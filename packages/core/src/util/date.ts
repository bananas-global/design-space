/**
 * Interpretação de data ISO.
 *
 * Esta é a **primeira** capacidade extraída para o motor por evidência, e não por
 * antecipação (Princípio 10). A régua aplicada foi: apareceu em dois produtos
 * independentes, não carrega nenhuma decisão de aparência e não carrega nenhum
 * conceito de domínio.
 *
 * O bug que a originou: `new Date("2011-09-08")` é parseado como meia-noite
 * **UTC**. Formatado em qualquer fuso a oeste de Greenwich — o Brasil inteiro —
 * exibe o dia anterior. Em um produto isso apareceu como data de nascimento
 * atrasada em um dia, o que deslocava a idade calculada e portanto uma regra que
 * dependia dela; em outro, como vencimento errado por um dia.
 *
 * Os dois produtos escreveram a mesma correção separadamente. Quando isso
 * acontece, o lugar da correção é o motor — senão o terceiro produto reescreve o
 * bug.
 */

/**
 * Converte uma string ISO em `Date`, lendo data sem horário como **local**.
 *
 * - `"2026-07-30"` → meia-noite no fuso local.
 * - `"2026-07-30T09:00:00-03:00"` → exatamente o instante indicado.
 *
 * A regra é a do próprio padrão: data sem horário não tem fuso, então tratá-la
 * como UTC é uma escolha arbitrária que produz erro de um dia.
 */
export function parseIsoDate(iso: string): Date {
  return new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
}

/**
 * Idade em anos completos, medida contra uma referência explícita.
 *
 * A referência é obrigatória de propósito. Um valor padrão `new Date()` faria
 * fixture depender do relógio, e o efeito é traiçoeiro: um cenário de "menor sem
 * responsável" deixaria de existir no aniversário de 18 anos da fixture, meses
 * depois de alguém tê-lo aprovado.
 */
export function ageInYears(birthDate: string, reference: string): number {
  const birth = parseIsoDate(birthDate);
  const at = parseIsoDate(reference);

  let age = at.getFullYear() - birth.getFullYear();
  const monthDiff = at.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && at.getDate() < birth.getDate())) age -= 1;
  return age;
}

/** Diferença em dias completos entre duas datas, positiva quando `to` é depois. */
export function daysBetween(from: string, to: string): number {
  const start = parseIsoDate(from);
  const end = parseIsoDate(to);
  return Math.floor((end.getTime() - start.getTime()) / 86_400_000);
}
