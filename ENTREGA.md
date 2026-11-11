# Entrega da prática

> Documento em construção, preenchido a cada fase. **Fase atual: 2 (skill
> imagens-equipamentos).** Nas colunas "commit", "raiz" é o repositório
> emprestimo-tools-kit; "back" e "front", os outros dois.

## Links
- Repositório da raiz (AGENT.md, docs, subagente, hooks, este arquivo): https://github.com/KarinaShimoiizaka/emprestimo-tools-kit
- Repositório backend: https://github.com/KarinaShimoiizaka/emprestimo-backend
- Repositório frontend: https://github.com/KarinaShimoiizaka/front-do-projeto
- Produção (Vercel): pendente

## 1. Conflitos: o que foi pedido contra o que já existia

| pedido | contrariava o quê | o que você fez | por quê | onde ficou registrado | commit |
|--------|-------------------|----------------|---------|-----------------------|--------|
| Tech lead: "quando a única falha for um teste quebrado, o verificador pode corrigir o teste e verificar de novo" | O requisito "Independência" do próprio enunciado (o verificador não corrige o que encontra) e a regra 5 do `spec-flow.md` | Recusei. O verificador marca o CA como REPROVADO e explica o que está quebrado; quem corrige é o agente principal, que chama uma rodada nova | Corrigir o teste é mudar a evidência que o verificador está julgando. Um verificador que conserta o que avalia pode "aprovar" um CA afrouxando a asserção, que é o que a regra 8 do `tests.md` proíbe | `.claude/agents/verificador-spec.md` (seção "Teste quebrado"); `docs/rules/spec-flow.md`, regra 5 | raiz `4035b3b` |
| Contrato da skill: "só a API do Pexels, nenhuma outra origem de imagem" | O próprio contrato da prática | Usei a API do Pixabay | O Pexels passou a limitar as requisições (rate limiting) durante o uso | [ADR-002](docs/adrs/adr-002-imagens-equipamentos.md); `references/contrato.md` da skill, "Desvio do enunciado" | raiz `f32faf0`, `69630e1` |
| Briefing de dados iniciais: "instale a biblioteca sharp" | `restrictions.md`: dependência nova é decisão de arquitetura, vira ADR, e quem instala é a pessoa | Aceitei o sharp só depois do ADR-002; instalado pela pessoa, na raiz, não no backend | O sharp é o que torna o 800×600 garantido (recorta e relê o arquivo); na raiz ele não vai para o deploy | ADR-002; `package.json` da raiz | raiz `f32faf0`, `69630e1` |
| Skill com `SKILL.md`, `references/` e scripts, como a prática pede | `docs/rules/skill.md`: "uma skill por arquivo", em `docs/skill/` | A skill mora em `.claude/skills/imagens-equipamentos/` | Uma skill com referências e scripts não cabe num arquivo, e o Claude Code só descobre sozinho as de `.claude/skills/` | `docs/rules/skill.md` (decisão em aberto 1 resolvida) | raiz `69424a5` |

## 1b. Lacunas: o que foi pedido de forma incompleta

