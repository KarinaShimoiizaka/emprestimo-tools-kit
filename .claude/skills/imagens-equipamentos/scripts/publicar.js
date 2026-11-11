#!/usr/bin/env node
'use strict';
// Publica as fotos aprovadas no Supabase Storage do deploy.
//
// SÓ A PESSOA RODA. Este script escreve em produção, e a regra da prática é
// que o agente nunca escreve em produção. Por isso:
//   - ele só roda em terminal interativo e pede a aprovação digitada;
//   - o guarda-comandos e o permissions.deny bloqueiam o comando para agentes.
//
// Uso, na raiz do projeto, no seu terminal:
//   npm run imagens:publicar
//
// Idempotente: cada foto vai para equipamentos/<patrimônio>.jpg com
// x-upsert, então rodar de novo sobrescreve, sem duplicar.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');
const ambiente = require('./lib/ambiente');
const sel = require('./lib/selecao');

const RAIZ = path.resolve(__dirname, '..', '..', '..', '..');
const SKILL = path.resolve(__dirname, '..');
const PASTA = path.join(RAIZ, 'imagens');
const MANIFESTO = path.join(PASTA, 'manifesto.json');
const LISTA = path.join(SKILL, 'references', 'equipamentos.json');
const ENV_BACKEND = path.join(RAIZ, 'backend', '.env');

function falhar(msg) {
  console.error(`\n[publicar] ${msg}`);
  process.exit(1);
}

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function perguntar(texto) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((ok) =>
    rl.question(texto, (r) => {
      rl.close();
      ok(r.trim());
    })
  );
}

async function corpoDoErro(r) {
  try {
    return (await r.text()).slice(0, 300);
  } catch {
    return '';
  }
}

async function garantirBucketPublico(base, bucket, auth) {
  const url = `${base}/storage/v1/bucket/${encodeURIComponent(bucket)}`;
  let r = await fetch(url, { headers: auth });

  if (r.ok) {
    const info = await r.json();
    if (info.public) return 'já era público';
    const ok = await perguntar(
      `O bucket "${bucket}" não é público, e as fotos precisam abrir sem login. Tornar público? (s/n): `
    );
    if (ok.toLowerCase() !== 's') falhar('publicação cancelada: o bucket continua privado.');
    r = await fetch(url, {
      method: 'PUT',
      headers: { ...auth, 'content-type': 'application/json' },
      body: JSON.stringify({ id: bucket, name: bucket, public: true }),
    });
    if (!r.ok) falhar(`não consegui tornar o bucket público: ${r.status} ${await corpoDoErro(r)}`);
    return 'passou a ser público';
  }

  const erro = await corpoDoErro(r);
  if (!/not.?found/i.test(erro)) falhar(`não consegui consultar o bucket: ${r.status} ${erro}`);
  r = await fetch(`${base}/storage/v1/bucket`, {
    method: 'POST',
    headers: { ...auth, 'content-type': 'application/json' },
    body: JSON.stringify({ id: bucket, name: bucket, public: true }),
  });
  if (!r.ok) falhar(`não consegui criar o bucket: ${r.status} ${await corpoDoErro(r)}`);
  return 'foi criado, público';
}

