import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";


/**
 * Trava da fronteira visual do motor.
 *
 * Desde a 0.8 a UI do produto roda num `<iframe>`, então o CSS do chrome não
 * alcança o produto por herança. Continua alcançando por outro caminho: o mesmo
 * bundle carrega `shell.css` também no documento do quadro. A garantia é que
 * todo seletor comece em `.ds-` — no quadro não existe elemento `ds-` fora do
 * estado vazio, então nada casa.
 *
 * No sentido inverso, o CSS global do produto também carrega no documento do
 * chrome. Por isso `.ds-root` precisa definir fundo, fonte e cor por conta
 * própria, em vez de herdar do `body` que o produto estilizou.
 *
 * O teste lê o CSS como texto de propósito: não existe unidade de React que
 * pegue isso.
 */

const css = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "shell.css"),
  "utf8",
).replace(/\/\*[\s\S]*?\*\//g, "");

/** Corpo de uma regra CSS, pelo seletor exato. */
function ruleBody(selector: string): string {
  const index = css.indexOf(`${selector} {`);
  if (index === -1) throw new Error(`Regra não encontrada: ${selector}`);
  const start = css.indexOf("{", index);
  return css.slice(start, css.indexOf("}", start));
}

/** Propriedades declaradas em uma regra, ignorando custom properties. */
function declaredProperties(selector: string): string[] {
  return ruleBody(selector)
    .split(";")
    .map((declaration) => declaration.split(":")[0]?.trim() ?? "")
    .filter((property) => property.length > 0 && !property.startsWith("--"))
    .map((property) => property.replace(/^\{\s*/, ""));
}

/** Todos os seletores do arquivo, um por item de lista, sem at-rules. */
function selectors(): string[] {
  return [...css.matchAll(/([^{}]+)\{/g)]
    .map((match) => match[1]!.trim())
    .filter((selector) => selector.length > 0 && !selector.startsWith("@"))
    .flatMap((selector) => splitSelectorList(selector));
}

function splitSelectorList(selector: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const char of selector) {
    if (char === "(") depth += 1;
    if (char === ")") depth -= 1;
    if (char === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

describe("fronteira visual", () => {
  it("todo seletor começa numa classe `ds-`", () => {
    const offenders = selectors().filter((selector) => !selector.startsWith(".ds-"));
    expect(offenders, "Seletor fora do escopo do chrome alcança o documento do quadro.").toEqual([]);
  });

  it("não existe regra em `:root`, `html`, `body` nem `*` solto", () => {
    expect(css).not.toMatch(/(^|[\s,}])(:root|html|body)\b[^{]*\{/m);
    expect(selectors().filter((selector) => selector.startsWith("*"))).toEqual([]);
  });

  it("toda classe e toda custom property são prefixadas", () => {
    const classes = [...css.matchAll(/\.([a-zA-Z][\w-]*)/g)]
      .map((match) => match[1]!)
      .filter((name) => !name.startsWith("ds-"));
    expect([...new Set(classes)]).toEqual([]);

    const properties = [...css.matchAll(/(--[\w-]+)\s*:/g)]
      .map((match) => match[1]!)
      .filter((name) => !name.startsWith("--ds-"));
    expect([...new Set(properties)]).toEqual([]);
  });

  it("`.ds-root` cobre a janela com fundo, fonte e cor próprios", () => {
    const declared = declaredProperties(".ds-root");
    for (const property of ["position", "inset", "background", "color", "font-family", "font-size"]) {
      expect(declared, property).toContain(property);
    }
  });

  it("os elementos do chrome voltam ao padrão antes do estilo do chrome", () => {
    expect(ruleBody(".ds-root :where(*:not(svg, svg *))")).toContain("all: revert");
  });

  it("claro e escuro usam os tokens preto e branco combinados", () => {
    const light = ruleBody(".ds-root");
    expect(light).toContain("--ds-bg: #ffffff");
    expect(light).toContain("--ds-fg: #0a0a0a");
    expect(light).toContain("--ds-muted: #737373");
    expect(light).toContain("--ds-border: #e5e5e5");
    expect(light).toContain("--ds-surface: #fafafa");
    expect(light).toContain("--ds-radius: 6px");
    expect(light).toContain("--ds-fs: 13px");
    expect(light).toContain("--ds-fs-sm: 12px");

    const dark = ruleBody('.ds-root[data-appearance="dark"]');
    expect(dark).toContain("--ds-bg: #0a0a0a");
    expect(dark).toContain("--ds-fg: #fafafa");
    expect(dark).toContain("--ds-muted: #a3a3a3");
    expect(dark).toContain("--ds-border: #262626");
    expect(dark).toContain("--ds-surface: #171717");
  });

  it("a única cor além do preto, branco e cinzas é o vermelho do diagnóstico", () => {
    const colors = [...css.matchAll(/#([0-9a-f]{3,8})\b/gi)].map((match) => match[1]!.toLowerCase());
    const chromatic = colors.filter((hex) => {
      const full = hex.length === 3 ? [...hex].map((c) => c + c).join("") : hex.slice(0, 6);
      const [r, g, b] = [0, 2, 4].map((i) => Number.parseInt(full.slice(i, i + 2), 16));
      return !(r === g && g === b);
    });
    expect([...new Set(chromatic)].sort()).toEqual(["dc2626", "f87171"]);
    expect(ruleBody(".ds-diagnostics__trigger[data-level=\"error\"]")).toContain("var(--ds-danger)");
  });

  it("seleção é inversão: fundo na cor do texto", () => {
    expect(ruleBody('.ds-tab[aria-selected="true"]')).toContain("background: var(--ds-fg)");
    expect(css).toMatch(/\.ds-item\[aria-current="true"\][^{]*\{\s*background: var\(--ds-fg\);\s*color: var\(--ds-bg\)/);
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

  // Nome de cliente. O nome do estúdio não entra: ele assina o pacote, e o
  // problema nunca foi identificar quem fez — foi expor para quem.
  const CLIENTES = [/\bbloomy\b/i, /\bfinaya\b/i];

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

  it("nenhum documento publicado com o pacote nomeia um cliente", () => {
    // `README.md` e `CHANGELOG.md` vão dentro do tarball do npm, então são tão
    // públicos quanto o código — e foi num exemplo do README que o nome de um
    // cliente real apareceu.
    const pkg = dirname(src);

    const offenders = ["README.md", "CHANGELOG.md"].filter((file) =>
      CLIENTES.some((pattern) => pattern.test(readFileSync(join(pkg, file), "utf8"))),
    );

    expect(offenders, "Nome de cliente em documento publicado no npm.").toEqual([]);
  });
});