| spec | o que faltava | alternativas | o que decidiu | por quê | commit |
|------|---------------|--------------|---------------|---------|--------|
| spec-flow | O que conta como "spec pronta". Os status eram texto livre ("proposta", "implementada", "escrita depois da implementação") | (a) manter texto livre; (b) vocabulário fixo `rascunho → aprovada → pronta` | (b) | A trava precisa de um valor exato para conferir; com texto livre não há o que bloquear. Registrado em `spec-flow.md`, "Status de uma spec", e aplicado às cinco specs | raiz `4035b3b`; back `961836c`; front `f38c63f` |
| spec-flow | Como tornar a chamada ao verificador obrigatória "sem depender de alguém lembrar" | (a) instrução no `CLAUDE.md`/`spec-flow.md`; (b) hook `Stop` que impede encerrar a sessão com código alterado e sem verificação; (c) hook que bloqueia mudar o status para `pronta` sem rodada `PRONTA` registrada | (c) | É o que o requisito pede: nenhuma spec declarada pronta sem passar por ele. (a) continua dependendo de lembrar. (b) dispara em qualquer edição pequena e não sabe qual spec o código implementa | raiz `4035b3b` |
| verificador | Como tornar duas rodadas "comparáveis lado a lado" | (a) o agente principal copia a resposta para um arquivo; (b) um hook grava a resposta sozinho, com o commit de cada repositório, numa pasta que nenhum agente edita | (b) | (a) depende do agente e permite resumir ou editar o resultado. (b) é fiel ao que saiu, e a mesma pasta serve de base para a trava do status | raiz `4035b3b` |
| verificador | Como impedir o verificador de escrever, migrar ou publicar, se ele precisa de Bash para build e teste | (a) proibição em texto; (b) `permissions.deny` por prefixo; (c) lista fechada de comandos num hook, mais o deny global | (c) | Deny por prefixo é contornável (`git -C backend commit`, `sh -c "..."`). Uma lista fechada só deixa passar o que é conhecido: build, teste e git de leitura | raiz `4035b3b` |
| projeto | Onde versionar o que fica na raiz (`AGENT.md`, `docs/`, `.claude/`, este arquivo). O enunciado fala em dois repositórios, mas a raiz não estava em nenhum, e sem commit nada da fase 1 é verificável | (a) a raiz vira um terceiro repositório; (b) mover tudo para o repositório do backend e abrir as sessões lá; (c) uma cópia em cada repositório | (a), decisão da pessoa: repositório `emprestimo-tools-kit` | Nada muda de lugar, e as sessões continuam enxergando back e front. (b) mudaria todos os caminhos; (c) teria duas cópias que divergem | raiz `79f810e` |
| projeto | O que da raiz entra no git | (a) tudo; (b) tudo menos `atividade/` | (b) | O enunciado em `atividade/` traz a senha padrão da turma, e a regra da prática é nenhuma senha no histórico do git. Registrado no `.gitignore` da raiz | raiz `79f810e` |
| projeto | Para qual banco o `backend/.env` aponta | (a) `.env` local apontando para o Postgres do Docker, credenciais de produção fora do projeto; (b) manter apontando para o Supabase do deploy | (b), decisão da pessoa: é um projeto de estudo | Consequência registrada em `secrets.md`, `migrations.md` e `tests.md`: nenhum comando do agente conecta no banco. O guarda bloqueia `prisma migrate`/`db` e `psql`, e o verificador para antes de `npm test` se algum teste usar banco real | raiz `79f810e` |
| skill | Onde instalar o sharp | (a) `package.json` próprio na raiz; (b) dependência de desenvolvimento do backend | (a), decisão da pessoa | É ferramenta de conteúdo; o sharp tem binário nativo e, no backend, iria para a imagem Docker sem ser usado | raiz `f32faf0`, `69630e1` |
| skill | Como chegar a 800×600 | (a) preencher o quadro, cortando as bordas (`cover`, foco por saliência); (b) caber a foto inteira, com faixas | (a), decisão da pessoa | Cards uniformes, sem faixas; o foco por saliência mantém o equipamento no recorte | raiz `69630e1` |
| skill | Como impedir o agente de publicar | (a) tirar `SUPABASE_SECRET_KEY` do `backend/.env` (o backend não a usa) e informá-la só na hora de publicar; (b) manter no `.env` e travar o `publicar`: bloqueado para agentes (guarda + deny), só em terminal interativo, com `APROVO` digitado | (b), decisão da pessoa: projeto de estudo | Limite conhecido: um script novo escrito pelo agente ainda conseguiria ler o `backend/.env`. Isso fica protegido pela regra, não por bloqueio; a opção (a) fecharia esse caminho | raiz `69630e1`, `2ff70a6` |
| skill | Quem cria e configura o bucket | (a) o `publicar` confere e, se faltar, cria ou torna público, perguntando antes; (b) pelo painel do Supabase | (a). O bucket já existia | O `migrations.md` diz que nada é criado pelo painel; assim o estado do bucket sai de código, e a mudança só acontece com a confirmação da pessoa | raiz `69630e1` |
| skill | Quem aprova cada foto | (a) só o filtro de tags; (b) revisão da pessoa em todas, com o `publicar` exigindo `APROVO` | (b), decisão da pessoa | A API não filtra pessoa nem logo, e o filtro de tags só pega o que o fotógrafo marcou | raiz `69630e1` |
| skill | O que fazer quando a busca não traz foto aceitável para um equipamento (TI-0006 teve 6 reprovadas, 4 delas com a maçã da Apple) | (a) continuar reprovando uma a uma; (b) usar um arquivo que a pessoa achou, redimensionado à mão; (c) a pessoa escolhe uma foto do Pixabay pelo número, e ela entra pela API como as outras (`--escolher`) | (c), decisão da pessoa: foto 1282241 | (b) quebraria o contrato: sem origem nem autor registrados, e o crédito do manifesto ficaria de outra foto. (c) mantém fonte única, recorte conferido e crédito certo. O filtro de tags vira aviso nessa escolha, porque a foto tem a tag "apple" (a fruta) e quem viu a foto foi a pessoa | pendente |
| skill | Linguagem e testes dos scripts da raiz | (a) TypeScript e Jest, como no ADR-001; (b) JavaScript e `node --test` | (b), *a confirmar pela pessoa* (seção 2) | Roda com `node` direto, sem build, como os hooks; não traz o Jest só para testar a escolha de foto | raiz `f32faf0`, `69630e1` |

