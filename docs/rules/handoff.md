# HANDOFF.md — EMPREST.AI

Como um agente de IA encerra uma sessão de trabalho neste repositório.

Como a IA não commita (ver [restrictions.md](restrictions.md)), todo trabalho
dela termina como mudança não commitada no working tree. O handoff é o que
permite à pessoa revisar, commitar ou descartar essa mudança sem ter de
reconstruir o que aconteceu.

---

## Onde

Na **última mensagem da sessão**, no chat. Não em arquivo novo.

## O que contém

Nesta ordem, e só as seções que tiverem conteúdo:

1. **O que mudou.** Cada arquivo alterado, com link, e uma linha dizendo o
   porquê. Arquivo criado é marcado como criado.
2. **Checagens.** O resultado de cada uma do [checks.md](checks.md): passou,
   falhou (com a saída) ou não rodou (com o motivo).
3. **O que não foi feito.** O que ficou pendente, e o que a IA deixou de
   fazer por causa de uma restrição — por exemplo, "precisaria instalar o
   Jest, não instalei".
4. **Comandos para a pessoa rodar.** O que a IA não pode executar, mas a
   tarefa exige: `npx prisma migrate dev --name ...`, `npm install`, etc.
5. **Decisões.** O que surgiu durante a tarefa e ainda não está decidido, e
   em qual spec ou ADR isso deveria entrar.
6. **Documentação desatualizada.** Se o código divergiu da spec, ou se a
   árvore da seção 4 do `AGENT.md` não bate mais com o repositório. A IA
   aponta; edita só se pedido.
7. **Mensagem de commit sugerida.** Conventional Commits, em inglês, como o
   histórico já usa. Entregue como texto — não executada.

---

## Regras

1. **Honesto antes de completo.** Falha, atalho e pendência aparecem no
   handoff, mesmo que isso deixe o resultado menos bonito.
2. **Curto.** Uma linha por item. O diff está no working tree; o handoff não
   o repete.
3. **Sessão interrompida no meio também tem handoff:** onde parou, em que
   estado ficou cada arquivo tocado, e qual é o próximo passo para retomar.
4. **Nada de segredo no handoff** (ver [secrets.md](secrets.md)).
5. **Uma mensagem de commit por mudança lógica.** Se a sessão fez duas coisas
   independentes, sugere dois commits e diz quais arquivos vão em cada um.

---

## Exemplo

```
O que mudou
- frontend/src/lib/dominio.ts — regra de bloqueio por atraso
- frontend/src/lib/dominio.spec.ts — teste do bloqueio (passa e falha)
- frontend/src/components/BannerAtraso.tsx — texto conforme a spec

Checagens
- build do frontend: passou
- testes do frontend: passaram (18 de 18)
- verificador-spec FE-02: NÃO PRONTA — CA-4 sem teste (tabela abaixo, como saiu;
  registro em docs/verificacoes/)
- escopo: git status mostra só os três arquivos acima

O que não foi feito
- teste do CA-4: o texto do banner depende de uma decisão em aberto da FE-02

Mensagem de commit sugerida
feat(frontend): block new loans when an item is overdue
```
