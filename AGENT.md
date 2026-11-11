# AGENT.md — EMPREST.AI

Instruções para agentes de IA que trabalham neste repositório. Leia este
arquivo antes de qualquer outra coisa.

---

## 1. Limites de atuação

**Antes de agir, leia [docs/rules/restrictions.md](docs/rules/restrictions.md).** É lá que vivem
as regras sobre o que um agente pode e não pode fazer aqui, e elas valem
sempre — mesmo quando o pedido do momento parecer sugerir o contrário.

Em resumo, para não haver surpresa: a IA **não commita, não muda de branch e
não cria coisas novas** (arquivos, módulos, dependências, ADRs) sem pedido
explícito; e **não toca em segredos**. Pode, sim, **consultar o histórico do
Git** à vontade, ler o projeto inteiro e editar arquivos que já existem
quando essa for a tarefa.

O arquivo de restrições tem a versão completa, com o raciocínio por trás de
cada limite. Em caso de dúvida, pergunte em vez de agir.

Parte desses limites não depende de o agente lembrar:
[.claude/settings.json](.claude/settings.json) (`permissions.deny`) e o hook
[guarda-comandos.js](.claude/hooks/guarda-comandos.js) bloqueiam git de
escrita, instalação de dependência, `prisma migrate`/`db`, CLIs de deploy e
leitura de `.env` antes de o comando rodar.

---

## 2. O que é o projeto

**EMPREST.AI** é um sistema web **interno** de empréstimo de equipamentos de
TI. Uma pessoa do time solicita um equipamento do catálogo, fica com ele por
um prazo, e devolve. A área de Operações acompanha tudo que está em aberto e
cadastra os equipamentos.

- Repositório: `KarinaShimoiizaka/Emprestimo`
- Idioma da interface: **português do Brasil**; datas em `DD/MM/AAAA`
- Tom da copy: direto e operacional, sem exclamação e sem emoji

### Papéis

| Papel | Vê |
|---|---|
| **Colaborador** | Catálogo, Meus empréstimos |
| **Operações** | Catálogo, Operações, Equipamentos, Meus empréstimos |

### Entidades

Duas: **equipamento** e **empréstimo**. O domínio é pequeno e fechado de
propósito — isso é o que justifica quase todas as decisões técnicas.

### Regras de negócio (v1)

1. Limite de **3 itens** ativos por pessoa.
2. Prazo padrão de **14 dias** (`devolver até = hoje + 14`).
3. Qualquer item **em atraso bloqueia** novos empréstimos da pessoa.
4. Equipamento **em manutenção nunca conta como disponível**.
5. **Escopo por pessoa**: cada usuário vê somente os próprios empréstimos; a
   visão completa existe apenas em Operações.
6. No cadastro, **nome é obrigatório**; patrimônio vazio cai para `TI-—`.
7. Busca é case-insensitive e filtra a cada tecla (catálogo: nome +
   patrimônio; Operações: pessoa + item).

**Fora da v1:** reserva com data futura, notificação por e-mail, importação
de planilha. Não implementar — nem "já que estou aqui".

O detalhamento completo (telas, componentes, tokens de cor, tipografia,
animações, dados de exemplo) está em [docs/prd.md](docs/prd.md).

---

## 3. Stack

Decidida no [ADR-001](docs/adrs/adr-001-stack.md), status **aceito**.

| Item | Escolha |
|---|---|
| Linguagem / runtime | TypeScript (Node LTS) |
| Backend | NestJS |
| Estilo da API | REST, em MVC (controller / service / model) |
| Frontend | Next.js (React) + Tailwind CSS |
| Como o front é servido | Separado do back (build, processo e deploy próprios) |
| Autenticação | Supabase Auth |
| Autorização | RLS no PostgreSQL (políticas do Supabase) + guards do Nest |
| Acesso ao banco | Prisma |
| Migrations | Prisma Migrate (**não** Flyway) |
| Testes | Jest (**não** Vitest) |
| Execução local | Docker Compose |
| Banco | PostgreSQL |
| Fotos de equipamento | Pixabay + sharp, na raiz, fora do deploy ([ADR-002](docs/adrs/adr-002-imagens-equipamentos.md)) |

