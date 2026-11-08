// Gera data/indice.json e data/municipios/<ibge>.json a partir dos CSVs reais do
// Infosiga-SP em data-raw/ (ver CLAUDE.md para o contrato e docs/notas.md para as
// decisões de escopo/filtro — plano completo discutido antes de escrever este script).
// Uso: npm run gerar-dados

import { mkdir, writeFile } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { FAIXAS_HORARIAS as HORAS } from '../js/calc.js';
import { TOTAL_MINIMO_VARIACAO } from '../js/insights.js';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const ARQUIVOS_CSV = ['sinistros_2022-2024.csv', 'sinistros_2025-2026.csv'].map(f => path.join(RAIZ, 'data-raw', f));

const REGIAO_ALVO = 'ARAÇATUBA';
// Só os 2 tipo_registro com gravidade classificada — bate com o total oficial do
// painel Infosiga-SP por ano/estado (ver scripts/verificar-totais.js e docs/notas.md).
// NOTIFICACAO fica fora: incluída, o total passa 47-86% acima do oficial.
export const TIPOS_VALIDOS = new Set(['SINISTRO NAO FATAL', 'SINISTRO FATAL']);
const LAT_MIN = -26, LAT_MAX = -19, LON_MIN = -54, LON_MAX = -44; // faixa larga de SP, só pra descartar outliers grosseiros
const TOP_RANKING = 10;
const CONECTORES = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);
const DIACRITICOS_RE = new RegExp('[' + String.fromCharCode(0x0300) + '-' + String.fromCharCode(0x036f) + ']', 'g');

const NOMINATIM_USER_AGENT = 'PulsoUrbano/1.0 (uso educacional - Ideathon Fatec 2026)';

// --- normalização de logradouro ------------------------------------------------

function expandirAbreviacao(raw) {
  return raw
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .replace(/^(AV|AV\.)\s+/, 'AVENIDA ')
    .replace(/^(R|R\.)\s+/, 'RUA ')
    .replace(/^(ESTR|ESTR\.)\s+/, 'ESTRADA ');
}

// Chave de agrupamento: minúsculas, sem acento, abreviações expandidas (AV/R -> Avenida/Rua).
function chaveLogradouro(raw) {
  return expandirAbreviacao(raw)
    .normalize('NFD')
    .replace(DIACRITICOS_RE, '')
    .toLowerCase();
}

// Nome de exibição: mesma expansão, mas preserva acento e usa Title Case
// (com conectores em minúsculas: "Rua Izídio Cabral de Jesus").
function tituloLogradouro(raw) {
  const expandido = expandirAbreviacao(raw).toLowerCase();
  return expandido
    .split(' ')
    .map((palavra, i) => (i > 0 && CONECTORES.has(palavra) ? palavra : palavra.charAt(0).toUpperCase() + palavra.slice(1)))
    .join(' ');
}

// --- datas ----------------------------------------------------------------------

function parseDataBR(str) {
  const [d, m, y] = str.split('/').map(Number);
  return Date.UTC(y, m - 1, d);
}

