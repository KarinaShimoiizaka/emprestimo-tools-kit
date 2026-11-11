---
name: imagens-equipamentos
description: Use quando for obter, trocar, revisar ou publicar a foto de um equipamento do EMPREST.AI (catálogo, dados iniciais, seed). É a única origem permitida de foto de equipamento. Não use para logo, landing ou ilustração.
---

# Fotos de equipamento

Toda foto de equipamento do EMPREST.AI sai desta skill: buscada no Pixabay,
recortada em 800×600, com crédito registrado, revisada pela pessoa e
publicada no Supabase Storage **pela pessoa**. Qualquer outra origem de foto
de equipamento é substituída pela saída daqui.

O que precisa ser garantido, e como, está em
[references/contrato.md](references/contrato.md). Não repita o contrato aqui:
se mudar, muda lá.

## Antes de começar

- O sharp está instalado na raiz (`node_modules/sharp`)? Se não, pare e peça
  à pessoa para rodar `npm install` na raiz. O agente não instala dependência.
- A chave `PIXABAY_API_KEY` está no `.env` da raiz. Não abra o `.env`: se o
  script disser que falta, peça à pessoa.

## Passo a passo

1. **Preparar** (o agente pode rodar, na raiz):
   `npm run imagens:preparar`
   Busca cada item de [references/equipamentos.json](references/equipamentos.json),
   escolhe a primeira foto que passa nas regras de
   [scripts/lib/selecao.js](scripts/lib/selecao.js), baixa, recorta e grava
   `imagens/manifesto.json` e `imagens/revisao.html`. Equipamento que já tem
   foto preparada é mantido.
2. **Pedir a revisão.** Indique `imagens/revisao.html` à pessoa e os
   critérios de [references/revisao.md](references/revisao.md). Não aprove nem
   reprove por ela.
3. **Trocar as reprovadas.** Para cada uma, com o motivo que a pessoa disse:
   `npm run imagens:preparar -- --reprovar TI-0005 "pessoa ao fundo"`
   (várias de uma vez repetindo `--reprovar`). Volte ao passo 2 só com as
   trocadas.
4. **Publicar: é a pessoa que roda.** Quando ela aprovar as 12, entregue o
   comando para ela rodar no terminal dela:
   `npm run imagens:publicar`
   O script exige terminal interativo e a palavra `APROVO`. O agente nunca
   roda, e o guarda bloqueia se tentar.
5. **Commit:** entregue os comandos para a pessoa commitar
   `imagens/manifesto.json` (só ele: as fotos e o cache ficam fora do git).

## O que o agente não faz

- Rodar o `publicar` ou qualquer coisa que escreva no Supabase.
- Buscar foto fora do Pixabay, ou baixar foto que não veio do `preparar`.
- Escolher à mão uma foto que a pessoa não viu na página de revisão.
- Editar `imagens/manifesto.json` à mão: quem escreve é o script.
- Ler `.env` ou mostrar chave.

## Se algo falhar

- **"NENHUMA candidata"** para um equipamento: a busca não trouxe foto que
  passe nas regras. Mostre os motivos de descarte à pessoa; trocar o termo de
  busca da lista é decisão dela (a lista é a mesma para a turma toda).
- **Limite da API (429):** o script espera sozinho. As buscas ficam em cache
  por 24 h, então rodar de novo não gasta requisição.
- **Tamanho diferente de 800×600:** o script apaga o arquivo e para. Não
  contorne: descubra por quê.
