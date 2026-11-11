#!/usr/bin/env node
'use strict';
// Prepara as fotos dos equipamentos: busca no Pixabay, escolhe, baixa,
// recorta para 800×600 e grava o manifesto com os créditos, mais a página de
// revisão. O agente pode rodar. NÃO envia nada ao Supabase: isso é o
// publicar.js, que só a pessoa roda.
//
// Uso, na raiz do projeto:
//   npm run imagens:preparar
//   npm run imagens:preparar -- --reprovar TI-0005 "pessoa ao fundo" --reprovar TI-0011 "logo legível"
//
// Idempotente: equipamento que já tem foto preparada (arquivo presente e com
// o mesmo sha256) é mantido, sem nova busca.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ambiente = require('./lib/ambiente');
const sel = require('./lib/selecao');

const RAIZ = path.resolve(__dirname, '..', '..', '..', '..');
const SKILL = path.resolve(__dirname, '..');
const PASTA = path.join(RAIZ, 'imagens');
const PRONTAS = path.join(PASTA, 'prontas');
const CACHE = path.join(PASTA, '.cache');
const MANIFESTO = path.join(PASTA, 'manifesto.json');
const REVISAO = path.join(PASTA, 'revisao.html');
const LISTA = path.join(SKILL, 'references', 'equipamentos.json');
const ENV_RAIZ = path.join(RAIZ, '.env');
const VALIDADE_DO_CACHE_MS = 24 * 60 * 60 * 1000; // termos da API: cache de 24 h

function falhar(msg) {
  console.error(`\n[preparar] ${msg}`);
  process.exit(1);
}

function lerArgs(argv) {
  const reprovar = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] !== '--reprovar') falhar(`argumento desconhecido: ${argv[i]}`);
    const patrimonio = argv[i + 1];
    const motivo = argv[i + 2];
    if (!patrimonio || !motivo || motivo.startsWith('--')) {
      falhar('uso: --reprovar TI-0000 "motivo dito pela pessoa"');
    }
    reprovar.push({ patrimonio: patrimonio.toUpperCase(), motivo });
    i += 2;
  }
  return { reprovar };
}

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function lerManifesto() {
  const vazio = { fonte: 'Pixabay API (https://pixabay.com/api/docs/)', itens: [], reprovadas: [] };
  if (!fs.existsSync(MANIFESTO)) return vazio;
  const m = JSON.parse(fs.readFileSync(MANIFESTO, 'utf8'));
  return { ...vazio, ...m, itens: m.itens || [], reprovadas: m.reprovadas || [] };
}

function gravarManifesto(m, lista) {
  const ordem = new Map(lista.map((e, i) => [e.patrimonio, i]));
  m.itens.sort((a, b) => ordem.get(a.patrimonio) - ordem.get(b.patrimonio));
  fs.writeFileSync(MANIFESTO, `${JSON.stringify(m, null, 2)}\n`, 'utf8');
}

async function buscar(termo, chave) {
  const params = {
    q: termo,
    lang: 'en',
    image_type: 'photo',
    orientation: 'horizontal',
    min_width: String(sel.LARGURA),
    min_height: String(sel.ALTURA),
    safesearch: 'true',
    order: 'popular',
    per_page: '50',
  };
  // A chave nunca entra no cache nem no nome do arquivo.
  const arquivo = path.join(CACHE, `busca-${sha256(Buffer.from(JSON.stringify(params))).slice(0, 16)}.json`);
  if (fs.existsSync(arquivo)) {
    const c = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
    if (Date.now() - Date.parse(c.salvo_em) < VALIDADE_DO_CACHE_MS) {
      return { hits: (c.resposta && c.resposta.hits) || [], doCache: true };
    }
  }

  const qs = new URLSearchParams({ key: chave, ...params });
  for (let tentativa = 1; tentativa <= 3; tentativa++) {
    let r;
    try {
      r = await fetch(`https://pixabay.com/api/?${qs}`);
    } catch (e) {
      // A mensagem não inclui a URL, que tem a chave.
      throw new Error(`falha de rede na busca "${termo}": ${e.message}`);
    }
    if (r.status === 429) {
      const espera = Number(r.headers.get('x-ratelimit-reset')) || 60;
      console.log(`  limite da API atingido; esperando ${espera}s`);
      await new Promise((ok) => setTimeout(ok, espera * 1000));
      continue;
    }
    if (!r.ok) {
      throw new Error(`Pixabay respondeu ${r.status} na busca "${termo}": ${(await r.text()).slice(0, 200)}`);
    }
    const resposta = await r.json();
    fs.writeFileSync(arquivo, JSON.stringify({ salvo_em: new Date().toISOString(), params, resposta }, null, 2));
    return { hits: resposta.hits || [], doCache: false };
  }
  throw new Error(`o limite da API não liberou a busca "${termo}"`);
}

