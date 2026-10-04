# 0015 — A query da tela é da tela

**Data:** 2026-10-04
**Status:** aceita
**Decidido por:** Bruno Santos
**Substitui:** o item 2 da [0014](0014-query-da-tela.md)

## Contexto

A 0014 preservou a query da tela nas mudanças de controle (0.9.3) e deixou como
proposta o escopo dela por tela, a implementar quando um segundo produto
precisasse. Um segundo produto precisou, por outro caminho:

- As abas dele guardam a aba aberta na query, como `?<chave>=<id>|<aba>`,
  lendo-a ao montar e reescrevendo-a com `history.replaceState` a cada clique.
  O motor não via essa escrita: o endereço que ele conhecia era o da última
  mudança feita por ele. A próxima troca de controle reconstruía a URL a partir
  desse endereço, e a aba sumia — o mesmo sintoma que a 0.9.3 tinha corrigido
  para quem escrevia por `context.navigate`. O produto contornou guardando a
  última aba lida e devolvendo-a à URL depois de cada mudança de controle.
- A chave da aba é por componente, não por tela, e a mesma chave aparece em
  telas diferentes. Levada para outra tela, ela abre a aba errada ou é ignorada.

Os dois produtos querem a mesma coisa: estado que a tela guarda na URL vale
enquanto a tela é a mesma.

## Decisão

1. **O quadro adota a query que a tela escreve pela History API.** No modo
   quadro, o motor observa `history.replaceState` e `history.pushState`. Quando
   a escrita mantém o caminho, o motor guarda a query da tela que foi escrita,
   mantém os próprios parâmetros (restaurando-os se a escrita os mudou) e avisa
   o chrome como numa navegação feita pela tela. `pushState` vira `replaceState`
   no quadro e entrada no histórico do chrome: o histórico é do pai
   ([0012](0012-chrome-unico-telas-como-rotas-e-iframe.md)). Escrita que troca
   o caminho continua fora do motor.

2. **A query da tela é escopada pela tela, sem declaração.** Todo parâmetro que
   o motor não lê é da tela. Numa navegação para a mesma tela (mesma rota ou,
   sem rota, mesmo caminho), ela segue como o contexto do motor: sem query,
   inteira; com query própria, o destino manda na mesma chave. Numa navegação
   para outra tela, sai, como os `c.*`, e só entra a que o destino traz.

## Por que sem declaração

A 0014 propôs `route.query: ["busca", "pagina"]`, opt-in, para não mudar o
padrão sem caso. Agora há dois produtos, e nenhum guarda parâmetro global da
própria UI na query: o que atravessa telas já é do motor (persona, rede,
viewport, tema, idioma, fonte, handoff, chrome). A declaração obrigaria cada
tela a listar chaves que ela já escreve, e a chave por componente do segundo
produto nem é conhecida pela rota. A regra implícita resolve os dois casos sem
contrato novo.

O custo é a mudança de padrão, por isso a versão é minor (0.10.0). Se um produto
precisar de parâmetro global próprio, o caminho é uma lista em
`ProductDefinition` (como `contextParams`), discutida quando o caso aparecer.

## Consequências

- O contorno do primeiro produto para o vazamento (`aba=` vazio) e o do segundo
  para a aba apagada podem sair.
- A URL do chrome passa a refletir a aba aberta: "Copiar link" e recarregar
  mantêm a aba.
- O motor passa a envolver `history.replaceState` e `history.pushState` dentro
  do quadro. Fora do quadro — no chrome — nada muda.

## Alternativas descartadas

- **Ler `window.location` só no momento da mudança de controle.** Corrige o
  `setControl` de dentro do quadro, mas não a mudança feita pelo painel, que
  parte do endereço do chrome, nem o link copiado.
- **`route.query` declarado**, a proposta da 0014. Ver acima.
