# Changelog

Versionamento semântico. **Patch** para correção sem mudança de contrato,
**minor** para funcionalidade compatível, **major** para mudança incompatível.

Mudança estrutural — pasta obrigatória nova, schema de cenário alterado — exige
comando explícito e revisável, nunca merge silencioso.

## 0.9.2 (2026-09-29)

**Patch.** Só o chrome muda; nenhum contrato, tipo ou export novo. Motivo: o
time achava o painel Variações complexo demais para usar.

### Alterado

- **Painel Variações em cartões.** Contexto primeiro, depois um cartão por
  `ControlGroup` e, no fim, os Atalhos (só quando a tela tem cenários). O título
  do cartão ocupa uma linha; grupo com `component` ganha um botão ícone ↗
  ("Abrir X no catálogo") no lugar do link textual.
- **Só selects.** Todo controle é um `<select>`, com o rótulo oculto
  visualmente (continua acessível e alcançado pelo filtro) e a `description` na
  dica. Acabaram os botões segmentados. `isSegmentedControl` continua exportada
  só por compatibilidade e não é mais usada pelo painel.
- **Sem acordeão, sem contagem, sem nota visível.** Os blocos não recolhem mais,
  o cabeçalho não mostra quantos controles há, e a `note` do grupo fica só no
  `title` do cabeçalho.
- **Variações de componente** viram um cartão com o nome do componente e um
  select das fixtures, no lugar da lista.
- Tela sem controles e sem cenários não mostra mais o item "Padrão" em Atalhos.

## 0.9.1 (2026-09-29)

**Patch/minor compatível.** Três limitações que um produto real encontrou na
0.9.0, mais a persona padrão do produto. Nada muda para quem não usa o que é
novo; `navigate(to)` sem query nem opções se comporta como antes.

### Corrigido

- **`context.navigate` com query própria não perde mais o contexto.** Antes, a
  query do destino substituía a atual inteira, e persona, rede, viewport, tema,
  idioma, fonte de dados e handoff precisavam ser remontados à mão. Agora os
  parâmetros de contexto do motor — tudo que não é `scenario`, `fixture`,
  `component` nem `c.*` — seguem, a menos que o destino traga o mesmo parâmetro.
  Os `c.*` da tela anterior continuam descartados. A persona que vinha do cenário
  deixado para trás vira `persona=` explícito (salvo quando é a persona padrão);
  a rede e a fixture do cenário ficam com ele. Vale também para navegação que
  nasce dentro do quadro e para link comum com query no quadro.
- **`setControl` chamado várias vezes no mesmo ciclo acumula.** Antes, cada
  chamada partia do valor da última renderização, e só a última sobrevivia. Agora
  cada chamada parte do endereço mais recente (atualização funcional), dentro e
  fora do quadro; chamada sem mudança efetiva não toca no histórico nem avisa o
  pai. `DesignSpaceState.setControls` também parte do endereço mais recente.
- **Tela com parâmetro aberta sem cenário** não precisa mais ir para o caminho
  literal (`/x/:id`): ver `RouteDefinition.params` abaixo. Sem `params`, o
  comportamento é o de antes, agora com aviso de validação.

### Adicionado

- **`navigate(to, options?)`** em `ScenarioContext` e `DesignSpaceState`, com
  `NavigateOptions` (tipo exportado): `controls` (id → value) vira `c.*` do
  destino, sem os valores iguais ao padrão da tela de destino (ou ao que o
  cenário de destino fixa); `replace` substitui a entrada do histórico. Passar
  `controls` já faz a navegação ser explícita, como uma query própria.
- **`ScenarioContext.setControls(patch)`** — vários controles numa única
  atualização de URL e uma só mensagem ao pai. **Obrigatório** no tipo: o motor é
  quem monta o contexto e sempre o entrega. Só quebra typecheck de quem monta um
  `ScenarioContext` à mão (um mock de teste, por exemplo): acrescente
  `setControls: () => {}`.
- **`DesignSpaceState.setScreenControls(patch)`** — o mesmo, para quem usa
  `useDesignSpaceState` diretamente.
- **`RouteDefinition.params`** — valores de exemplo dos parâmetros do `path` (e
  de `*`). Usados sempre que o motor abre a tela sem cenário: lateral, variação
  padrão, "Usado em" em Informações (que agora abre também tela sem
  variação) e "Copiar para o PR". `ScreenNode.href` passa a trazer o caminho com
  os exemplos, codificados.
- **`ProductDefinition.defaultPersona`** — persona efetiva de toda tela e todo
  cenário sem persona própria: `context.persona`, `context.permissions` e
  `context.can` refletem ela, também no quadro. O seletor do painel deixa de
  oferecer "—" e mostra o padrão; `persona=` só vai para a URL quando difere do
  padrão efetivo. Persona do cenário e a escolhida no painel continuam vencendo.
  `Registry.defaultPersona`; `permissionsOf` usa a persona padrão para cenário
  sem persona. Sem `defaultPersona`, nada muda.
- **Validação:** rota com `:param` sem exemplo e sem cenário que a cubra
  (aviso); `params` com nome que a rota não tem, vazio, ou que monta caminho de
  outra rota (aviso); `params` que não é objeto (erro); `defaultPersona` que não
  é persona registrada (erro).

