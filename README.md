# Bananas Design Space

Especificação executável de produto. Ambiente independente do stack de produção
onde design, PO, negócio, cliente, engenharia e agentes de IA abrem um cenário
real por link, com dados controlados.

Este repositório é o **motor** e o **template**. Ele não contém nenhum produto de
cliente: cada produto vive em seu próprio repositório privado.

```
design-space/
├── packages/core/       # @brucesantos/design-space — motor neutro, publicado no npm
└── packages/template/   # molde de novos Design Spaces
```

## O problema

O arquivo estático descreve aparência, não comportamento. Fluxos ramificados,
estados condicionais, permissões, regras e exceções precisam ser simulados por
duplicação de frames e protótipos frágeis. Quanto mais complexo o sistema, maior
a distância entre a intenção de design e o que a engenharia interpreta.

O repositório de produção reduz essa distância, mas cobra permissões, banco,
autenticação e governança que não pertencem ao ciclo diário do time. Um designer
que precisa revisar uma solicitação recusada não deveria construir a cadeia de
dados inteira para chegar naquele estado.

O Design Space reproduz apenas o necessário para tornar a experiência explorável
e verificável — e fala a linguagem do produto: a situação tem o nome que o time do
cliente usa para ela, não o nome do componente que a desenha.

## Arquitetura

| Camada | Onde vive | O que contém |
| --- | --- | --- |
| Motor | `@brucesantos/design-space` | Chrome de revisão (Telas e Componentes à esquerda, Variações e Informações à direita), registry, deep links, controles e utilitários de teste. |
| Produto | um `<produto>-design-space` privado por cliente | UI, tokens, componentes, telas, regras, personas e fixtures exclusivas. |
| Dados | fixture adapter por padrão | Dado sintético e determinístico. REST, GraphQL ou staging entram como adapters opcionais. |

A **regra de fronteira**: se aparece dentro da interface do cliente e contribui
para sua linguagem visual ou seu domínio, pertence ao repositório daquele
produto. Se organiza como a Bananas explora qualquer produto, pode pertencer ao
motor.

Tokens são sempre exclusivos. O stack é padronizado; a aparência não.

O **chrome** é o mesmo para todos os produtos: preto e branco, claro e escuro,
sem cor de cliente. A UI do produto roda num `<iframe>` da mesma origem, com a
largura do viewport escolhido — CSS isolado nos dois sentidos, e media queries
respondendo como em produção. Ver
[`docs/decisions/0012`](docs/decisions/0012-chrome-unico-telas-como-rotas-e-iframe.md).

Organização: **uma tela é uma rota**, as telas de uma feature se agrupam num
**fluxo** (`route.group`), e as **variações** de uma tela são controles por
componente que se combinam, com os cenários como atalhos para combinações. Não
há módulo nem jornada para manter. Ver
[`docs/decisions/0013`](docs/decisions/0013-fluxos-e-controles-por-componente.md).

O motor também oferece um escopo de handoff serializado na URL: uma allowlist
neutra de cenários, padrões de rota e componentes filtra as superfícies de
descoberta e bloqueia navegação incidental fora do trabalho entregue. É um
recorte de foco/UX, não uma fronteira de segurança; isolamento real continua
responsabilidade do build ou da autenticação do produto.

## Desenvolvimento

```bash
pnpm install
pnpm check
```

```bash
pnpm -C packages/template dev
```

O template consome o motor por `workspace:*`, então uma alteração no motor
aparece no template com um rebuild — sem publicar versão.

## Criar um produto novo

```bash
cp -R packages/template ../<produto>-design-space
```

Depois siga [`packages/template/README.md`](packages/template/README.md). O
template **inicia** projeto e nunca atualiza projeto existente: melhoria contínua
do motor chega por versão do pacote.

## Distribuição

| Mecanismo | Serve para | Limitação |
| --- | --- | --- |
| Template | Criar produto novo com estrutura inicial. | Não atualiza repositório existente. |
| Pacote versionado | Entregar melhoria contínua do motor. | Só altera o que está encapsulado como dependência. |
| CLI de migração | Mover arquivo, pasta e configuração. | Não existe ainda — só quando a primeira migração real aparecer. |

Fluxo de release: alterar o motor, testar, publicar versão semântica, abrir PR
automático em cada produto, validar com build e testes por produto, mesclar com
controle. **Sem merge automático** de versão incompatível.

## Princípios

1. **Situação antes de pixel.** Uma tela é uma rota; o que se revisa são as variações dela, com o nome que o negócio usa.
2. **Cenário antes de mockup.** Toda interface relevante é acessível em estado nomeado e reproduzível.
3. **Especificação executável.** A referência funciona e reage, não apenas parece correta.
4. **Independência do stack real.** O ambiente interno é padronizado mesmo quando o cliente usa Phoenix, React ou Flutter.
5. **UI exclusiva por produto.** Nenhuma abstração compartilhada força produtos distintos a parecerem iguais.
6. **Motor pequeno e neutro.** Compartilha-se shell, ferramenta e convenção.
7. **Dados controlados por padrão.** Fixture sintética mantém cenário estável.
8. **IA como participante de primeira classe.** Estrutura, nomes e contratos são legíveis por agente.
9. **Governança proporcional.** Exploração é rápida. Validação existe sem burocracia de produção.
10. **Abstração comprovada.** Só entra no motor o que já provou ser genérico em mais de um produto.

## Ver também

- [`packages/core/README.md`](packages/core/README.md) — API do motor.
- [`AGENTS.md`](AGENTS.md) — instruções e guardrails para agentes de IA.
- [`docs/setup.md`](docs/setup.md) — **os passos que exigem suas credenciais**:
  publicar no npm, criar projeto no provedor de hospedagem, quando houver, e a
  decisão de contrato antes do primeiro preview público.
- [`docs/decisions/`](docs/decisions/) — decisões **do modelo**: valem para todos os
  Design Spaces e vivem aqui uma vez só. Repositório de produto registra apenas o
  que é específico dele.

## Estado

Fases 1 e 2 construídas e verificadas localmente.

| Repositório | Papel | Verificação |
| --- | --- | --- |
| `design-space/packages/core` | motor | typecheck, build, 151 testes |
| `design-space/packages/template` | molde | typecheck, build, 13 testes, 18 jornadas |

Os dois produtos vivem em repositórios privados, e o registro do que a Fase 2
provou fica com eles: a fronteira se sustentou, um vazamento de CSS foi encontrado
e travado por teste, e exatamente uma capacidade foi extraída para o motor — por
evidência, não por antecipação.

Pendente, porque depende de você:

| Passo | Por quê |
| --- | --- |
| Criar o projeto no provedor de hospedagem, quando houver | requer conta |
| Revisar cenários | requer uma pessoa de negócio |

Tudo detalhado em [`docs/setup.md`](docs/setup.md).
