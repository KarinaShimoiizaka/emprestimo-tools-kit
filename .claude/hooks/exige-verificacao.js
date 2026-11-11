#!/usr/bin/env node
// Trava do status "pronta" — hook PreToolUse em Edit, Write e MultiEdit.
//
// Uma spec (backend/specs/*.md ou frontend/specs/*.md) só passa a
// `**Status:** pronta` se a rodada mais recente do verificador-spec para ela,
// gravada em docs/verificacoes/ pelo hook registra-verificacao.js, terminou
// com `Veredito: PRONTA`. Assim a chamada ao verificador não depende de
// alguém lembrar de pedir (docs/rules/spec-flow.md).
//
// Saída: código 0 libera; código 2 bloqueia, e o stderr vira o motivo.
'use strict';

const fs = require('fs');
const path = require('path');

function lerEntrada() {
  try {
    return JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
  } catch {
    return {};
  }
}

function bloquear(motivo) {
  process.stderr.write(`[exige-verificacao] ${motivo}\n`);
  process.exit(2);
}

function substituir(texto, antigo, novo, todas) {
  if (typeof antigo !== 'string' || antigo === '') return texto;
  if (todas) return texto.split(antigo).join(novo);
  const i = texto.indexOf(antigo);
  return i < 0 ? texto : texto.slice(0, i) + novo + texto.slice(i + antigo.length);
}

const STATUS_PRONTA = /^\*\*Status:\*\*\s*pronta\b/im;

const entrada = lerEntrada();
const ti = entrada.tool_input || {};
const arquivo = String(ti.file_path || '');
const normalizado = arquivo.replace(/\\/g, '/');

if (!/\/(backend|frontend)\/specs\/[^/]+\.md$/i.test(normalizado)) process.exit(0);

let atual = '';
try {
  atual = fs.readFileSync(arquivo, 'utf8');
} catch {
  atual = '';
}

let depois;
switch (entrada.tool_name) {
  case 'Write':
    depois = String(ti.content || '');
    break;
  case 'Edit':
    depois = substituir(atual, ti.old_string, String(ti.new_string ?? ''), ti.replace_all);
    break;
  case 'MultiEdit':
    depois = (ti.edits || []).reduce(
      (txt, e) => substituir(txt, e.old_string, String(e.new_string ?? ''), e.replace_all),
      atual
    );
    break;
  default:
    process.exit(0);
}

// Só interessa a passagem para "pronta"; editar uma spec que já está pronta
// não exige nova rodada aqui (a regra 1 do spec-flow cobre isso).
if (!STATUS_PRONTA.test(depois) || STATUS_PRONTA.test(atual)) process.exit(0);

const id = (depois.match(/^#\s+((?:BE|FE)-\d{2})\b/m) || [])[1];
if (!id) {
  bloquear('a spec não tem o ID (BE-nn ou FE-nn) no título; sem ID não há como achar a verificação.');
}

const projeto = process.env.CLAUDE_PROJECT_DIR || entrada.cwd || process.cwd();
const pasta = process.env.VERIFICACOES_DIR || path.join(projeto, 'docs', 'verificacoes');

let rodadas = [];
try {
  rodadas = fs
    .readdirSync(pasta)
    .filter((f) => f.startsWith(`${id}_`) && f.endsWith('.md'))
    .sort();
} catch {
  rodadas = [];
}

if (rodadas.length === 0) {
  bloquear(
    `${id} não tem nenhuma rodada do verificador-spec em docs/verificacoes/. Chame o subagente verificador-spec antes de declarar a spec pronta (docs/rules/spec-flow.md).`
  );
}

const ultima = rodadas[rodadas.length - 1];
const texto = fs.readFileSync(path.join(pasta, ultima), 'utf8').replace(/\*/g, '');

if (!/^\s*Veredito:\s*PRONTA\b/im.test(texto)) {
  bloquear(
    `a rodada mais recente de ${id} (docs/verificacoes/${ultima}) não tem "Veredito: PRONTA". Corrija o que ela apontou e chame o verificador de novo (spec-flow, regra 5).`
  );
}

process.exit(0);
