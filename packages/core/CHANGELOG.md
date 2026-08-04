# Changelog

Versionamento semântico. **Patch** para correção sem mudança de contrato,
**minor** para funcionalidade compatível, **major** para mudança incompatível.

Mudança estrutural — pasta obrigatória nova, schema de cenário alterado — exige
comando explícito e revisável, nunca merge silencioso.

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

- **Trava de fronteira de hospedagem** (`src/deploy/hosting.test.ts`): reprova o
  build se qualquer arquivo do motor citar um provedor, ou se `deploy/index.ts`
  voltar a ler ambiente. No mesmo espírito da trava de fronteira visual.

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
  qualquer fuso a oeste de Greenwich, exibe o dia anterior. No Bloomy isso
  deslocava a data de nascimento, o cálculo de idade e portanto a regra do paciente
  menor de idade; na Finaya, errava o vencimento da cobrança por um dia. Os dois
  produtos escreveram a mesma correção separadamente, sem saber um do outro.

  `ageInYears` exige a data de referência como parâmetro obrigatório de propósito:
  um padrão `new Date()` faria fixture depender do relógio.

  O que **não** foi extraído, e por quê, está em
  `finaya-design-space/docs/decisions/0001`. A régua para a próxima extração:
  **dois produtos, zero aparência, zero domínio.**
