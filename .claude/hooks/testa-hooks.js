#!/usr/bin/env node
'use strict';
// Testes dos hooks: chama cada script com a entrada que o Claude Code mandaria
// e confere se ele libera (código 0) ou bloqueia (código 2).
// Roda com `npm test` na raiz. Usa pastas temporárias: não toca em
// docs/verificacoes/ nem em nenhuma spec real.

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PROJETO = path.resolve(__dirname, '..', '..');
const HOOKS = __dirname;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hooks-'));
const VERIF = path.join(tmp, 'verificacoes');
fs.mkdirSync(VERIF);

let falhas = 0;
let casos = 0;

function roda(hook, entrada) {
  const r = spawnSync(process.execPath, [path.join(HOOKS, hook)], {
    input: JSON.stringify(entrada),
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_PROJECT_DIR: PROJETO, VERIFICACOES_DIR: VERIF },
  });
  return { code: r.status, err: (r.stderr || '').trim() };
}

function espera(nome, r, codigo) {
  casos++;
  const ok = r.code === codigo;
  if (!ok) falhas++;
  console.log(
    `${ok ? 'ok   ' : 'FALHA'} [${codigo === 0 ? 'libera' : 'bloqueia'}] ${nome}${ok ? '' : `  -> veio ${r.code} ${r.err}`}`
  );
}

// Montadas por partes para o próprio arquivo não parecer um comando proibido.
const ENV = '.' + 'env';
const PASTA_V = 'docs/' + 'verificacoes';
const CAMINHO = 'C:/x/Instituto J&F/backend';
const PUBLICAR = 'node .claude/skills/imagens-equipamentos/scripts/' + 'publicar.js';

console.log('\n== guarda-comandos: agente principal');
const principal = (cmd, tool = 'Bash') => roda('guarda-comandos.js', { tool_name: tool, tool_input: { command: cmd } });
[
  'git status', 'git -C backend log --oneline -3', 'cd frontend && npm test', 'npm run build',
  'grep -rn "process.env" src', 'ls docs', 'git branch', 'git branch --list', 'node scripts/x.js',
  `cat ${ENV}.example`, `cd "${CAMINHO}" && npm test`, 'npm run prisma -- generate', 'git diff HEAD~1',
  'npm run imagens:preparar', 'npm run imagens:preparar -- --reprovar TI-0005 "pessoa ao fundo"', 'npm test',
].forEach((c) => espera(c, principal(c), 0));
[
  `cat backend/${ENV}`, `type frontend\\${ENV}.local`, 'git commit -m x', 'git -C backend commit -m x',
  'cd backend && git push', 'git branch nova', 'git branch -D velha', 'npm install sharp', 'npm i',
  'npx prisma migrate deploy', 'npm run prisma -- migrate dev', 'npx prisma db push', 'vercel --prod',
  'npx supabase db push', `echo x > ${PASTA_V}/a.md`, `rm ${PASTA_V}/a.md`,
  "sed -i 's/aprovada/pronta/' frontend/specs/spec-login.md", `node -e "require('dotenv').config()"`,
  `git -C "${CAMINHO}" push origin main`, 'git remote add x y', 'npx create-next-app x',
  'npm run imagens:' + 'publicar', PUBLICAR,
].forEach((c) => espera(c, principal(c), 2));
espera(`PowerShell: Get-Content ${ENV}`, principal(`Get-Content ${ENV}`, 'PowerShell'), 2);
espera('PowerShell: git status', principal('git status', 'PowerShell'), 0);
espera('PowerShell: publicar', principal(PUBLICAR, 'PowerShell'), 2);

console.log('\n== guarda-comandos: verificador-spec');
const verif = (cmd, tool = 'Bash') =>
  roda('guarda-comandos.js', { tool_name: tool, agent_type: 'verificador-spec', tool_input: { command: cmd } });
[
  'cd backend && npm test', `cd "${CAMINHO}" && npm run build`, 'git -C frontend status',
  'git log --oneline -5', 'npm test -- src/auth', 'ls', 'pwd', 'npm run test', `git -C "${CAMINHO}" diff HEAD~2`,
].forEach((c) => espera(c, verif(c), 0));
[
  'cat frontend/src/app/page.tsx', 'npm test -- -u', 'npm test > out.txt', 'git diff --output=x',
  'echo hi', 'node -e "1"', 'npm test; rm x', 'git status | head', 'rm -rf x', 'sed -i s/a/b/ x',
  'npm test & rm x', 'npm test -- --outputFile=x.json', 'git -c core.pager=x log', 'npx jest',
  'npm run imagens:preparar',
].forEach((c) => espera(c, verif(c), 2));
espera('verificador usando PowerShell', verif('git status', 'PowerShell'), 2);

