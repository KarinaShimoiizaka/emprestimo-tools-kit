# SECRETS.md — EMPREST.AI

Como segredos são guardados, lidos e protegidos neste repositório.

Complementa a seção "Não tocar em segredos" de
[restrictions.md](restrictions.md). Lá está o limite da IA; aqui está a regra
do projeto inteiro, que vale para pessoa e agente.

---

## Onde moram

| Arquivo | Conteúdo | Versionado |
|---|---|---|
| `backend/.env` | `SUPABASE_URL`, `SUPABASE_JWKS_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `STORAGE_NAME`, `DATABASE_URL`, `DIRECT_URL` | não |
| `frontend/.env` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | não |
| `.env` (raiz) | `PIXABAY_API_KEY`; é também onde o Compose leria `POSTGRES_*`, se definido | não |

O `.gitignore` de cada repositório (`backend/` e `frontend/`) cobre `.env` e
`.env.*`, menos `.env.example`.

**O `backend/.env` aponta para o Supabase do deploy**, não para o Postgres
local. Decisão da pessoa em 11/11/2026: é um projeto de estudo. A
consequência é que qualquer comando que conecte no banco com esse `.env`
escreve em produção, e por isso o agente não roda nenhum (ver
[migrations.md](migrations.md) e [tests.md](tests.md), regra 7).

## Classificação

| Variável | Classe | Pode ir para o navegador |
|---|---|---|
| `SUPABASE_SECRET_KEY` | **secreta** — ignora RLS | nunca |
| `DATABASE_URL` | **secreta** — contém senha | nunca |
| `DIRECT_URL` | **secreta** — contém senha, com mais privilégio | nunca |
| `SUPABASE_PUBLISHABLE_KEY` | pública por desenho do Supabase | sim |
| `SUPABASE_URL`, `SUPABASE_JWKS_URL` | pública | sim |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | pública por desenho do Supabase | sim |
| `STORAGE_NAME` | configuração | sim, se um dia for usada no front |
| `PIXABAY_API_KEY` | **secreta**: gasta a cota da conta da pessoa | nunca; só os scripts da skill `imagens-equipamentos` leem |

O `.gitignore` da raiz cobre `.env` e `.env.*`, menos `.env.example`.

"Pública" quer dizer que o valor pode chegar ao navegador — não que pode ser
escrito em código ou em documentação.

---

## Regras

1. **Nenhum `.env` é versionado.** Se um aparecer no `git status` como
   rastreado, é incidente (ver adiante), não detalhe.
2. **Valor de segredo não aparece em lugar nenhum além do `.env`:** nem em
   código, nem em `docker-compose.yml`, nem em `DockerFile`, nem em spec, nem
   em mensagem de commit, nem em log, nem no chat.
3. **Documentação cita nomes, nunca valores.** A BE-01 §8 é o modelo.
4. **O frontend só recebe o que é público.** Variável exposta ao navegador
   leva o prefixo `NEXT_PUBLIC_`; nenhuma variável secreta ganha esse
   prefixo, nem temporariamente para testar.
5. **`SUPABASE_SECRET_KEY` fica só no backend**, e só no código que
   realmente precisa ignorar RLS. Na v1 não há nenhum caso assim; se surgir,
   ele entra em spec antes.
6. **`DATABASE_URL` é a conexão da aplicação (pooler, porta 6543);
   `DIRECT_URL` é a do Prisma Migrate (porta 5432).** O ADR-001 previa um
   usuário sem bypass de RLS na `DATABASE_URL`; pelo
   [ADR-003](../adrs/adr-003-autorizacao-no-backend.md), a autorização ficou no
   backend, e as duas usam hoje o mesmo usuário do Supabase.
7. **A senha padrão do Compose (`emprestimo`) é só para o Postgres local.**
   Nenhum ambiente fora da máquina de desenvolvimento usa esse valor.
8. **Nada de segredo em log.** Erro de conexão loga o host, não a URL
   completa; token do Supabase não é logado nem truncado.

## Para a IA, especificamente

- Pode ler os **nomes** das variáveis (por exemplo, listar só o que vem antes
  do `=`). Não pode ler, imprimir, copiar ou resumir os **valores**.
- Não abre `.env` inteiro com `cat`, `Read` ou equivalente.
- Não envia conteúdo de `.env` para ferramenta ou serviço externo.
- Se precisar saber se uma variável está preenchida, pergunta.

Isso é imposto: `Read(**/.env)` e `Read(**/.env.*)` estão em
`permissions.deny` no [.claude/settings.json](../../.claude/settings.json), e o
[guarda-comandos](../../.claude/hooks/guarda-comandos.js) bloqueia qualquer
comando de terminal que cite um `.env` ou use `dotenv`. Por consequência, nem
listar os nomes pelo terminal passa mais; quando precisar dos nomes, a
fonte é a tabela acima.

---

## Se um segredo vazar

Commitado, colado no chat, impresso em log, enviado para fora — tudo conta.

1. Tratar como comprometido. Apagar do arquivo ou do histórico não desfaz o
   vazamento.
2. Gerar um valor novo no painel do Supabase (ou trocar a senha do banco) e
   atualizar o `.env`.
3. Reescrever histórico do Git é decisão da pessoa. A IA avisa do vazamento
   e para — não executa nada no Git (ver [restrictions.md](restrictions.md)).

---

## Decisões em aberto

| # | Questão | Efeito |
|---|---|---|
| 1 | Cria-se um `.env.example` por ponta, com os nomes e sem valores? | documenta a configuração sem abrir o `.env`; é arquivo novo, então só com pedido |
| 3 | `FRONTEND_URL` (CORS do backend) entra nesta tabela de classificação? | é configuração pública; sem `/` no fim, senão o CORS barra o front |

> **Decidido na fase 4:** front e back rodam na Vercel, e os segredos do
> ambiente hospedado ficam nas variáveis de cada projeto lá, nunca no
> repositório (era a decisão em aberto 2). No front, só `NEXT_PUBLIC_*`.
> No backend, só o que o código lê: `DATABASE_URL`, `DIRECT_URL`,
> `SUPABASE_URL`, `SUPABASE_JWKS_URL`, `STORAGE_NAME` e `FRONTEND_URL`. A
> `SUPABASE_SECRET_KEY` não precisa ir para lá: o backend não a usa.

> **Decidido pela FE-03:** o frontend fala direto com o Supabase Auth
> (`frontend/src/lib/supabase/`), com `NEXT_PUBLIC_SUPABASE_URL` e
> `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (era a decisão em aberto 3).
