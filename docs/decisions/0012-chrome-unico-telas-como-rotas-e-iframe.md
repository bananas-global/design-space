# 0012 — Chrome único em preto e branco, telas como rotas e produto em iframe

**Data:** 2026-09-28
**Status:** aceita
**Decidido por:** Bruno Santos
**Supera em parte:** [0010](0010-handoff-e-recorte-de-foco-nao-seguranca.md)
(as menções a Home, árvore e jornadas)

## Contexto

O time de produto achou o chrome da 0.7 confuso. Três coisas se somavam:

1. **Organização em três níveis.** Módulo → jornada → cenário exigia manter um
   prefixo de id sincronizado com a lista de módulos, e a navegação mostrava
   uma árvore que não correspondia a nada que o time via no produto real. O que
   o time vê no produto é tela.
2. **Aparência por produto.** O chrome escuro com acentos e o modo claro próprio
   competiam com a UI do cliente na mesma tela, e cada produto parecia um
   ambiente diferente para quem revisava mais de um.
3. **Produto e chrome no mesmo documento.** O CSS global do produto (preflight,
   `body { background }`) vazava para o chrome, o do chrome precisava de travas
   para não vazar para o produto, e o palco não era uma janela: media queries
   `md:`/`lg:` respondiam à janela do navegador inteira, e os produtos passaram
   a usar container queries como contorno.

Um laboratório irmão, feito à mão para um app de outro stack, organizou a
revisão como **Telas + Componentes à esquerda, Variações + Informações à
direita**, e o time preferiu.

## Decisão

Na 0.8.0 (incompatível):

- **Uma tela é uma rota.** As variações da tela são os cenários cuja `route`
  casa com o `path` dela, pelo mesmo casamento do roteador. Ordem das telas é a
  de `routes`; das variações, a de `scenarios`. Rota sem cenário também é tela,
  com uma variação implícita "Padrão". Saem `Module`, `Flow`, `FlowStep`,
  `ProductDefinition.modules`, a árvore, os órfãos e a validação de prefixo:
  id de cenário é qualquer id estável e único.
- **Um chrome para todos os produtos**, preto e branco, claro e escuro, sem cor
  de cliente e sem logo — só o nome do produto em texto. A única cor é o
  vermelho discreto do diagnóstico com erro. O tema segue o sistema e a troca é
  lembrada.
- **A UI do produto roda num `<iframe>`** da mesma origem e do mesmo bundle
  (`ds-frame=1`). Em modo quadro, `<DesignSpace>` renderiza só o wrapper do
  produto mais a tela ou o preview. O chrome e o quadro conversam por
  `postMessage`, e cada lado só aceita mensagem da mesma origem e da janela
  esperada. O viewport do preview passa a ser a largura real da janela do
  produto.
- **Informações para o PR.** `Scenario.components` e `ComponentPreview.source`
  ligam cada tela aos componentes que ela usa e à origem deles no sistema real;
  "Copiar para o PR" gera o markdown com links absolutos por variação, a tabela
  componente → origem e o comportamento esperado.
- **Sem Home.** A raiz abre o primeiro item.

Continua: fixtures e adapters, estado de rede, persona, viewport, tema e locale
do produto, deploy e deep links, handoff focado, `util/date`, rótulos
sobrescrevíveis e a URL como fonte da verdade do estado.

## Consequências

- **Produtos migram.** Removem `modules`, dão `name` às rotas e, se quiserem,
  preenchem `components` e `source`. Container queries que existiam só por causa
  do palco voltam a ser media queries. Guia no `CHANGELOG.md` do motor.
- **Testes de ponta a ponta passam pelo quadro.** Asserção sobre a UI do produto
  usa `page.frameLocator(FRAME_SELECTOR)`; asserção sobre o chrome fica em
  `page`.
- **O isolamento de CSS deixa de depender de disciplina.** O CSS do chrome
  continua todo prefixado — o mesmo bundle o carrega no quadro, onde não existe
  elemento `ds-` para casar —, mas herança e preflight não atravessam mais o
  iframe. No documento do chrome, `.ds-root` cobre a janela com fundo, fonte e
  cor próprios e devolve seus elementos ao padrão do navegador antes de
  estilizá-los.
- **O handoff continua igual** como allowlist (0010), agora filtrando telas,
  variações e componentes. Onde a 0010 fala de Home, árvore e jornadas, vale
  isto: não há Home, e a raiz abre o primeiro item permitido.
- **Um preview isolado precisa de duas cargas do bundle** (chrome e quadro). O
  custo é de uma navegação, não de cada troca: trocar variação, persona ou rede
  vai por mensagem, sem recarregar.

## Alternativas descartadas

- **Manter módulos como agrupamento opcional da lista de telas.** Preservaria o
  vocabulário que o time pediu para tirar, e duas formas de organizar é o que
  torna a navegação imprevisível.
- **Shadow DOM em vez de iframe.** Isola CSS no sentido chrome → produto, mas
  não dá ao produto uma janela com largura própria: media queries continuariam
  respondendo à janela do navegador, que era metade do problema.
- **Tema do chrome configurável por produto.** Reabre a pergunta que esta
  decisão fecha. O chrome é ferramenta, não identidade; a identidade do cliente
  fica inteira dentro do quadro.
