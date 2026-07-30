# Design Space — template

Molde de novos Design Spaces. Um Design Space é a representação viva, navegável e
executável da experiência pretendida de um produto: UI real em React, cenários
controlados, dados sintéticos, regras, personas e documentação em um ambiente
compartilhável por link.

Este template **inicia** um repositório novo. Ele não atualiza projeto existente:
o que evolui continuamente é o motor, distribuído como pacote versionado
(`@brucesantos/design-space`).

## Começar

```bash
pnpm install
pnpm dev
```

A porta é derivada do nome em `package.json`, então é sempre a mesma para este
projeto e não colide com outros Design Spaces abertos ao mesmo tempo.

Abra a raiz: ela mostra o produto como mapa de situações. Cada situação abre por
URL própria.

## Criar um produto a partir deste template

1. Copie o diretório para um repositório novo, `<produto>-design-space`.
2. Troque `name` no `package.json` — isso muda a porta de dev automaticamente.
3. Substitua os tokens em `src/tokens/tokens.css` pela identidade do cliente e
   atualize `src/tokens/contrast.ts` com os pares reais. O teste de tokens falha
   se algum par ficar abaixo do alvo.
4. Reescreva `src/app/catalog.ts` com o vocabulário do cliente — módulos, jornadas
   e cenários — e ajuste as rotas em `src/app/product.ts`.
5. Substitua domínio, personas, fixtures, regras e cenários.
6. Escreva `docs/product.md` e o primeiro registro em `docs/decisions/` — só o que
   for específico deste produto. As decisões do modelo já estão no repositório do
   motor e não devem ser copiadas para cá.
7. Crie o projeto na Vercel apontando para o repositório. `vercel.json` já vem
   com o rewrite de SPA e o header `noindex`.

## Estrutura

```
src/
├── app/           # catalog.ts (especificação) e product.ts (integração com o motor)
├── components/    # componentes exclusivos deste produto
├── screens/       # composições de tela
├── scenarios/     # cenários registráveis
├── fixtures/      # dados sintéticos e determinísticos
├── personas/      # papéis e permissões
├── rules/         # regras de negócio e sua implementação
├── contracts/     # tipos do domínio
└── tokens/        # identidade visual e pares de contraste
docs/
├── product.md
├── handoff.md
└── decisions/
tests/
├── product.test.ts   # contrato de cenário e regras
├── tokens.test.ts    # contraste na origem
└── e2e/              # jornada Playwright + axe
```

## Qualidade

```bash
pnpm check      # typecheck + testes + build
pnpm test:e2e   # jornada real, com axe por cenário
```

O que quebra o build de propósito:

- **Typecheck.** Contrato de componente e de cenário.
- **Contrato de cenário.** Fixture, persona, regra ou rota inexistente.
- **Contraste dos tokens.** Par de cores abaixo do alvo WCAG 2.2 AA.
- **Axe, violação crítica ou séria.** Por cenário, na mesma jornada Playwright.

Verificação automática é piso, não teto. Ordem de leitura confusa, rótulo
tecnicamente presente mas sem sentido e fluxo impossível de completar com leitor
de tela passam no axe — revisão humana nas jornadas críticas continua necessária.

## Preview e revisão

Todo push gera um preview automático na Vercel. O preview é **público, sem login** —
postura padrão do estúdio, não decisão caso a caso. Quem tem o link abre e revisa,
sem conta e sem convite, que é o ponto do ambiente.

- **URL de branch** (`projeto-git-branch-escopo.vercel.app`) — revisão em
  andamento, sempre o último commit daquela branch.
- **URL de commit** (`projeto-hash-escopo.vercel.app`) — aprovação e handoff.
  Imutável, então a aprovação não muda de conteúdo debaixo de quem aprovou.

O header `X-Robots-Tag: noindex, nofollow` mantém a URL clicável e fora de busca.
Preview aberto não é preview indexado.

Se algum dia um projeto precisar ser fechado, saiba o que isso custa antes de
decidir: **Vercel Authentication exige que cada pessoa que revisa seja membro do
time na Vercel**, e no plano Pro seat é pago. Não é ligar uma chave — é passar a
administrar acesso, e é o oposto do que este ambiente existe para fazer.

## Feedback

Duas camadas, com laços diferentes:

- **`feedback-collector`** — camada oficial de iteração. `ALT` + clique captura o
  elemento e abre o campo de instrução; "Copiar backlog" gera markdown numerado
  com `arquivo:linha` para o agente. Não exige conta.
- **Vercel Toolbar** — revisão assíncrona com PO e cliente. Thread ancorada na
  página, com status. Exige conta para comentar.

Comentário resolvido na Toolbar não significa cenário aprovado. Aprovação muda o
`status` do cenário no repositório, e nada mais.

## Ver também

- [`AGENTS.md`](AGENTS.md) — instruções e guardrails para agentes de IA.
- [`docs/product.md`](docs/product.md) — visão, vocabulário e personas.
- [`docs/handoff.md`](docs/handoff.md) — modelo de entrega para engenharia.
- [`docs/decisions/`](docs/decisions/) — decisões **deste produto**. As do modelo
  vivem no [repositório do motor](https://github.com/bananas-global/design-space/tree/main/docs/decisions).
