# Entrega da prática

> Documento em construção, preenchido a cada fase. **Fase atual: 1 (subagente
> verificador).** As colunas "commit" ficam como `pendente` até os arquivos
> serem commitados.

## Links
- Repositório da raiz (AGENT.md, docs, subagente, hooks, este arquivo): https://github.com/KarinaShimoiizaka/emprestimo-tools-kit
- Repositório backend: https://github.com/KarinaShimoiizaka/emprestimo-backend
- Repositório frontend: https://github.com/KarinaShimoiizaka/front-do-projeto
- Produção (Vercel): pendente

## 1. Conflitos: o que foi pedido contra o que já existia

| pedido | contrariava o quê | o que você fez | por quê | onde ficou registrado | commit |
|--------|-------------------|----------------|---------|-----------------------|--------|
| Tech lead: "quando a única falha for um teste quebrado, o verificador pode corrigir o teste e verificar de novo" | O requisito "Independência" do próprio enunciado (o verificador não corrige o que encontra) e a regra 5 do `spec-flow.md` | Recusei. O verificador marca o CA como REPROVADO e explica o que está quebrado; quem corrige é o agente principal, que chama uma rodada nova | Corrigir o teste é mudar a evidência que o verificador está julgando. Um verificador que conserta o que avalia pode "aprovar" um CA afrouxando a asserção, que é o que a regra 8 do `tests.md` proíbe | `.claude/agents/verificador-spec.md` (seção "Teste quebrado"); `docs/rules/spec-flow.md`, regra 5 | pendente |

## 1b. Lacunas: o que foi pedido de forma incompleta

| spec | o que faltava | alternativas | o que decidiu | por quê | commit |
|------|---------------|--------------|---------------|---------|--------|
| spec-flow | O que conta como "spec pronta". Os status eram texto livre ("proposta", "implementada", "escrita depois da implementação") | (a) manter texto livre; (b) vocabulário fixo `rascunho → aprovada → pronta` | (b) | A trava precisa de um valor exato para conferir; com texto livre não há o que bloquear. Registrado em `spec-flow.md`, "Status de uma spec", e aplicado às cinco specs | pendente |
| spec-flow | Como tornar a chamada ao verificador obrigatória "sem depender de alguém lembrar" | (a) instrução no `CLAUDE.md`/`spec-flow.md`; (b) hook `Stop` que impede encerrar a sessão com código alterado e sem verificação; (c) hook que bloqueia mudar o status para `pronta` sem rodada `PRONTA` registrada | (c) | É o que o requisito pede: nenhuma spec declarada pronta sem passar por ele. (a) continua dependendo de lembrar. (b) dispara em qualquer edição pequena e não sabe qual spec o código implementa | pendente |
| verificador | Como tornar duas rodadas "comparáveis lado a lado" | (a) o agente principal copia a resposta para um arquivo; (b) um hook grava a resposta sozinho, com o commit de cada repositório, numa pasta que nenhum agente edita | (b) | (a) depende do agente e permite resumir ou editar o resultado. (b) é fiel ao que saiu, e a mesma pasta serve de base para a trava do status | pendente |
| verificador | Como impedir o verificador de escrever, migrar ou publicar, se ele precisa de Bash para build e teste | (a) proibição em texto; (b) `permissions.deny` por prefixo; (c) lista fechada de comandos num hook, mais o deny global | (c) | Deny por prefixo é contornável (`git -C backend commit`, `sh -c "..."`). Uma lista fechada só deixa passar o que é conhecido: build, teste e git de leitura | pendente |
| projeto | Onde versionar o que fica na raiz (`AGENT.md`, `docs/`, `.claude/`, este arquivo). O enunciado fala em dois repositórios, mas a raiz não estava em nenhum, e sem commit nada da fase 1 é verificável | (a) a raiz vira um terceiro repositório; (b) mover tudo para o repositório do backend e abrir as sessões lá; (c) uma cópia em cada repositório | (a), decisão da pessoa: repositório `emprestimo-tools-kit` | Nada muda de lugar, e as sessões continuam enxergando back e front. (b) mudaria todos os caminhos; (c) teria duas cópias que divergem | pendente |
| projeto | O que da raiz entra no git | (a) tudo; (b) tudo menos `atividade/` | (b) | O enunciado em `atividade/` traz a senha padrão da turma, e a regra da prática é nenhuma senha no histórico do git. Registrado no `.gitignore` da raiz | pendente |
| projeto | Para qual banco o `backend/.env` aponta | (a) `.env` local apontando para o Postgres do Docker, credenciais de produção fora do projeto; (b) manter apontando para o Supabase do deploy | (b), decisão da pessoa: é um projeto de estudo | Consequência registrada em `secrets.md`, `migrations.md` e `tests.md`: nenhum comando do agente conecta no banco. O guarda bloqueia `prisma migrate`/`db` e `psql`, e o verificador para antes de `npm test` se algum teste usar banco real | pendente |

