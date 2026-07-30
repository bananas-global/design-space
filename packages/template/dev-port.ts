import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

/**
 * Porta determinística derivada do nome do projeto.
 *
 * Existe porque um designer costuma ter dois ou três Design Spaces abertos ao
 * mesmo tempo, e porta rotativa quebra bookmark, quebra o link que estava no
 * Slack e obriga a reler o terminal a cada `pnpm dev`. Mesmo projeto, mesma
 * porta, sempre — e projetos diferentes não colidem.
 */
function hashToPort(name: string): number {
  let hash = 0;
  for (const char of name) {
    hash = (hash * 31 + char.codePointAt(0)!) % 100_000;
  }
  // Faixa 3000–8999: acima das portas privilegiadas e abaixo do que serviços
  // locais comuns costumam ocupar.
  return 3000 + (hash % 6000);
}

const here = dirname(fileURLToPath(import.meta.url));
const { name } = JSON.parse(readFileSync(join(here, "package.json"), "utf8")) as { name: string };

export const devPort = hashToPort(name);
