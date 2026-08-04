import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Trava da fronteira de hospedagem.
 *
 * O motor passou por um período em que `deploy/index.ts` lia `VERCEL_*` do
 * ambiente e `commitUrl` montava `*.vercel.app` na mão. Nada disso funcionava em
 * produto real — o motor é biblioteca compilada e não alcança o build de quem o
 * consome — e o efeito colateral foi pior que o bug: um Design Space que roda só
 * local parecia caso degradado de um modelo que pressupõe um fornecedor.
 *
 * Este teste lê o próprio código como texto, igual ao de fronteira visual. Não
 * existe unidade de comportamento que pegue "voltou a citar um fornecedor", e o
 * custo de a regressão voltar é o produto inteiro herdar a suposição.
 */

const src = dirname(dirname(fileURLToPath(import.meta.url)));

/** Nome de provedor não pertence ao motor, nem em comentário. */
const FORBIDDEN = [/vercel/i, /netlify/i, /cloudflare pages/i, /amplify/i];

/**
 * Código sem comentário.
 *
 * O comentário precisa poder explicar por que a leitura de ambiente foi
 * removida, então a trava olha o que executa — não o que documenta.
 */
function code(path: string): string {
  return readFileSync(path, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry) ? [path] : [];
  });
}

describe("fronteira de hospedagem", () => {
  it("nenhum arquivo do motor cita um provedor de hospedagem", () => {
    const offenders = sourceFiles(src)
      .filter((path) => !path.endsWith("hosting.test.ts"))
      // Texto cru, comentário incluído: é o comentário que ensina o próximo
      // agente a supor um fornecedor.
      .filter((path) => FORBIDDEN.some((pattern) => pattern.test(readFileSync(path, "utf8"))))
      .map((path) => path.slice(src.length + 1));

    expect(
      offenders,
      "Provedor de hospedagem citado no motor. A configuração de host vive no produto.",
    ).toEqual([]);
  });

  it("o motor não lê variável de ambiente para descobrir contexto", () => {
    // `getDeployContext` recebe o contexto do produto. Ler `process.env` ou
    // `import.meta.env` aqui é o bug de 0.1.1 voltando por outro caminho.
    const deploy = code(join(src, "deploy", "index.ts"));

    expect(deploy).not.toMatch(/process\.env/);
    expect(deploy).not.toMatch(/import\.meta/);
  });
});
