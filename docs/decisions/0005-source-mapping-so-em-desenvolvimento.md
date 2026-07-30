# 0005 — Source mapping só em desenvolvimento

**Data:** 2026-07-30
**Status:** aceita, revisável
**Alcance:** todos os Design Spaces

## Contexto

O `feedback-collector` entrega `arquivo:linha` para o agente de código, e isso
depende do `@react-dev-inspector/babel-plugin` no bundler. Em React 19 o fallback
pelo fiber (`_debugSource`) foi removido, então sem o plugin não existe source
mapping — só o resto do payload.

O plugin injeta os caminhos de arquivo do repositório no HTML. Como o preview é
público ([0004](0004-preview-publico-sem-autenticacao.md)), ligar o plugin no build
de preview publica a estrutura de diretórios do projeto.

Esta é uma das decisões que o documento de arquitetura deixou explicitamente
aberta.

## Decisão

O plugin fica ativo **apenas em desenvolvimento**. O build de preview sai sem
source mapping.

Para ligar em um projeto específico, defina `DESIGN_SPACE_SOURCE_MAPPING=1` nas
variáveis de ambiente daquele projeto na Vercel. O `vite.config.ts` do template já
lê essa variável.

## Raciocínio

O laço que o coletor fecha é o de **iteração**, e iteração acontece com o designer
rodando o projeto localmente com hot reload. Quem usa o preview é PO e cliente, e
para eles a ferramenta é a thread ancorada da Vercel Toolbar, que não depende de
source mapping.

Ou seja: o custo recai sobre o público que menos se beneficia. Ligar por padrão
seria pagar sempre por um ganho eventual.

## Quando revisar

Se aparecer um fluxo real de revisão em que o designer coleta feedback no preview
com frequência — revisão em conjunto pelo celular, longe da máquina de
desenvolvimento — o custo/benefício inverte e vale ligar por padrão.
