# ADR-001 — Stack do projeto

**Status:** aceito

**Contexto do produto:** [docs/prd.md](../prd.md)

## Contexto

Sistema web interno de empréstimo de equipamentos de TI (EMPREST.AI). Front,
backend e banco.

Time pequeno, prazo curto, nenhum código existente. O banco já estava
decidido: PostgreSQL.

O domínio é pequeno e fechado: dois papéis (Colaborador e Operações), duas
entidades (equipamento e empréstimo), cinco telas e onze regras de negócio —
limite de 3 itens por pessoa, prazo de 14 dias, bloqueio por atraso,
manutenção nunca conta como disponível, escopo por pessoa. Fora da v1:
reserva com data futura, notificação por e-mail, importação de planilha.

Esse tamanho é o que justifica quase todas as escolhas abaixo: não há
requisito de volume, de latência nem de integração que peça ferramenta
especializada.

## Decisão

| item                   | escolha                                                |
|------------------------|--------------------------------------------------------|
| linguagem / runtime    | TypeScript (Node LTS)                                  |
| framework do backend   | NestJS                                                 |
| estilo da API          | REST, organizada em MVC (controller / service / model) |
| front                  | Next.js (React) com Tailwind CSS                       |
| como o front é servido | separado do back (build, processo e deploy próprios)   |
| autenticação           | Supabase Auth                                          |
| autorização            | RLS no PostgreSQL (políticas do Supabase)              |
| acesso ao banco        | Prisma                                                 |
| migrations             | Prisma Migrate (não Flyway)                            |
| testes                 | Jest                                                   |
| execução local         | Docker Compose                                         |
| banco                  | PostgreSQL                                             |

## Justificativa

Uma linha por item. O critério foi: menor número de peças móveis que
atende o PRD, e que a equipe consegue operar sem aprender uma ferramenta
nova no meio do caminho.

- **TypeScript** — uma linguagem só nas duas pontas; os tipos do domínio
  (situação do equipamento, estado do empréstimo) são compartilhados em vez
  de reescritos.
- **NestJS** — entrega estrutura pronta (módulos, injeção de dependência,
  validação, camada de teste) para um time que não tem prazo para convencionar
  a sua própria; o custo é ler documentação, não desenhar arquitetura.
- **REST em MVC** — o produto é CRUD de equipamento mais duas transições de
  estado do empréstimo; nada aqui pede consulta de forma variável.
- **Next.js + React** — o PRD descreve troca de tela na mesma janela, sem
  rotas aninhadas; roteador de arquivos e build vêm resolvidos.
- **Tailwind** — o design system Nocturne já é um conjunto de tokens CSS
  (`--color-*`, `--radius-*`, escala de espaçamento); Tailwind consome esses
  tokens sem obrigar a inventar uma segunda camada de nomes.
- **Front separado do back** — as duas partes sobem e quebram independentes;
  e o navegador precisa falar com o Supabase Auth de qualquer forma, então já
  é cliente de rede de primeira classe.
- **Supabase Auth** — o requisito é login por e-mail e senha; não vale
  escrever hash, sessão e recuperação de acesso à mão.
- **RLS** — "cada usuário vê somente os próprios empréstimos" é restrição de
  dados; no banco vira invariante, na aplicação vira um `if` que alguém
  esquece na próxima rota.
- **Prisma** — schema declarativo, tipos gerados e migrations no mesmo lugar;
  duas tabelas não pedem mais poder que isso.
- **Prisma Migrate** — já vem com o Prisma e lê o mesmo `schema.prisma`;
  Flyway seria uma segunda fonte de verdade do esquema.
- **Jest** — o NestJS já gera a configuração e os utilitários; custo de
  decisão zero.
- **Docker Compose** — Postgres em container fixa a versão para todo mundo e
  deixa "clonar e rodar" em um comando.
- **PostgreSQL** — pré-decidido; e é o que viabiliza RLS.

## Alternativas descartadas

- **Java + Spring Boot** — descartada porque manteria duas linguagens e dois
  ecossistemas de build para um domínio de duas tabelas.
