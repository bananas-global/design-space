# 0002 — `a11y` é campo obrigatório do contrato de cenário

**Data:** 2026-07-30
**Status:** aceita

## Contexto

Acessibilidade normalmente entra como auditoria: o produto é construído, alguém
roda uma ferramenta perto do fim, e o resultado é uma lista de correções tardias.
Muitas dessas correções são caras justamente porque a causa é uma decisão de
design tomada meses antes.

O documento de arquitetura decidiu tratar acessibilidade como dimensão de
primeira classe (D-15). A questão de implementação era: campo opcional com
validação recomendada, ou campo obrigatório que quebra o typecheck?

## Decisão

`a11y` é obrigatório em `Scenario`. Um cenário não compila sem declarar cobertura
de teclado e nível de contraste.

## Raciocínio

Campo opcional com aviso é campo que não existe. O padrão observável em qualquer
codebase: o primeiro cenário declara, o quinto esquece, o vigésimo estabelece que
declarar é opcional na prática — e o aviso número onze não é mais lido por
ninguém.

Obrigatório muda a pergunta que o autor do cenário precisa responder. Em vez de
"vale a pena preencher isso?", passa a ser "esta jornada é completável só por
teclado?". A segunda pergunta é a que produz decisão de design.

Existe um custo real: `keyboard: "partial"` fica disponível como saída, e um autor
apressado vai usá-la. Isso é aceito e mitigado — a validação avisa quando um
cenário aprovado tem teclado parcial, porque aprovar jornada crítica sem teclado
é exatamente o gate que o roadmap definiu.

## Consequências

- O tipo carrega a exigência: nenhum lint, nenhum hook, nenhuma revisão manual é
  necessária para que a pergunta seja feita.
- `announces` é opcional dentro de `a11y`, e deliberadamente: não toda situação
  tem evento a anunciar, e exigir uma lista vazia explícita seria ritual.
- A verificação automática continua sendo piso, não teto. O campo declara a
  intenção; o axe no CI verifica uma fração dela; revisão humana nas jornadas
  críticas continua necessária. O motor não deve sugerir que CI verde significa
  produto acessível, e o painel diz isso em texto.

## Alternativa descartada

Campo opcional com regra de lint. Descartada porque lint é configurável por
projeto, e a exigência precisava sobreviver a um produto que herda o motor sem
herdar a configuração de lint.
