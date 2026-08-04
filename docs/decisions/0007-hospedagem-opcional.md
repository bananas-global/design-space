# 0007 — Hospedagem é opcional, e o motor não conhece provedor

**Status:** aceita · **Data:** 2026-08-04 · Vale para todos os Design Spaces.

## Contexto

O modelo nasceu com a Vercel dentro dele. `getDeployContext` lia `VERCEL_*` do
ambiente, `commitUrl` montava `*.vercel.app` na mão, e o template já vinha com
`vercel.json` e um workflow que só faz sentido com a integração Git da Vercel
ligada.

Duas coisas ficaram evidentes ao preparar o primeiro Design Space que não vai ter
preview publicado:

1. **A leitura de ambiente no motor nunca funcionou.** O motor é biblioteca
   compilada: o `import.meta.env` do código dele foi resolvido no build do pacote.
   Já corrigido em 0.1.1, quando o contexto passou a vir do produto — mas o código
   morto ficou, e com ele a impressão de que o motor "detecta" hospedagem.

2. **Um projeto sem hospedagem parecia projeto incompleto.** Nada quebrava, mas
   todo documento descrevia preview público como fato consumado, e o produto sem
   preview aparecia como caso degradado de um modelo que pressupõe um fornecedor.
   Aparência de pendência muda decisão de time.

## Decisão

**Hospedagem é escolha do produto, não pressuposto do modelo. O motor não cita nem
conhece provedor.**

- O motor recebe o contexto do deployment por `ProductDefinition.deploy` e não lê
  ambiente. `commitUrl` recebe um template de URL do produto.
- Um teste do motor reprova o build se qualquer arquivo dele citar um provedor de
  hospedagem, ou se `deploy/index.ts` voltar a ler ambiente.
- No template, os arquivos de cada provedor vivem em `hosting/<provedor>/` e são
  instalados por `pnpm setup:hosting <provedor>`. O padrão é `none`.
- As variáveis de build do template se chamam `VITE_DEPLOY_*`, não o nome de um
  fornecedor: quem publica muda, o contrato com o motor não.

Rodar só local é uso completo do modelo. O que muda sem hospedagem é o cabeçalho da
revisão, que omite branch e commit.

## Consequência que precisa ser dita

Sem hospedagem não existe revisão **assíncrona** e não existe URL imutável de
aprovação. `approvedAt` continua obrigatório em cenário aprovado, e o substituto é
o permalink do commit no Git — que exige acesso ao repositório para abrir.

Isso não abre a decisão [0004](0004-preview-publico-sem-autenticacao.md): quando
houver preview, ele continua público e sem login. O que esta decisão diz é que
**não haver preview** é uma opção legítima, e que o produto que escolhe isso
registra a escolha nas próprias decisões.

## O que foi rejeitado

- **Um `if` no motor, por provedor.** Cada fornecedor entraria no pacote e todo
  produto herdaria todos. A fronteira do motor já proíbe isso por outro motivo, e o
  raciocínio é o mesmo: o que não é neutro pertence ao produto.
- **Parâmetro na instalação do pacote.** Instalar dependência não gera arquivo no
  repositório de quem instala. A escolha só faz sentido onde os arquivos nascem, e
  isso é o template.
