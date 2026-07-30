# Changelog

Versionamento semântico. **Patch** para correção sem mudança de contrato,
**minor** para funcionalidade compatível, **major** para mudança incompatível.

Mudança estrutural — pasta obrigatória nova, schema de cenário alterado — exige
comando explícito e revisável, nunca merge silencioso.

## 0.1.0 — não publicado

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
