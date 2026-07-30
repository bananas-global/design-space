/**
 * Leitura da árvore acessível do elemento em foco (§6.1, "No painel").
 *
 * Não é um leitor de tela e não pretende ser. É a resposta rápida a "o que um
 * leitor de tela anunciaria aqui?", disponível na hora em que a decisão de
 * design está sendo tomada. O cálculo de nome acessível segue a ordem do
 * accname, simplificada para o que aparece em UI de produto — o limite honesto
 * é o mesmo do resto do capítulo: ferramenta é piso, não teto.
 */

export type AccessibleNode = {
  /** Papel explícito ou inferido do elemento. */
  role: string;
  /** Nome acessível calculado. */
  name: string;
  /** De onde o nome veio: útil quando o nome está tecnicamente presente e sem sentido. */
  nameFrom:
    | "aria-labelledby"
    | "aria-label"
    | "label"
    | "alt"
    | "title"
    | "value"
    | "content"
    | "none";
  /** Descrição acessível, quando houver. */
  description?: string;
  /** Estados relevantes: `disabled`, `checked`, `expanded`, `invalid`… */
  states: string[];
  /** Seletor curto do elemento, para citar em backlog. */
  selector: string;
  /** `true` quando o elemento está fora da ordem de tabulação. */
  hiddenFromTabOrder: boolean;
  /** `true` quando o elemento é escondido de tecnologia assistiva. */
  hiddenFromAssistiveTech: boolean;
};

const IMPLICIT_ROLES: Record<string, string> = {
  a: "link",
  article: "article",
  aside: "complementary",
  button: "button",
  dialog: "dialog",
  fieldset: "group",
  footer: "contentinfo",
  form: "form",
  h1: "heading",
  h2: "heading",
  h3: "heading",
  h4: "heading",
  h5: "heading",
  h6: "heading",
  header: "banner",
  hr: "separator",
  img: "img",
  li: "listitem",
  main: "main",
  nav: "navigation",
  ol: "list",
  option: "option",
  output: "status",
  progress: "progressbar",
  section: "region",
  select: "combobox",
  table: "table",
  tbody: "rowgroup",
  td: "cell",
  textarea: "textbox",
  th: "columnheader",
  tr: "row",
  ul: "list",
};

const INPUT_ROLES: Record<string, string> = {
  button: "button",
  checkbox: "checkbox",
  email: "textbox",
  image: "button",
  number: "spinbutton",
  radio: "radio",
  range: "slider",
  reset: "button",
  search: "searchbox",
  submit: "button",
  tel: "textbox",
  text: "textbox",
  url: "textbox",
};

export function describeElement(element: Element | null): AccessibleNode | undefined {
  if (!element || !(element instanceof HTMLElement)) return undefined;

  const { name, nameFrom } = accessibleName(element);

  return {
    role: computeRole(element),
    name,
    nameFrom,
    description: accessibleDescription(element),
    states: computeStates(element),
    selector: shortSelector(element),
    hiddenFromTabOrder: element.tabIndex < 0,
    hiddenFromAssistiveTech: isHiddenFromAssistiveTech(element),
  };
}

export function computeRole(element: HTMLElement): string {
  const explicit = element.getAttribute("role");
  if (explicit) return explicit.split(/\s+/)[0] ?? explicit;

  const tag = element.tagName.toLowerCase();

  if (tag === "input") {
    const type = (element as HTMLInputElement).type.toLowerCase();
    return INPUT_ROLES[type] ?? "textbox";
  }

  // `<a>` sem href não é link: é texto. Distinção que aparece muito em UI
  // construída rápido e que muda o que o leitor de tela anuncia.
  if (tag === "a" && !element.hasAttribute("href")) return "generic";

  return IMPLICIT_ROLES[tag] ?? "generic";
}

