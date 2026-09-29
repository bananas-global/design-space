# AGENTS.md

Instruções para agentes de IA trabalhando neste Design Space. Leia antes de
alterar qualquer arquivo.

## O que este repositório é

Uma **especificação executável** de produto: UI real em React, cenários
controlados, dados sintéticos, regras, personas e documentação, compartilhável
por link. Não é um sistema de produção, não é um design system universal e não é
promessa de reuso de código — quando o stack real for diferente, a engenharia
traduz esta especificação.

**Uma tela é uma rota**, e as telas de uma feature se agrupam num fluxo com
`route.group`. As **variações** da tela são controles por componente
(`route.controls`), que a tela lê em `context.controls`; os cenários cuja `route`
casa com ela são atalhos para combinações (`Scenario.controls`). Um cenário
combina intenção, persona, permissões, pré-condições, dados, ações, regras,
resultado esperado e os componentes que a tela usa.

## Comandos

```bash
pnpm dev          # dev server na porta determinística deste projeto
pnpm typecheck    # tsc --noEmit
pnpm test         # contrato de cenário e regras
pnpm test:e2e     # jornadas Playwright (sobe o dev server sozinho)
pnpm build        # typecheck + build de produção
pnpm check        # typecheck + test + build — rode antes de concluir qualquer alteração
```

Hospedagem é escolha explícita, e o padrão é nenhuma: `pnpm setup:hosting vercel`
instala os arquivos do provedor, `pnpm setup:hosting none` os remove. **Não** crie
`vercel.json` nem workflow de deploy à mão — eles vivem em `hosting/<provedor>/`, e
um Design Space que roda só local é caso suportado, não pendência.

## Onde as coisas ficam

| Caminho | Conteúdo |
| --- | --- |
| `src/app/catalog.ts` | Cenários, personas, fixtures e regras. **Livre de React e de `import.meta`.** Comece aqui. |
| `src/app/product.ts` | O catálogo mais rotas (as telas, com `name`), tema e contexto de deployment. É o que o motor recebe. |
| `src/scenarios/` | Cenários registráveis, um arquivo por área do produto. |
| `src/screens/` | Composições de tela. Recebem `params` e `context` do motor. |
| `src/components/` | Componentes exclusivos e previews do catálogo visual deste produto. |
| `src/fixtures/` | Dados sintéticos e determinísticos. |
| `src/personas/` | Papéis, objetivos e permissões. |
| `src/rules/` | Regras de negócio, separadas por domínio, com a implementação. |
| `src/contracts/` | Tipos e schemas do domínio. |
| `src/tokens/` | Identidade visual: `tokens.css`. |
| `hosting/` | Arquivos por provedor de hospedagem, instalados por `pnpm setup:hosting`. |
| `docs/product.md` | Visão, telas, vocabulário e personas. |
| `docs/decisions/` | Decisões **deste produto**. As do modelo vivem no repositório do motor. |
| `docs/handoff.md` | Modelo de entrega para engenharia. |

## Como criar um cenário

1. Escolha um id estável e único, minúsculo, em kebab-case com pontos
   opcionais: `requests.approve-blocked`. O prefixo é só convenção de leitura.
2. Use o **vocabulário do negócio** no `title`. "Aprovação bloqueada por falta de
   documento", não "ApprovalBlockedState".
3. Aponte `fixture` para um id que já existe. `persona` é opcional: informe
   quando ela decide permissões. O motor valida em runtime e reclama no painel de
   Diagnóstico se um id informado não existir.
4. Preencha `expected`. Sem critério de aceite, o cenário não vira caso
   verificável no handoff — é tela bonita.
5. Garanta que `route` casa com uma rota declarada em `product.ts`: é ela que
   define de qual tela o cenário é variação. Uma tela nova é uma rota nova, com
   `name`.
6. Liste em `components` os ids do catálogo que a tela usa, e dê `source` a cada
   componente novo em `src/components/catalog.tsx`. É o que o "Copiar para o
   PR" leva para a engenharia.

**Por que `catalog.ts` é separado de `product.ts`:** o Playwright carrega os testes
com esbuild puro, sem os plugins do Vite. Um `import` de SVG, de CSS ou um
`import.meta.env` na cadeia derruba a suíte antes do primeiro teste, e o erro
aparece como "No tests found". O teste de jornada importa o catálogo. Não junte os
dois.

Um cenário só existe de verdade quando abre por URL direta e produz sempre a
mesma situação.

## Guardrails

- **Nunca** usar credencial ou dado pessoal de produção. Fixture é sempre
  sintética e determinística: nada de `new Date()`, `Math.random()` ou id gerado
  em runtime dentro de fixture.
- **Não** modificar `@brucesantos/design-space` (o motor) para resolver uma
  necessidade específica deste produto. Se parecer necessário, pare e pergunte.
- **Não** traduzir o chrome do motor editando o pacote. O idioma do chrome é
  `theme.labels` em `src/app/product.ts`; o template usa `EN_US_LABELS` e o padrão
  do motor é português.
- **Não** introduzir componente global quando a necessidade é local. Reuso de UI
  é decisão local deste produto.
- **Não** adicionar integração com backend sem um problema concreto de fixture.
  O padrão é `dataSources: { default: "fixtures" }`.
- Registrar em `docs/decisions/` toda nova regra ou decisão **deste produto** que
  altere comportamento. Decisão que valeria para todos os Design Spaces pertence ao
  repositório do motor — não copie para cá.
- Rodar `pnpm check` antes de concluir. Typecheck, contrato de cenário e testes
  de regra quebram o build de propósito.

## Como pedir mudanças (formato que funciona)

Pedidos orientados ao domínio, não a coordenada visual:

```
Abra o cenário "requests.approve-blocked-by-rule" e reduza a ambiguidade
da ação bloqueada. Preserve todas as regras existentes.

Crie o cenário "requests.duplicate-submission" para a persona solicitante,
com fixture sintética e URL direta.

Aplique este backlog. Não mude token nem regra: se um item exigir isso, pare e
pergunte.
```

## Atalhos do ambiente

| Atalho | Efeito |
| --- | --- |
| `Command/Ctrl` + `K` | Foca a busca da lateral |
| `Shift` + `C` | Revisão limpa: esconde e mostra o chrome |
| `Command/Ctrl` + `F` | Foca o filtro do painel direito |

A UI do produto roda num `<iframe>` com a largura do viewport. Use media queries
normais; nos testes e2e, a UI fica em `page.frameLocator(FRAME_SELECTOR)`.
