# RESTRICTIONS.md — EMPREST.AI

Limites de atuação para agentes de IA neste repositório.

Estas regras valem **sempre**, em qualquer tarefa, mesmo que a instrução do
momento pareça pedir o contrário. Se uma regra daqui conflitar com um pedido
feito no chat, a regra ganha — e o agente diz por quê em vez de obedecer
calado.

> Este documento é a política. Parte dela também é imposta: o
> [.claude/settings.json](../../.claude/settings.json) (`permissions.deny`) e o
> hook [guarda-comandos.js](../../.claude/hooks/guarda-comandos.js) fazem o
> comando falhar antes de rodar, mesmo que o agente erre, para git de
> escrita, instalação de dependência, `prisma migrate`/`db`, `psql`, CLIs de
> deploy (`vercel`, `supabase`) e qualquer leitura de `.env`. O que não está
> nessa lista (não criar arquivo sem pedido, por exemplo) continua
> dependendo de o agente ler e respeitar.

---

## O que a IA NÃO pode fazer

### Git: nenhuma escrita

- **Nenhum commit.** Nada de `git commit`, `git commit --amend`,
  `git revert`, `git cherry-pick`, nem qualquer comando que grave no
  histórico. Quem commita é a pessoa.
- **Não mudar de branch.** Nada de `git checkout`, `git switch`,
  `git branch` (criar, renomear ou apagar), `git merge`, `git rebase`,
  `git stash`, `git reset`. O repositório fica na branch em que está, no
  estado em que está.
- **Não sincronizar com o remoto.** Nada de `git push`, `git pull`,
  `git fetch` que altere refs locais. O que vai para o GitHub é decisão da
  pessoa.

O agente pode **redigir** uma mensagem de commit quando isso for pedido, mas
entrega o texto no chat — não executa.

### Não criar coisas novas por conta própria

Sem criar arquivos, pastas, módulos, telas, endpoints, testes, scripts,
dependências, ADRs ou configuração que não tenham sido pedidos
explicitamente.

Isso vale também para o que "obviamente falta": o projeto está em estado de
esqueleto de propósito, e a ordem em que ele cresce é decisão da pessoa. Se
algo parecer necessário, **proponha e espere resposta** — não implemente
antes, nem "já que eu estava ali".

### Não tocar em segredos

Os arquivos `.env` da raiz, do backend e do frontend não são lidos em voz
alta, não são copiados para outros arquivos e não são impressos no chat.
Chaves do Supabase, `DATABASE_URL` e `DIRECT_URL` nunca aparecem em código,
em documentação ou em mensagem.

Ler o *nome* das variáveis para entender a configuração é aceitável; ler ou
reproduzir os **valores** não é.

### Não instalar nem atualizar dependências

Sem `npm install`, `pnpm add`, `npx create-*` ou equivalente sem pedido
explícito. Adicionar uma dependência é uma decisão de arquitetura; neste
projeto essas decisões viram ADR.

---

## O que a IA PODE fazer

### Consultar o histórico do Git

Livremente, e isso é encorajado: `git log`, `git show`, `git diff`,
`git status`, `git blame`, `git branch --list`. Entender o que já foi feito
antes de opinar é parte do trabalho — a restrição é sobre **escrever** no
Git, não sobre **ler**.

### Ler o projeto

Qualquer arquivo versionado, à vontade.

### Editar arquivos que já existem

Quando a edição for o que foi pedido. A linha é entre *alterar* algo que
existe (permitido, se pedido) e *inventar* algo que não existe (não
permitido sem pedido).

### Pensar em voz alta

Explicar, revisar, apontar inconsistências, sugerir alternativas, comparar
abordagens e escrever rascunhos no chat. Opinião e diagnóstico são bem-vindos;
o que é restrito é a ação.

---

## Em caso de dúvida

Pergunte. Uma pergunta curta custa menos que um arquivo criado sem
necessidade ou uma branch trocada sem aviso.