## 0.9.0 (2026-09-29)

**Minor (compatível).** Fluxos agrupam telas, e as variações de uma tela passam a
ser controles por componente que se combinam. Tudo é opcional: um produto da 0.8
continua funcionando sem mudar nada. Ver
`docs/decisions/0013-fluxos-e-controles-por-componente.md`.

### Adicionado

- **Tipos:** `ControlOption`, `Control` e `ControlGroup`.
- **`RouteDefinition`:** `group` (o fluxo da tela), `controls` (grupos de
  controles por componente), `expected` (comportamento esperado da tela sem
  cenário ativo) e `components` (ids do catálogo usados pela tela).
- **`Scenario.controls`:** a combinação que o cenário fixa. Abrir o cenário
  aplica esses valores sobre os padrões da tela.
- **`ScenarioContext.controls`** (valor de cada controle, com os padrões
  aplicados) e **`ScenarioContext.setControl(id, value)`**, que funciona dentro
  do quadro: troca o endereço do quadro e avisa o chrome, que adota a URL.
- **URL:** `c.<id>=<value>` para cada controle fora do padrão (ou do que o
  cenário fixa). Valor inválido cai no padrão e aparece como aviso no
  diagnóstico; controle que a tela não tem também. Os `c.*` chegam ao quadro, e
  mudar um controle atualiza o quadro por mensagem, sem recarregar. Ao navegar
  para outra tela, os `c.*` da anterior ficam para trás.
  `ControlsState.screenControls`, `CONTROL_PARAM_PREFIX`; `applyOverrides` (e
  portanto `pathFor`/`scenarioUrl` com `overrides`) aceita `screenControls`.
- **Registry:** `flows()`, `flowOf(screen)`, `controlsOf(screen)`,
  `resolveControls(screen, { scenario, requested })`; `ScreenNode.group` e
  `ScreenNode.controls`. Tipos `FlowNode`, `ControlResolution`,
  `InvalidControl`. `searchScreens` casa também o nome do fluxo.
- **Aba Telas** agrupada por fluxo, com seções recolhíveis e contagem; tela sem
  `group` fica no topo, sem título.
- **Painel Variações** em três partes: **contexto** no topo (persona, rede, e
  tema, idioma e fonte de dados quando declarados), **um bloco por grupo de
  controles** (título, link para o componente do catálogo, `note`, e cada
  controle como botões segmentados ou select) e **atalhos** (os cenários da tela,
  compactos, com a intenção na dica). O filtro alcança grupos, controles e
  opções.
- **Informações:** fluxo, controles com o valor atual, comportamento esperado do
  cenário ativo ou da rota, e componentes de `route.components` mais os do
  cenário.
- **Copiar para o PR por fluxo:** numa tela com `group`, o markdown traz o fluxo
  inteiro — para cada tela, nome, rota, link absoluto (com os controles atuais na
  tela aberta), controles disponíveis, atalhos, comportamento esperado e a tabela
  componente → origem.
- **Validação:** ids de grupo e de controle únicos por tela, id de controle sem
  espaço, opções não vazias e sem duplicata, `default` entre as opções e
  `Scenario.controls` usando controles e valores da tela do cenário (erros);
  `route.components` e `group.component` inexistentes (avisos).
- **Rótulos** novos, em pt-BR e en-US: `panel.context`, `panel.shortcuts`,
  `panel.toggleGroup`, `panel.openComponent`, `info.flow`, `info.controls`,
  `diagnostics.invalidControl`, `diagnostics.unknownControl`, `pr.open`,
  `pr.controls`, `pr.shortcuts`, `pr.defaultOption`.

### Alterado

- **Tela sem cenário respeita o estado de rede.** Antes, sem cenário, `network`
  não tinha efeito; agora `loading`, `slow`, `empty` e `error` chegam à tela
  (`isLoading`, `data: null`, `error`), como com cenário. `useScenarioData`
  aceita `screen` para nomear o erro simulado.
- A lista de cenários do painel virou **Atalhos**, depois dos controles, em uma
  linha cada; a intenção foi para a dica (`title`) do item.
- `parseControls(search, registry, path?)` e `serializeControls(state, registry,
  path?)` aceitam o caminho aberto, para resolver os controles pela tela dele.
  Sem ele, vale a tela do cenário, como antes.
- `componentsOfScreen(screen, scenario?)` inclui `route.components`, e aceita um
  cenário para restringir aos componentes dele; `usagesOf` considera
  `route.components`.

### Guia de uso

1. Dê um `group` às rotas de um mesmo fluxo:
   `{ path: "/orders", screen: OrderList, name: "Lista de pedidos", group: "Pedidos" }`.
2. Declare os controles da tela por componente, em `controls`: um `ControlGroup`
   por componente (`id`, `title`, `component` opcional, `note` opcional) com os
   `Control`s dele (`id`, `label`, `options`, `default` opcional).
3. Na tela, leia `context.controls` e monte os dados sintéticos a partir deles.
   Quando a UI do produto precisa mudar um controle (fechar um modal), chame
   `context.setControl(id, value)`.
