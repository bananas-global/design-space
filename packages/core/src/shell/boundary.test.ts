import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Trava da fronteira visual do motor.
 *
 * Existe por causa de um bug real: `.ds-root` definia `color` e `font-family`, e
 * como o palco é descendente dele, todo elemento do produto que não declarava cor
 * própria herdava o cinza-claro do chrome. O sintoma apareceu no axe do produto
 * piloto — tabelas reprovadas por contraste de 1.21:1 contra uma cor que o
 * cliente nunca escolheu.
 *
 * O teste lê o CSS como texto de propósito. Não existe unidade de React que pegue
 * isso, e o custo de a regressão voltar é alto: ela reprova o CI de um produto por
 * um problema que não é dele.
 */

const css = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "shell.css"),
  "utf8",
);

/** Corpo de uma regra CSS, pelo seletor exato. */
function ruleBody(selector: string): string {
  const index = css.indexOf(`${selector} {`);
  if (index === -1) throw new Error(`Regra não encontrada: ${selector}`);
  const start = css.indexOf("{", index);
  return css.slice(start, css.indexOf("}", start));
}

/**
 * Propriedades declaradas em uma regra, ignorando custom properties.
 *
 * Definir `--ds-font` em `.ds-root` é correto e necessário: custom property não
 * pinta nada por si, e as regiões do chrome precisam herdá-la. O que não pode é
 * `font:` de verdade.
 */
function declaredProperties(selector: string): string[] {
  return ruleBody(selector)
    .split(";")
    .map((declaration) => declaration.split(":")[0]?.trim() ?? "")
    .filter((property) => property.length > 0 && !property.startsWith("--"))
    .map((property) => property.replace(/^\{\s*/, ""));
}

describe("fronteira visual", () => {
  it("`.ds-root` não define propriedade herdável", () => {
    const declared = declaredProperties(".ds-root");

    // Layout e fundo podem ficar em `.ds-root`, porque não são herdados. Tudo que
    // cascateia precisa viver em `.ds-chrome`, que o palco não é.
    const inherited = [
      "color",
      "font",
      "font-family",
      "font-size",
      "font-weight",
      "line-height",
      "letter-spacing",
      "text-align",
      "visibility",
    ];

    expect(
      declared.filter((property) => inherited.includes(property)),
      "Propriedade herdável em .ds-root vaza para a UI do produto. Mova para .ds-chrome.",
    ).toEqual([]);
  });

  it("a tipografia do chrome vive em `.ds-chrome`", () => {
    const declared = declaredProperties(".ds-chrome");
    expect(declared).toContain("color");
    expect(declared).toContain("font-family");
  });

  it("nenhum seletor alcança o palco a partir de `.ds-root`", () => {
    // `.ds-root *` alcançaria todo elemento do produto. `.ds-chrome *` não.
    const leaking = [...css.matchAll(/^\s*(\.ds-root\s+\*[^,{]*)/gm)].map((match) => match[1]);
    expect(leaking).toEqual([]);
  });

  it("todo seletor de classe do motor é prefixado com `ds-`", () => {
    const classes = [...css.matchAll(/\.([a-zA-Z][\w-]*)/g)]
      .map((match) => match[1]!)
      .filter((name) => !name.startsWith("ds-"));
    expect([...new Set(classes)]).toEqual([]);
  });

  it("não existe regra em elemento nu sem escopo do chrome", () => {
    // Uma regra como `button { … }` no CSS do motor redefiniria os botões do
    // cliente. Toda regra de elemento tem que estar sob um seletor `ds-`.
    const bareElementRules = [...css.matchAll(/^([a-z][a-z0-9]*(?:\s*,\s*[a-z][a-z0-9]*)*)\s*\{/gm)]
      .map((match) => match[1]!)
      .filter((selector) => !selector.startsWith("@"));
    expect(bareElementRules).toEqual([]);
  });
});

/**
 * Trava da fronteira de vocabulário.
 *
 * O motor carregava o domínio dos primeiros clientes nos comentários e nos testes
 * — convênio recusado, paciente menor de idade, guia — sem nenhum efeito em
 * runtime. O custo era outro: um agente que lê estes arquivos conclui que o motor
 * é de um setor específico e escreve como se fosse, e o exemplo de um cliente
 * aparece no repositório do concorrente dele.
 *
 * Exemplo em comentário e em teste é vocabulário genérico: solicitação, pedido,
 * cobrança. Nome de cliente, nunca.
 */
describe("fronteira de vocabulário", () => {
  const src = dirname(dirname(fileURLToPath(import.meta.url)));

  const CLIENTES = [/\bbloomy\b/i, /\bfinaya\b/i, /\bbananas\b/i];

  function sourceFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((entry) => {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) return sourceFiles(path);
      return /\.tsx?$/.test(entry) ? [path] : [];
    });
  }

  it("nenhum arquivo do motor nomeia um cliente", () => {
    const offenders = sourceFiles(src)
      .filter((path) => !path.endsWith("boundary.test.ts"))
      .filter((path) => CLIENTES.some((pattern) => pattern.test(readFileSync(path, "utf8"))))
      .map((path) => path.slice(src.length + 1));

    expect(
      offenders,
      "Nome de cliente citado no motor. Exemplo do motor usa vocabulário genérico.",
    ).toEqual([]);
  });
});
