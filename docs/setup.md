# Setup — o que exige credencial ou decisão

O que um Design Space novo precisa e que nenhum agente executa: credencial de
conta, permissão de organização e decisão de contrato. Cada passo diz o que fazer,
por que, e como conferir que funcionou.

Os passos são por produto. O motor deste repositório não vira site — ele é
publicado como pacote.

## 1. Publicar o motor no npm

Com o secret `NPM_TOKEN` no repositório, criar a tag `core-v<versão>` dispara
[`.github/workflows/release.yml`](../.github/workflows/release.yml), que roda
`pnpm check`, confere que a tag casa com a versão do `package.json` e publica com
provenance.

```bash
gh secret set NPM_TOKEN
git tag core-v<versão> && git push origin core-v<versão>
```

## 2. Produto apontando para a versão publicada

O template consome o motor por `workspace:*`, que só resolve dentro deste
monorepo. Em um repositório de produto isso precisa virar a versão publicada, ou o
`pnpm install` falha — e o build no CI falha com ele.

Para desenvolver motor e produto ao mesmo tempo, dá para apontar temporariamente
para a pasta local:

```bash
pnpm add @brucesantos/design-space@link:../design-space/packages/core
```

Só lembre de voltar para a versão publicada antes de commitar.

## 3. Criar o repositório do produto

Design Space de cliente vive em repositório **privado**:

```bash
gh repo create <org>/<produto>-design-space --private --source=. --push
```

## 4. Hospedagem, quando houver

O padrão do template é **nenhuma**: `pnpm dev` local é um uso completo do modelo.
Ver [`0007`](decisions/0007-hospedagem-opcional.md) para o que se ganha e o que se
perde em cada caminho.

Optando por publicar, `pnpm setup:hosting <provedor>` instala os arquivos do
provedor, e o que sobra é de conta:

1. Criar o projeto no provedor, apontando para o repositório.
2. Gravar os secrets que o workflow de deploy usa.
3. **Desligar a proteção de acesso do preview.** É ela que faria quem revisa bater
   em tela de login — ver o passo 5.
4. Anotar a URL de produção: é o link permanente do catálogo.

Confira o que mais importa: abra uma rota profunda direto, em janela anônima.

```
https://<projeto>/<rota-profunda>?scenario=<modulo>.<situacao>
```

Precisa abrir a situação certa sem login e sem 404. Se der 404, o rewrite de SPA
não foi aplicado.

## 5. Preview público

Todos os Design Spaces publicados ficam com preview **público e sem login** —
postura padrão, não decisão caso a caso. Ver
[`0004`](decisions/0004-preview-publico-sem-autenticacao.md).

A proteção é URL não adivinhável mais o header `noindex`, que o `vercel.json` do
template já manda. Mesmo modelo de link compartilhado do Figma.

Fechar um preview não é ligar uma chave: a autenticação de deployment exige que
cada pessoa que revisa seja membro do time no provedor, e em plano pago seat é
pago. É passar a administrar acesso, e é o oposto do que este ambiente existe para
fazer.

## 6. Convidar quem vai revisar

GitHub → Settings → Collaborators, permissão **Read**. É gratuito e não consome
seat de hospedagem. Quem revisa não precisa de conta no provedor — só do link.

O `feedback-collector` não exige conta nenhuma, mas roda em desenvolvimento (ver a
decisão [`0005`](decisions/0005-source-mapping-so-em-desenvolvimento.md)).

## 7. Primeira revisão com uma pessoa de negócio

É o que falta para os cenários saírem de `em revisão`. Escolha os três cenários que
mais rendem conversa — normalmente uma recusa, um conflito e um bloqueio por
permissão — e leve uma pergunta por cenário, não uma apresentação.

Depois da revisão, para cada cenário aprovado: mude `status` para `"approved"` e
preencha `approvedAt` com a **URL de commit**, não a de branch. O validador avisa se
você esquecer — aprovação sem URL imutável muda de conteúdo debaixo de quem
aprovou.

Sem hospedagem não existe URL de commit: registre o permalink do commit no Git e
anote a escolha nas decisões do produto.

## 8. Dependabot ou Renovate no produto

Quando sair uma versão nova do motor, o PR deve ser aberto automaticamente em cada
produto — e o merge **não** deve ser automático. O `.github/dependabot.yml` do
template já vem configurado para isso.