**Alternativas já descartadas** — não reabrir sem um ADR novo: Java/Spring,
Express ou Fastify puro, GraphQL, SSR com templates, autenticação própria
com JWT + bcrypt, autorização só na aplicação, TypeORM/Drizzle/SQL puro,
Flyway, Vitest, Postgres instalado na máquina.

**Cuidado com RLS + Prisma:** o Prisma conecta com um único usuário de
banco. Se esse usuário for dono das tabelas ou tiver `BYPASSRLS`, as
políticas não são avaliadas. Para valer de fato: usuário sem bypass, cada
requisição dentro de uma transação que define o contexto
(`SET LOCAL request.jwt.claims`) a partir do token do Supabase validado pelo
Nest, e políticas escritas em migration. O ADR-001 detalha e define a saída
caso o custo se mostre maior que o previsto.

---

## 4. Estrutura do repositório

```
.                                repositório emprestimo-tools-kit (sem backend/ e frontend/)
├── .gitignore                   ignora backend/, frontend/, atividade/, .env, node_modules/ e imagens/ (menos o manifesto)
├── AGENT.md                     este arquivo
├── CLAUDE.md                    só manda ler este arquivo
├── ENTREGA.md                   decisões da prática, com alternativa, motivo e evidência
├── docker-compose.yml           db + frontend; backend atrás de profile
├── package.json                 só ferramentas: sharp (ADR-002), npm test dos hooks e da skill
├── .env                         PIXABAY_API_KEY (não versionado)
├── imagens/
│   └── manifesto.json           foto escolhida e créditos de cada equipamento (o resto fica fora do git)
├── .claude/
│   ├── settings.json            permissions.deny e registro dos hooks
│   ├── agents/
│   │   └── verificador-spec.md  subagente que confere specs (ver §6)
│   ├── skills/
│   │   └── imagens-equipamentos/ SKILL.md, references/ e scripts/ (preparar, publicar)
│   └── hooks/
│       ├── guarda-comandos.js   bloqueia comandos proibidos; lista fechada do verificador
│       ├── exige-verificacao.js trava o status "pronta" sem veredito PRONTA
│       ├── registra-verificacao.js grava cada rodada em docs/verificacoes/
│       └── testa-hooks.js       os casos que cada hook deve liberar ou bloquear
├── atividade/                   enunciado da prática (HTML); fora do git, contém a senha da turma
├── backend/                     repositório git próprio (emprestimo-backend)
│   ├── DockerFile               alvos `dev` e `runner`
│   ├── .env                     Supabase + DATABASE_URL (não versionado)
│   ├── package.json             scripts chamam node node_modules/... (ver abaixo)
│   ├── jest.config.js           Jest + ts-jest
│   ├── prisma/
│   │   ├── schema.prisma        perfil + enum papel
│   │   └── migrations/          20261019200000_criar_perfil
│   ├── specs/
│   │   ├── spec-backend.md       BE-01 · backend
│   │   └── spec-autenticacao.md  BE-02 · autenticação e identidade
│   └── src/
│       ├── main.ts              Nest em :3001 (PORT)
│       ├── app.module.ts, app.controller.ts   rota GET /
│       ├── auth/                guards de autenticação e papel, decorators, token Supabase
│       ├── perfil/              controller, service e testes do perfil
│       ├── comum/               erros, filtro de exceção, value objects (email, papel)
│       └── prisma/              PrismaService
├── frontend/                    repositório git próprio (front-do-projeto)
│   ├── DockerFile               alvos `dev` e `runner`
│   ├── .env                     NEXT_PUBLIC_SUPABASE_* (não versionado)
│   ├── package.json             Next.js 15 + React 19 + Tailwind 3
│   ├── jest.config.js, jest.setup.ts   Jest + jsdom + Testing Library
│   ├── next.config.mjs          output standalone
│   ├── tailwind.config.ts       aponta para os tokens do :root
│   ├── specs/
│   │   ├── spec-frontend.md      FE-01 · frontend
│   │   ├── spec-catalogo.md      FE-02 · página inicial
│   │   └── spec-login.md         FE-03 · login
│   └── src/
│       ├── middleware.ts        sem sessão, redireciona para /login
│       ├── app/
│       │   ├── layout.tsx       Raleway + html/body
│       │   ├── globals.css      tokens Nocturne e classes de componente
│       │   ├── page.tsx         Catálogo (tela de entrada)
│       │   └── login/           tela e formulário de login
│       ├── components/          Navbar, CardEquipamento, Pill, FiltroChips, BannerAtraso,
│       │                        ModalSolicitar, Toast, Marca, MolduraDeAutenticacao
│       └── lib/
│           ├── tipos.ts         Equipamento, Emprestimo, Filtro
│           ├── dados.ts         dados de exemplo do PRD (seção 9)
│           ├── dominio.ts       as 7 regras de negócio, isoladas da UI
│           ├── sessao.ts, validacao-login.ts, mensagens-de-erro.ts
│           └── supabase/        clientes do navegador e do servidor
└── docs/
    ├── prd.md                   especificação de layout e regras (v1)
    ├── stacks.md                cópia idêntica de prd.md
    ├── adrs/
    │   ├── adr-001-stack.md     decisão de stack
    │   └── adr-002-imagens-equipamentos.md  Pixabay, sharp, fora do deploy
    ├── skill/
    │   └── solid.md             princípios de código
    ├── verificacoes/            uma rodada do verificador por arquivo (escrita só pelo hook)
    └── rules/
        ├── restrictions.md      limites de atuação para agentes de IA
        ├── secrets.md           onde moram os segredos e quem pode ler
        ├── checks.md            o que roda antes de dizer "terminei"
        ├── tests.md             o que se testa e com o quê
        ├── migrations.md        como o esquema muda
        ├── handoff.md           como uma sessão termina
        ├── spec-flow.md         o caminho de uma spec até "pronta"
        └── skill.md             como skills são usadas e criadas
```