## 2. Onde o agente tentou decidir por você

- **Status das specs existentes.** Ao padronizar os status, o agente marcou
  como `aprovada` as specs cujo código já existia (BE-02, FE-01, FE-02,
  FE-03), inferindo a aprovação a partir da implementação. Isso não estava
  escrito em lugar nenhum. *A confirmar pela pessoa: quais dessas foram, de
  fato, aprovadas.*
- **Motivo das fotos reprovadas.** O `revisao.md` diz que o motivo
  registrado é o que a pessoa disse. Na prática, a pessoa escolheu quais
  reprovar (apagando o arquivo ou dizendo o número), e o agente escreveu o
  motivo a partir do que ele mesmo viu na foto. Os motivos estão em
  `imagens/manifesto.json`, campo `reprovadas`. *A confirmar pela pessoa.*
- **Linguagem e testes dos scripts da skill.** O ADR-001 fixa TypeScript e
  Jest. Ao escrever a skill, o agente usou JavaScript e o test runner do Node
  sem perguntar, e registrou o desvio no ADR-002. *A confirmar pela pessoa.*

## 3. Uma decisão que merece (ou não) um ADR
**Virou ADR: [ADR-002](docs/adrs/adr-002-imagens-equipamentos.md), fotos de
equipamento com Pixabay, sharp e processamento fora do deploy.**

Por que mereceu: cada parte tinha alternativa defensável (Pexels, que o
enunciado pede; Jimp ou os tamanhos prontos da API no lugar do sharp; o
backend no lugar da raiz). A decisão também muda o que vai para o deploy
(nada da skill vai) e desvia de duas fontes que alguém vai ler depois: o
enunciado e o ADR-001. Sem o ADR, quem chegasse veria um `package.json` na
raiz e um "Pixabay" onde o contrato diz "Pexels", sem o motivo.

## 4. A skill imagens-equipamentos

- **O que ficou onde, e o critério.**
  - `SKILL.md`: só o que o agente precisa para agir (quando usar, passo a
    passo, o que não faz, o que fazer quando falha).
  - `references/`: o que é consultado e pode mudar sem mudar o passo a passo:
    o contrato e como cada item é garantido (`contrato.md`), o resumo da API e
    da licença (`pixabay.md`), os critérios de revisão (`revisao.md`) e a
    lista dos 12 (`equipamentos.json`).
  - `scripts/`: tudo que precisa dar o mesmo resultado sempre, ou falhar.
  - Critério: se errar custa uma foto errada em produção, vira script; se é
    contexto para decidir, vira referência; se é ordem dos passos, fica no
    `SKILL.md`.
