#!/usr/bin/env node
/**
 * Escolhe a hospedagem deste Design Space.
 *
 *   pnpm setup:hosting none      # padrão: só local
 *   pnpm setup:hosting vercel    # publica preview e produção pela Vercel
 *
 * Existe porque hospedagem é a única parte do modelo que gera arquivo de
 * fornecedor no repositório do produto — `vercel.json` e um workflow de deploy. O
 * motor não sabe nada disso (ver a trava em `src/deploy/hosting.test.ts` do
 * pacote), então o parâmetro tem que morar aqui, onde os arquivos nascem.
 *
 * `none` não é degradação: um Design Space aberto por `pnpm dev`, revisado ao lado
 * de quem desenha ou por chamada com tela compartilhada é um uso completo do modelo. A
 * hospedagem entra quando a revisão passa a ser assíncrona ou com cliente.
 *
 * O script é idempotente: rodar duas vezes com o mesmo alvo não muda nada, e
 * trocar de alvo remove o que o anterior instalou.
 */

import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const hostingDir = join(root, "hosting");
const workflowsDir = join(root, ".github", "workflows");

const providers = readdirSync(hostingDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

const target = process.argv[2] ?? "none";

if (target !== "none" && !providers.includes(target)) {
  console.error(`Hospedagem desconhecida: ${target}`);
  console.error(`Disponíveis: none, ${providers.join(", ")}`);
  process.exit(1);
}

/** Arquivos que uma hospedagem instala na raiz e em `.github/workflows`. */
function installedFiles(provider) {
  return readdirSync(join(hostingDir, provider)).map((file) => ({
    from: join(hostingDir, provider, file),
    to: file.endsWith(".yml") ? join(workflowsDir, file) : join(root, file),
  }));
}

// Remover primeiro, sempre: é o que faz trocar de alvo não deixar resto de
// fornecedor no repositório.
for (const provider of providers) {
  for (const { to } of installedFiles(provider)) {
    if (existsSync(to)) rmSync(to);
  }
}

if (target === "none") {
  console.log("Hospedagem: nenhuma. `pnpm dev` local, sem preview publicado.");
  console.log("Lembre que `approvedAt` de cenário aprovado precisa de uma URL");
  console.log("imutável — sem hospedagem, registre o permalink do commit no Git.");
  process.exit(0);
}

mkdirSync(workflowsDir, { recursive: true });
for (const { from, to } of installedFiles(target)) {
  copyFileSync(from, to);
  console.log(`instalado: ${to.slice(root.length + 1)}`);
}

console.log(`\nHospedagem: ${target}.`);
if (target === "vercel") {
  console.log("Falta o que só uma pessoa faz: criar o projeto na Vercel, gravar os");
  console.log("secrets VERCEL_TOKEN, VERCEL_ORG_ID e VERCEL_PROJECT_ID no GitHub e");
  console.log("desligar Vercel Authentication no preview.");
}
