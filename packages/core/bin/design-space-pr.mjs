#!/usr/bin/env node
/**
 * design-space-pr — escreve na descrição do PR os critérios de aceite gerados
 * do registro do produto. Ver a decisão 0018 do motor.
 *
 * No GitHub Actions, num evento `pull_request`, de dentro do produto:
 *
 *   design-space-pr [--origin <url do preview>]
 *
 * busca a base do PR, compara os dois registros e reescreve o bloco gerado na
 * descrição. O que estiver fora do bloco fica como está. Precisa de `GH_TOKEN`
 * ou `GITHUB_TOKEN` com `pull-requests: write`.
 *
 * Fora dele, para conferir o resultado sem mexer em nada:
 *
 *   design-space-pr --body <arquivo> [--base <diretório>] [--origin <url>] [--commit <sha>]
 *
 * imprime a descrição nova na saída padrão.
 *
 * `--entry <arquivo>` aponta o módulo do produto (padrão: `src/app/product.ts`
 * ou `.tsx`). O export lido é `productDefinition`, `product` ou o `default`.
 * `--dry-run` no modo GitHub imprime em vez de gravar.
 *
 * O produto é carregado pelo Vite do próprio produto, com a configuração dele,
 * do mesmo jeito que o dev server carrega. Por isso o comando não leva Vite como
 * dependência: usa o que o produto já tem.
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

import { buildPrSection, mergePrBody } from "../dist/pr.js";

const USAGE = `Uso:
  design-space-pr [--origin <url>] [--entry <arquivo>] [--dry-run]      no GitHub Actions, em pull_request
  design-space-pr --body <arquivo> [--base <dir>] [--origin <url>] [--commit <sha>] [--entry <arquivo>]`;

const { values: args } = parseArgs({
  options: {
    body: { type: "string" },
    base: { type: "string" },
    origin: { type: "string" },
    commit: { type: "string" },
    entry: { type: "string" },
    "dry-run": { type: "boolean", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
});

if (args.help) {
  console.log(USAGE);
  process.exit(0);
}

const root = process.cwd();

/** Limite da descrição de PR no GitHub. A folga fica para o texto escrito por gente. */
const BODY_LIMIT = 65536;

