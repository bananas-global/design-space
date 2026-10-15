# 0017 — Destaque automático pela árvore do React

**Data:** 2026-10-15
**Status:** aceita
**Decidido por:** Bruno Santos
**Emenda:** a [0016](0016-destaque-de-componentes.md) — a marcação manual deixa de
ser o único caminho e passa a ser o complemento

## Contexto

A 0016 fez o destaque contornar só o que o produto marcasse com
`data-ds-component`. Na prática, isso falhou nas duas pontas:

- **Ninguém marca.** O primeiro produto a ligar o destaque depois da 0.11 não
  tinha um único componente marcado, e o botão não mostrava nada. Quem abre o
  destaque espera que o Design Space saiba o que é componente — o catálogo já
  diz isso.
- **Marcar fere a fidelidade.** Produto que reproduz o markup de um sistema real
  não pode acrescentar ao componente um atributo que o sistema real não tem: o
  HTML do Design Space deixa de ser o HTML que vai para produção.

O catálogo de um produto, na maioria dos casos, já importa os componentes de
verdade para montar os previews. A informação que faltava ao motor estava a um
campo de distância.

## Decisão

1. **Referência no catálogo.** `ComponentPreview` ganha `implementation`, com o
   componente React real que a entrada cataloga, ou uma lista deles. Aceita
   função, classe, `memo`, `forwardRef` e `lazy`.
2. **Casamento por referência.** Dentro do quadro, o motor percorre a árvore de
   fibers a partir das raízes e casa cada fiber cujo `type` ou `elementType`,
   desembrulhando `memo` e `forwardRef`, é uma referência do catálogo. Nome não
   entra, então o build minificado casa igual.
3. **Raízes pelo gancho do DevTools.** As raízes vêm de
   `__REACT_DEVTOOLS_GLOBAL_HOOK__`. O produto importa
   `@brucesantos/design-space/devtools-hook` na primeira linha do ponto de
   entrada, antes de qualquer import de React; esse entrypoint não importa
   React e instala um gancho mínimo. Com o React DevTools aberto, o gancho da
   extensão é respeitado: o callback de commit dele é chamado primeiro e o
   motor só encadeia o seu, e as raízes anteriores vêm de `getFiberRoots`.
4. **O que se contorna.** O primeiro nó de DOM que o componente renderiza, ou a
   união dos nós de topo quando ele devolve fragment; portal entra pelo nó do
   portal. Componentes aninhados com nós diferentes — um botão dentro de um
   cartão — aparecem os dois. A camada de contornos é a da 0016: no `body` do
   quadro, sem receber ponteiro, preto e branco, remedida a cada commit,
   mutação, rolagem e redimensionamento.
5. **A marcação manual continua.** `data-ds-component` segue valendo para o que
   a árvore não resolve — um trecho que não é componente React, um componente
   de terceiro que o catálogo não importa. Não há precedência que esconda uma
   fonte: o contorno é **por conjunto de nós**. Duas origens que caem nos mesmos
   nós viram um contorno só, com os nomes juntos (`Primário · Botão`), na ordem
   de fora para dentro e a marcação manual por último, sem repetir id. É o que
   evita contorno duplicado tanto para a marcação manual sobre um componente que
   a árvore já achou quanto para um wrapper que só repassa ao componente de
   dentro.
6. **Degradação.** Sem gancho registrado antes do React, ou com uma árvore cuja
   forma o motor não reconhece, o destaque fica só com a marcação manual e avisa
   **uma vez** no console, dizendo o motivo. A UI do produto nunca quebra por
   causa disso.

## Raciocínio

- **Referência em vez de nome.** Nome de função some no build minificado e
  colide entre componentes de mesmo nome. A referência é exatamente o que o
  produto já tem nas mãos quando escreve o catálogo.
- **Gancho do DevTools em vez de `__reactFiber$`.** A 0016 descartou ler a
  propriedade que o React pendura nos nós de DOM, e o motivo continua: o nome
  muda por versão e com sufixo aleatório. O gancho é a interface que o React
  mantém para ferramentas externas — o React DevTools, o react-scan e o
  LocatorJS dependem dela —, tem forma estável há várias versões maiores e
  entrega as raízes sem precisar varrer o DOM.
- **Risco aceito.** A forma do fiber (`child`, `sibling`, `type`,
  `elementType`, `stateNode`) não é contrato público. O motor aceita esse risco
  porque o destaque é ferramenta de revisão, não de produção: o pior caso é o
  destaque cair para a marcação manual com um aviso. O que o motor supõe da
  árvore está concentrado em `src/fiber/tree.ts`, e um teste contra o React
  instalado (`src/fiber/react-tree.test.tsx`) quebra quando a forma muda — a
  atualização de React no motor é onde o risco aparece, não no produto.
- **Exigência pequena e explícita no produto.** O gancho só funciona se existir
  antes do `react-dom` ser avaliado, e o motor não consegue garantir isso sozinho:
  quando o bundle dele roda, o React já carregou. Uma linha de import no ponto
  de entrada é a exigência mínima; esquecê-la produz um aviso que diz a linha.
- **Passa nos três critérios.** O mecanismo não decide aparência nem conhece
  domínio; o campo é o mesmo para qualquer produto. O destaque já estava no
  motor desde a 0016; esta decisão muda como ele descobre os componentes.

## Alternativas descartadas

- **Manter só a marcação manual (a 0016).** Ver Contexto: não é usada e, onde
  o markup precisa ser fiel ao sistema real, não pode ser.
- **`__reactFiber$` no nó de DOM.** Dispensa o import no ponto de entrada, mas
  depende de nome interno que muda entre versões, obriga a varrer o DOM para
  achar as raízes e foi descartada pelo mesmo motivo na 0016.
- **Toda função React que renderiza DOM.** Continua descartada: mistura tela,
  provider e wrapper com componente de sistema, e no build minificado os nomes
  viram letras. O catálogo é o que diz o que é componente.
- **Plugin de build que injeta o atributo.** Resolveria a fidelidade só no
  build de revisão, mas obriga o motor a ter plugin de bundler e o HTML do
  Design Space voltaria a divergir do que vai para produção.
