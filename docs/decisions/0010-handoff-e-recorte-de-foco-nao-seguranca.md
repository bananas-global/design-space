# D-10 — Handoff por URL é recorte de foco, não fronteira de segurança

## Contexto

`chrome=0` remove as ferramentas do ambiente, mas não define o que foi entregue
para implementação. Mesmo em uma revisão limpa, a URL ainda podia alcançar Home,
busca, jornadas, referências portadas, rotas e componentes de todo o produto.

Uma pessoa desenvolvedora precisa receber um endereço reproduzível que mostre o
trabalho autorizado sem transformar o catálogo inteiro em navegação incidental.
O motor, porém, não conhece o domínio do produto e não pode decidir quais itens
pertencem a um ticket.

## Decisão

O handoff usa uma allowlist genérica e serializável na própria URL:

- `allowScenario` autoriza cenários e as rotas declaradas por eles;
- `allowRoute` autoriza padrões de rota sem cenário;
- `allowComponent` autoriza referências do catálogo visual;
- `handoff=1` mantém o recorte explícito, inclusive quando a lista está vazia.

As listas filtram Home, árvore, busca, jornadas, referências portadas e
componentes. A navegação interna preserva o recorte. Uma tentativa de abrir um
item ou rota fora dele renderiza uma mensagem do motor e não monta a tela do
produto solicitada. A raiz continua disponível como Home já filtrada.

O Inspector mantém o Diagnóstico como visão do catálogo inteiro e o identifica
explicitamente como geral do produto. O handoff reduz distração e ambiguidade;
não promete ocultar metadados globais do ambiente.

## Consequências

O consumidor escolhe a allowlist ao montar o link, sem mudar o schema dos
cenários e sem adicionar vocabulário de domínio ao motor. O mesmo endereço abre
o mesmo recorte e pode combinar handoff com viewport, aparência, acessibilidade
ou `chrome=0`.

Este mecanismo não é autorização. O catálogo e os bundles continuam chegando ao
navegador, e uma pessoa com acesso ao preview pode alterar a URL ou inspecionar os
arquivos carregados. Quando isolamento real for requisito, o produto precisa
publicar um build separado contendo somente o recorte ou proteger o preview com
autenticação e autorização próprias.
