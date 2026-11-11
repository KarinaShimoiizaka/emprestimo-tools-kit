# CHECKS.md — EMPREST.AI

O que precisa ser verificado antes de dizer que uma tarefa terminou.

"Terminou" quer dizer que as checagens abaixo rodaram e o resultado foi
reportado. Não quer dizer que o código foi escrito.

---

## As checagens

| # | Checagem | Comando | Quando | Hoje |
|---|---|---|---|---|
| 1 | Build do frontend | `npm run build` em `frontend/` | a tarefa tocou o frontend | disponível |
| 2 | Testes | `npm test` na ponta tocada | a tarefa tocou código com teste | disponível: Jest nas duas pontas |
| 3 | Conferência com a spec | leitura, item a item (lista adiante) | sempre | disponível |
| 4 | Escopo | `git status` | sempre | disponível |

O build do Next já roda o typecheck do frontend; não há checagem de tipos
separada.

### 3. Conferência com a spec

Contra a spec aprovada da tarefa e o [PRD](../prd.md):

- cada regra numerada da spec está atendida, ou a ausência está explicada;
- nada da seção "fora de escopo" foi implementado;
- nenhuma "decisão em aberto" foi decidida em silêncio pelo código;
- copy em português do Brasil, direta, **sem exclamação e sem emoji**;
- datas exibidas em `DD/MM/AAAA`;
- cores, raios e espaçamentos vêm de `var(--*)`, sem valor solto; nada de
  preto ou branco puro;
- regra de negócio mora em `src/lib/dominio.ts` (front) ou no service
  (back), não no componente nem no controller.

### 4. Escopo

O `git status` final é comparado com o pedido. Todo arquivo alterado ou
criado tem de ser explicável pela tarefa. Arquivo novo que não foi pedido é
violação do [restrictions.md](restrictions.md), mesmo que o build passe.

---

## Regras

1. **Checagem que não rodou é dita como não rodada**, com o motivo. "Jest não
   instalado, testes não rodaram" é resposta válida; silêncio não é.
2. **Checagem que falhou é reportada com a saída**, não com um resumo
   otimista.
3. **"Deve funcionar" não é resultado.** Ou rodou e passou, ou não foi
   verificado.
4. **Não se contorna checagem para passar:** nada de desligar erro de tipo
   no `next.config.mjs`, `// @ts-ignore` para calar o build, ou teste pulado
   (ver [tests.md](tests.md), regra 8).
5. **Artefato de build não fica para trás como mudança.** `.next/` e `dist/`
   estão no `.gitignore`; se algo gerado aparecer no `git status`, é
   apontado.
6. O resultado de cada checagem entra no handoff (ver
   [handoff.md](handoff.md)).

---

## Fora destas checagens (por ora)

Lint e formatação (nenhum configurado) · teste ponta a ponta · CI.

## Decisões em aberto

| # | Questão | Efeito |
|---|---|---|
| 1 | O backend já existe: `npm run build` (compilação do Nest) entra como checagem desta tabela? | pega erro de tipo no back, que o Jest sozinho não pega em arquivo sem teste; o verificador-spec já roda esse build |
| 2 | Entra ESLint e/ou Prettier? | vira dependência e checagem nova; exige pedido |
| 3 | Estas checagens rodam também em CI (GitHub Actions)? | hoje só rodam na máquina de quem trabalha |
