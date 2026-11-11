# SKILL.md — EMPREST.AI

Como skills são usadas, criadas e editadas neste repositório.

Uma skill é um documento de instruções reutilizável — um jeito de trabalhar
(princípios de código, roteiro de revisão, fluxo de tarefa) que qualquer
agente pode carregar antes de agir.

---

## Onde moram

| Caminho | O quê |
|---|---|
| `docs/skill/<nome>.md` | uma skill por arquivo |

Cada arquivo começa com um cabeçalho YAML:

```yaml
---
name: <nome, igual ao nome do arquivo>
description: <quando usar esta skill, em uma frase>
---
```

A `description` é o que o agente lê para decidir se a skill se aplica à
tarefa. Ela diz **quando** usar, não o que a skill contém.

### Skills existentes

| Skill | Para quê |
|---|---|
| [solid](../skill/solid.md) | princípios de código: SOLID, TDD, clean code, desenho de objetos |

---

## Uso

1. **Todos os agentes podem usar todas as skills.** Não há skill restrita a
   um agente, papel ou ponta do projeto.
2. **Antes de começar uma tarefa, o agente confere as `description`** de
   `docs/skill/` e lê por inteiro as que se aplicam.
3. **O handoff diz quais skills foram usadas** (ver
   [handoff.md](handoff.md)).

## Precedência

Uma skill é conselho genérico; as regras do projeto são decisão. Quando as
duas discordam, vale esta ordem:

1. [restrictions.md](restrictions.md)
2. as demais regras de `docs/rules/`
3. ADRs, PRD e a spec aprovada da tarefa
4. a skill

O agente segue a regra que ganha **e diz no handoff** que a skill pedia
outra coisa. Não obedece à skill em silêncio, nem a ignora em silêncio.

### Conflitos conhecidos com `solid`

| A skill diz | O projeto diz | Vale |
|---|---|---|
| TDD sempre; nenhum código sem teste antes | o código pedido vem com o teste da regra, na mesma tarefa ([tests.md](tests.md), regra 1), sem impor a ordem | o projeto |
| value object obrigatório para todo id e e-mail | domínio de duas entidades; YAGNI da própria skill | a spec da tarefa decide; na falta dela, tipo simples |
| no máximo duas variáveis de instância por classe | service do Nest recebe dependências injetadas no construtor | o padrão do Nest |
| nomes e testes em inglês (exemplos) | código, comentário e nome de teste em português ([tests.md](tests.md), regra 4; FE-01 §10) | o projeto |
| aponta para `references/*.md` | esses arquivos não existem | ignorar os links até existirem |

---

## Criação e edição

1. **Criar, editar, renomear ou apagar uma skill só com pedido explícito.**
   Vale para qualquer agente. "Essa instrução se repete, dava uma skill" é
   uma proposta para fazer no chat, não um arquivo para criar.
2. **Quando pedido, qualquer agente pode criar ou editar** — não há agente
   dono das skills.
3. **Uma skill por arquivo, um assunto por skill.** Skill que cresce para
   dois assuntos vira duas.
4. **Skill não repete regra do projeto.** Se a instrução já está em
   `docs/rules/`, na spec ou no ADR, a skill aponta para lá em vez de
   copiar — cópia diverge.
5. **Skill não contradiz regra do projeto** de propósito. Se o pedido for uma
   skill que contradiz uma regra, o agente aponta o conflito antes de
   escrever.
6. **Skill nova ou alterada entra na tabela "Skills existentes"** acima, na
   mesma edição.
7. **Nada de segredo em skill** (ver [secrets.md](secrets.md)).

---

## Decisões em aberto

| # | Questão | Efeito |
|---|---|---|
| 1 | As skills ficam em `docs/skill/` ou em `.claude/skills/<nome>/SKILL.md`? | o Claude Code só descobre sozinho as de `.claude/skills/`; em `docs/skill/` o agente precisa ser mandado ler, e por isso a regra 2 de uso existe |
| 2 | Skill nova é escrita em português, como o resto da documentação, ou em inglês, como a `solid`? | afeta como a `description` é lida e se a `solid` deve ser traduzida |
| 3 | Os arquivos de `references/` da `solid` serão trazidos, ou os links saem da skill? | hoje são links quebrados |
| 4 | O `AGENT.md` passa a citar `docs/skill/`? | hoje ele não menciona skills; um agente que só lê o `AGENT.md` não as encontra |
