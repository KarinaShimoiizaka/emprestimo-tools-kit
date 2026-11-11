#!/usr/bin/env node
// Guarda de comandos — hook PreToolUse em Bash e PowerShell.
//
// 1. Para qualquer agente: bloqueia o que docs/rules/ proíbe e que um
//    `permissions.deny` por prefixo deixaria passar (`git -C x commit`,
//    `cat backend/.env`, `npm run prisma -- migrate deploy`...).
// 2. Para o verificador-spec: só deixa passar uma lista fechada de comandos
//    de leitura, build e teste. Ele não tem Edit nem Write; sem esta lista,
//    o Bash seria a porta para escrever arquivo, banco ou git.
//
// Saída: código 0 libera; código 2 bloqueia, e o stderr vira o motivo que o
// agente recebe.
'use strict';

const fs = require('fs');

const VERIFICADOR = 'verificador-spec';

function lerEntrada() {
  try {
    return JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
  } catch {
    return {};
  }
}

function bloquear(motivo) {
  process.stderr.write(`[guarda-comandos] ${motivo}\n`);
  process.exit(2);
}

// Troca o conteúdo entre aspas por marcadores (Q0, Q1...). Assim o caminho
// "Instituto J&F" não é lido como operador `&`, e `;` dentro de uma string
// não separa comandos.
function mascararAspas(comando) {
  const aspas = [];
  const mascarado = comando.replace(/"(?:[^"\\]|\\.)*"|'[^']*'/g, (m) => {
    aspas.push(m);
    return `Q${aspas.length - 1}`;
  });
  return { mascarado, aspas };
}

