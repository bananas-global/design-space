# D-09 — Fixtures de componente têm escopo local

## Contexto

Um preview isolado precisa mostrar dados determinísticos em estados como vazio,
carregando, erro e conteúdo longo. Reusar a fixture ou o `ScenarioContext` de um
cenário inventaria persona, permissões, regras e intenção onde existe apenas um
componente.

## Decisão

Cada `ComponentPreview<T>` pode declarar `fixtures` próprias e uma
`defaultFixture`. O preview recebe `ComponentPreviewProps<T>` com fixture
resolvida, dados, viewport, tema, idioma e preferências de acessibilidade.

Fixtures de cenário e de componente não se misturam automaticamente. O mesmo
parâmetro `fixture` é contextual ao item ativo na URL. Estado interativo efêmero
continua local ao preview; fixtures nomeadas bastam, sem uma abstração separada
de variants.

## Consequências

O seletor de dados só aparece para componentes que declaram fixtures. Previews
sem props continuam compatíveis. Ids duplicados ou inválidos e defaults ausentes
são erros de validação; ids desconhecidos no deep link usam fallback explícito e
permanecem visíveis no painel para não mascarar links quebrados.
