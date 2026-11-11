# API do Pixabay: o que esta skill usa

Fonte: https://pixabay.com/api/docs/ e
https://pixabay.com/service/license-summary/ (lidas em 11/11/2026).

## Requisição

`GET https://pixabay.com/api/` com estes parâmetros:

| parâmetro | valor | por quê |
|---|---|---|
| `key` | `PIXABAY_API_KEY` do `.env` da raiz | obrigatório; nunca vai para log, manifesto ou cache |
| `q` | o campo `busca` de [equipamentos.json](equipamentos.json) | os termos da lista da prática, sem alteração |
| `lang` | `en` | os termos estão em inglês |
| `image_type` | `photo` | ilustração e vetor não servem como foto de equipamento |
| `orientation` | `horizontal` | o destino é 800×600, paisagem |
| `min_width`, `min_height` | `800`, `600` | não aceitar foto menor que o destino |
| `safesearch` | `true` | só conteúdo adequado a qualquer idade |
| `order` | `popular` | ordem estável entre rodadas |
| `per_page` | `50` | margem para descartar por tag, repetição ou reprovação |

## Campos usados de cada resultado

`id`, `pageURL`, `type`, `tags`, `user`, `user_id`, `imageWidth`,
`imageHeight`, `largeImageURL`.

- `largeImageURL` tem no máximo 1280 px no lado maior. Por isso a escolha
  calcula o tamanho real dela e descarta o que ficaria abaixo de 800×600, para
  nunca ampliar a imagem.
- `webformatURL` (640 px, válida por 24 h) não serve: é menor que o destino.

## Regras da API que a skill respeita

- **Hotlink proibido:** "permanent hotlinking of images (using Pixabay URLs in
  your app) is not allowed". A foto é baixada e servida pelo Supabase Storage.
- **Cache de 24 h:** "requests must be cached for 24 hours". As respostas de
  busca ficam em `imagens/.cache/` (fora do git) e são reaproveitadas por 24 h.
- **Limite:** 100 requisições por 60 s por chave. A skill faz uma busca por
  equipamento e, se receber 429, espera o tempo de `X-RateLimit-Reset`.
- **Origem visível:** a API pede que se mostre de onde vêm as imagens quando
  resultados de busca são exibidos. Aqui não exibimos resultados de busca ao
  usuário final; o crédito na tela é decidido na fase 4.

## Licença (Pixabay Content License)

Permite usar e modificar sem pagar e sem atribuição obrigatória (crédito é
"apreciado"). Proíbe, entre outros:

- vender ou distribuir a foto sem alteração ("Standalone");
- usar foto com marca, logo ou marca registrada reconhecível para fins
  comerciais ligados a produtos ou serviços;
- usar foto com pessoa reconhecível de forma imoral ou ilegal;
- usar de forma enganosa.

A licença também avisa que a foto pode ter direitos de terceiros (marca,
desenho, privacidade). Por isso o critério de revisão é mais estrito do que a
licença: nenhuma pessoa e nenhuma marca legível, mesmo quando a licença
permitiria ([revisao.md](revisao.md)).