async function baixar(hit) {
  const ext = (path.extname(new URL(hit.largeImageURL).pathname) || '.jpg').toLowerCase();
  const arquivo = path.join(CACHE, `original-${hit.id}${ext}`);
  if (fs.existsSync(arquivo)) return arquivo;
  const r = await fetch(hit.largeImageURL);
  if (!r.ok) throw new Error(`o download da foto ${hit.id} respondeu ${r.status}`);
  fs.writeFileSync(arquivo, Buffer.from(await r.arrayBuffer()));
  return arquivo;
}

// Recorta para 800×600 preenchendo o quadro (corta as bordas, não põe
// faixas) e confere o arquivo pronto. Se não for exatamente 800×600 JPEG,
// apaga e para: o tamanho é garantido, não só pedido.
async function recortar(sharp, origem, destino) {
  await sharp(origem)
    .rotate()
    .resize(sel.LARGURA, sel.ALTURA, { fit: 'cover', position: sharp.strategy.attention })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(destino);
  const meta = await sharp(destino).metadata();
  if (meta.width !== sel.LARGURA || meta.height !== sel.ALTURA || meta.format !== 'jpeg') {
    fs.rmSync(destino, { force: true });
    throw new Error(
      `${path.basename(destino)} saiu ${meta.width}×${meta.height} ${meta.format}; esperado ${sel.LARGURA}×${sel.ALTURA} jpeg`
    );
  }
}