4. Troque os cenários que eram só combinações por atalhos: `controls: { … }` no
   cenário. Mantenha cenário para o que tem persona, fixture, regra ou
   comportamento esperado próprios.
5. Mova para `route.expected` e `route.components` o que vale para a tela
   inteira, e rode a validação: ela aponta controle inexistente, valor fora das
   opções e `default` inválido.
6. Nos testes, um link com controles sai de
   `pathFor(scenario, { screenControls: { rows: "none" } })`.

## 0.8.0 (2026-09-28)

**Major (incompatível).** Chrome novo, modelo de organização novo e a UI do
produto dentro de um `<iframe>`. Ver
`docs/decisions/0012-chrome-unico-telas-como-rotas-e-iframe.md`.

> **Primeira publicação depois da 0.6.0.** A 0.7.0 nunca foi publicada no npm:
> quem está em `^0.6.0` recebe as mudanças da 0.7.0 (acima, na seção dela) e as
> desta versão de uma vez. Leia os dois guias de migração, na ordem 0.7 → 0.8.

### Removido

- **Módulos e jornadas:** `Module`, `Flow`, `FlowStep`, `ProductDefinition.modules`,
  `ModuleNode`, `Registry.tree`, `Registry.orphans`, `Registry.treeFor`,
  `Registry.orphansFor`, `Registry.module` e `Registry.flow`. A validação não
  exige mais prefixo de módulo no id nem avisa quando falta; passos e
  ramificações de jornada deixam de ser validados.
- **Home e palco inline:** `Home`, `HomeProps`, `Stage`, `StageProps`. A raiz
  abre o primeiro item. `StageEmpty` continua exportado.
- **Rótulos:** os grupos `controls`, `inspector` e `home` e as chaves de fluxo e
  de módulo em `sidebar` e `topbar` (`flowsTab`, `withoutModule`, `homeTitle`,
  `toggleNav`, `panel`, `cleanReviewTitle`, `copyPrompt` de cenário…). Override
  em `theme.labels` que declare esses grupos passa a ser erro de tipo.
- `buildHomeUrl`, `buildCleanReviewUrl`, `nextItemId` (eram exports internos do
  shell, usados só em teste).

### Adicionado

- **Telas e variações.** Uma tela é uma rota; as variações são os cenários cuja
  `route` casa com o `path` (mesmo casamento e especificidade do roteador). Rota
  sem cenário é tela com variação implícita "Padrão". `RouteDefinition.name` e
  `RouteDefinition.description`. Nome da tela: `name` ?? título do primeiro
  cenário ?? `path`.
- **Registry:** `screens`, `screen`, `screenForPath`, `screenOf`, `screensFor`
  (com handoff), `searchScreens`, `searchComponents` (nome, descrição, grupo, id
  e `source`, sem acento nem caixa), `componentsOfScreen`, `usagesOf`. Tipo
  `ScreenNode`. `normalizeSearch` exportado.
- **`Scenario.components`**: ids de `ComponentPreview` usados na tela. Alimenta
  "Componentes usados", o "Usado em" do componente e o "Copiar para o PR". Id
  não registrado gera aviso.
- **`ComponentPreview.source`**: origem no sistema real, texto livre.
- **Chrome novo, preto e branco**, claro e escuro, sem cor de cliente e sem
  logo. Seleção por tom (a cor do texto a 10%), grupos e abas em cápsula,
  controles de 36px.
  - Barra superior em três partes: o nome do produto e a versão do motor, com
    link para o pacote; no centro, viewport (Celular 375, Tablet 768, Desktop
    1280, Ajustar), girar (só celular e tablet), zoom de 25% a 150% e revisão
    limpa (`Shift` + `C`); à direita, copiar link, tema e o indicador de
    diagnóstico. Em 100%, um viewport mais largo que a área encolhe até caber.
  - Lateral esquerda: busca (`Cmd`/`Ctrl` + `K`) e as abas **Telas |
    Componentes**, sempre visíveis; componentes agrupados por `group`, com
    grupos recolhíveis.
  - Lateral direita, sempre aberta com o chrome: filtro (`Cmd`/`Ctrl` + `F`)
    e as abas **Variações | Informações**, com o botão **Copiar para o PR**.
  - As duas laterais são redimensionáveis, e a largura é lembrada no navegador.
- **Quadro (`<iframe>`)**: a UI do produto roda na mesma origem e no mesmo
  bundle, com `ds-frame=1`. A largura do viewport é a largura real da janela do
  produto. Protocolo por `postMessage` validando origem e janela nos dois lados.
  Exports `FRAME_PARAM` e `FRAME_ATTRIBUTE`; em `/testing`, `FRAME_SELECTOR`.
- **Estado na URL:** `zoom`, `rotate`, `tab` (aba do painel). `appearance` aceita
  `dark` e `light`; sem ele, o tema segue a última escolha e, na falta dela, o
  sistema. `ControlsState` ganha `zoom`, `rotated` e `panelTab`; tipo
  `PanelTab`. `ZOOM_MIN`, `ZOOM_MAX`, `ZOOM_DEFAULT` e `clampZoom`.