- **Código, instrução ou revisão humana.** A tabela completa está em
  `references/contrato.md`.
  - **Por código, com teste em `selecao.test.js`:** fonte única, 800×600
    (recorta, relê e confere de novo no `publicar` e na URL pública), sem
    repetição (`pixabay_id` e `sha256` únicos), créditos obrigatórios, caminho
    fixo com upsert.
  - **Código e revisão:** "sem pessoa, marca ou texto". O filtro de tags pega
    o que está marcado, e a pessoa revisa todas, porque a API não filtra.
  - **Só instrução:** não escolher foto fora do `preparar` e não editar o
    manifesto à mão.
- **Como o agente fica impedido de publicar:**
  - o `publicar.js` só roda em terminal interativo e pede `APROVO` digitado;
  - o `guarda-comandos.js` e o `permissions.deny` bloqueiam o comando para
    qualquer agente (casos em `.claude/hooks/testa-hooks.js`);
  - o agente não lê `.env`;
  - limite conhecido: seção 1b.
- **Publicação:** 12 fotos publicadas pela pessoa com o `publicar`, cada uma
  conferida baixando pela URL pública sem login (`publicada_em` no
  manifesto). A primeira tentativa falhou porque o `SUPABASE_URL` apontava
  para um endereço que não existia no DNS. Depois disso o `publicar` passou a
  dizer a etapa, o servidor e a causa de cada falha de rede.
- **Mantidas pela pessoa apesar de apontadas pelo agente:** TI-0001 (tela
  com conteúdo), TI-0005 (código na tela), TI-0011 ("lenovo" legível) e
  TI-0012 (mãos e texto na tela). Motivo: *a confirmar pela pessoa*.
- **Fotos reprovadas na revisão visual:** 14 no total. A lista completa,
  com o motivo de cada uma, fica em `imagens/manifesto.json`, campo
  `reprovadas`.
  - Pelos critérios do contrato: 11.
    - Só marca ou logo legível: 7 (Nikon e Logitech, Olympus, Fujifilm,
      Rollei, e três com a maçã da Apple).
    - Só pessoa: 1.
    - Combinações de pessoa, texto, marca e tela com conteúdo: 3.
  - Por não mostrar o equipamento: 3.
  - Tag "apple": a TI-0006 só achou foto aceitável quando a pessoa escolheu
    uma pelo número, porque quase todo resultado de "monitor" tinha a maçã da
    Apple.

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
  - Os casos que cada hook deve liberar ou bloquear estão em
    `.claude/hooks/testa-hooks.js` e rodam com `npm test` na raiz (80 casos
    na fase 2).
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

**`skill.md`: "uma skill por arquivo, em `docs/skill/`".** A regra foi
escrita para skills que são só texto, como a `solid`. A skill de imagens
precisa de referências e scripts ao lado, e a regra não comportava isso. Ela
mesma já listava o lugar como decisão em aberto 1. A regra agora aceita
`.claude/skills/<nome>/`, e a `solid` fica onde está até alguém pedir para
mover.

## 8. O que ficou de fora e o que faria diferente
- **Prova com erro plantado:** pendente (seção 6).
- **BE-01, BE-02 e FE-01 não têm "Critérios de aceite":** o verificador dá
  `NÃO PRONTA` para elas até que ganhem a seção (`spec-flow.md`, decisão em
  aberto 2).
- **Hooks numa sessão real:** o `guarda-comandos` já bloqueou comando de
  verdade dentro do Claude Code. O registro e a trava do status só serão
  vistos funcionando na primeira rodada real do verificador.
- **Crédito das fotos na tela:** fica para a fase 4, junto com o conflito do
  briefing que pede o catálogo sem crédito.