function formatDataCurta(timestamp) {
  const d = new Date(timestamp);
  const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return `${String(d.getUTCDate()).padStart(2, '0')} ${MESES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

const UM_DIA = 24 * 60 * 60 * 1000;

// --- leitura dos CSVs -------------------------------------------------------------

export async function lerCsv(caminho, porMunicipio, estadoGlobal) {
  const stream = createReadStream(caminho, { encoding: 'latin1' });
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
    if (cols.length !== header.length) continue; // linha corrompida, ignora

    if (cols[idx.regiao_administrativa] !== REGIAO_ALVO) continue;
    if (!TIPOS_VALIDOS.has(cols[idx.tipo_registro])) continue;

    const ibge = cols[idx.cod_ibge];
    const municipioNome = cols[idx.municipio];
    if (!ibge || !municipioNome) continue;

    const dataStr = cols[idx.data_sinistro];
    const ts = parseDataBR(dataStr);
    if (!Number.isFinite(ts)) continue;
    if (estadoGlobal.maxTs === null || ts > estadoGlobal.maxTs) estadoGlobal.maxTs = ts;

    const horaStr = cols[idx.hora_sinistro];
    const hora = horaStr ? Number(horaStr.slice(0, 2)) : null;

    const logradouroRaw = cols[idx.logradouro]?.trim() || '';

    const latRaw = cols[idx.latitude], lonRaw = cols[idx.longitude];
    let lat = null, lon = null;
    if (latRaw && lonRaw) {
      const latN = parseFloat(latRaw.replace(',', '.'));
      const lonN = parseFloat(lonRaw.replace(',', '.'));
      if (Number.isFinite(latN) && Number.isFinite(lonN) && latN >= LAT_MIN && latN <= LAT_MAX && lonN >= LON_MIN && lonN <= LON_MAX) {
        lat = latN; lon = lonN;
      }
    }

    if (!porMunicipio.has(ibge)) porMunicipio.set(ibge, { municipioRaw: municipioNome, registros: [] });
    porMunicipio.get(ibge).registros.push({ ts, hora, logradouroRaw, lat, lon });
  }
}

// --- agregações por município -----------------------------------------------------

function calcularPontos(registros) {
  const grupos = new Map();
  for (const r of registros) {
    if (r.lat === null || r.lon === null) continue;
    const lat = Number(r.lat.toFixed(3));
    const lon = Number(r.lon.toFixed(3));
    const chave = `${lat},${lon}`;
    grupos.set(chave, (grupos.get(chave) || { lat, lon, n: 0 }));
    grupos.get(chave).n++;
  }
  return [...grupos.values()];
}

function calcularRanking(registros) {
  const porChave = new Map(); // chave -> { contagem, rawCount: Map<raw,int> }
  let totalComVia = 0;
  for (const r of registros) {
    if (!r.logradouroRaw) continue;
    totalComVia++;
    const chave = chaveLogradouro(r.logradouroRaw);
    if (!porChave.has(chave)) porChave.set(chave, { contagem: 0, rawCount: new Map() });
    const grupo = porChave.get(chave);
    grupo.contagem++;
    grupo.rawCount.set(r.logradouroRaw, (grupo.rawCount.get(r.logradouroRaw) || 0) + 1);
  }
  const itens = [...porChave.values()]
    .sort((a, b) => b.contagem - a.contagem)
    .slice(0, TOP_RANKING)
    .map(grupo => {
      const rawMaisComum = [...grupo.rawCount.entries()].sort((a, b) => b[1] - a[1])[0][0];
      return {
        nome: tituloLogradouro(rawMaisComum),
        pct: totalComVia > 0 ? Math.round((grupo.contagem / totalComVia) * 100) : 0,
      };
    });
  return { tipo: 'via', itens };
}

function calcularPorHora(registros) {
  const porHora = new Array(HORAS.length).fill(0);
  for (const r of registros) {
    if (r.hora === null || !Number.isFinite(r.hora) || r.hora < 6) continue; // madrugada (00h-06h) fica fora
    const idx = Math.floor((r.hora - 6) / 2);
    if (idx >= 0 && idx < porHora.length) porHora[idx]++;
  }
  const max = Math.max(...porHora);
  const pico = max > 0 ? HORAS[porHora.indexOf(max)] : null;
  return { porHora, pico };
}

// Domingo a sábado, a partir do timestamp (UTC) do próprio sábado (fim da semana).
function calcularPorDia(registros, fimSemanaTs) {
  const inicioSemanaTs = fimSemanaTs - 6 * UM_DIA;
  const porDia = new Array(7).fill(0);
  for (const r of registros) {
    if (r.ts < inicioSemanaTs || r.ts > fimSemanaTs) continue;
    const diaSemana = new Date(r.ts).getUTCDay(); // 0=Dom..6=Sáb
    porDia[diaSemana]++;
  }
  return porDia;
}

function totalNoIntervalo(registros, inicioTs, fimTs) {
  let total = 0;
  for (const r of registros) if (r.ts >= inicioTs && r.ts <= fimTs) total++;
  return total;
}

// totalPeriodoCompleto: 2022 até a última data do extrato, mesmo universo de
// porHora/ranking/pontos. totalUltimas2Semanas: soma das 2 últimas semanas completas
// (a atual + a anterior) — nunca só a mais recente. amostraSemanalPequena: abaixo de
// TOTAL_MINIMO_VARIACAO sinistros nas 2 semanas somadas, não dá pra falar em
// aumento/queda (ver js/insights.js, que lê esta flag pra montar a frase).
export function calcularTotais(registros, { inicioSemanaAtualTs, fimSemanaAtualTs, inicioSemanaAnteriorTs, fimSemanaAnteriorTs }) {
  const totalSemanaAtual = totalNoIntervalo(registros, inicioSemanaAtualTs, fimSemanaAtualTs);
  const totalSemanaAnterior = totalNoIntervalo(registros, inicioSemanaAnteriorTs, fimSemanaAnteriorTs);
  const totalUltimas2Semanas = totalSemanaAtual + totalSemanaAnterior;
  const amostraSemanalPequena = totalUltimas2Semanas < TOTAL_MINIMO_VARIACAO;

  let variacaoSemanaPct;
  if (amostraSemanalPequena) {
    variacaoSemanaPct = null;
  } else if (totalSemanaAnterior > 0) {
    variacaoSemanaPct = Number((((totalSemanaAtual - totalSemanaAnterior) / totalSemanaAnterior) * 100).toFixed(1));
  } else {
    variacaoSemanaPct = totalSemanaAtual === 0 ? 0 : null; // sem base de comparação (semana anterior zerada)
  }

  return {
    totalPeriodoCompleto: registros.length,
    totalUltimas2Semanas,
    amostraSemanalPequena,
    variacaoSemanaPct,
  };
}

// --- IBGE (nome oficial) e Nominatim (coordenadas) ---------------------------------

async function buscarComTimeout(url, opts = {}, timeoutMs = 8000) {
  const res = await fetch(url, { ...opts, signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`HTTP ${res.status} em ${url}`);
  return res.json();
}

async function nomeOficialIBGE(ibge) {
  try {
    const dados = await buscarComTimeout(`https://servicodados.ibge.gov.br/api/v1/localidades/municipios/${ibge}`);
    return dados?.nome || null;
  } catch (erro) {
    console.warn(`  aviso: não consegui o nome oficial do IBGE para ${ibge} (${erro.message})`);
    return null;
  }
}

