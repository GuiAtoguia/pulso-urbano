// Confere se TIPOS_VALIDOS (scripts/gerar-dados.js) bate com o painel oficial do
// Infosiga-SP: soma estadual (todas as regiões) por ano_sinistro e compara com os
// totais lidos no gráfico oficial do painel. Ver docs/notas.md.
// Uso: node scripts/verificar-totais.js

import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { TIPOS_VALIDOS } from './gerar-dados.js';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const ARQUIVOS_CSV = ['sinistros_2022-2024.csv', 'sinistros_2025-2026.csv'].map(f => path.join(RAIZ, 'data-raw', f));

// Totais oficiais lidos no gráfico anual do painel público do Infosiga-SP
// (infosiga.detran.sp.gov.br), checado em 2026-11-08.
const OFICIAL_POR_ANO = {
  2022: 130684,
  2023: 140502,
  2024: 135583,
  2025: 102093,
  2026: 77609,
};

const TOLERANCIA_PCT = 0.5; // pequenas diferenças de linhas corrompidas/descartadas são esperadas

async function contarPorAno(arquivo, contagem) {
  const stream = createReadStream(arquivo, { encoding: 'latin1' });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });
  let header = null;
  let idx = {};
  for await (const linha of rl) {
    if (!linha) continue;
    const cols = linha.split(';');
    if (!header) {
      header = cols;
      header.forEach((h, i) => { idx[h] = i; });
      continue;
    }
    if (cols.length !== header.length) continue;
    if (!TIPOS_VALIDOS.has(cols[idx.tipo_registro])) continue;

    const ano = Number(cols[idx.ano_sinistro]);
    contagem.set(ano, (contagem.get(ano) || 0) + 1);
  }
}

async function main() {
  const contagem = new Map();
  for (const arquivo of ARQUIVOS_CSV) {
    console.log(`Lendo ${path.basename(arquivo)}...`);
    await contarPorAno(arquivo, contagem);
  }

  let algumaDivergencia = false;
  console.log('\nAno       Calculado    Oficial      Diferença');
  for (const [ano, oficial] of Object.entries(OFICIAL_POR_ANO)) {
    const calculado = contagem.get(Number(ano)) || 0;
    const diffPct = oficial > 0 ? Math.abs((calculado - oficial) / oficial) * 100 : 0;
    const ok = diffPct <= TOLERANCIA_PCT;
    if (!ok) algumaDivergencia = true;
    console.log(
      `${ano}      ${String(calculado).padStart(8)}     ${String(oficial).padStart(8)}     ${diffPct.toFixed(2)}%${ok ? '' : '  <-- DIVERGE'}`,
    );
  }

  if (algumaDivergencia) {
    console.error(`\nFALHOU: diferença acima de ${TOLERANCIA_PCT}% em pelo menos um ano.`);
    process.exitCode = 1;
  } else {
    console.log(`\nOK: todos os anos dentro de ${TOLERANCIA_PCT}% do total oficial do painel Infosiga-SP.`);
  }
}

main().catch(erro => {
  console.error(erro);
  process.exitCode = 1;
});
