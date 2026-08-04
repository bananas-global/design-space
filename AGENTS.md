# AGENTS.md

Instruções para agentes de IA trabalhando no **motor** do Design Space. Se você
está em um repositório de produto — um `<produto>-design-space` — leia o
`AGENTS.md` daquele repositório em vez deste.

## O que este repositório é

O motor compartilhado (`packages/core`) e o template de novos produtos
(`packages/template`). Nenhum produto de cliente vive aqui.

## Comandos

```bash
pnpm install
pnpm check                      # typecheck + build + testes de todos os pacotes
pnpm -C packages/core test      # 67 testes unitários do motor
pnpm -C packages/template dev   # o motor rodando dentro de um produto de exemplo
pnpm -C packages/template test:e2e
```

O template consome o motor por `workspace:*`. Depois de mudar o motor, rode
`pnpm -C packages/core build` para o template ver a alteração.

## A regra que governa tudo

**Se aparece dentro da interface do cliente e contribui para sua linguagem visual
ou seu domínio, não pertence a este repositório.**

O motor não contém e não pode passar a conter: componente visual, token,
tipografia, cor, ícone, ilustração, persona de domínio, fixture, regra de
negócio ou conteúdo de cliente.

Antes de adicionar qualquer capacidade ao motor, os três critérios precisam valer
ao mesmo tempo:

1. **Dois produtos.** Já apareceu, implementado separadamente, em dois produtos
   independentes. Um produto só não é evidência — é antecipação.
2. **Zero aparência.** Nenhuma decisão de cor, raio, espaçamento, tipografia ou
   anatomia de layout.
3. **Zero domínio.** Nenhum conceito de cliente, de nenhum setor. Se o nome só faz
   sentido dentro do negócio de um cliente, o lugar é o repositório dele.

Falhar em qualquer um dos três significa que o lugar é o produto.

Exemplo do que **passou**: `parseIsoDate`. Dois produtos independentes escreveram a
mesma correção de fuso separadamente, e ela não decide nada visual nem conhece
domínio.

Exemplo do que **não passa**: um `Button` compartilhado. Os dois produtos têm um,
com a mesma prop `unavailableReason` resolvendo o mesmo problema conceitual — e
ainda assim extrair faria mudar o raio de canto de um cliente mexer no outro. O
padrão é compartilhado pela convenção no template; o componente, não.

## Guardrails

- **Não** adicione um export ao `src/index.ts` sem necessidade. Aquela lista é um
  compromisso de versionamento semântico com todos os produtos.
- **Não** adicione dependência de runtime. O motor tem `react` e `react-dom` como
  peers e nada além disso. Roteamento, validação e medição de contraste são
  implementados aqui de propósito, porque o que se precisa deles é pequeno.
- **Não** cite provedor de hospedagem no motor, nem em comentário, e não volte a ler
  variável de ambiente em `deploy/`. Contexto de deployment vem do produto por
  `ProductDefinition.deploy` — ver `docs/decisions/0007-hospedagem-opcional.md`.
  Existe trava em `src/deploy/hosting.test.ts`.
- **Não** escreva texto visível fixo em componente do chrome. Todo rótulo de
  mecanismo nasce em `src/shell/labels.ts` e é sobrescrevível por `theme.labels`;
  existe trava em `src/shell/labels.test.ts`.
- **Não** use nome de cliente nem vocabulário de um setor específico em comentário,
  exemplo ou fixture de teste do motor. Exemplo do motor é genérico: solicitação,
  aprovação, cobrança. Existe trava em `src/shell/boundary.test.ts`.
- **Não** escreva CSS que possa alcançar a UI do produto. Todo seletor é
  prefixado com `ds-`, toda custom property com `--ds-`, e não existe regra em
  elemento nu fora de `.ds-root`.
- **Não** mude o schema de cenário sem entrada no `CHANGELOG.md` e sem avaliar se
  é major. Mudança incompatível exige comando ou guia, nunca merge silencioso.
- **Não** remova o `a11y` obrigatório do contrato de cenário, nem o torne
  opcional "por conveniência de migração". Ele existe para que acessibilidade não
  volte a ser auditoria de fim de projeto.
- Rode `pnpm check` antes de concluir qualquer alteração.

## Onde as decisões vivem

`docs/decisions/` deste repositório guarda as decisões **do modelo** — as que valem
para todos os Design Spaces: fixture sintética como padrão, preview público,
acessibilidade obrigatória no contrato de cenário, escopo do source mapping, ação
bloqueada que explica o motivo.

Repositório de produto registra apenas o que é dele: identidade visual, regra de
negócio, recorte de escopo, divergência com o sistema real.

A regra é a mesma da fronteira do motor, aplicada a documento: **se valeria para
qualquer produto, vive aqui uma vez só.** Copiar para o produto cria duas fontes que
divergem na primeira vez que uma for atualizada — e foi o que aconteceu antes desta
separação, com quatro decisões duplicadas em três repositórios.

Um produto pode registrar uma **exceção** a uma decisão do modelo. Nesse caso o
documento diz qual decisão ele abre e por quê, em vez de reescrevê-la.

## Estrutura de `packages/core`

| Caminho | Responsabilidade |
| --- | --- |
| `src/types/` | Contratos públicos. A fronteira entre motor e produto. |
| `src/registry/` | Índice consultável e validação em runtime do contrato. |
| `src/router/` | Casamento de rotas declarativas. |
| `src/controls/` | Estado dos controles e sua serialização na URL. |
| `src/adapters/` | Fontes de dados e resolução do cenário ativo. |
| `src/deploy/` | Contexto de deployment e montagem de deep links. |
| `src/a11y/` | Contraste, árvore acessível e modo teclado. |
| `src/shell/` | Chrome neutro: mapa, navegação, painel, controles, palco. |
| `src/testing/` | Entrypoint separado, fora do bundle do preview. |

## Ao mudar o motor

1. Escreva o teste primeiro quando a mudança for de comportamento observável.
2. Verifique no template: `pnpm -C packages/core build && pnpm -C packages/template dev`.
3. Registre no `CHANGELOG.md` de `packages/core`, classificando patch, minor ou
   major.
4. Se for major, escreva também o que o produto precisa fazer para migrar.
