# SPEC-FLOW.md — EMPREST.AI

O caminho de uma spec, do rascunho até ser declarada pronta.

Complementa a convenção "Spec antes do código" do
[AGENT.md](../../AGENT.md), seção 5. Lá está o princípio; aqui está a
sequência, quem faz cada passo e o que garante que nenhum passo é pulado.

---

## Onde mora

| Caminho | O quê |
|---|---|
| `backend/specs/spec-<nome>.md` | specs do backend, numeradas `BE-nn` |
| `frontend/specs/spec-<nome>.md` | specs do frontend, numeradas `FE-nn` |
| `.claude/agents/verificador-spec.md` | o subagente que verifica os critérios de aceite |
| `docs/verificacoes/` | uma rodada do verificador por arquivo, gravada pelo hook |

## Status de uma spec

A linha `**Status:**` logo abaixo do título usa um destes três valores,
seguido, se precisar, de uma frase sobre o estado do código:

| Status | Quer dizer | Quem muda para ele |
|---|---|---|
| `rascunho` | escrita, ainda não aprovada; código não começa | quem escreveu |
| `aprovada` | a pessoa aprovou; pode ser implementada, ou já está, mas ainda não passou pelo verificador | a pessoa |
| `pronta` | a rodada mais recente do verificador deu `Veredito: PRONTA` | o agente principal, e só se o hook deixar |

## O fluxo

| # | Passo | Quem | Saída |
|---|---|---|---|
| 1 | Escrever a spec, com "Fora de escopo", "Critérios de aceite" e "Decisões em aberto" | pessoa ou IA, quando pedido | spec em `rascunho` |
| 2 | Aprovar a spec | pessoa | spec `aprovada` |
| 3 | Implementar, com o teste de cada regra ([tests.md](tests.md)) | IA ou pessoa | mudança no working tree |
| 4 | Rodar as checagens ([checks.md](checks.md)) | quem implementou | resultado de cada checagem |
| 5 | **Chamar o subagente `verificador-spec`** | agente principal | tabela de CAs e veredito, gravados em `docs/verificacoes/` pelo hook |
| 6 | Se `PRONTA`: mudar o status para `pronta` | agente principal | spec `pronta` |
| 7 | Handoff ([handoff.md](handoff.md)) | agente principal | última mensagem da sessão |

---

## Regras

1. **O verificador-spec é chamado sempre.** Toda tarefa que implementa ou
   altera código descrito por uma spec termina com uma chamada a ele, antes
   do handoff. Não há exceção por tamanho da mudança, por pressa ou porque
   "os testes já passaram".
2. **Spec só é declarada pronta com veredito `PRONTA`** do verificador.
   O agente que implementou não declara a própria spec pronta.
3. **O verificador roda com contexto limpo.** O agente principal chama o
   subagente `verificador-spec` e passa só o que o arquivo dele pede: o
   caminho da spec e o que verificar em cada repositório tocado (intervalo
   de commits, lista de arquivos, ou "tudo que implementa esta spec"). Não
   passa resumo do que foi feito nem opinião sobre o resultado.
4. **A resposta do verificador entra no handoff como saiu.** A tabela, os
   checks e o veredito são copiados, não resumidos nem reinterpretados. O
   registro em `docs/verificacoes/` é do hook: nenhum agente cria, edita ou
   apaga arquivo ali.
5. **`NÃO PRONTA` volta para o passo 3.** O agente principal corrige o que
   foi apontado e chama o verificador de novo, em uma execução nova. Não
   argumenta com o veredito nem edita a tabela. **O verificador não corrige
   nada, nem teste quebrado:** ele aponta, e quem corrige é o agente
   principal.
6. **CA `AMBÍGUO` volta para a pessoa**, não para o código. O que falta
   decidir entra em "Decisões" no handoff, apontando a spec.
7. **CA `OUTRO REPOSITÓRIO` é pendência**, não aprovação. O handoff diz em
   qual ponta ele precisa ser verificado, e a rodada seguinte inclui aquele
   repositório.
8. **Se não der para chamar o verificador**, o handoff diz que ele não
   rodou e por quê, e a spec não é declarada pronta (ver
   [checks.md](checks.md), regra 1).

---

## Como é garantido

As regras acima não dependem de alguém lembrar delas:

| O quê | Mecanismo | Onde |
|---|---|---|
| O verificador existe para o Claude Code | subagente em `.claude/agents/`, descoberto sozinho | [verificador-spec.md](../../.claude/agents/verificador-spec.md) |
| Spec não vira `pronta` sem veredito `PRONTA` | hook `PreToolUse` em Edit/Write: confere a rodada mais recente da spec em `docs/verificacoes/` e bloqueia se não for `PRONTA`; o mesmo vale para mudar o status pelo terminal | [exige-verificacao.js](../../.claude/hooks/exige-verificacao.js), [guarda-comandos.js](../../.claude/hooks/guarda-comandos.js) |
| Toda rodada fica registrada, como saiu | hook `SubagentStop` grava a resposta com data e commit dos dois repositórios | [registra-verificacao.js](../../.claude/hooks/registra-verificacao.js) |
| Ninguém forja ou apaga um registro | `Edit(/docs/verificacoes/**)` em `permissions.deny`; o guarda bloqueia comando de terminal que cite a pasta | [settings.json](../../.claude/settings.json) |
| O verificador não corrige nada | sem Edit e Write; o Bash dele só roda build, teste e git de leitura | `tools` do subagente e [guarda-comandos.js](../../.claude/hooks/guarda-comandos.js) |
| O verificador não toca em produção | a lista fechada não inclui `prisma`, CLIs de deploy, nem nada que leia `.env` | idem |

> **Decidido em 11/11/2026:** o subagente mora em `.claude/agents/`, não em
> `.agents/` (era a decisão em aberto 1). Em `.agents/` o Claude Code não o
> descobria, e a chamada dependia de o agente principal ser mandado ler o
> arquivo.

## Decisões em aberto

| # | Questão | Efeito |
|---|---|---|
| 1 | O nome do teste passa a citar o ID do CA (ex.: `FE-03 CA-3`)? | hoje o verificador liga teste e CA pelo `describe` e pela asserção; com o ID, a ligação fica direta |
| 2 | BE-01, BE-02 e FE-01 ganham seção "Critérios de aceite"? | sem ela, o verificador dá `NÃO PRONTA` para essas specs |
