# AGENTS.md

Instruções para agentes de IA trabalhando neste Design Space. Leia antes de
alterar qualquer arquivo.

## O que este repositório é

Uma **especificação executável** de produto: UI real em React, cenários
controlados, dados sintéticos, regras, personas e documentação, compartilhável
por link. Não é um sistema de produção, não é um design system universal e não é
promessa de reuso de código — quando o stack real for diferente, a engenharia
traduz esta especificação.

A unidade central é o **cenário**, não a tela. Um cenário combina intenção,
persona, permissões, pré-condições, dados, ações, regras e resultado esperado.

## Comandos

```bash
pnpm dev          # dev server na porta determinística deste projeto
pnpm typecheck    # tsc --noEmit
pnpm test         # contrato de cenário, regras e contraste dos tokens
pnpm test:e2e     # jornada Playwright + axe (sobe o dev server sozinho)
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
| `src/app/catalog.ts` | Módulos, jornadas, cenários, personas, fixtures e regras. **Livre de React e de `import.meta`.** Comece aqui. |
| `src/app/product.ts` | O catálogo mais rotas, tema e contexto de deployment. É o que o motor recebe. |
| `src/scenarios/` | Cenários registráveis, um arquivo por módulo. |
| `src/screens/` | Composições de tela. Recebem `params` e `context` do motor. |
| `src/components/` | Componentes exclusivos deste produto. |
| `src/fixtures/` | Dados sintéticos e determinísticos. |
| `src/personas/` | Papéis, objetivos e permissões. |
| `src/rules/` | Regras de negócio, separadas por domínio, com a implementação. |
| `src/contracts/` | Tipos e schemas do domínio. |
| `src/tokens/` | Identidade visual: `tokens.css` e os pares de contraste. |
| `hosting/` | Arquivos por provedor de hospedagem, instalados por `pnpm setup:hosting`. |
| `docs/product.md` | Visão, módulos, vocabulário e personas. |
| `docs/decisions/` | Decisões **deste produto**. As do modelo vivem no repositório do motor. |
| `docs/handoff.md` | Modelo de entrega para engenharia. |

## Como criar um cenário

1. Escolha o id no formato `modulo.situacao`, em kebab-case, com o prefixo
   correspondendo a um módulo registrado — o motor usa o prefixo para montar a
   navegação.
2. Use o **vocabulário do negócio** no `title`. "Aprovação bloqueada por falta de
   documento", não "ApprovalBlockedState".
3. Aponte `fixture` e `persona` para ids que já existem. O motor valida em
   runtime e reclama no painel de Diagnóstico se não existirem.
4. Preencha `a11y`. É obrigatório, e não é formalidade: `keyboard: "full"`
   significa que a jornada é completável só por teclado, e `announces` lista os
   eventos que precisam ser anunciados para leitor de tela.
5. Preencha `expected`. Sem critério de aceite, o cenário não vira caso
   verificável no handoff — é tela bonita.
6. Garanta que `route` casa com uma rota declarada em `product.ts`.

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
  `theme.labels` em `src/app/product.ts`; o padrão é português.
- **Não** introduzir componente global quando a necessidade é local. Reuso de UI
  é decisão local deste produto.
- **Não** remover foco visível, rótulo acessível, ordem de tabulação ou contraste
  para resolver um pedido de layout. Se um item do backlog exigir isso, **pare e
  pergunte** — não escolha o layout.
- **Não** adicionar integração com backend sem um problema concreto de fixture.
  O padrão é `dataSources: { default: "fixtures" }`.
- Registrar em `docs/decisions/` toda nova regra ou decisão **deste produto** que
  altere comportamento. Decisão que valeria para todos os Design Spaces pertence ao
  repositório do motor — não copie para cá.
- Rodar `pnpm check` antes de concluir. Typecheck, contrato de cenário e
  contraste dos tokens quebram o build de propósito.

## Como pedir mudanças (formato que funciona)

Pedidos orientados ao domínio, não a coordenada visual:

```
Abra o cenário "requests.approve-blocked-by-rule" e reduza a ambiguidade
da ação bloqueada. Preserve todas as regras existentes.

Crie o cenário "requests.duplicate-submission" para a persona solicitante,
com fixture sintética e URL direta.

Aplique este backlog do coletor. Cada item tem arquivo e linha.
Não mude token nem regra: se um item exigir isso, pare e pergunte.
```

## Coletor de feedback

`feedback-collector` está instalado e ativo em desenvolvimento. Segure `ALT`
para destacar, `ALT` + clique para capturar o elemento e escrever a instrução, e
use "Copiar backlog" para gerar o markdown numerado com `arquivo:linha`.

O `arquivo:linha` vem do `@react-dev-inspector/babel-plugin` no
`vite.config.ts`. Em React 19 não existe fallback pelo fiber: **sem o plugin não
há source mapping**. Não remova.

O `feedback-collector` traz uma skill de setup para agentes de código, em
`skills/feedback-collector-setup/SKILL.md` do seu repositório. Ela cobre as
receitas por bundler, o caveat do React 19 e como remover a instalação — use-a em
vez de reconstruir a configuração do zero.

## Atalhos do ambiente

| Atalho | Efeito |
| --- | --- |
| `Shift` + `C` | Mostra ou oculta o chrome do Design Space (revisão limpa) |
| `Shift` + `K` | Liga ou desliga o modo teclado |
| `Shift` + `P` | Mostra ou oculta o painel de contexto |