**Estado atual:**

- **Frontend:** Catálogo (`/`) com estado em memória e os dados de exemplo
  do PRD; login com Supabase Auth (FE-03) e middleware que exige sessão.
  Meus empréstimos, Operações e Equipamentos ainda não existem.
- **Backend:** NestJS com autenticação e identidade (BE-02): valida o token
  do Supabase, provisiona o perfil e aplica guards de papel. Prisma com uma
  migration (`criar_perfil`). Equipamentos, empréstimos e RLS ainda não
  existem.
- **Testes:** Jest instalado nas duas pontas; `npm test` roda em cada uma.

Não preencha o que falta por iniciativa própria (ver
[docs/rules/restrictions.md](docs/rules/restrictions.md)).

### Como subir

```
# local
cd frontend && npm install && npm run dev          # :3000
cd backend && npm install && npm run start:dev     # :3001

# em container: banco + frontend
docker compose up

# banco + backend + frontend
docker compose --profile backend up
```

Observações:

- `docs/stacks.md` e `docs/prd.md` têm **conteúdo idêntico** (diferem só nas
  quebras de linha). É duplicação — vale consolidar, mas só quando pedido.
- Os arquivos são `DockerFile`, com D e F maiúsculos. Como o nome não é o
  convencional, o compose aponta `dockerfile: DockerFile` em cada serviço.
  Renomear é decisão da pessoa, não do agente.