- `useDesignSpaceState(registry, { frame })`; o retorno ganha `openScreen` e
  `go`, e `openComponent` aceita `{ replace }`.
- **Validação de rotas:** `path` duplicado, `path` sem `/` inicial e `screen`
  ausente são erro; `modules` ainda declarado vira aviso.

### Alterado

- **`VIEWPORTS`**: `mobile` 375×812, `tablet` 768×1024, `desktop` 1280×800.
  `custom` continua, só por URL (`viewport=custom&w=…`).
- **`ControlsState.chromeTheme`** fica `undefined` quando a URL não informa, em
  vez de `dark`.
- **`scenariosForRoute`** devolve as variações da tela que renderiza o endereço,
  pelo casamento de rota, e não mais cenários com o mesmo texto de caminho.
- **`validateScenario`**: id é minúsculo, kebab-case com pontos opcionais; não
  precisa de prefixo.
- **`ProductDefinition.tagline`** continua no tipo, mas o chrome não o exibe.
- **CSS:** todos os seletores começam em `.ds-`; `.ds-root` agora define fundo,
  fonte e cor e cobre a janela, porque o palco não é mais descendente dele. Os
  tokens `--ds-*` foram todos renomeados para a paleta preto e branco.

### Migração

1. **Remova `modules`** da `ProductDefinition` (e os `flows` dentro dele). O
   TypeScript aponta onde; se sobrar em JavaScript, o diagnóstico avisa.
2. **Dê `name` às rotas** — é o nome da tela na lista. Opcionalmente, uma
   `description`. Sem `name`, a tela usa o título do primeiro cenário da rota.
3. **Ids de cenário continuam válidos.** O prefixo de módulo deixa de ter
   significado, mas não precisa mudar: links antigos continuam abrindo.
4. **Opcional:** liste em `components` de cada cenário os ids de componente que
   a tela usa, e preencha `source` em cada `ComponentPreview`. É o que alimenta
   "Componentes usados" e o "Copiar para o PR".
5. **Troque container queries por media queries** onde elas existiam só porque
   o palco não era uma janela. Dentro do quadro, `md:`/`lg:` respondem à largura
   do viewport escolhido.
6. **Testes de ponta a ponta:** a UI do produto está num iframe. Use
   `page.frameLocator(FRAME_SELECTOR)` (de `@brucesantos/design-space/testing`)
   para a UI e `page` para o chrome. Links do produto dentro do quadro navegam
   sem recarregar e atualizam a URL do chrome.
7. **Rótulos:** se `theme.labels` sobrescrevia `controls`, `inspector` ou `home`,
   mova para `panel`, `info`, `diagnostics` e `shell`; o TypeScript aponta cada
   chave. `EN_US_LABELS` já traz o dicionário novo completo.
8. **CSS global do produto:** nada a fazer. O chrome define os próprios estilos
   e ignora preflight e `body { … }` do produto. Se o produto dependia de algo
   do chrome herdado no palco, isso acabou — o que é o objetivo.
9. Links antigos com `module`, `flow`, `view`, `showPorted` ou parâmetros de
   acessibilidade abrem sem erro: os parâmetros são ignorados.

## 0.7.0 (2026-09-28) — não publicada

**Major (incompatível).** O motor deixa de impor acessibilidade e ciclo de vida
de cenário. Todo cenário registrado é simplesmente exibido. Ver
`docs/decisions/0011-revoga-a11y-e-ciclo-de-vida.md`.

### Removido

- **Ciclo de vida do cenário:** `Scenario.status`, `Scenario.approvedAt`,
  `ScenarioStatus`, `SCENARIO_STATUSES`, `ScenarioView`, `ControlsState.view` e
  `showPorted`, a visão de referências portadas, a legenda e as contagens por
  status na Home, na navegação e no Diagnóstico, os marcadores de status e os
  parâmetros de URL `view` e `showPorted`. `Registry.byStatus` e
  `Registry.coverage` saíram; `ScenarioQueryOptions` agora só tem `handoff`.
  `useDesignSpaceState` não devolve mais `setScenarioView`. `Home` e `Sidebar`
  perderam `view`, `onViewChange` e `showPorted`; `buildHomeUrl` perdeu o
  parâmetro de visão.
- **Acessibilidade:** `Scenario.a11y`, `A11yContract`, `KeyboardCoverage`,
  `ContrastTarget`, `ContrastPair`, `ProductTheme.contrastPairs`,
  `ScenarioContext.a11y`, `ComponentPreviewProps.a11y`, todo `src/a11y/`
  (`contrastRatio`, `checkContrastPair(s)`, `assertContrastPairs`,
  `CONTRAST_THRESHOLDS`, `parseColor`, `flatten`, `relativeLuminance`,
  `readCssVariable`, `computeRole`, `describeElement`, `shortSelector`,
  `tabbableElements`, `useKeyboardMode` e tipos), `TabOrderOverlay`, o modo
  teclado (atalho `Shift` + `K`), redução de movimento e ampliação de texto
  (`TEXT_SCALES`, `keyboardMode`, `reducedMotion`, `textScale` e os parâmetros
  `kb`, `motion`, `scale`), a aba Acessibilidade do Inspector.
  `StageProps` ficou só com `viewport` e `children`.