console.log('\n== exige-verificacao');
const specDir = path.join(tmp, 'frontend', 'specs');
fs.mkdirSync(specDir, { recursive: true });
const spec = path.join(specDir, 'spec-teste.md');
fs.writeFileSync(spec, '# FE-99 — Teste\n\n**Status:** aprovada. Texto.\n\n## 1. Algo\n');
const editaStatus = () =>
  roda('exige-verificacao.js', {
    tool_name: 'Edit',
    tool_input: { file_path: spec, old_string: '**Status:** aprovada.', new_string: '**Status:** pronta.' },
  });
espera('pronta sem nenhuma rodada', editaStatus(), 2);
fs.writeFileSync(path.join(VERIF, 'FE-99_2026-11-11_100000_aaa.md'), 'x\nVeredito: NÃO PRONTA — CA-2 sem teste\n');
espera('pronta com a última rodada NÃO PRONTA', editaStatus(), 2);
fs.writeFileSync(path.join(VERIF, 'FE-99_2026-11-11_110000_bbb.md'), 'x\n**Veredito:** PRONTA — todos atendidos\n');
espera('pronta com a última rodada PRONTA', editaStatus(), 0);
fs.writeFileSync(path.join(VERIF, 'FE-99_2026-11-11_120000_ccc.md'), 'x\nVeredito: NÃO PRONTA — regressão\n');
espera('PRONTA antiga, mas a mais recente é NÃO PRONTA', editaStatus(), 2);
espera(
  'editar outra parte da spec',
  roda('exige-verificacao.js', {
    tool_name: 'Edit',
    tool_input: { file_path: spec, old_string: '## 1. Algo', new_string: '## 1. Outra' },
  }),
  0
);
espera(
  'Write de spec nova já como pronta, sem rodada',
  roda('exige-verificacao.js', {
    tool_name: 'Write',
    tool_input: { file_path: path.join(specDir, 'spec-nova.md'), content: '# FE-98 — Nova\n\n**Status:** pronta.\n' },
  }),
  2
);
espera(
  'arquivo fora de specs/',
  roda('exige-verificacao.js', {
    tool_name: 'Write',
    tool_input: { file_path: path.join(tmp, 'x.md'), content: '**Status:** pronta' },
  }),
  0
);

console.log('\n== registra-verificacao');
const relatorio =
  'Spec: FE-99 — frontend/specs/spec-teste.md\nVerificado: backend não informado · frontend "tudo"\n\n' +
  '| CA | evidência | status | observação |\n|---|---|---|---|\n| FE-99 CA-1 | a.spec.ts:10 | ATENDIDO | — |\n\n' +
  'Veredito: NÃO PRONTA — teste';
const antes = fs.readdirSync(VERIF).length;
const stop = (extra) =>
  roda('registra-verificacao.js', { hook_event_name: 'SubagentStop', agent_type: 'verificador-spec', ...extra });
espera('SubagentStop do verificador', stop({ agent_id: 'abc123def456', last_assistant_message: relatorio }), 0);
espera(
  'mesma rodada pelo SubagentHandback',
  roda('registra-verificacao.js', {
    hook_event_name: 'PostToolUse',
    tool_name: 'SubagentHandback',
    agent_type: 'verificador-spec',
    agent_id: 'abc123def456',
    tool_input: { message: relatorio },
  }),
  0
);
espera(
  'SubagentStop de outro agente',
  roda('registra-verificacao.js', {
    hook_event_name: 'SubagentStop',
    agent_type: 'Explore',
    agent_id: 'zzz',
    last_assistant_message: relatorio,
  }),
  0
);
espera('mensagem sem veredito', stop({ agent_id: 'yyy', last_assistant_message: 'Pronto, terminei.' }), 0);

casos++;
const novos = fs.readdirSync(VERIF).filter((f) => f.endsWith('_abc123def456.md'));
const okRegistro = fs.readdirSync(VERIF).length === antes + 1 && novos.length === 1 && novos[0].startsWith('FE-99_');
if (!okRegistro) falhas++;
console.log(`${okRegistro ? 'ok   ' : 'FALHA'} exatamente 1 registro novo, com o ID da spec no nome: ${novos.join(', ')}`);

casos++;
const conteudo = novos[0] ? fs.readFileSync(path.join(VERIF, novos[0]), 'utf8') : '';
const okConteudo = conteudo.includes(relatorio) && /\| backend \|/.test(conteudo) && /\| frontend \|/.test(conteudo);
if (!okConteudo) falhas++;
console.log(`${okConteudo ? 'ok   ' : 'FALHA'} o registro tem a resposta como saiu e o estado dos repositórios`);

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${casos - falhas} de ${casos} casos com o resultado esperado`);
process.exit(falhas ? 1 : 0);
