'use strict';
// Testes das regras que a skill garante por código. Rodam com o test runner
// do próprio Node (sem dependência): npm test, na raiz.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const sel = require('./lib/selecao');
const { lerArquivoEnv } = require('./lib/ambiente');

const hit = (extra = {}) => ({
  id: 1,
  type: 'photo',
  tags: 'laptop, computer, desk',
  imageWidth: 6000,
  imageHeight: 4000,
  largeImageURL: 'https://pixabay.com/get/x_1280.jpg',
  pageURL: 'https://pixabay.com/photos/laptop-1/',
  user: 'fotografo',
  user_id: 9,
  ...extra,
});

test('tag de pessoa descarta a foto', () => {
  assert.deepEqual(sel.tagProibida('laptop, young woman, desk'), { motivo: 'pessoa', tag: 'young woman' });
  assert.equal(sel.tagProibida('laptop, hands, keyboard').motivo, 'pessoa');
});

test('tag de marca ou texto descarta a foto', () => {
  assert.equal(sel.tagProibida('macbook, laptop').motivo, 'marca');
  assert.equal(sel.tagProibida('laptop, social media').motivo, 'texto ou tela com conteúdo');
  assert.equal(sel.tagProibida('monitor, code, programming').motivo, 'texto ou tela com conteúdo');
});

test('comparação é por palavra inteira, não por pedaço', () => {
  assert.equal(sel.tagProibida('workplace, pineapple, textured'), null);
  assert.equal(sel.tagProibida('laptop, computer, desk'), null);
});

test('tamanho do largeImageURL respeita o limite de 1280 px no lado maior', () => {
  assert.deepEqual(sel.dimensoesDoLarge({ imageWidth: 6000, imageHeight: 4000 }), { largura: 1280, altura: 853 });
  assert.deepEqual(sel.dimensoesDoLarge({ imageWidth: 1000, imageHeight: 700 }), { largura: 1000, altura: 700 });
  assert.deepEqual(sel.dimensoesDoLarge({ imageWidth: 4000, imageHeight: 1500 }), { largura: 1280, altura: 480 });
});

test('escolhe o primeiro resultado que serve e explica os descartes', () => {
  const hits = [
    hit({ id: 10, tags: 'laptop, man' }),
    hit({ id: 11 }),
    hit({ id: 12 }),
    hit({ id: 13, imageWidth: 4000, imageHeight: 1500 }),
    hit({ id: 14, type: 'illustration' }),
    hit({ id: 15 }),
  ];
  const r = sel.escolherCandidato(hits, { idsEmUso: new Set([11]), idsReprovados: new Set([12]) });
  assert.equal(r.hit.id, 15);
  assert.deepEqual(
    r.descartes.map((d) => d.id),
    [10, 11, 12, 13, 14]
  );
  assert.match(r.descartes[0].motivo, /pessoa/);
  assert.match(r.descartes[1].motivo, /já usada/);
  assert.match(r.descartes[2].motivo, /reprovada/);
  assert.match(r.descartes[3].motivo, /pequena/);
  assert.match(r.descartes[4].motivo, /illustration/);
});

test('sem resultado que sirva, não escolhe nada', () => {
  const r = sel.escolherCandidato([hit({ id: 1, tags: 'logo' })]);
  assert.equal(r.hit, null);
  assert.equal(r.descartes.length, 1);
});

function itemValido(p, n) {
  return {
    patrimonio: p,
    arquivo: `prontas/${p}.jpg`,
    caminho_storage: `equipamentos/${p}.jpg`,
    largura: 800,
    altura: 600,
    sha256: `hash-${n}`,
    fonte: 'Pixabay',
    pixabay_id: n,
    pagina: `https://pixabay.com/photos/x-${n}/`,
    autor: 'a',
    autor_pagina: 'https://pixabay.com/users/a-1/',
    licenca: sel.LICENCA,
    licenca_url: sel.LICENCA_URL,
  };
}

test('manifesto completo e correto passa', () => {
  const m = { itens: [itemValido('TI-0001', 1), itemValido('TI-0002', 2)] };
  assert.deepEqual(sel.validarManifesto(m, ['TI-0001', 'TI-0002']), []);
});

test('manifesto com foto repetida não passa', () => {
  const b = itemValido('TI-0002', 1);
  const m = { itens: [itemValido('TI-0001', 1), b] };
  const p = sel.validarManifesto(m, ['TI-0001', 'TI-0002']);
  assert.ok(p.some((x) => /pixabay_id repetido/.test(x)));
});

test('manifesto com tamanho errado, sem crédito, fonte errada ou faltando equipamento não passa', () => {
  const errado = { ...itemValido('TI-0001', 1), largura: 640, autor: '', fonte: 'Pexels', caminho_storage: 'x.jpg' };
  const p = sel.validarManifesto({ itens: [errado] }, ['TI-0001', 'TI-0002']);
  assert.ok(p.some((x) => /640×600/.test(x)));
  assert.ok(p.some((x) => /falta autor/.test(x)));
  assert.ok(p.some((x) => /fonte "Pexels"/.test(x)));
  assert.ok(p.some((x) => /caminho_storage/.test(x)));
  assert.ok(p.some((x) => /TI-0002: sem foto/.test(x)));
});

test('leitor de .env entende aspas e comentários e não precisa de dotenv', () => {
  const arq = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'env-')), 'teste.env');
  fs.writeFileSync(arq, '# comentario\nA="com aspas"\nB=sem aspas # comentario\nC=\'simples\'\nlinha solta\n');
  assert.deepEqual(lerArquivoEnv(arq), { A: 'com aspas', B: 'sem aspas', C: 'simples' });
  assert.deepEqual(lerArquivoEnv(path.join(os.tmpdir(), 'nao-existe.env')), {});
});