- **Rótulos:** grupos `status`, `statusMeaning` e `keyboard`; exports
  `STATUS_LABELS`, `STATUS_MEANING` e `KEYBOARD_LABELS`; as chaves de
  referências portadas, aprovação, contraste e modo teclado em `sidebar`,
  `controls`, `inspector` e `home`. Override em `theme.labels` que declare esses
  grupos passa a ser erro de tipo.
- **`/testing`:** `scenariosUnderTest`, `keyboardScenarios` e a reexportação das
  funções de contraste. Continuam `testOrigin`, `urlFor`, `pathFor`,
  `scenarioUrl`, `assertValidProduct`, `validateProduct`, `hasErrors` e
  `formatIssues`.

### Alterado

- **`persona` é opcional em `Scenario`.** Cenário sem persona tem permissões
  vazias, a menos que declare `permissions`. A validação só reclama de persona
  inexistente quando ela é informada, e `scenarioUrl()` omite `persona` da URL
  quando o cenário não declara uma.
- **Produto só de componentes é válido.** `routes` vazio só é erro quando há
  cenários. Sem cenários e com `components`, a Home abre no catálogo de
  componentes agrupado por `group`, e a navegação abre direto na lista de
  componentes, sem aba de fluxos vazia.
- A Home sem cenário nem componente mostra um único estado vazio
  (`home.noScenarios`); a navegação usa `sidebar.emptyScenarios`. Novo rótulo
  `home.componentsLead`.

### Migração

1. Apague `a11y`, `status` e `approvedAt` de todos os cenários e
   `theme.contrastPairs` da definição do produto.
2. `persona` agora é opcional: mantenha onde ela decide permissões, remova onde
   não acrescenta nada.
3. Remova de `theme.labels` os grupos `status`, `statusMeaning` e `keyboard` e as
   chaves listadas acima; o TypeScript aponta cada uma.
4. Se os testes do produto usavam `scenariosUnderTest`, `keyboardScenarios` ou
   as funções de contraste de `/testing`, troque por `product.scenarios` (ou um
   filtro do próprio produto) e apague os testes de contraste e axe que
   dependiam delas.
5. Links antigos com `view=ported`, `showPorted=1`, `kb=1`, `motion=1` ou
   `scale=…` continuam abrindo: os parâmetros são ignorados.

## 0.6.0 (2026-08-13)

### Adicionado

- **Escopo explícito de handoff por URL.** `HandoffScope` traz allowlists neutras
  de cenários, padrões de rota e componentes. O formato legível usa `handoff=1`
  com parâmetros repetíveis `allowScenario`, `allowRoute` e `allowComponent`.
- Home, árvore, busca, flows, referências portadas e catálogo de componentes
  respeitam o recorte. Navegação interna e links de Home/revisão limpa o
  preservam; tentativas fora do escopo recebem mensagem clara sem montar a tela
  solicitada.
- Helpers públicos `applyHandoffScope`, `parseHandoffScope`,
  `normalizeHandoffScope`, `handoffAllowsScenario`, `handoffAllowsPath` e
  `handoffAllowsComponent` permitem construir e verificar o mesmo contrato fora
  do shell. `scenarioUrl()` e `componentUrl()` aceitam o recorte em
  `overrides.handoff`.

### Alterado

- O Inspector agrupa visual e semanticamente dados da tarefa e contexto herdado
  do produto/persona. A aba Acessibilidade distingue contrato da tarefa,
  inspeção ao vivo da tela e verificações gerais do produto; Diagnóstico declara
  que continua avaliando o catálogo inteiro.
- Cenário `approved` sem `approvedAt` aparece como **Aprovado — registro
  pendente**, com alerta no painel e warning equivalente no validador. O status
  e o marcador só recebem tratamento completo de aprovação quando existe uma URL
  de commit registrada.

O handoff é bloqueio de foco/UX, não controle de acesso. Preview que exige
isolamento real precisa de build separado ou autenticação/autorização no produto.
Não há mudança obrigatória no schema de `Scenario` nem nos catálogos existentes.

## 0.5.1 (2026-08-12)

### Adicionado

- A home agora traz uma legenda dos sete status com o mesmo marcador colorido da
  navegação, o rótulo e o significado completo. A informação permanece textual
  e compreensível sem depender apenas de cor, responde em duas ou uma coluna e
  continua sobrescrevível por `theme.labels`.

## 0.5.0 (2026-08-12)

### Adicionado

- Visões separadas **Trabalho ativo** e **Referências portadas**. A segunda é
  reproduzível com `view=ported`, mostra somente cenários `ported` e oferece
  retorno textual ao trabalho ativo.
- `ScenarioView` e `ControlsState.view` modelam a coleção atual. As consultas do
  registry aceitam `{ view: "ported" }`; `{ includePorted: true }` continua
  representando o catálogo completo para diagnóstico.
- Estados vazios únicos oferecem “Ver N referências portadas” no próprio
  contexto. Quando existe trabalho ativo, a mesma entrada fica discreta na
  navegação e na home.

