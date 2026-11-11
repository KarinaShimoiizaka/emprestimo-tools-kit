# ADR-003 — Autorização no backend, não no RLS

**Status:** aceito (11/11/2026)

**Substitui em parte:** [ADR-001](adr-001-stack.md), linha "autorização = RLS
no PostgreSQL", e a [BE-01 §6](../../backend/specs/spec-backend.md).

## Contexto

O ADR-001 escolheu RLS como camada de autorização ("cada usuário vê somente os
próprios empréstimos" vira invariante do banco) e avisou do risco: o Prisma
conecta com um único usuário de banco, e, se esse usuário for dono das
tabelas ou tiver `BYPASSRLS`, as políticas não são avaliadas. Para valer, a
aplicação precisaria de:

- um usuário de banco sem bypass e que não seja dono das tabelas;
- cada requisição dentro de uma transação que define o contexto
  (`set_config('request.jwt.claims', …, true)`);
- políticas testadas em Postgres real.

O ADR-001 já previa a saída: "se o custo se mostrar maior que o descrito, a
saída é assumir a autorização apenas nos guards do Nest e registrar isso como
ADR-003".

O estado real em 11/11/2026: o backend conecta ao Supabase com o usuário dono
das tabelas (`DATABASE_URL` do pooler), e o projeto ainda não tem banco de
teste ([tests.md](../rules/tests.md), decisão 1). As tabelas `perfil` e
`equipamento` já têm RLS ligado **sem** política, o que bloqueia a API pública
do Supabase, mas não diz nada sobre o que o backend lê.

## Decisão

| item | escolha |
|---|---|
| quem pode chamar cada rota | guards do Nest (autenticação + papel), como já existe |
| quais linhas cada um enxerga | o service: toda consulta de empréstimo de uma pessoa filtra pelo `perfilId` que vem do token validado, nunca do corpo da requisição |
| RLS | continua **ligado e sem política** em todas as tabelas, só para fechar a API pública do Supabase (chave publishable) |
| usuário de banco | o atual; nenhuma credencial nova em produção |

## Justificativa

- O RLS com efeito real exige trocar a credencial de produção, envolver cada
  requisição numa transação com contexto e testar as políticas em Postgres
  real. Nada disso existe hoje, e a prática tem prazo.
- Manter políticas que nunca rodam é pior do que não ter: dá a impressão de
  proteção. O próprio ADR-001 diz isso.
- RLS ligado sem política continua útil: ninguém lê nem escreve as tabelas
  pela API pública do Supabase, mesmo com a chave publishable que vai para o
  navegador.

## Alternativas descartadas

- **Fazer o RLS valer** (usuário sem bypass + contexto por transação +
  políticas): mais seguro, porque um `where` esquecido no código não vazaria
  nada. Descartado agora pelo custo descrito acima. Volta a ser candidato
  quando houver banco de teste.
- **Desligar o RLS:** abriria as tabelas para a API pública do Supabase.

## Consequências

- **O risco que fica:** um `where perfilId` esquecido no código vaza
  empréstimo de outra pessoa. A mitigação é concentrar a consulta "meus
  empréstimos" num único método do service que **exige** o `perfilId`, com
  teste que confere o filtro.
- **O que fica mais fácil:** nenhuma credencial nova, nenhuma transação extra
  por requisição; os testes de autorização são unitários.
- **O que precisa de nova decisão para mudar:** voltar ao RLS com efeito real
  pede um ADR novo, junto com o banco de teste.