async function principal() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    falhar('o publicar só roda num terminal interativo, pela pessoa. Agente não publica (contrato da skill, item 7).');
  }

  const lista = JSON.parse(fs.readFileSync(LISTA, 'utf8'));
  if (!fs.existsSync(MANIFESTO)) falhar('imagens/manifesto.json não existe. Rode o preparar antes.');
  const m = JSON.parse(fs.readFileSync(MANIFESTO, 'utf8'));

  const problemas = sel.validarManifesto(m, lista.map((e) => e.patrimonio));
  if (problemas.length) falhar(`o manifesto não passa na validação:\n  - ${problemas.join('\n  - ')}`);

  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    falhar('o sharp não está instalado na raiz: npm install.');
  }
  sharp.cache(false);

  // Confere cada arquivo de novo: existe, é o mesmo que foi preparado e
  // revisado (sha256), e é 800×600 JPEG.
  const arquivos = new Map();
  for (const i of m.itens) {
    const arq = path.join(PASTA, i.arquivo);
    if (!fs.existsSync(arq)) falhar(`${i.patrimonio}: ${i.arquivo} não existe. Rode o preparar.`);
    const buf = fs.readFileSync(arq);
    if (sha256(buf) !== i.sha256) falhar(`${i.patrimonio}: o arquivo mudou depois de preparado. Rode o preparar.`);
    const meta = await sharp(buf).metadata();
    if (meta.width !== sel.LARGURA || meta.height !== sel.ALTURA || meta.format !== 'jpeg') {
      falhar(`${i.patrimonio}: ${meta.width}×${meta.height} ${meta.format}, esperado ${sel.LARGURA}×${sel.ALTURA} jpeg`);
    }
    arquivos.set(i.patrimonio, buf);
  }

  let env;
  try {
    env = ambiente.carregar(ENV_BACKEND, ['SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'STORAGE_NAME']);
  } catch (e) {
    falhar(e.message);
  }
  const base = env.SUPABASE_URL.replace(/\/+$/, '');
  const bucket = env.STORAGE_NAME;
  // Chave nova do Supabase (sb_secret_...): só no cabeçalho apikey, não é JWT.
  const auth = { apikey: env.SUPABASE_SECRET_KEY };

  console.log(`\n${m.itens.length} fotos conferidas: 800×600, sem repetição, com créditos.`);
  console.log(`Destino: bucket "${bucket}", pasta equipamentos/ (sobrescreve arquivos com o mesmo nome).`);
  console.log(`Reprovadas na revisão até agora: ${(m.reprovadas || []).length}.`);
  console.log('Confira imagens/revisao.html antes de responder.\n');
  const resposta = await perguntar('Você revisou as fotos e aprova todas para publicação? Digite APROVO: ');
  if (resposta !== 'APROVO') falhar('publicação cancelada.');

  const situacaoDoBucket = await garantirBucketPublico(base, bucket, auth);
  console.log(`\nbucket "${bucket}": ${situacaoDoBucket}`);

  const b = encodeURIComponent(bucket);
  for (const i of m.itens) {
    const caminho = i.caminho_storage.split('/').map(encodeURIComponent).join('/');
    const buf = arquivos.get(i.patrimonio);

    const envio = await fetch(`${base}/storage/v1/object/${b}/${caminho}`, {
      method: 'POST',
      headers: { ...auth, 'content-type': 'image/jpeg', 'x-upsert': 'true', 'cache-control': '3600' },
      body: buf,
    });
    if (!envio.ok) falhar(`${i.patrimonio}: o envio respondeu ${envio.status} ${await corpoDoErro(envio)}`);

    // Abre pela URL pública, sem nenhuma credencial, e compara os bytes.
    const publica = await fetch(`${base}/storage/v1/object/public/${b}/${caminho}?v=${i.sha256.slice(0, 8)}`);
    if (!publica.ok) falhar(`${i.patrimonio}: a URL pública respondeu ${publica.status}`);
    if (sha256(Buffer.from(await publica.arrayBuffer())) !== i.sha256) {
      falhar(`${i.patrimonio}: o que a URL pública devolve não é o arquivo enviado`);
    }

    i.revisao = 'aprovada';
    i.publicada_em = new Date().toISOString();
    fs.writeFileSync(MANIFESTO, `${JSON.stringify(m, null, 2)}\n`, 'utf8');
    console.log(`  ${i.patrimonio} -> ${i.caminho_storage}: ok, abre sem login`);
  }

  console.log(`\n${m.itens.length} fotos publicadas e conferidas pela URL pública.`);
  console.log('Falta commitar o imagens/manifesto.json, que agora registra a aprovação e a publicação.');
}

principal().catch((e) => falhar(e.message));
