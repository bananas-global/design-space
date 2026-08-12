# D-08 — Portados ficam fora do trabalho ativo

## Contexto

`ported` registra material importado do sistema existente sem afirmar que ele foi
validado, proposto ou aprovado. Misturá-lo à home, à busca e às contagens fazia o
backlog aparente crescer com referências que ainda não representam trabalho.

## Decisão

Consultas e superfícies de trabalho ativo excluem `ported` por padrão. A opção
**Mostrar portados** inclui o material e persiste `showPorted=1` na URL.

O catálogo original não é alterado: `ProductDefinition`, `registry.tree`, o
diagnóstico e `byStatus("ported")` continuam completos. Deep links diretos abrem
o cenário e o mantêm identificável na navegação mesmo quando a opção está
desligada. `scenariosUnderTest()` continua excluindo `ported` do recorte padrão.

## Consequências

Um produto apenas com referências portadas informa que não há trabalho ativo,
sem chamar toda importação de backlog. Quem precisa auditar a importação ainda
consegue reproduzir e compartilhar o recorte completo.