function accessibleName(element: HTMLElement): {
  name: string;
  nameFrom: AccessibleNode["nameFrom"];
} {
  const labelledBy = element.getAttribute("aria-labelledby");
  if (labelledBy) {
    const text = labelledBy
      .split(/\s+/)
      .map((id) => element.ownerDocument.getElementById(id)?.textContent?.trim() ?? "")
      .filter(Boolean)
      .join(" ");
    if (text) return { name: text, nameFrom: "aria-labelledby" };
  }

  const ariaLabel = element.getAttribute("aria-label")?.trim();
  if (ariaLabel) return { name: ariaLabel, nameFrom: "aria-label" };

  if (element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement) {
    const labels = Array.from(element.labels ?? [])
      .map((label) => label.textContent?.trim() ?? "")
      .filter(Boolean);
    if (labels.length) return { name: labels.join(" "), nameFrom: "label" };
  }

  if (element instanceof HTMLImageElement) {
    const alt = element.getAttribute("alt");
    // `alt=""` é decisão válida — imagem decorativa — e precisa aparecer como
    // tal, não como nome ausente por descuido.
    if (alt !== null) return { name: alt, nameFrom: "alt" };
  }

  const title = element.getAttribute("title")?.trim();
  const content = visibleText(element);

  if (content) return { name: content, nameFrom: "content" };
  if (title) return { name: title, nameFrom: "title" };

  if (element instanceof HTMLInputElement && element.value) {
    return { name: element.value, nameFrom: "value" };
  }

  const placeholder = element.getAttribute("placeholder")?.trim();
  // Placeholder não é rótulo. Devolver como nome seria mentir; devolver vazio é
  // o resultado correto e é o que faz o problema aparecer no painel.
  if (placeholder) return { name: "", nameFrom: "none" };

  return { name: "", nameFrom: "none" };
}

function accessibleDescription(element: HTMLElement): string | undefined {
  const describedBy = element.getAttribute("aria-describedby");
  if (describedBy) {
    const text = describedBy
      .split(/\s+/)
      .map((id) => element.ownerDocument.getElementById(id)?.textContent?.trim() ?? "")
      .filter(Boolean)
      .join(" ");
    if (text) return text;
  }
  return element.getAttribute("aria-description")?.trim() || undefined;
}

function computeStates(element: HTMLElement): string[] {
  const states: string[] = [];

  const flag = (attribute: string, label = attribute.replace("aria-", "")) => {
    const value = element.getAttribute(attribute);
    if (value === null) return;
    if (value === "false") return;
    states.push(value === "true" || value === "" ? label : `${label}=${value}`);
  };

  if ((element as HTMLButtonElement).disabled) states.push("disabled");
  if (element.getAttribute("aria-disabled") === "true") states.push("disabled");
  if ((element as HTMLInputElement).required) states.push("required");
  if ((element as HTMLInputElement).readOnly) states.push("readonly");
  if ((element as HTMLInputElement).checked) states.push("checked");

  flag("aria-expanded");
  flag("aria-selected");
  flag("aria-checked");
  flag("aria-pressed");
  flag("aria-current");
  flag("aria-invalid");
  flag("aria-busy");
  flag("aria-live");
  flag("aria-haspopup");
  flag("aria-level", "level");

  if (element.ownerDocument.activeElement === element) states.push("focused");

  return [...new Set(states)];
}

function isHiddenFromAssistiveTech(element: HTMLElement): boolean {
  let current: HTMLElement | null = element;
  while (current) {
    if (current.getAttribute("aria-hidden") === "true") return true;
    if (current.hasAttribute("hidden")) return true;
    current = current.parentElement;
  }
  return false;
}

/** Texto visível do elemento, ignorando conteúdo escondido de leitor de tela. */
function visibleText(element: HTMLElement): string {
  const clone = element.cloneNode(true) as HTMLElement;
  for (const hidden of clone.querySelectorAll("[aria-hidden='true'],[hidden]")) {
    hidden.remove();
  }
  return (clone.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 160);
}

/** Seletor curto e legível, para citar no backlog do coletor. */
export function shortSelector(element: HTMLElement): string {
  const tag = element.tagName.toLowerCase();
  if (element.id) return `${tag}#${element.id}`;

  const testId = element.getAttribute("data-testid");
  if (testId) return `${tag}[data-testid="${testId}"]`;

  const classes = Array.from(element.classList).slice(0, 2);
  return classes.length ? `${tag}.${classes.join(".")}` : tag;
}

/**
 * Elementos focáveis na ordem em que o Tab os visita. Serve para evidenciar a
 * ordem de tabulação — ordem de leitura confusa passa no axe e é exatamente o
 * que o modo teclado existe para revelar.
 */
export function tabbableElements(root: ParentNode = document): HTMLElement[] {
  const selector = [
    "a[href]",
    "button",
    "input",
    "select",
    "textarea",
    "summary",
    "[tabindex]",
    "[contenteditable='true']",
  ].join(",");

  return Array.from(root.querySelectorAll<HTMLElement>(selector)).filter((element) => {
    if (element.tabIndex < 0) return false;
    if ((element as HTMLButtonElement).disabled) return false;
    if (element.getAttribute("aria-hidden") === "true") return false;
    const style = window.getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden") return false;
    return element.offsetWidth > 0 || element.offsetHeight > 0 || element === document.activeElement;
  });
}