try {
  if (args.body !== undefined) await local();
  else await github();
} catch (error) {
  console.error(`design-space-pr: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

/** Lê a descrição de um arquivo e imprime a nova. Não fala com ninguém. */
async function local() {
  const body = readFileSync(resolve(args.body), "utf8");
  const head = await loadProduct(root);
  const base = args.base ? await loadBase(resolve(args.base)) : undefined;
  const section = buildPrSection({ head, base, origin: args.origin, commit: args.commit });
  process.stdout.write(mergePrBody(body, section));
}

/** Reescreve a descrição do PR do evento que disparou o workflow. */
async function github() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  const repository = process.env.GITHUB_REPOSITORY;
  if (!eventPath || !repository) throw new Error(`fora do GitHub Actions, passe --body.\n${USAGE}`);

  const pull = JSON.parse(readFileSync(eventPath, "utf8")).pull_request;
  if (!pull) {
    console.log("design-space-pr: o evento não é de pull request; nada a fazer.");
    return;
  }

  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (!token && !args["dry-run"]) throw new Error("falta GH_TOKEN ou GITHUB_TOKEN com pull-requests: write.");
  const api = (process.env.GITHUB_API_URL || "https://api.github.com").replace(/\/+$/, "");
  const request = async (method, path, payload) => {
    const response = await fetch(`${api}${path}`, {
      method,
      headers: {
        accept: "application/vnd.github+json",
        "x-github-api-version": "2022-11-28",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(payload ? { "content-type": "application/json" } : {}),
      },
      body: payload ? JSON.stringify(payload) : undefined,
    });
    if (!response.ok) throw new Error(`${method} ${path}: ${response.status} ${await response.text()}`);
    return response.json();
  };

  const head = await loadProduct(root);
  const base = await withBaseCheckout(await baseSha(pull, request, Boolean(token)), (dir) => loadBase(dir));
  const section = buildPrSection({ head, base, origin: args.origin, commit: pull.head.sha, maxLength: BODY_LIMIT - 8000 });

  // A descrição do evento é a do momento do push; alguém pode ter editado
  // depois. Lê a atual para não apagar o que foi escrito no meio do caminho.
  const path = `/repos/${repository}/pulls/${pull.number}`;
  const current = token ? (await request("GET", path)).body : pull.body;
  const next = mergePrBody(current, section);

  if (args["dry-run"]) {
    process.stdout.write(next);
    return;
  }
  if (next === (current ?? "").replace(/\r\n/g, "\n")) {
    console.log("design-space-pr: descrição já está em dia.");
    return;
  }
  await request("PATCH", path, { body: next });
  console.log(`design-space-pr: descrição do PR #${pull.number} atualizada.`);
}

/**
 * O commit contra o qual comparar.
 *
 * Com o checkout padrão do evento, o diretório é o merge do PR com a base, e a
 * comparação certa é com a ponta da base. Com o commit do PR checado (um deploy
 * de preview costuma fazer isso), a ponta da base pode ter andado depois que a
 * branch saiu, e o que entrou nela apareceria como removido; aí a comparação é
 * com o ponto onde a branch saiu.
 */
async function baseSha(pull, request, canAsk) {
  if (!canAsk || git("rev-parse", "HEAD") !== pull.head.sha) return pull.base.sha;
  try {
    const compare = await request("GET", `/repos/${process.env.GITHUB_REPOSITORY}/compare/${pull.base.sha}...${pull.head.sha}`);
    return compare.merge_base_commit?.sha ?? pull.base.sha;
  } catch (error) {
    console.error(`design-space-pr: sem o ponto de partida da branch (${firstLine(error)}); comparando com a ponta da base.`);
    return pull.base.sha;
  }
}

function git(...gitArgs) {
  return execFileSync("git", gitArgs, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

/**
 * Põe a base do PR numa worktree temporária, com os `node_modules` do PR, e
 * devolve o que `use` devolver. Sem a base, devolve `undefined` e o bloco lista
 * todas as telas, que é melhor que nenhuma.
 */
async function withBaseCheckout(sha, use) {
  const dir = mkdtempSync(join(tmpdir(), "design-space-pr-"));
  let added = false;
  try {
    git("fetch", "--no-tags", "--depth=1", "origin", sha);
    git("worktree", "add", "--detach", dir, sha);
    added = true;
    // O produto pode morar numa subpasta do repositório.
    const productDir = join(dir, git("rev-parse", "--show-prefix"));
    symlinkSync(join(root, "node_modules"), join(productDir, "node_modules"), "dir");
    return await use(productDir);
  } catch (error) {
    console.error(`design-space-pr: sem a base do PR (${firstLine(error)}); listando todas as telas.`);
    return undefined;
  } finally {
    if (added) {
      try {
        git("worktree", "remove", "--force", dir);
      } catch {
        rmSync(dir, { recursive: true, force: true });
      }
    } else {
      rmSync(dir, { recursive: true, force: true });
    }
  }
}

async function loadBase(dir) {
  try {
    return await loadProduct(dir);
  } catch (error) {
    console.error(`design-space-pr: não deu para ler o produto na base (${firstLine(error)}); listando todas as telas.`);
    return undefined;
  }
}

/** Carrega o produto pelo Vite instalado nele, sem abrir porta. */
async function loadProduct(dir) {
  const entry = args.entry ?? ["src/app/product.ts", "src/app/product.tsx"].find((file) => existsSync(join(dir, file)));
  if (!entry) throw new Error(`não achei src/app/product.ts nem .tsx em ${dir}; passe --entry.`);

  const require = createRequire(join(dir, "package.json"));
  const vite = await import(pathToFileURL(require.resolve("vite")).href);
  const server = await vite.createServer({
    root: dir,
    server: { middlewareMode: true, hmr: false },
    appType: "custom",
    logLevel: "error",
    // Só o carregamento em Node interessa; a varredura de dependências é do
    // navegador e falha à toa na base, que usa os node_modules do PR.
    optimizeDeps: { noDiscovery: true, entries: [] },
  });
  try {
    const mod = await server.ssrLoadModule(`/${entry.replace(/^\.?\//, "")}`);
    const product = ["productDefinition", "product", "default"].map((name) => mod[name]).find(isProduct);
    if (!product) throw new Error(`${entry} não exporta um produto (procurei productDefinition, product e default).`);
    return product;
  } finally {
    await server.close();
  }
}

function isProduct(value) {
  return Boolean(value) && typeof value === "object" && Array.isArray(value.routes) && Array.isArray(value.scenarios);
}

function firstLine(error) {
  return String(error instanceof Error ? error.message : error).split("\n")[0];
}
