# Changelog

Versionamento semântico. **Patch** para correção sem mudança de contrato,
**minor** para funcionalidade compatível, **major** para mudança incompatível.

Mudança estrutural — pasta obrigatória nova, schema de cenário alterado — exige
comando explícito e revisável, nunca merge silencioso.

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
