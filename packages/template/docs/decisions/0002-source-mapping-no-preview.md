# 0002 — Source mapping só em desenvolvimento

**Data:** 2026-07-30
**Status:** aceita, revisável

## Contexto

O `feedback-collector` entrega `arquivo:linha` para o agente de código, e isso
depende do `@react-dev-inspector/babel-plugin` no bundler. Em React 19 o fallback
pelo fiber (`_debugSource`) foi removido, então sem o plugin não existe source
mapping — só o resto do payload.

O plugin injeta os caminhos de arquivo do repositório no HTML. Como o preview é
público e sem login (D-11), ligar o plugin no build de preview significa publicar
a estrutura de diretórios do projeto.

Esta é uma das decisões que o documento de arquitetura deixou explicitamente
aberta.

## Decisão

O plugin fica ativo **apenas em desenvolvimento**. O build de preview sai sem
source mapping.

Para ligar em um projeto específico, defina `DESIGN_SPACE_SOURCE_MAPPING=1` nas
variáveis de ambiente daquele projeto na Vercel. O `vite.config.ts` já lê essa
variável.

## Raciocínio

O laço que o coletor fecha é o de **iteração**, e iteração acontece com o
designer rodando o projeto localmente com hot reload. Quem usa o preview é PO e
cliente, e para eles a ferramenta certa é a thread ancorada da Vercel Toolbar,
que já não depende de source mapping.

Ou seja: o custo (expor estrutura de projeto) recai sobre o público que menos se
beneficia. Ligar por padrão seria pagar sempre por um ganho eventual.

## Consequências

- Caminho de arquivo do repositório não vai para o HTML público.
- Um designer que quiser coletar backlog **direto no preview compartilhado**
  precisa ligar a variável naquele projeto, conscientemente.
- Não é vazamento de dado de cliente em nenhum dos dois casos — é exposição de
  estrutura. A decisão é sobre superfície, não sobre confidencialidade de dados.

## Quando revisar

Se aparecer um fluxo real de revisão em que o designer coleta feedback no preview
com frequência — por exemplo, revisão em conjunto pelo celular, longe da máquina
de desenvolvimento — o custo/benefício inverte e vale ligar por padrão.
