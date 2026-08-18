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
3. Troque a dependência do motor de `workspace:*` para a versão publicada
   (`^0.3.0`). `workspace:*` só resolve dentro do monorepo do motor: fora dele, o
   `pnpm install` falha.
4. Substitua os tokens em `src/tokens/tokens.css` pela identidade do cliente e
   atualize `src/tokens/contrast.ts` com os pares reais. O teste de tokens falha
   se algum par ficar abaixo do alvo.
5. Reescreva `src/app/catalog.ts` com o vocabulário do cliente — módulos, jornadas
   e cenários — e ajuste as rotas em `src/app/product.ts`.
6. Substitua domínio, personas, fixtures, regras e cenários.
7. Escreva `docs/product.md` e o primeiro registro em `docs/decisions/` — só o que
   for específico deste produto. As decisões do modelo já estão no repositório do
   motor e não devem ser copiadas para cá.
8. Se o time do cliente revisa em outro idioma, traduza o chrome do motor em
   `theme.labels`, em `src/app/product.ts`. O template usa `EN_US_LABELS`; o
   padrão do motor continua em português.
9. Escolha a hospedagem, se for haver alguma: `pnpm setup:hosting vercel`. O padrão
   é nenhuma. Ver [Hospedagem](#hospedagem).

## Estrutura

```
src/
├── app/           # catalog.ts (especificação) e product.ts (integração com o motor)
├── components/    # componentes exclusivos e catálogo visual deste produto
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
hosting/              # arquivos por provedor, instalados por escolha explícita
└── vercel/
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

## Hospedagem

Escolha explícita, e o padrão é **nenhuma**:

```bash
pnpm setup:hosting          # nenhuma: só local
pnpm setup:hosting vercel   # publica preview e produção
```

Sem hospedagem, o Design Space roda por `pnpm dev` e a revisão acontece ao lado de
quem desenha ou por chamada com tela compartilhada. É um uso completo do modelo,
não uma versão reduzida: `env` fica `development` e o cabeçalho da revisão omite
branch e commit, e nada mais muda.

O que você perde é a revisão **assíncrona** — e, com ela, a aprovação por URL
imutável. `approvedAt` continua obrigatório em cenário aprovado, então registre o
permalink do commit no Git e anote a escolha em `docs/decisions/`: sem artefato que
o aprovador consiga abrir, a aprovação passa a depender do repositório.

`hosting/<provedor>/` guarda os arquivos que cada provedor exige. O script copia
para a raiz e para `.github/workflows/`, e remove o que o provedor anterior
instalou — então trocar de alvo não deixa resto.

### Vercel

`pnpm setup:hosting vercel` instala `vercel.json` e o workflow `deploy.yml`. Depois
falta o que só uma pessoa faz: criar o projeto na Vercel, gravar os secrets
`VERCEL_TOKEN`, `VERCEL_ORG_ID` e `VERCEL_PROJECT_ID` no GitHub e desligar Vercel
Authentication no preview.

Quem publica é o workflow, não a integração Git — no plano Pro a Vercel só publica
commit cujo autor é membro pago do time, e pelo token o autor deixa de importar. O
mesmo workflow grava o `build-info.json` que dá branch e commit ao cabeçalho da
revisão.

O preview fica **público, sem login**: quem tem o link abre e revisa, sem conta e
sem convite. `X-Robots-Tag: noindex, nofollow` mantém a URL clicável e fora de
busca — preview aberto não é preview indexado.

- **URL de branch** — revisão em andamento, sempre o último commit daquela branch.
- **URL de commit** — aprovação e handoff. Imutável, então a aprovação não muda de
  conteúdo debaixo de quem aprovou.

Se algum dia um projeto precisar ser fechado, saiba o que isso custa antes de
decidir: **Vercel Authentication exige que cada pessoa que revisa seja membro do
time na Vercel**, e no plano Pro seat é pago. Não é ligar uma chave — é passar a
administrar acesso, e é o oposto do que este ambiente existe para fazer.

## Revisão assíncrona

Quando o projeto usa Vercel, a Toolbar oferece threads ancoradas na página, com
status, para revisão assíncrona com PO e cliente. Ela exige conta para comentar.
O template não inclui, por enquanto, um coletor de feedback próprio no preview.

Comentário resolvido na Toolbar não significa cenário aprovado. Aprovação muda o
`status` do cenário no repositório, e nada mais.

Cenário trazido do sistema existente sem validação começa como `ported`. Esse
estado documenta a origem sem tratá-la como proposta ou compromisso de
implementação; a revisão é que determina sua próxima etapa.

A aba **Componentes** é alimentada por `ProductDefinition.components`. Cada item
aponta para um preview React local: o motor organiza e cria o deep link, mas
componente, conteúdo e aparência continuam exclusivos deste produto.

O chrome do template usa en-US e oferece dark/light mode na topbar. A aparência
é independente do tema do produto e viaja no deep link como `appearance=light`.

## Ver também

- [`AGENTS.md`](AGENTS.md) — instruções e guardrails para agentes de IA.
- [`docs/product.md`](docs/product.md) — visão, vocabulário e personas.
- [`docs/handoff.md`](docs/handoff.md) — modelo de entrega para engenharia.
- [`docs/decisions/`](docs/decisions/) — decisões **deste produto**. As do modelo
  vivem no [repositório do motor](https://github.com/bananas-global/design-space/tree/main/docs/decisions).
