# D-08 — Portados ficam fora do trabalho ativo

## Contexto

`ported` registra material importado do sistema existente sem afirmar que ele foi
validado, proposto ou aprovado. Misturá-lo à home, à busca e às contagens fazia o
backlog aparente crescer com referências que ainda não representam trabalho.

## Decisão

Consultas e superfícies de trabalho ativo excluem `ported` por padrão. Referências
portadas formam uma coleção separada, acessada pela ação **Ver N referências
portadas** e reproduzida por `view=ported`. Busca, módulos, home e contagens nunca
misturam as duas visões. `showPorted=1` permanece apenas como compatibilidade de
leitura para links gerados pela 0.4.0.

O catálogo original não é alterado: `ProductDefinition`, `registry.tree`, o
diagnóstico e `byStatus("ported")` continuam completos. Deep links diretos para
um portado inferem a visão de referências e o mantêm identificável na navegação.
`scenariosUnderTest()` continua excluindo `ported` do recorte padrão.

## Consequências

Um produto apenas com referências portadas informa que não há trabalho ativo,
sem chamar toda importação de backlog. A entrada para a biblioteca mora nesse
estado vazio, sem ocupar permanentemente espaço de filtro. Quem precisa auditar
a importação ainda consegue reproduzir e compartilhar o recorte completo.