const dormir = ms => new Promise(resolve => setTimeout(resolve, ms));

async function coordenadasNominatim(nomeMunicipio) {
  try {
    const query = encodeURIComponent(`${nomeMunicipio}, SP, Brasil`);
    const dados = await buscarComTimeout(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${query}`,
      { headers: { 'User-Agent': NOMINATIM_USER_AGENT, 'Accept': 'application/json' } },
    );
    if (!dados.length) return null;
    return { lat: Number(dados[0].lat), lon: Number(dados[0].lon) };
  } catch (erro) {
    console.warn(`  aviso: não consegui coordenadas no Nominatim para ${nomeMunicipio} (${erro.message})`);
    return null;
  }
}

// --- main ----------------------------------------------------------------------

async function main() {
  console.log('Lendo CSVs de data-raw/ (streaming, pode levar ~1 min)...');
  const porMunicipio = new Map();
  const estadoGlobal = { maxTs: null };
  for (const arquivo of ARQUIVOS_CSV) {
    console.log(`  ${path.basename(arquivo)}`);
    await lerCsv(arquivo, porMunicipio, estadoGlobal);
  }

  if (estadoGlobal.maxTs === null) throw new Error('Nenhuma linha válida encontrada nos CSVs.');

  // Última semana completa (dom-sáb) contida no extrato, e a semana anterior.
  const diaSemanaMax = new Date(estadoGlobal.maxTs).getUTCDay(); // 0=Dom..6=Sáb
  const diasAteSabado = (diaSemanaMax - 6 + 7) % 7;
  const fimSemanaAtualTs = estadoGlobal.maxTs - diasAteSabado * UM_DIA;
  const inicioSemanaAtualTs = fimSemanaAtualTs - 6 * UM_DIA;
  const fimSemanaAnteriorTs = fimSemanaAtualTs - 7 * UM_DIA;
  const inicioSemanaAnteriorTs = fimSemanaAnteriorTs - 6 * UM_DIA;

  const periodo = `${formatDataCurta(inicioSemanaAtualTs)} a ${formatDataCurta(fimSemanaAtualTs)}`;
  console.log(`Última semana completa do extrato: ${periodo}`);

  const indice = [];
  let i = 0;
  const total = porMunicipio.size;
  for (const [ibge, { municipioRaw, registros }] of porMunicipio) {
    i++;
    console.log(`[${i}/${total}] ${municipioRaw} (${ibge}) — ${registros.length} registros no histórico`);

    const nomeOficial = await nomeOficialIBGE(ibge);
    await dormir(120); // só pra não martelar a API do IBGE
    const nome = nomeOficial || tituloLogradouro(municipioRaw); // fallback: mesmo Title Case usado pra logradouro

    const { porHora, pico } = calcularPorHora(registros);
    const porDia = calcularPorDia(registros, fimSemanaAtualTs);
    const { totalPeriodoCompleto, totalUltimas2Semanas, amostraSemanalPequena, variacaoSemanaPct } = calcularTotais(
      registros,
      { inicioSemanaAtualTs, fimSemanaAtualTs, inicioSemanaAnteriorTs, fimSemanaAnteriorTs },
    );

    const municipioJson = {
      ibge,
      nome,
      uf: 'SP',
      fonte: 'Infosiga-SP: sinistros com vítimas (fatais e não fatais)',
      periodo,
      simulado: false,
      totalPeriodoCompleto,
      totalUltimas2Semanas,
      amostraSemanalPequena,
      porHora,
      porDia,
      variacaoSemanaPct,
      pico,
      ranking: calcularRanking(registros),
      pontos: calcularPontos(registros),
    };

    await mkdir(path.join(RAIZ, 'data', 'municipios'), { recursive: true });
    await writeFile(
      path.join(RAIZ, 'data', 'municipios', `${ibge}.json`),
      JSON.stringify(municipioJson, null, 2) + '\n',
    );

    console.log('  buscando coordenadas no Nominatim...');
    const coord = await coordenadasNominatim(nome);
    await dormir(1000); // Nominatim: 1 requisição por segundo
    if (coord) {
      indice.push({ ibge, nome, uf: 'SP', lat: coord.lat, lon: coord.lon });
    } else {
      console.warn(`  aviso: ${nome} (${ibge}) ficou sem coordenada no Nominatim — não entra em data/indice.json`);
    }
  }

  indice.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  await writeFile(path.join(RAIZ, 'data', 'indice.json'), JSON.stringify(indice, null, 2) + '\n');

  console.log(`\nGerado data/indice.json (${indice.length} município(s)) e data/municipios/*.json (${porMunicipio.size} arquivo(s)).`);
}

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1] || '')) {
  main().catch(erro => {
    console.error(erro);
    process.exitCode = 1;
  });
}
