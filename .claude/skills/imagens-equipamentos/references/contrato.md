# Contrato da skill imagens-equipamentos

O que a skill precisa garantir, vindo do enunciado da prática, e como cada
item é garantido aqui. "Código" quer dizer que o script falha se o requisito
não for cumprido; "instrução" depende de o agente seguir o `SKILL.md`;
"revisão" depende da pessoa.

| # | Requisito | Como é garantido | Tipo |
|---|---|---|---|
| 1 | **Fonte:** uma só API de imagens, com a chave da pessoa, nenhuma outra origem | `preparar.js` só chama `pixabay.com/api` e só baixa o `largeImageURL` do resultado; o manifesto guarda `fonte`, `pixabay_id` e `pagina` de cada foto; `publicar.js` recusa item com `fonte` diferente de `Pixabay` | código |
| 2 | **Direito de imagem:** nenhuma foto com pessoa, marca ou logo legível, texto ou tela com conteúdo | `preparar.js` descarta foto com tag proibida na escolha automática ([selecao.js](../scripts/lib/selecao.js)); na foto escolhida pela pessoa pelo número (`--escolher`), a tag proibida vira aviso no manifesto. A API não tem filtro de pessoa nem de logo, então **toda foto passa pela revisão da pessoa** ([revisao.md](revisao.md)), e o `publicar.js` só roda com a confirmação dela | código + revisão |
| 3 | **Mesmo tamanho:** todas em 800×600, garantido e não só pedido | `preparar.js` recorta com o sharp e relê o arquivo pronto: se não for 800×600, para. O `publicar.js` confere de novo antes de subir e confere outra vez baixando da URL pública | código |
| 4 | **Sem repetição:** uma foto não aparece em dois equipamentos | `preparar.js` não escolhe um `pixabay_id` já em uso nem um já reprovado; `publicar.js` recusa manifesto com `pixabay_id` ou `sha256` repetido | código |
| 5 | **Créditos:** de onde veio, quem fotografou, sob qual licença | o manifesto (`imagens/manifesto.json`, versionado) guarda `pagina`, `autor`, `autor_pagina`, `licenca` e `licenca_url` de cada foto; `publicar.js` recusa item sem esses campos | código |
| 6 | **Armazenamento:** bucket público do Supabase Storage; repetir não duplica | caminho fixo por patrimônio (`equipamentos/TI-0001.jpg`) com `x-upsert: true`: repetir sobrescreve o mesmo objeto. O `publicar.js` confere que o bucket é público e que cada foto abre pela URL pública sem login | código |
| 7 | **Produção:** o agente prepara, mas não envia ao Supabase do deploy | `publicar.js` só roda em terminal interativo e pede a confirmação digitada; o [guarda-comandos](../../../hooks/guarda-comandos.js) e o `permissions.deny` bloqueiam o comando para qualquer agente; o agente não lê `.env` (deny + guarda) | código + instrução |
| 8 | **Segredos e dependências:** nenhuma chave em código ou no git; nenhuma biblioteca fora do que as rules e ADRs permitem | as chaves são lidas dos `.env` (fora do git) na hora de rodar e nunca impressas; a única dependência é o sharp, decidida no [ADR-002](../../../../docs/adrs/adr-002-imagens-equipamentos.md) | código + ADR |
| 9 | **Crédito na tela:** a tela que exibe as fotos mostra o crédito com link | fora desta skill: é da tela do catálogo, e o briefing de "solicitar empréstimo" pede o catálogo sem crédito. Decidido na fase 4 | — |

## Desvio do enunciado

O enunciado pede a API do **Pexels**. Esta skill usa o **Pixabay**, porque o
Pexels estava limitando as requisições (rate limiting). A decisão e as
consequências estão no [ADR-002](../../../../docs/adrs/adr-002-imagens-equipamentos.md).
