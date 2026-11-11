# Revisão visual das fotos

O filtro por tags pega só o que o fotógrafo marcou. Uma pessoa ao fundo, um
logo pequeno na tampa do notebook ou uma tela ligada com texto passam pelo
filtro. Por isso **toda foto é revisada pela pessoa** antes de publicar.

## Reprova se a foto tiver

1. **Pessoa:** rosto, corpo, mão ou braço, mesmo ao fundo, desfocada ou em
   reflexo.
2. **Marca ou logo legível:** logotipo na tampa, no teclado, na base do
   monitor ou na lente; nome de fabricante que dá para ler.
3. **Texto:** qualquer palavra legível (cartaz, caderno, embalagem, etiqueta).
4. **Tela com conteúdo:** monitor, notebook ou celular ligado mostrando
   site, código, app, foto ou papel de parede com conteúdo. Tela preta,
   desligada ou com cor lisa pode.
5. **Não representa o equipamento:** a foto não mostra o item do nome (por
   exemplo, um cabo VGA para "Cabo HDMI", ou um celular para "Webcam").
6. **Recorte ruim:** o recorte para 800×600 cortou o equipamento de um jeito
   que ele não é reconhecido.

## Como funciona

1. O agente roda o `preparar.js` e indica `imagens/revisao.html`.
2. A pessoa abre a página e diz, no chat, quais reprova e por qual item
   acima.
3. Para cada reprovada, o agente roda
   `preparar.js --reprovar TI-xxxx "<motivo dito pela pessoa>"`. A foto vai
   para a lista `reprovadas` do manifesto, nunca mais é escolhida (para
   nenhum equipamento) e o equipamento recebe a próxima candidata.
4. Repete até a pessoa aprovar as 12.
5. A aprovação final é da pessoa, digitada no `publicar.js`.

O agente não reprova nem aprova por conta própria: o motivo registrado é o
que a pessoa disse.
