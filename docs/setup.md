# Setup — o que só você pode fazer

O código está pronto e verificado localmente. Os passos abaixo exigem
credenciais, aprovação de conta ou decisão de contrato, então ficaram sem
execução de propósito. Cada um diz o que fazer, por que, e como conferir que
funcionou.

## 1. Publicar o motor no npm

O pacote `@brucesantos/design-space` está pronto para publicar: `files`,
`exports`, `types`, `peerDependencies` e `CHANGELOG.md` configurados.

Confira o conteúdo do tarball antes:

```bash
pnpm -C packages/core pack --pack-destination /tmp && tar -tzf /tmp/brucesantos-design-space-0.1.0.tgz
```

Deve conter apenas `dist/`, `README.md`, `CHANGELOG.md` e `package.json` — nada de
`src/`, nada de teste.

Depois:

```bash
pnpm -C packages/core publish --access public
```

`--access public` é necessário na primeira publicação de um pacote com escopo,
senão o npm assume privado e recusa sem plano pago.

**Automatizado depois:** com o secret `NPM_TOKEN` no repositório, criar a tag
`core-v0.1.0` dispara `.github/workflows/release.yml`, que roda `pnpm check`,
confere que a tag casa com a versão do `package.json` e publica com provenance.

## 2. Trocar o link local pela versão publicada

`bloomy-design-space` hoje consome o motor por link de sistema de arquivos:

```json
"@brucesantos/design-space": "link:../design-space/packages/core"
```

Isso funciona e é conveniente para desenvolver os dois lados junto, mas amarra o
produto ao caminho da sua máquina. Depois de publicar:

```bash
cd ../bloomy-design-space
pnpm add @brucesantos/design-space@^0.1.0
pnpm check
```

Se preferir manter o link durante a Fase 1, mantenha — só não faça deploy na
Vercel com ele, porque o build remoto não encontra o caminho.

## 3. Criar os repositórios no GitHub

`design-space` já tem remote (`bananas-global/design-space`) e dois commits
locais. Nada foi enviado.

```bash
cd design-space && git push -u origin main
```

`bloomy-design-space` é um repositório novo, ainda sem remote. Crie **privado** —
Design Space de cliente vive em repositório privado controlado pela Bananas:

```bash
cd ../bloomy-design-space
gh repo create bananas-global/bloomy-design-space --private --source=. --push
```

`finaya-design-space` também. Ele é o segundo produto e serve de referência viva da
fronteira do motor, então vale versionar mesmo com os tokens ainda provisórios:

```bash
cd ../finaya-design-space
gh repo create bananas-global/finaya-design-space --private --source=. --push
```

## 4. Criar os projetos na Vercel

Um projeto por repositório de produto. O motor **não** vira site: ele é publicado
como pacote.

Para `bloomy-design-space`:

1. Vercel → Add New → Project → importe o repositório.
2. Framework detectado: Vite. Nada a configurar — `vercel.json` já tem o rewrite
   de SPA e o header `noindex`.
3. **Deployment Protection → desligue Vercel Authentication para preview.** No
   plano Pro ela vem ligada, e é ela que faria o cliente bater em tela de login.
   Vale para todos os projetos — ver o passo 5.
4. Anote a URL de produção: é o link permanente do catálogo.

Confira o que mais importa: abra uma rota profunda direto, em janela anônima:

```
https://<projeto>.vercel.app/finance/claims/GUI-4042?scenario=finance.insurance-denied
```

Precisa abrir a guia recusada sem login e sem 404. Se der 404, o rewrite não foi
aplicado.

## 5. Preview público — decidido para todos

Todos os Design Spaces ficam com preview **público e sem login**. É postura padrão,
não decisão caso a caso.

Na Vercel: **Deployment Protection → desligue Vercel Authentication para preview**
em cada projeto. No plano Pro ela vem ligada por padrão.

**Por que não vale a pena deixar ligada**, e isso não está claro no documento de
arquitetura, que descreve como "um toggle": Vercel Authentication exige que cada
pessoa que revisa seja **membro do time na Vercel**, e no Pro seat é pago. Mandar um
fluxo para um cliente deixaria de ser mandar um link e passaria a ser adicionar
pessoa e pagar por revisor.

Se um dia algum projeto precisar ser fechado, as alternativas a checar antes são
Password Protection (senha compartilhada, sem conta por pessoa) e shareable links por
deployment — não conferi disponibilidade nem preço das duas no plano atual.

O `noindex` permanece em todos: preview aberto não é preview indexado.

## 6. Convidar quem vai revisar

GitHub → Settings → Collaborators, permissão **Read**. É gratuito e não consome
seat da Vercel. Quem revisa não precisa de conta na Vercel — só do link.

Para comentar em thread na Vercel Toolbar, aí sim precisa de conta. O
`feedback-collector` não precisa de conta nenhuma, mas roda em desenvolvimento
(ver `bloomy-design-space/docs/decisions/0003`).

## 7. Primeira revisão com uma pessoa de negócio

É o passo 6 da sequência de execução do documento, e o que falta para os cenários
saírem de `em revisão`.

Sugestão de roteiro, com os três cenários que mais rendem conversa:

| Link | Pergunta a fazer |
| --- | --- |
| `?scenario=finance.insurance-denied` | "O motivo da recusa está claro o suficiente para você saber o que fazer?" |
| `?scenario=agenda.double-booking` | "Assim você percebe o conflito antes dos dois pacientes chegarem?" |
| `?scenario=patients.minor-without-guardian` | "Faz sentido bloquear o agendamento aqui, ou a clínica precisa de uma exceção?" |

Depois da revisão, para cada cenário aprovado: mude `status` para `"approved"` e
preencha `approvedAt` com a **URL de commit** (não a de branch) e o sha. O
validador avisa se você esquecer — aprovação sem URL imutável muda de conteúdo
debaixo de quem aprovou.

## 8. Dependabot ou Renovate nos produtos

Quando sair uma versão nova do motor, o PR deve ser aberto automaticamente em cada
produto — e o merge **não** deve ser automático. O arquivo
`.github/dependabot.yml` do template já vem configurado para isso.

## Checklist

- [ ] `pnpm -C packages/core publish --access public`
- [ ] `bloomy-design-space` apontando para a versão publicada
- [ ] `design-space` enviado para o GitHub
- [ ] `bloomy-design-space` criado como repositório **privado**
- [ ] `finaya-design-space` criado como repositório **privado**
- [ ] Projeto Vercel do Bloomy criado
- [ ] Rota profunda abrindo em janela anônima, sem 404
- [x] Preview público decidido para todos os projetos
- [ ] Vercel Authentication desligada em cada projeto criado
- [ ] Primeira revisão com pessoa de negócio feita
- [ ] Cenários aprovados com `approvedAt` preenchido por URL de commit