### Alterado

- Módulos sem cenários na visão ou busca atual deixam de ser renderizados. Não há
  mais contador zero, chevron ou mensagem vazia por módulo.
- Home, busca, jornadas, árvore e contagens operam somente sobre a visão atual.
  O diagnóstico continua avaliando todo o catálogo.
- O checkbox aditivo “Mostrar portados” foi removido. A troca de visão usa botão
  textual semântico, com foco visível e nome da visão anunciado na região.
- Deep links diretos para portados inferem a visão de referências. Links antigos
  com `showPorted=1` continuam aceitos na leitura e passam a ser serializados como
  `view=ported`.

Migração: nenhuma obrigatória. Produtos que montam links ou controles próprios
com `showPorted` podem migrar para `view: "ported"`; links existentes continuam
funcionando. Nenhuma mudança é necessária no catálogo de cenários.

## 0.4.0 (2026-08-12)

### Adicionado

- **Fixtures próprias para previews de componentes.** `ComponentPreview<T>` aceita
  `fixtures` e `defaultFixture`; cada `ComponentPreviewFixture<T>` tem id estável,
  rótulo, descrição opcional e dados sintéticos como valor ou factory determinística.
- `ComponentPreviewProps<T>` entrega fixture resolvida, dados, viewport, tema,
  idioma e preferências de acessibilidade ao preview. Previews 0.3.0 sem props e
  componentes sem fixtures continuam válidos.
- O deep link de componente passa a incluir sua fixture:
  `?component=actions.button&fixture=disabled`. `componentUrl()` monta esse link.
- O validador detecta ids inválidos ou duplicados dentro do componente e
  `defaultFixture` inexistente. Uma fixture desconhecida na URL cai explicitamente
  no default (ou na primeira) e mostra o fallback no painel.
- Opção discreta **Mostrar portados**, reproduzível como `showPorted=1`.

### Alterado

- Cenários `ported` deixam de aparecer por padrão na home, árvore de Fluxos,
  busca, jornadas e contagens de trabalho ativo. Continuam em
  `ProductDefinition`, `registry.tree`, `registry.issues`, `byStatus()`, diagnóstico,
  deep links diretos e continuam fora de `scenariosUnderTest()`.
- `Registry.search()`, `coverage()` e `scenariosForRoute()` agora consultam trabalho
  ativo por padrão; `{ includePorted: true }` restaura o catálogo completo.
  `activeScenarios()`, `treeFor()` e `orphansFor()` tornam o recorte explícito.
- Um produto contendo somente portados mostra que não há trabalho ativo. Um
  portado aberto por deep link continua visível como item ativo na navegação,
  mesmo com a opção desligada.
- O painel de componente passa a mostrar nome, grupo, id, fixture ativa e as
  descrições do componente e da fixture.

Migração: nenhuma obrigatória para consumidores 0.3.0. Para adotar dados por
componente, tipar o preview com `ComponentPreviewProps<T>` e declarar `fixtures`.
Fixtures globais de cenário não são usadas automaticamente por componentes.

## 0.3.0

### Adicionado

- **Estado de ciclo de vida `ported` (`Portado — não validado`).** Identifica um
  cenário trazido do sistema existente que ainda não foi validado e não representa
  proposta, aprovação ou compromisso de implementação. É uma adição compatível:
  os seis estados anteriores preservam valor, rótulo e comportamento.
- `ported` passa a fazer parte de `ScenarioStatus` e `SCENARIO_STATUSES`, da
  validação em runtime, de `Registry.byStatus()` e da cobertura por status. O mapa,
  a navegação e o diagnóstico mostram o estado com rótulo, significado, chip
  neutro e indicador visual próprio.
- `scenariosUnderTest()` não inclui cenários portados no recorte padrão. Um produto
  ainda pode testá-los explicitamente com `scenariosUnderTest(product, ["ported"])`,
  sem transformar a importação em compromisso de manutenção de jornada E2E.
- **Catálogo opcional de componentes.** `ProductDefinition.components` recebe
  referências visuais implementadas pelo produto (`id`, nome, grupo, descrição e
  componente React). O motor organiza a aba, busca, deep link `?component=…` e
  painel de contexto sem incorporar UI, tokens ou domínio do produto.
- **Navegação por teclado na lateral.** `Command/Ctrl + K` e `Command/Ctrl + F`
  focam a busca; setas percorrem os resultados filtrados.
- **Light mode do chrome.** A topbar alterna entre `dark` e `light`, e o estado
  fica no deep link como `?appearance=light`. Os tokens claros preservam contraste
  WCAG AA e não alcançam a UI do produto no palco.
- **Dicionário `EN_US_LABELS`.** Tradução integral do vocabulário do motor —
  navegação, controles, status, significados, diagnóstico, acessibilidade e
  estados vazios — pronta para uso em `theme.labels`.

### Alterado

- O botão que ocultava a lateral foi removido; a navegação permanece como parte
  estrutural da mesa de revisão e se reorganiza acima do palco em telas estreitas.
- “Revisão limpa” abre uma nova aba com `chrome=0`, preservando a mesa de revisão
  original. O controle invisível de retorno continua disponível em deep links
  recebidos diretamente nesse modo.