## 2. Onde o agente tentou decidir por você

- **Status das specs existentes.** Ao padronizar os status, o agente marcou
  como `aprovada` as specs cujo código já existia (BE-02, FE-01, FE-02,
  FE-03), inferindo a aprovação a partir da implementação. Isso não estava
  escrito em lugar nenhum. *A confirmar pela pessoa: quais dessas foram, de
  fato, aprovadas.*

## 3. Uma decisão que merece (ou não) um ADR
*A preencher nas fases 2 a 4. Candidatas: a troca do Pexels pelo Pixabay
como fonte de imagens; a biblioteca de imagem (sharp).*

## 4. A skill imagens-equipamentos
*A preencher na fase 2.*

## 5. O subagente verificador

- **Como é acionado e por que esse gatilho.** O agente principal chama o
  subagente `verificador-spec` ao fim de toda tarefa que implementa uma spec
  (`spec-flow.md`, regra 1). O que impede pular essa etapa é o hook
  `exige-verificacao.js`: ele bloqueia qualquer edição que leve uma spec a
  `**Status:** pronta` se a rodada mais recente dela em `docs/verificacoes/`
  não terminar em `Veredito: PRONTA`. Escolhi travar o status, e não o fim
  da sessão, porque o requisito fala em "declarar pronta"; ver seção 1b.
- **O que ele lê e por que lê em vez de herdar.** Lê `AGENT.md`,
  `restrictions.md`, `secrets.md`, `checks.md`, `tests.md`, a spec inteira e
  o trecho das specs citadas de que um CA dependa. Não herda a conversa
  porque a conversa é de quem implementou: traz as justificativas e o viés
  de quem quer ver a spec aprovada. Com contexto limpo, ele só tem a spec e
  o código.
- **O que ele não consegue fazer e como isso é garantido.**
  - Não edita arquivo: o `tools` dele é `Read, Grep, Glob, Bash`, sem Edit
    nem Write.
  - O Bash só roda uma lista fechada (`cd`, `npm test`, `npm run build`,
    git de leitura, `ls`, `pwd`), sem redirecionamento nem pipe. Isso é
    garantido pelo `guarda-comandos.js`, que reconhece o subagente pelo
    `agent_type`.
  - Não migra, não publica, não lê `.env`: nada disso está na lista, e o
    deny global também bloqueia para o agente principal.
  - Não forja nem apaga registro: `Edit(/docs/verificacoes/**)` está no
    deny, e o guarda bloqueia comando que cite a pasta.
  - Testado isoladamente com 80 casos (comandos que devem passar e que devem
    ser bloqueados), todos com o resultado esperado.
- **Back e front separados.** São dois repositórios git, e a sessão roda na
  raiz, que enxerga os dois. O verificador recebe o que verificar em cada
  repositório e procura a evidência nos dois. Quando a prova de um CA está
  na outra ponta e ela não foi informada, o status é `OUTRO REPOSITÓRIO`:
  pendência, não aprovação. O registro de cada rodada guarda o commit e o
  estado do working tree dos dois.

## 6. O verificador em ação
- **Histórico real:** nenhuma rodada ainda. Cada rodada fica em
  `docs/verificacoes/`.
- **Prova com erro plantado:** pendente. Adiada por decisão da pessoa;
  sugestão: fazer sobre a spec de solicitar empréstimo (fase 4).
- **Tabelas finais das duas specs:** fases 3 e 4.

## 7. Uma regra sua que esta prática pôs à prova

**`spec-flow.md`, regra 3, e o lugar do subagente.** A regra mandava o
agente principal "abrir um subagente que lê `.agents/verificador-spec.md`".
O Claude Code só descobre subagentes em `.claude/agents/`, então a chamada
dependia de o agente principal lembrar de ler o arquivo, que é justamente o
que o requisito "Obrigatório" proíbe. A própria regra já listava isso como
decisão em aberto 1. Mudei o subagente para `.claude/agents/` e coloquei a
trava do status e o registro automático. A regra 3 foi reescrita, e a
decisão 1 saiu da lista de abertas.

O `restrictions.md` dizia "nada aqui é imposto tecnicamente". Parte das
restrições agora é imposta (`settings.json` + `guarda-comandos.js`), e o
texto foi atualizado.

## 8. O que ficou de fora e o que faria diferente
- **Prova com erro plantado:** pendente (seção 6).
- **BE-01, BE-02 e FE-01 não têm "Critérios de aceite":** o verificador dá
  `NÃO PRONTA` para elas até que ganhem a seção (`spec-flow.md`, decisão em
  aberto 2).
- **Hooks testados fora de uma sessão real:** os 80 casos rodaram chamando
  os scripts direto. A confirmação dentro do Claude Code vem na primeira
  rodada real do verificador.
