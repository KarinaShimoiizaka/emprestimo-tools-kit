'use strict';
// Lê variáveis de um arquivo .env sem dependência (sem dotenv) e sem nunca
// imprimir valores. As variáveis já definidas no processo têm precedência.

const fs = require('fs');

function lerArquivoEnv(caminho) {
  let texto;
  try {
    texto = fs.readFileSync(caminho, 'utf8');
  } catch {
    return {};
  }
  const vars = {};
  for (const linha of texto.split(/\r?\n/)) {
    const m = linha.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    let valor = m[2];
    if (/^".*"$/.test(valor) || /^'.*'$/.test(valor)) valor = valor.slice(1, -1);
    else valor = valor.replace(/\s+#.*$/, '');
    vars[m[1]] = valor;
  }
  return vars;
}

// Junta o arquivo com o ambiente do processo e exige os nomes pedidos.
// O erro cita só os nomes que faltam, nunca valores.
function carregar(caminho, nomes) {
  const doArquivo = lerArquivoEnv(caminho);
  const vars = {};
  for (const n of nomes) vars[n] = process.env[n] || doArquivo[n] || '';
  const faltando = nomes.filter((n) => !vars[n]);
  if (faltando.length) {
    throw new Error(`faltam variáveis: ${faltando.join(', ')} (procuradas no ambiente e em ${caminho})`);
  }
  return vars;
}

module.exports = { lerArquivoEnv, carregar };
