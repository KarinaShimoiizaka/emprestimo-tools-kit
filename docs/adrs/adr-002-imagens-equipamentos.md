# ADR-002 — Fotos de equipamento: Pixabay, sharp e processamento fora do deploy

**Status:** aceito (11/11/2026)

**Contexto do produto:** [docs/prd.md](../prd.md) · **Contrato:**
[.claude/skills/imagens-equipamentos/references/contrato.md](../../.claude/skills/imagens-equipamentos/references/contrato.md)

> **Sobre o número:** o [ADR-001](adr-001-stack.md) previa o 002 para
> estrutura de pastas ("se for caro de mudar") e o 003 para abandonar RLS.
> Nenhum dos dois foi escrito. Esta é a próxima decisão registrada, então leva
> o 002; se aquelas vierem, pegam o próximo número livre.

## Contexto

O catálogo precisa de uma foto por equipamento: 12 itens, todos em 800×600,
sem pessoa, marca ou texto, sem foto repetida, com o crédito de cada uma
registrado, guardadas num bucket público do Supabase Storage. O enunciado da
prática pede a API do **Pexels** e, no briefing de dados iniciais, manda
"instalar a biblioteca sharp e redimensionar depois do download".

Duas restrições do projeto pesam: dependência nova é decisão de arquitetura
e vira ADR ([restrictions.md](../rules/restrictions.md)), e o agente nunca
escreve em produção.

Durante o uso, o Pexels passou a limitar as requisições (rate limiting).

## Decisão

| item | escolha |
|---|---|
| fonte das fotos | API do **Pixabay**, com a chave da pessoa |
| tratamento | **sharp**: recorte para 800×600 preenchendo o quadro (`fit: cover`, foco por saliência) e JPEG |
| onde roda | **raiz do projeto** (repositório emprestimo-tools-kit), com `package.json` próprio; fora do backend e do frontend |
| envio ao Storage | API REST do Supabase Storage com o `fetch` do Node, sem `@supabase/supabase-js` |
| linguagem dos scripts | JavaScript (CommonJS), rodando com `node` direto, como os hooks |
| testes dos scripts | test runner do próprio Node (`node --test`) |

## Justificativa

- **Pixabay:** a API tem busca por termo, filtro de tipo, orientação e
  tamanho mínimo, devolve autor e página de cada foto, e o limite (100
  requisições por minuto, com cache de 24 h exigido) comporta 12 buscas com
  folga. Foi a alternativa à mão quando o Pexels começou a limitar.
- **sharp:** recorta e redimensiona com tamanho exato e permite reler o
  arquivo pronto para conferir, que é o que torna o 800×600 *garantido*. Já
  era a indicação do briefing.
- **Na raiz:** a skill é ferramenta de conteúdo, não código de produto. O
  sharp tem binário nativo por plataforma; no backend ele entraria na imagem
  Docker e no deploy sem ser usado por nenhuma rota.
- **fetch em vez de supabase-js:** são três chamadas (consultar bucket,
  enviar objeto, conferir URL pública). Uma segunda dependência não compra
  nada.
- **JavaScript e `node --test`:** os scripts rodam com `node` direto, sem
  build nem `ts-node`, como os hooks; e não trazem o Jest como dependência só
  para testar a lógica de escolha.

## Alternativas descartadas

- **Pexels**, como pede o enunciado: descartada por causa do rate limiting.
  O desvio está registrado no contrato da skill e no `ENTREGA.md`.
- **Tamanhos prontos do Pixabay** (`webformatURL` de 640 px, `largeImageURL`
  de até 1280 px): nenhum é 800×600; usar um deles seria pedir o tamanho, não
  garantir.
- **Transformação de imagem do Supabase:** transforma na entrega, não no
  arquivo guardado, e é recurso de plano pago.
- **Jimp** (JavaScript puro, sem binário nativo): não tem recorte por
  saliência e é mais lento; o briefing já apontava o sharp.
- **sharp como dependência de desenvolvimento do backend:** misturaria
  ferramenta de conteúdo com o código que vai para o deploy.

## Consequências

- **O que fica mais fácil:** trocar uma foto é rodar o `preparar` com
  `--reprovar`; repetir não duplica nada (caminho fixo por patrimônio, com
  upsert); cada regra do contrato tem um ponto do código que falha se ela não
  for cumprida.
- **O que fica mais difícil:** a raiz passa a ter `node_modules/` e um
  `npm install` próprio; o sharp precisa ser instalado na máquina de quem
  roda (binário por sistema operacional).
- **Desvios registrados:**
  - do enunciado, que pede Pexels;
  - do ADR-001 (TypeScript e Jest) para os scripts da raiz. O código de
    produto continua em TypeScript com Jest.
- **Licença:** a Pixabay Content License não exige atribuição, mas o crédito é
  registrado mesmo assim (contrato, item 5). Ela proíbe uso comercial de foto
  com marca reconhecível, o que reforça o critério de revisão "nenhuma marca
  legível".
- **Termos da API:** hotlink é proibido, então as fotos são servidas pelo
  Supabase Storage; as buscas ficam em cache por 24 h.
