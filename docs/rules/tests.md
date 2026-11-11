# TESTS.md — EMPREST.AI

O que se testa, com o quê, e quando um teste é escrito.

A ferramenta foi decidida no [ADR-001](../adrs/adr-001-stack.md): **Jest**,
não Vitest. No frontend, componentes usam Testing Library (FE-01 §9).

**Estado atual:** Jest instalado nas duas pontas. No backend, com
`ts-jest`; no frontend, com `jest-environment-jsdom` e Testing Library.
`npm test` roda em cada uma. Já há testes em `backend/src/auth/`,
`backend/src/perfil/`, `backend/src/comum/valores/`,
`backend/src/dados-iniciais/` (BE-03), `backend/src/emprestimos/` (BE-04),
`frontend/src/lib/`, `frontend/src/components/` e `frontend/src/app/`
(login, catálogo e Meus empréstimos, FE-03 e FE-04). Os testes citam o CA no
nome (ex.: `BE-04 CA-5`).

**Na raiz** (ferramentas, sem código de produto), os testes usam o test
runner do próprio Node (`node --test`) e não o Jest, para não trazer uma
dependência só para isso ([ADR-002](../adrs/adr-002-imagens-equipamentos.md)).
`npm test` na raiz roda os testes da skill `imagens-equipamentos` e os casos
dos hooks (`.claude/hooks/testa-hooks.js`).

**Atenção:** o `backend/.env` aponta para o Supabase do deploy. Teste que
abre conexão de verdade com o banco não roda com esse `.env` (regra 7).

---

## O que testar, por ordem de valor

| # | Ponta | Nível | O quê |
|---|---|---|---|
| 1 | backend | unitário | service de empréstimos: cada regra de negócio, com o caso que passa e o que falha |
| 2 | backend | integração, banco real | índice único barra o segundo empréstimo do mesmo item; trigger barra o sexto item da mesma pessoa |
| 3 | backend | integração, banco real | **RLS ligado sem política**: pela API pública do Supabase (chave publishable), nenhuma tabela é lida nem escrita ([ADR-003](../adrs/adr-003-autorizacao-no-backend.md)) |
| 4 | frontend | unitário | `src/lib/dominio.ts` inteiro |
| 5 | frontend | componente | card em cada situação; modal de solicitar |

Com o ADR-003, quem filtra "cada um vê os seus" é o backend, e o teste disso
é unitário (BE-04 CA-8). O RLS ficou só para fechar a API pública, e o teste
3 confere isso. **Os testes 2 e 3 ainda não existem:** dependem do banco de
teste (decisão em aberto 1); até lá, essas garantias só são conferidas em
produção (BE-04 §8, decisão em aberto 2).

**Fora da v1:** ponta a ponta automatizado (navegador em CI). O fluxo
login → solicitar → devolver é conferido à mão.

---

## Regras

1. **Código pedido inclui o teste da regra que ele implementa.** Implementar
   "bloqueio por atraso" entrega também o teste do bloqueio. Isso refina o
   [restrictions.md](restrictions.md): o teste faz parte do pedido, não é
   criação por iniciativa própria.
2. **Teste avulso só com pedido.** Cobrir código que já existe, ampliar
   cobertura ou "aproveitar para testar" outra parte é escopo novo.
3. **Toda regra de negócio tem dois casos:** o que passa e o que falha. As
   sete regras do [PRD](../prd.md) são a lista de referência.
4. **Nome do teste descreve a regra, em português:**
   `bloqueia novo empréstimo quando há item em atraso`, não
   `testa checkAtraso`.
5. **Data nunca vem do relógio.** O "hoje" é injetado no teste, como o
   `HOJE` fixo de `src/lib/dados.ts`. Teste que depende de `new Date()`
   quebra no dia em que o prazo virar.
6. **Constraint, trigger e RLS se testam em Postgres real**, no container,
   nunca com mock do Prisma. Mock prova que o mock funciona.
7. **Nenhum teste roda contra o Supabase.** Só contra o Postgres local.
8. **Teste que falha não é enfraquecido para passar.** Nada de `.skip`,
   `.only` esquecido, asserção afrouxada ou teste apagado. Se o teste está
   errado, isso é dito e corrigido às claras; se o código está errado, o
   código é que muda.
9. **Arquivo de teste fica ao lado do que testa**, com sufixo `.spec.ts`,
   que é o padrão que o NestJS gera.

## Para a IA, especificamente

- Pode rodar os testes à vontade, quando existirem.
- Resultado é reportado como saiu: quantos passaram, quais falharam, com a
  saída. "Deve passar" não é resultado (ver [checks.md](checks.md)).
- Se a tarefa pede código e o Jest ainda não existe naquela ponta, a IA
  escreve o código, diz que o teste não pôde ser escrito e por quê, e
  pergunta se instala.

---

## Decisões em aberto

| # | Questão | Efeito |
|---|---|---|
| 1 | O banco dos testes de integração é um serviço próprio no Compose ou o mesmo `db` com outro schema? | serviço próprio isola dados; mesmo `db` é menos configuração |
| 2 | Há meta de cobertura? | proposta: nenhuma na v1; a tabela acima já diz o que importa |
| 3 | `.spec.ts` também no frontend, ou `.test.ts`? | adotei `.spec.ts` nas duas pontas por consistência com o Nest; vale confirmar |
