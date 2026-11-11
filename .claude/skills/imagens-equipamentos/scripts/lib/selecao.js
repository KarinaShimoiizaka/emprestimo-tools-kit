'use strict';
// Regras de escolha e de validação que a skill garante por código.
// Sem rede, sem disco e sem sharp: só decisão, para poder ser testada
// (selecao.test.js).

const LARGURA = 800;
const ALTURA = 600;
// O largeImageURL do Pixabay tem no máximo 1280 px no lado maior.
const LADO_MAIOR_DO_LARGE = 1280;

const FONTE = 'Pixabay';
const LICENCA = 'Pixabay Content License';
const LICENCA_URL = 'https://pixabay.com/service/license-summary/';

// Tags que descartam a foto antes da revisão humana. Comparação por palavra
// inteira: "worker" barra, "workplace" não; "apple" barra, "pineapple" não.
const TAGS_PROIBIDAS = {
  pessoa: [
    'person', 'people', 'man', 'men', 'woman', 'women', 'girl', 'boy', 'child',
    'children', 'kid', 'kids', 'baby', 'human', 'hand', 'hands', 'finger',
    'fingers', 'face', 'portrait', 'model', 'businessman', 'businesswoman',
    'student', 'worker', 'user', 'selfie', 'couple', 'family', 'team', 'crowd',
    'lady', 'guy', 'adult', 'teen', 'teenager', 'senior',
  ],
  marca: [
    'logo', 'brand', 'apple', 'macbook', 'imac', 'iphone', 'ipad', 'samsung',
    'dell', 'lenovo', 'asus', 'acer', 'hp', 'sony', 'canon', 'nikon',
    'fujifilm', 'panasonic', 'logitech', 'microsoft', 'windows', 'google',
    'android', 'facebook', 'instagram', 'twitter', 'youtube', 'netflix', 'amazon',
  ],
  'texto ou tela com conteúdo': [
    'text', 'typography', 'letter', 'letters', 'word', 'words', 'sign', 'quote',
    'website', 'webpage', 'code', 'coding', 'programming', 'programmer', 'html',
    'social media', 'chart', 'graph', 'dashboard', 'email', 'news', 'app',
  ],
};

function normalizar(texto) {
  return ` ${String(texto || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).join(' ')} `;
}

// Devolve { motivo, tag } da primeira tag proibida, ou null.
function tagProibida(tags) {
  for (const tag of String(tags || '').split(',')) {
    const t = normalizar(tag);
    for (const [motivo, termos] of Object.entries(TAGS_PROIBIDAS)) {
      for (const termo of termos) {
        if (t.includes(normalizar(termo))) return { motivo, tag: tag.trim() };
      }
    }
  }
  return null;
}

// Tamanho real do largeImageURL de um resultado.
function dimensoesDoLarge(hit) {
  const w = Number(hit.imageWidth) || 0;
  const h = Number(hit.imageHeight) || 0;
  if (!w || !h) return { largura: 0, altura: 0 };
  const escala = Math.min(1, LADO_MAIOR_DO_LARGE / Math.max(w, h));
  return { largura: Math.round(w * escala), altura: Math.round(h * escala) };
}

// Escolhe o primeiro resultado que pode virar foto de equipamento.
// Devolve { hit, descartes }, com hit = null quando nenhum serve.
function escolherCandidato(hits, { idsEmUso = new Set(), idsReprovados = new Set() } = {}) {
  const descartes = [];
  for (const hit of hits || []) {
    const id = Number(hit.id);
    let motivo = null;
    if (hit.type && hit.type !== 'photo') motivo = `tipo ${hit.type}`;
    else if (idsReprovados.has(id)) motivo = 'reprovada antes';
    else if (idsEmUso.has(id)) motivo = 'já usada em outro equipamento';
    else {
      const proibida = tagProibida(hit.tags);
      if (proibida) motivo = `tag "${proibida.tag}" (${proibida.motivo})`;
      else {
        const { largura, altura } = dimensoesDoLarge(hit);
        if (largura < LARGURA || altura < ALTURA) motivo = `pequena (${largura}×${altura})`;
        else if (!hit.largeImageURL) motivo = 'sem largeImageURL';
      }
    }
    if (motivo) {
      descartes.push({ id, motivo });
      continue;
    }
    return { hit, descartes };
  }
  return { hit: null, descartes };
}

// Confere o manifesto antes de publicar. Devolve a lista de problemas
// (vazia = pode publicar).
function validarManifesto(manifesto, patrimoniosEsperados) {
  const problemas = [];
  const itens = (manifesto && manifesto.itens) || [];
  const porPatrimonio = new Map(itens.map((i) => [i.patrimonio, i]));

  for (const p of patrimoniosEsperados) {
    if (!porPatrimonio.has(p) || !porPatrimonio.get(p).pixabay_id) problemas.push(`${p}: sem foto escolhida`);
  }
  for (const i of itens) {
    if (!patrimoniosEsperados.includes(i.patrimonio)) problemas.push(`${i.patrimonio}: não está na lista de equipamentos`);
  }

  const vistos = { pixabay_id: new Map(), sha256: new Map() };
  for (const i of itens) {
    if (!i.pixabay_id) continue;
    if (i.fonte !== FONTE) problemas.push(`${i.patrimonio}: fonte "${i.fonte}" não é ${FONTE}`);
    if (i.largura !== LARGURA || i.altura !== ALTURA) {
      problemas.push(`${i.patrimonio}: ${i.largura}×${i.altura}, esperado ${LARGURA}×${ALTURA}`);
    }
    for (const campo of ['pagina', 'autor', 'autor_pagina', 'licenca', 'licenca_url', 'sha256', 'arquivo']) {
      if (!i[campo]) problemas.push(`${i.patrimonio}: falta ${campo}`);
    }
    if (i.caminho_storage !== `equipamentos/${i.patrimonio}.jpg`) {
      problemas.push(`${i.patrimonio}: caminho_storage "${i.caminho_storage}" fora do padrão`);
    }
    for (const campo of ['pixabay_id', 'sha256']) {
      const v = i[campo];
      if (!v) continue;
      if (vistos[campo].has(v)) problemas.push(`${i.patrimonio}: ${campo} repetido (também em ${vistos[campo].get(v)})`);
      else vistos[campo].set(v, i.patrimonio);
    }
  }
  return problemas;
}

module.exports = {
  LARGURA,
  ALTURA,
  FONTE,
  LICENCA,
  LICENCA_URL,
  TAGS_PROIBIDAS,
  tagProibida,
  dimensoesDoLarge,
  escolherCandidato,
  validarManifesto,
};