function itemDoHit(eq, hit, buf, descartes) {
  return {
    patrimonio: eq.patrimonio,
    nome: eq.nome,
    busca: eq.busca,
    arquivo: `prontas/${eq.patrimonio}.jpg`,
    caminho_storage: `equipamentos/${eq.patrimonio}.jpg`,
    largura: sel.LARGURA,
    altura: sel.ALTURA,
    sha256: sha256(buf),
    fonte: sel.FONTE,
    pixabay_id: hit.id,
    pagina: hit.pageURL,
    tags: hit.tags,
    autor: hit.user,
    autor_id: hit.user_id,
    autor_pagina: `https://pixabay.com/users/${encodeURIComponent(hit.user)}-${hit.user_id}/`,
    licenca: sel.LICENCA,
    licenca_url: sel.LICENCA_URL,
    descartadas_antes: descartes.length,
    preparada_em: new Date().toISOString(),
    revisao: 'pendente',
    publicada_em: null,
  };
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function gerarRevisao(m, lista) {
  const porPatrimonio = new Map(m.itens.map((i) => [i.patrimonio, i]));
  const cards = lista
    .map((eq) => {
      const i = porPatrimonio.get(eq.patrimonio);
      if (!i) {
        return `<article class="card falta"><div class="ph">sem foto</div><h2>${esc(eq.patrimonio)} · ${esc(eq.nome)}</h2><p>busca: ${esc(eq.busca)}</p></article>`;
      }
      return `<article class="card">
  <img src="${esc(i.arquivo)}?v=${esc(i.sha256.slice(0, 8))}" width="800" height="600" alt="${esc(eq.nome)}">
  <h2>${esc(i.patrimonio)} · ${esc(i.nome)}</h2>
  <p>busca: <code>${esc(i.busca)}</code></p>
  <p>tags: ${esc(i.tags)}</p>
  <p>Pixabay <a href="${esc(i.pagina)}" target="_blank" rel="noopener">${esc(i.pixabay_id)}</a> · por <a href="${esc(i.autor_pagina)}" target="_blank" rel="noopener">${esc(i.autor)}</a></p>
  <p class="st ${esc(i.revisao)}">revisão: ${esc(i.revisao)}</p>
</article>`;
    })
    .join('\n');

  const reprovadas = m.reprovadas.length
    ? `<table><thead><tr><th>patrimônio</th><th>foto</th><th>motivo</th><th>quando</th></tr></thead><tbody>${m.reprovadas
        .map(
          (r) =>
            `<tr><td>${esc(r.patrimonio)}</td><td><a href="${esc(r.pagina)}" target="_blank" rel="noopener">${esc(r.pixabay_id)}</a></td><td>${esc(r.motivo)}</td><td>${esc(r.reprovada_em)}</td></tr>`
        )
        .join('')}</tbody></table>`
    : '<p>Nenhuma até agora.</p>';

  const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Revisão das fotos</title>
<style>
:root { --bg:#f6f6f4; --fg:#1d1d1b; --muted:#5f5f5a; --line:#d9d9d4; --card:#fff; --ok:#1f7a4d; --warn:#9a5b00; }
@media (prefers-color-scheme: dark) { :root { --bg:#16171b; --fg:#ececea; --muted:#a3a39e; --line:#2e3037; --card:#1e2026; --ok:#5fd39b; --warn:#f0b35a; } }
* { box-sizing:border-box } body { margin:0; padding:24px 16px; background:var(--bg); color:var(--fg); font:15px/1.5 system-ui, sans-serif }
main { max-width:1200px; margin:0 auto } h1 { font-size:22px; margin:0 0 4px } .muted { color:var(--muted) }
ol { padding-left:20px } .grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(300px, 1fr)); gap:16px; margin:20px 0 }
.card { background:var(--card); border:1px solid var(--line); border-radius:10px; overflow:hidden }
.card img, .ph { display:block; width:100%; height:auto; aspect-ratio:4/3 } .ph { display:grid; place-items:center; color:var(--warn) }
.card h2 { font-size:15px; margin:10px 12px 4px } .card p { margin:2px 12px; font-size:13px; color:var(--muted); overflow-wrap:anywhere }
.card p:last-child { margin-bottom:12px } .st.pendente { color:var(--warn) } .st.aprovada { color:var(--ok) }
a { color:inherit } code { font-size:12px } table { border-collapse:collapse; width:100%; font-size:13px }
th, td { text-align:left; padding:6px 8px; border-bottom:1px solid var(--line) }
</style></head><body><main>
<h1>Revisão das fotos dos equipamentos</h1>
<p class="muted">Gerada por preparar.js. Todas em 800×600. Diga no chat quais reprova e por quê.</p>
<h2>Reprove se a foto tiver</h2>
<ol>
<li>pessoa (rosto, corpo, mão, mesmo ao fundo ou em reflexo);</li>
<li>marca ou logo legível;</li>
<li>texto legível;</li>
<li>tela ligada com conteúdo (site, código, app, foto);</li>
<li>outro objeto que não o equipamento do nome;</li>
<li>recorte que deixa o equipamento irreconhecível.</li>
</ol>
<section class="grid">
${cards}
</section>
<h2>Reprovadas</h2>
${reprovadas}
</main></body></html>
`;
  fs.writeFileSync(REVISAO, html, 'utf8');
}

async function principal() {
  const { reprovar } = lerArgs(process.argv.slice(2));
  const lista = JSON.parse(fs.readFileSync(LISTA, 'utf8'));
  fs.mkdirSync(PRONTAS, { recursive: true });
  fs.mkdirSync(CACHE, { recursive: true });
  const m = lerManifesto();

  for (const { patrimonio, motivo } of reprovar) {
    const i = m.itens.findIndex((x) => x.patrimonio === patrimonio);
    if (i < 0 || !m.itens[i].pixabay_id) falhar(`${patrimonio} não tem foto escolhida para reprovar`);
    const it = m.itens[i];
    m.reprovadas.push({
      patrimonio,
      pixabay_id: it.pixabay_id,
      pagina: it.pagina,
      autor: it.autor,
      motivo,
      reprovada_em: new Date().toISOString(),
    });
    m.itens.splice(i, 1);
    fs.rmSync(path.join(PASTA, it.arquivo), { force: true });
    console.log(`reprovada: ${patrimonio} (Pixabay ${it.pixabay_id}): ${motivo}`);
  }
  if (reprovar.length) gravarManifesto(m, lista);

  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    falhar('o sharp não está instalado na raiz. Quem instala é a pessoa: npm install (ADR-002).');
  }
  sharp.cache(false);

  let chave;
  try {
    chave = ambiente.carregar(ENV_RAIZ, ['PIXABAY_API_KEY']).PIXABAY_API_KEY;
  } catch (e) {
    falhar(e.message);
  }

  const idsReprovados = new Set(m.reprovadas.map((r) => Number(r.pixabay_id)));
  const resumo = [];

  for (const eq of lista) {
    const atual = m.itens.find((x) => x.patrimonio === eq.patrimonio);
    if (atual && atual.pixabay_id) {
      const arq = path.join(PASTA, atual.arquivo);
      if (fs.existsSync(arq) && sha256(fs.readFileSync(arq)) === atual.sha256) {
        resumo.push([eq.patrimonio, atual.pixabay_id, 'mantida', atual.revisao]);
        continue;
      }
    }
    // Sem foto, ou o arquivo sumiu/mudou: escolhe de novo.
    m.itens = m.itens.filter((x) => x.patrimonio !== eq.patrimonio);
    const idsEmUso = new Set(m.itens.filter((x) => x.pixabay_id).map((x) => Number(x.pixabay_id)));

    const { hits, doCache } = await buscar(eq.busca, chave);
    const { hit, descartes } = sel.escolherCandidato(hits, { idsEmUso, idsReprovados });
    if (!hit) {
      const motivos = descartes.slice(0, 5).map((d) => `${d.id}: ${d.motivo}`).join('; ');
      resumo.push([eq.patrimonio, '—', `NENHUMA candidata (${hits.length} resultados; ${motivos || 'busca vazia'})`, '—']);
      continue;
    }
    const origem = await baixar(hit);
    const destino = path.join(PRONTAS, `${eq.patrimonio}.jpg`);
    await recortar(sharp, origem, destino);
    m.itens.push(itemDoHit(eq, hit, fs.readFileSync(destino), descartes));
    resumo.push([
      eq.patrimonio,
      hit.id,
      `nova${doCache ? ' (busca do cache)' : ''}, ${descartes.length} descartada(s) antes`,
      'pendente',
    ]);
  }

  gravarManifesto(m, lista);
  gerarRevisao(m, lista);

  console.log('\npatrimônio | Pixabay | situação | revisão');
  for (const linha of resumo) console.log(linha.join(' | '));
  console.log(`\nreprovadas até agora: ${m.reprovadas.length}`);
  console.log(`manifesto: ${path.relative(RAIZ, MANIFESTO)}`);
  console.log(`revisão:   ${path.relative(RAIZ, REVISAO)}`);

  const problemas = sel.validarManifesto(m, lista.map((e) => e.patrimonio));
  if (problemas.length) {
    console.log('\nAinda não dá para publicar:');
    for (const p of problemas) console.log(`  - ${p}`);
    process.exitCode = 1;
  } else {
    console.log('\nManifesto completo. Próximo passo: a pessoa revisa a página de revisão.');
  }
}

principal().catch((e) => falhar(e.message));