- **Express ou Fastify puro** — descartada porque o tempo poupado no
  boilerplate voltaria como decisões de estrutura para o time tomar sozinho
  dentro do prazo.
- **GraphQL** — descartada porque as telas têm consultas fixas e conhecidas;
  schema, resolvers e cache não compram nada aqui.
- **Monolito servindo o front por templates (SSR do Nest, EJS/Handlebars)** —
  descartada porque filtro a cada tecla, modal, toast e derivação de estado no
  render são de cliente; ida ao servidor por ação seria mais trabalho.
- **Autenticação própria com JWT e bcrypt** — descartada porque é código
  sensível, sem valor de produto, e concentra risco justamente no que a equipe
  tem menos tempo para revisar.
- **Autorização só na aplicação (guards do Nest, sem RLS)** — descartada como
  camada única porque um `where` esquecido vaza empréstimo de outra pessoa;
  os guards seguem existindo, só não sozinhos.
- **TypeORM, Drizzle ou SQL puro** — descartadas porque nenhuma entrega ao
  mesmo tempo tipos gerados e migrations versionadas com tão pouca
  configuração quanto o Prisma nesse tamanho de modelo.
- **Flyway** — descartada porque partiria o esquema em dois lugares (SQL
  versionado e `schema.prisma`) sem nenhuma exigência de banco que peça isso.
- **Vitest** — descartada porque o NestJS entrega Jest configurado; a troca
  seria manutenção de config em vez de teste escrito.
- **Postgres instalado na máquina de cada um** — descartada porque divergência
  de versão local é uma classe de bug que não queremos diagnosticar.
- **Supabase gerenciado também no desenvolvimento** — descartada para o loop
  local porque deixaria o dia a dia dependente de rede e de um projeto remoto
  compartilhado; Compose local, Supabase no ambiente hospedado.

## Consequências

- **O que fica mais fácil:** um `tsc` e um `package.json` por ponta, mesma
  linguagem nas duas; subir o ambiente com um comando; nascer com login
  funcionando no primeiro dia; mudar o modelo (editar `schema.prisma`, gerar
  migration, tipos atualizam sozinhos); testar sem escolher ferramenta.
- **O que fica mais difícil:** dois artefatos para versionar, buildar e
  publicar em vez de um; CORS, URL de ambiente e validação de token na
  fronteira entre front e back; o modelo de autorização passa a viver em dois
  lugares (políticas SQL e guards do Nest) e as duas cópias têm de concordar;
  RLS não se aplica sozinho por baixo do Prisma — ver a nota adiante.
- **O que essa escolha nos impede de fazer depois sem custo:** sair do
  Supabase (identidade dos usuários e políticas ficam amarradas nele); sair do
  PostgreSQL (RLS não é portável); trocar o Prisma depois de haver migrations
  aplicadas em produção; adotar SSR com busca de dados no servidor sem
  redesenhar como o token chega ao backend.

### Nota sobre RLS com Prisma

O Prisma se conecta com um único usuário de banco. Se esse usuário for dono
das tabelas ou tiver `BYPASSRLS`, as políticas não são avaliadas e a linha
"autorização = RLS" desta tabela vira letra morta. Para que valha de fato:

- a aplicação usa um usuário de banco sem privilégio de bypass;
- cada requisição roda dentro de uma transação que define o contexto do
  usuário antes das consultas (`SET LOCAL request.jwt.claims`), a partir do
  token do Supabase validado pelo Nest;
- as políticas são escritas em migration, junto do resto do esquema.

É uma peça móvel a mais do que a tabela sugere. Vale porque o escopo por
pessoa é o requisito de segurança do produto, mas precisa estar de pé no
esqueleto, não depois. Se ao montar o esqueleto o custo se mostrar maior do
que o descrito aqui, a saída é assumir a autorização apenas nos guards do
Nest e registrar isso como ADR-003 — em vez de manter políticas que nunca
são executadas.

## O que este ADR NÃO decide

Estrutura de pastas, organização em camadas, nomes de módulo.
Isso vem depois do esqueleto rodar, e vira ADR-002 se for caro de mudar.