- **O `&` em "Instituto J&F" no caminho quebra a resolução de binários do
  npm no Windows.** Por isso os scripts do frontend chamam
  `node node_modules/next/dist/bin/next` em vez de `next`. Se o projeto
  mudar para uma pasta sem `&`, dá para voltar ao normal.
- Cada repositório tem o próprio `.gitignore` (`backend/.gitignore` e
  `frontend/.gitignore`), cobrindo `node_modules/`, o build (`dist/`,
  `.next/`) e todo `.env` menos `.env.example`.
- **São três repositórios.** A raiz é o
  [emprestimo-tools-kit](https://github.com/KarinaShimoiizaka/emprestimo-tools-kit)
  (`AGENT.md`, `docs/`, `.claude/`, `ENTREGA.md`); `backend/` e `frontend/`
  têm repositório próprio e estão no `.gitignore` da raiz. `atividade/`
  também fica fora: o enunciado traz a senha padrão da turma.

## 5. Convenções

- **Commits** seguem Conventional Commits em inglês (`chore:`, `docs:`,
  `fix:`). O histórico atual usa esse padrão. A IA pode *redigir* uma
  mensagem de commit quando pedido — mas quem executa o commit é a pessoa.
- **Documentação** é escrita em português.
- **Spec antes do código.** Tela ou funcionalidade nova ganha primeiro uma
  spec, com seções de "fora de escopo" e "decisões em aberto". O que a spec
  não decidiu, o código não decide sozinho. O fluxo completo, inclusive a
  chamada obrigatória ao verificador-spec antes de declarar uma spec
  pronta, está em [docs/rules/spec-flow.md](docs/rules/spec-flow.md).
  Status de spec: `rascunho → aprovada → pronta`; só o veredito PRONTA do
  verificador leva a `pronta`, e um hook trava o resto.
- **A spec mora junto do código que descreve**, em `specs/` dentro de
  `backend/` ou `frontend/`. A numeração é por lado:
  `BE-nn` e `FE-nn`. O que atravessa os dois vira duas specs que se citam,
  não um documento no meio.
- **Regras de trabalho** ficam em `docs/rules/`. `docs/` guarda o que vale
  para o projeto inteiro (PRD, ADRs, regras); o que é de um lado só fica com
  aquele lado.
- **Decisões de arquitetura** viram ADR em `docs/adrs/`, numerado em
  sequência. O ADR-001 antecipava a estrutura de pastas como ADR-002 e o
  abandono de RLS como ADR-003; nenhuma das duas foi escrita, e o 002 ficou
  com as fotos de equipamento. Se vierem, pegam o próximo número livre.
- **Design system:** Nocturne, com acento teal `#2fb8ac` e tipografia
  Raleway. Interface escura e densa; o acento é linha e brilho, nunca
  preenchimento sólido. Nada de preto puro nem branco puro. Todos os valores
  vêm de `var(--*)`; ver seção 1 do PRD para a rampa completa.

---

## 6. Subagentes e skills

Moram em [.claude/agents/](.claude/agents/) e
[.claude/skills/](.claude/skills/), onde o Claude Code os descobre sozinho.
As regras de skill estão em [docs/rules/skill.md](docs/rules/skill.md).

| Skill | Quando |
|---|---|
| [imagens-equipamentos](.claude/skills/imagens-equipamentos/SKILL.md) | qualquer foto de equipamento; é a única origem permitida. O `publicar` só a pessoa roda |
| [solid](docs/skill/solid.md) | princípios de código (skill antiga, em `docs/skill/`) |

| Subagente | Quando | O que garante |
|---|---|---|
| [verificador-spec](.claude/agents/verificador-spec.md) | sempre, antes de uma spec virar `pronta` | contexto limpo; não edita nada; Bash só com lista fechada; cada rodada gravada em `docs/verificacoes/` |

Como ele é acionado e o que impede de pular essa etapa está em
[docs/rules/spec-flow.md](docs/rules/spec-flow.md).