function segmentos(mascarado) {
  return mascarado
    .split(/&&|\|\||;|\||&|\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// Regras para todos os agentes
// ---------------------------------------------------------------------------

const GIT_ESCRITA =
  /^git(\s+-C\s+\S+)*\s+(commit|push|pull|fetch|checkout|switch|merge|rebase|reset|stash|revert|cherry-pick|tag|clean|restore|rm|mv|am|apply|init|clone|worktree)\b/i;
const GIT_BRANCH = /^git(\s+-C\s+\S+)*\s+branch\b(.*)$/i;
const GIT_REMOTE_ESCRITA = /^git(\s+-C\s+\S+)*\s+remote\s+(add|remove|rm|rename|set-url)\b/i;
const INSTALACAO =
  /^(npm|pnpm|yarn)\s+(install|i|add|ci|uninstall|remove|rm|update|up|upgrade|link)\b|^npx\s+create-/i;
const CLI_DE_DEPLOY = /^(npx\s+|npm\s+exec\s+)?(vercel|supabase)\b/i;

function checarParaTodos(comando) {
  // Segredos: arquivo .env (qualquer variante, menos .env.example) e dotenv.
  if (/(^|[\s"'=\/\\(:])\.env(\.(?!example\b)[\w-]+)?(?![\w.-])/i.test(comando)) {
    bloquear(
      'comando cita um arquivo .env. Valores de segredo não são lidos nem copiados (docs/rules/secrets.md). Se precisar saber se uma variável existe, pergunte à pessoa.'
    );
  }
  if (/\bdotenv\b/i.test(comando)) {
    bloquear('comando carrega .env via dotenv (docs/rules/secrets.md).');
  }

  // Banco: nada que migre ou escreva. O backend/.env aponta para o Supabase
  // do deploy, então qualquer um destes escreveria em produção.
  if (
    /\bprisma\b[^\n]*\b(migrate\s+(dev|deploy|reset|resolve)|db\s+(push|execute|seed|pull))\b/i.test(
      comando
    )
  ) {
    bloquear(
      'prisma migrate/db é executado pela pessoa, nunca pelo agente (docs/rules/migrations.md). Entregue o comando no handoff.'
    );
  }
  if (/(^|[\s;&|])psql\b/i.test(comando)) {
    bloquear('psql não é usado pelo agente (docs/rules/migrations.md).');
  }

  // Registro das verificações: só o hook escreve lá.
  if (/docs[\\\/]+verificacoes/i.test(comando)) {
    bloquear(
      'docs/verificacoes/ é escrita só pelo hook registra-verificacao.js. Para ler, use Read/Grep/Glob.'
    );
  }

  // Status "pronta" de spec mudado pelo terminal contornaria a trava.
  if (/spec-[\w-]+\.md/i.test(comando) && /pronta/i.test(comando)) {
    bloquear(
      'status de spec não é alterado pelo terminal. Use Edit: a trava exige-verificacao.js confere o veredito.'
    );
  }

  const { mascarado } = mascararAspas(comando);
  for (const seg of segmentos(mascarado)) {
    if (GIT_ESCRITA.test(seg) || GIT_REMOTE_ESCRITA.test(seg)) {
      bloquear('git de escrita é feito pela pessoa (docs/rules/restrictions.md). Leitura (status, log, diff, show) é livre.');
    }
    const branch = seg.match(GIT_BRANCH);
    if (branch && !/^\s*(--list|-a|-r|-v|-vv|--show-current|--all|--remotes)?(\s+(--list|-a|-r|-v|-vv|--all|--remotes))*\s*$/i.test(branch[2])) {
      bloquear('criar, renomear ou apagar branch é feito pela pessoa (docs/rules/restrictions.md).');
    }
    if (INSTALACAO.test(seg)) {
      bloquear('instalar ou atualizar dependência só a pessoa faz, depois de decidir (docs/rules/restrictions.md).');
    }
    if (CLI_DE_DEPLOY.test(seg)) {
      bloquear('CLI de deploy (vercel, supabase) não é usada pelo agente: o agente nunca escreve em produção.');
    }
  }
}

// ---------------------------------------------------------------------------
// Lista fechada do verificador-spec
// ---------------------------------------------------------------------------

const PERMITIDOS_VERIFICADOR = [
  /^cd\s+\S+$/,
  /^npm\s+(test|run\s+test|run\s+build)$/,
  // `npm test -- <padrão>`: só padrões de caminho, nenhuma opção do Jest
  // (algumas escrevem arquivo, como --outputFile e -u).
  /^npm\s+(test|run\s+test)\s+--(\s+[^\s-]\S*)+$/,
  /^git(\s+-C\s+\S+)?\s+(status|log|diff|show|rev-parse|blame|ls-files)(\s.*)?$/,
  /^(ls|pwd)(\s.*)?$/,
];

function checarVerificador(nomeDaFerramenta, comando) {
  if (nomeDaFerramenta !== 'Bash') {
    bloquear('o verificador-spec só usa Bash, e só para a lista fechada de comandos.');
  }
  const { mascarado } = mascararAspas(comando);
  if (/[><`|;]|\$\(|\r|\n/.test(mascarado) || /(^|[^&])&([^&]|$)/.test(mascarado)) {
    bloquear(
      'verificador-spec: sem redirecionamento, pipe, `;`, `&` ou substituição de comando. Encadeie só com `&&`.'
    );
  }
  if (/--output|--ext-diff/i.test(mascarado)) {
    bloquear('verificador-spec: opção que escreve arquivo ou roda programa externo não é permitida.');
  }
  for (const seg of mascarado.split('&&').map((s) => s.trim())) {
    if (!PERMITIDOS_VERIFICADOR.some((re) => re.test(seg))) {
      bloquear(
        `verificador-spec: "${seg}" está fora da lista. Permitidos: cd, npm test, npm run test, npm run build, git status|log|diff|show|rev-parse|blame|ls-files (com -C opcional), ls, pwd. Para ler e buscar arquivos, use Read, Grep e Glob.`
      );
    }
  }
}

// ---------------------------------------------------------------------------

const entrada = lerEntrada();
const ferramenta = entrada.tool_name || '';
const comando = String((entrada.tool_input || {}).command || '');

if (!comando) process.exit(0);

checarParaTodos(comando);
if (entrada.agent_type === VERIFICADOR) checarVerificador(ferramenta, comando);

process.exit(0);