- O seletor global de fixtures saiu da barra inferior. Dados, persona e rede do
  cenário ativo aparecem juntos como escopo na lateral; overrides explícitos por
  URL continuam compatíveis.
- A seção temporária de controles de acessibilidade saiu da barra inferior. O
  contrato obrigatório, o painel de inspeção e os parâmetros de URL continuam
  disponíveis.
- Presets de viewport usam ícones derivados do [Lucide](https://lucide.dev/), sob
  licença MIT, incorporados como SVG para não adicionar dependência de runtime.
- O inspetor ganhou largura, espaçamento e cartões para separar situação,
  reprodução, permissões, ações e critérios.

Migração: nenhuma para produtos que usam os seis estados anteriores. Ao trazer
cenários de um sistema existente sem validação, declare `status: "ported"` e só os
promova para outro estado quando houver a decisão correspondente.

## 0.2.0

Hospedagem deixa de ser suposição do motor. Um Design Space que roda só na
máquina de quem desenha passa a ser caso suportado e documentado, não um caso
degradado de um modelo que pressupõe um fornecedor.

### Alterado (incompatível)

- **`commitUrl` recebe um template de URL em vez de projeto e escopo.** O formato
  do endereço é de quem hospeda, não do motor.

  ```ts
  // 0.1.x
  commitUrl(scenario, { project: "acme", scope: "time" });

  // 0.2.0
  commitUrl(scenario, { template: "https://acme-{shortCommit}-time.example.app" });
  commitUrl(scenario, { template: "https://{commit}.review.acme.dev" });
  ```

  `{commit}` e `{shortCommit}` são substituídos. Sem commit a função continua
  devolvendo `undefined`, porque aprovação sem commit não é rastreável.

  Migração: nenhum produto usava a função. Se o seu usa, monte o template com o
  endereço que o seu host produz.

- **`getDeployContext` não lê mais variável de ambiente.** O contexto vem só de
  `ProductDefinition.deploy`. A leitura anterior de `import.meta.env` e
  `process.env` era inócua em produto real — o motor é biblioteca compilada, o
  `import.meta.env` dele foi resolvido no build do pacote (ver 0.1.1) — então na
  prática nada muda para quem já informava o campo `deploy`. Quem dependia da
  detecção automática nunca teve detecção.

  Campo vazio agora é tratado como ausente: `branch: ""`, que é o que um `define`
  de bundler produz quando a variável não existe, deixa de virar um rótulo vazio
  no cabeçalho da revisão.

### Adicionado

- **`theme.labels`: o chrome deixa de ser fixo em português.** Todo rótulo de
  mecanismo — status, estado de rede, viewport, botão, aba, mensagem do painel —
  vive em `DEFAULT_LABELS` e pode ser sobrescrito por grupo:

  ```ts
  theme: {
    labels: {
      status: { approved: "Approved", "in-review": "In review" },
      topbar: { copyLink: "Copy link" },
    },
  }
  ```

  O que não for declarado fica no padrão. Novos exports: `DEFAULT_LABELS`,
  `resolveLabels`, `useLabels`, `Labels`, `LabelsOverride`. `STATUS_LABELS`,
  `STATUS_MEANING`, `NETWORK_LABELS` e `KEYBOARD_LABELS` continuam exportados,
  agora como atalhos para os grupos de `DEFAULT_LABELS`.

  O motivo: o chrome divide a tela com a UI do cliente. Um Design Space revisado
  em inglês misturava "Em revisão" e "Copiar link" com a interface dele, e
  traduzir só os status seria pior que não traduzir.

- **Trava de fronteira de hospedagem** (`src/deploy/hosting.test.ts`): reprova o
  build se qualquer arquivo do motor citar um provedor, ou se `deploy/index.ts`
  voltar a ler ambiente. No mesmo espírito da trava de fronteira visual.

- **Trava de idioma** (`src/shell/labels.test.ts`): reprova o build quando um
  componente do chrome tem texto visível fixo — nó de texto, `aria-label`,
  `title` ou `placeholder`. Sem ela, o próximo rótulo nasce no JSX e volta a ser
  intraduzível.

- **Trava de vocabulário** (`src/shell/boundary.test.ts`): reprova o build se o
  motor nomear um cliente.

### Corrigido

- **O motor não carrega mais o domínio dos primeiros clientes.** Comentários,
  exemplos de JSDoc e fixtures de teste usavam o vocabulário do setor de um
  cliente, inclusive o exemplo do README deste pacote. Nada disso tinha efeito em
  runtime; o efeito era outro, e caro: um agente que lê esses arquivos conclui que
  o motor serve a um setor e escreve como se fosse. Os exemplos passaram a usar
  vocabulário genérico — solicitação, aprovação, cobrança.

- **Testes do módulo de deploy** (`src/deploy/deploy.test.ts`), que não existiam:
  contexto local sem hospedagem, precedência do que o produto informa, string
  vazia como ausente e substituição no template de aprovação.

## 0.1.1

### Corrigido

- **O motor não conseguia detectar o contexto do deployment.** `getDeployContext`
  lia `import.meta.env`, mas o motor é uma biblioteca já compilada: esse
  `import.meta.env` foi resolvido no build do **pacote**, não no build do produto,
  então não sobrava nada para o bundler do produto substituir. O resultado era o
  cabeçalho da revisão sempre em "development", sem branch nem commit — e é o
  commit que torna uma aprovação rastreável.

  Uma biblioteca publicada não tem como ler o ambiente de build de quem a consome.
  Quem tem acesso a ele é o produto.

### Adicionado

- **`ProductDefinition.deploy`** (`DeployOverrides`): o produto informa `env`,
  `branch`, `commit`, `branchUrl` e `deploymentUrl`. O que vier preenchido tem
  precedência sobre a detecção por ambiente, que continua funcionando quando o
  motor roda a partir do código-fonte.

  ```ts
  deploy: {
    env: import.meta.env.VITE_VERCEL_ENV,
    branch: import.meta.env.VITE_VERCEL_GIT_COMMIT_REF,
    commit: import.meta.env.VITE_VERCEL_GIT_COMMIT_SHA,
  }
  ```

  Compatível com 0.1.0: o campo é opcional e quem não passar continua no
  comportamento anterior — que, na prática, nunca detectou nada em produto real.

## 0.1.0

Primeira versão do motor. Fase 1 do roadmap.

### Adicionado

- **Contratos** (`types/`): `Scenario`, `Persona`, `Rule`, `Fixture`, `Module`,
  `Flow`, `ProductDefinition`, `ScenarioContext`, `A11yContract`. `a11y` é campo
  obrigatório do cenário.
- **Registry** (`createRegistry`): árvore de módulos, busca por vocabulário de
  negócio sem acento, cobertura por status, resolução de permissões efetivas.
- **Validação em runtime** (`validateProduct`, `validateScenario`): forma do
  cenário e integridade de referências entre cenário, persona, fixture, regra e
  rota.
- **Shell**: mapa de situações na raiz, navegação por módulo, painel de contexto
  com abas de cenário, acessibilidade e diagnóstico, barra de controles e modo de
  revisão limpa.
- **Roteamento declarativo** sem dependência externa, com casamento de
  especificidade e parâmetros dinâmicos.
- **Deep links**: a URL é o estado. Todo controle é serializado, com precedência
  de parâmetro explícito sobre valor declarado no cenário.
- **Contexto de deployment** (`getDeployContext`, `scenarioUrl`, `commitUrl`):
  monta a URL absoluta de qualquer cenário sem domínio hardcoded.
- **Adapters**: `fixtureAdapter` como padrão, materializando os cinco estados de
  rede; `createHttpAdapter` com fallback para fixture.
- **Acessibilidade**: razão de contraste do WCAG 2.x com composição de alfa,
  `assertContrastPairs` para falhar o build, leitura da árvore acessível do
  elemento em foco e modo teclado com ordem de tabulação evidenciada.
- **Entrypoint de testes** (`/testing`): `pathFor`, `testOrigin`,
  `assertValidProduct`, recortes de cenário por status.
- 49 testes unitários cobrindo contraste, roteamento, registry, serialização de
  controles e a fronteira visual do CSS.

### Corrigido durante a construção do primeiro produto

- **Vazamento de estilo do chrome para a UI do produto.** `.ds-root` definia
  `color`, `font-family`, `font-size` e `line-height`. Como o palco é descendente
  dele, todo elemento do produto que não declarava cor própria herdava o
  cinza-claro do chrome — e o axe do produto piloto reprovou as tabelas do
  cliente por contraste de 1.21:1 contra uma cor que o cliente nunca escolheu.

  As propriedades herdáveis passaram para uma classe `.ds-chrome`, aplicada
  apenas nas regiões do chrome. `src/shell/boundary.test.ts` trava a regressão:
  ele lê o CSS e falha se qualquer propriedade herdável voltar para `.ds-root`,
  se algum seletor alcançar o palco, ou se aparecer regra em elemento nu.

- `checkContrastPair`, `checkContrastPairs` e `contrastRatio` passaram a ser
  exportados por `/testing`. O produto valida os próprios tokens; o motor só sabe
  medir.

### Extraído por evidência, depois do segundo produto

- **`parseIsoDate`, `ageInYears` e `daysBetween`.** Primeira capacidade a entrar no
  motor pela régua do Princípio 10 — apareceu em dois produtos independentes, não
  carrega aparência e não carrega domínio.

  O bug de origem: `new Date("2011-09-08")` é meia-noite **UTC** e, formatado em
  qualquer fuso a oeste de Greenwich, exibe o dia anterior. Em um produto isso
  deslocava uma data de nascimento e, com ela, a idade calculada e uma regra que
  dependia da idade; em outro, errava um vencimento por um dia. Os dois produtos
  escreveram a mesma correção separadamente, sem saber um do outro.

  `ageInYears` exige a data de referência como parâmetro obrigatório de propósito:
  um padrão `new Date()` faria fixture depender do relógio.

  O que **não** foi extraído, e por quê, está registrado no repositório do segundo
  produto. A régua para a próxima extração: **dois produtos, zero aparência, zero
  domínio.**
