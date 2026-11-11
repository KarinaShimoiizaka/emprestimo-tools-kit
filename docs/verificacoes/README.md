# Verificações

Uma rodada do `verificador-spec` por arquivo, gravada como saiu.

Quem escreve aqui é o hook
[registra-verificacao.js](../../.claude/hooks/registra-verificacao.js), no
momento em que o subagente termina. Nenhum agente edita, apaga ou cria
arquivo nesta pasta: `Edit(/docs/verificacoes/**)` está em
`permissions.deny` e o [guarda-comandos](../../.claude/hooks/guarda-comandos.js)
bloqueia qualquer comando de terminal que cite a pasta.

## Nome do arquivo

`<ID da spec>_<AAAA-MM-DD_HHMMSS>_<agent_id>.md`, por exemplo
`FE-03_2026-11-11_143205_a1b2c3d4.md`. A ordem alfabética é a ordem no tempo.

## Para que serve

- **Comparar rodadas:** dois arquivos da mesma spec, lado a lado
  (`git diff --no-index <a> <b>`). O cabeçalho de cada um diz o commit e o
  estado do working tree de cada repositório naquela rodada.
- **Trava do status:** uma spec só passa a `**Status:** pronta` se o
  arquivo mais recente dela aqui tiver `Veredito: PRONTA`
  ([exige-verificacao.js](../../.claude/hooks/exige-verificacao.js)).
- **Evidência para o ENTREGA.md:** o histórico real de reprovações.
