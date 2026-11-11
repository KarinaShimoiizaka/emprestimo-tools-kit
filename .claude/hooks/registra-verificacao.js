#!/usr/bin/env node
// Registro das rodadas do verificador-spec — hook SubagentStop (e
// PostToolUse em SubagentHandback, que é como versões novas do Claude Code
// entregam o relatório de um subagente).
//
// Grava a resposta do verificador, como saiu, em
// docs/verificacoes/<ID>_<AAAA-MM-DD_HHMMSS>_<agent_id>.md, com o commit e o
// estado do working tree de cada repositório. Nenhum agente escreve nessa
// pasta; quem escreve é este script. É isso que torna duas rodadas
// comparáveis e que a trava exige-verificacao.js consulta.
//
// Nunca bloqueia: falha aqui não pode impedir o subagente de terminar.
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const VERIFICADOR = 'verificador-spec';
// rótulo → pasta. A raiz guarda o próprio verificador e os hooks: o commit
// dela diz com qual versão deles a rodada foi feita.
const REPOSITORIOS = [
  ['raiz (emprestimo-tools-kit)', '.'],
  ['backend', 'backend'],
  ['frontend', 'frontend'],
];

function lerEntrada() {
  try {
    return JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
  } catch {
    return {};
  }
}

function ultimaMensagemDoTranscript(caminho) {
  if (!caminho) return '';
  const real = caminho.startsWith('~') ? path.join(os.homedir(), caminho.slice(1)) : caminho;
  let linhas;
  try {
    linhas = fs.readFileSync(real, 'utf8').split(/\r?\n/).filter(Boolean);
  } catch {
    return '';
  }
  for (let i = linhas.length - 1; i >= 0; i--) {
    try {
      const l = JSON.parse(linhas[i]);
      if (l.type !== 'assistant') continue;
      const partes = (l.message && l.message.content) || [];
      const texto = (Array.isArray(partes) ? partes : [partes])
        .filter((p) => p && p.type === 'text')
        .map((p) => p.text)
        .join('\n')
        .trim();
      if (texto) return texto;
    } catch {
      // linha inválida: segue para a anterior
    }
  }
  return '';
}

function git(projeto, repo, args) {
  try {
    return execFileSync('git', ['-C', path.join(projeto, repo), ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

function estadoDoRepositorio(projeto, repo) {
  const commit = git(projeto, repo, ['rev-parse', '--short', 'HEAD']);
  if (!commit) return 'indisponível';
  const status = git(projeto, repo, ['status', '--porcelain']);
  const alterados = status ? status.split(/\r?\n/).filter(Boolean).length : 0;
  const arvore = alterados === 0 ? 'limpa' : `${alterados} arquivo(s) alterado(s) sem commit`;
  return `\`${commit}\` · working tree: ${arvore}`;
}

function carimbo(d) {
  const p = (n) => String(n).padStart(2, '0');
  return {
    arquivo: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`,
    legivel: `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`,
  };
}

function principal() {
  const e = lerEntrada();
  if (e.agent_type !== VERIFICADOR) return;

  let texto = '';
  let origem = '';
  if (e.hook_event_name === 'SubagentStop') {
    texto = e.last_assistant_message || ultimaMensagemDoTranscript(e.agent_transcript_path);
    origem = 'SubagentStop';
  } else if (e.hook_event_name === 'PostToolUse' && e.tool_name === 'SubagentHandback') {
    texto = String((e.tool_input || {}).message || '');
    origem = 'PostToolUse/SubagentHandback';
  } else {
    return;
  }

  texto = String(texto || '').trim();
  // Sem veredito não é relatório (pode ser só a frase de encerramento).
  if (!/Veredito:/i.test(texto.replace(/\*/g, ''))) return;

  const projeto = process.env.CLAUDE_PROJECT_DIR || e.cwd || process.cwd();
  const pasta = process.env.VERIFICACOES_DIR || path.join(projeto, 'docs', 'verificacoes');
  fs.mkdirSync(pasta, { recursive: true });

  const agente = String(e.agent_id || 'sem-agent-id').replace(/[^\w-]/g, '').slice(0, 12) || 'sem-agent-id';

  // A mesma rodada pode chegar pelos dois eventos: grava uma vez só.
  const jaGravada = fs
    .readdirSync(pasta)
    .filter((f) => f.endsWith(`_${agente}.md`))
    .some((f) => fs.readFileSync(path.join(pasta, f), 'utf8').includes(texto));
  if (jaGravada) return;

  const id = (texto.match(/\b((?:BE|FE)-\d{2})\b/) || [])[1] || 'SEM-ID';
  const agora = carimbo(new Date());

  const cabecalho = [
    `# Verificação ${id}`,
    '',
    '| campo | valor |',
    '|---|---|',
    `| data | ${agora.legivel} |`,
    `| rodada (agent_id) | \`${e.agent_id || '—'}\` |`,
    ...REPOSITORIOS.map(([rotulo, pasta]) => `| ${rotulo} | ${estadoDoRepositorio(projeto, pasta)} |`),
    `| registrado por | \`.claude/hooks/registra-verificacao.js\` (${origem}) |`,
    '',
    'Abaixo, a resposta do verificador-spec como saiu. Nenhum agente edita',
    'este arquivo (ver docs/verificacoes/README.md).',
    '',
    '---',
    '',
    '',
  ].join('\n');

  fs.writeFileSync(path.join(pasta, `${id}_${agora.arquivo}_${agente}.md`), `${cabecalho}${texto}\n`, 'utf8');
}

try {
  principal();
} catch (err) {
  process.stderr.write(`[registra-verificacao] não gravou a rodada: ${err && err.message}\n`);
}
process.exit(0);
