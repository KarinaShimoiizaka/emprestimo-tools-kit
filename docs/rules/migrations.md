# MIGRATIONS.md — EMPREST.AI

Como o esquema do banco muda neste repositório.

A ferramenta foi decidida no [ADR-001](../adrs/adr-001-stack.md): **Prisma
Migrate**, não Flyway. O esquema tem uma fonte de verdade só.

---

## Onde mora

| Caminho | O quê |
|---|---|
| `backend/prisma/schema.prisma` | modelo declarativo |
| `backend/prisma/migrations/` | SQL versionado, uma pasta por migration |

**Estado atual:** o `schema.prisma` tem `perfil` e `equipamento`, com os
enums `papel`, `categoria` e `situacao_fisica`. Há duas migrations,
`20261019200000_criar_perfil` e `20261111120000_criar_equipamento` (BE-03).
Empréstimo ainda não existe no esquema.

**Atenção:** o `backend/.env` aponta para o Supabase do deploy. Qualquer
`prisma migrate` rodado com ele aplica em produção. Por isso o agente não
roda nenhum, e o [guarda-comandos](../../.claude/hooks/guarda-comandos.js)
bloqueia a tentativa.

## O que vai em migration

Tudo que define o banco, não só as tabelas:

- tabelas, colunas, chaves e índices;
- constraints e índices parciais (`emprestimo_aberto_unico`,
  `prazo_coerente` — BE-01 §3);
- triggers (limite de 5 por pessoa, trava de manutenção);
- **políticas de RLS**, `grant`s e o usuário da aplicação sem bypass.

O que o `schema.prisma` não expressa (trigger, política, índice parcial,
`grant`) é escrito à mão no `migration.sql`, gerado com `--create-only` e
editado **antes** de ser aplicado.

Nada é criado pelo painel do Supabase. O que existe no banco e não existe em
migration não existe para o projeto (BE-01 §6.3).

---

## Regras

1. **Migration aplicada é imutável.** Depois de rodar em qualquer banco além
   do seu local, não se edita nem se apaga — corrige-se com uma migration
   nova.
2. **Uma migration por mudança lógica.** "Criar empréstimo" e "política de
   empréstimo" podem ser uma só; "criar empréstimo" e "renomear coluna de
   equipamento" não.
3. **Nome descritivo**, depois do carimbo que o Prisma gera:
   `20260928120000_criar_emprestimo`.
4. **Nunca `prisma db push`.** Ele altera o banco sem deixar migration, e o
   esquema passa a ter duas verdades.
5. **`prisma migrate reset` só no Postgres local.** Ele apaga todos os dados.
6. **Migrate usa `DIRECT_URL`; a aplicação usa `DATABASE_URL`.** O usuário
   da aplicação não é dono das tabelas (ver [secrets.md](secrets.md), regra 6).
7. **Ambiente hospedado recebe só `prisma migrate deploy`**, nunca
   `migrate dev`.
8. **Mudança destrutiva** (remover ou renomear coluna, apagar tabela, apertar
   constraint sobre dados existentes) é anunciada na spec antes de virar
   migration.
9. **Migration que cria ou altera política de RLS vem com o teste** que
   confirma que ela está ligada (BE-01 §9.3; ver [tests.md](tests.md)).

---

## Para a IA, especificamente

**Pode:**

- ler `schema.prisma` e as migrations existentes;
- editar `schema.prisma`, quando essa for a tarefa;
- escrever o SQL de uma migration e entregá-lo no chat;
- editar um `migration.sql` que a pessoa gerou com `--create-only` e **ainda
  não foi aplicado**, quando pedido;
- rodar `prisma validate`, que só lê.

**Não pode:**

- rodar `prisma migrate` em qualquer forma (`dev`, `deploy`, `reset`,
  `resolve`), `prisma db push`, `prisma db execute`, nem DDL por `psql`;
- editar migration já aplicada;
- apontar qualquer comando para o Supabase.

Quem gera e aplica migration é a pessoa. Quando a tarefa terminar com o
schema alterado, o handoff diz qual comando rodar (ver
[handoff.md](handoff.md)).

---

## Decisões em aberto

| # | Questão | Efeito |
|---|---|---|
| 1 | Os dados de exemplo do PRD §9 entram no seed? | o seed já existe (`prisma/seed.ts`, BE-03), mas só com os 12 equipamentos da prática; os dados do PRD §9 continuam só no frontend, em memória |
| 2 | Nome de tabela e coluna em português (`emprestimo`, `devolver_ate`) como a BE-01 já usa, ou em inglês? | a BE-01 assume português; vale confirmar antes da primeira migration |
| 3 | Quem aplica migration no ambiente hospedado, e quando? | depende do deploy, ainda não decidido |
