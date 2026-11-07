// Gera data/indice.json e data/municipios/<ibge>.json com dados SIMULADOS
// (simulado: true), no contrato descrito em CLAUDE.md, para Araçatuba (3502804).
// Uso: npm run gerar-simulado

import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const MUNICIPIO = { ibge: '3502804', nome: 'Araçatuba', uf: 'SP', lat: -21.2076, lon: -50.4401 };

// PRNG determinístico (seed fixa) para o arquivo gerado não mudar a cada execução.
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function seedFromString(str) {
  let h = 0;
  for (const c of str) h = (h * 31 + c.charCodeAt(0)) | 0;
  return h;
}

const rand = mulberry32(seedFromString(MUNICIPIO.ibge));
const randomInt = (min, max) => Math.floor(min + rand() * (max - min + 1));
const randomFloat = (min, max, decimals = 1) => Number((min + rand() * (max - min)).toFixed(decimals));

// Nomes de vias fictícios para compor o ranking (dado é simulado; ver flag "simulado").
const VIAS = [
  'Avenida Floriano Peixoto',
  'Avenida Governador Mário Covas',
  'Rua Coronel José Dias',
  'Rua Pernambuco',
  'Avenida Baguaçu',
  'Rua XV de Novembro',
];

function gerarRanking() {
  const n = 3;
  const escolhidas = [...VIAS].sort(() => rand() - 0.5).slice(0, n);
  let restante = 100;
  const itens = escolhidas.map((nome, i) => {
    const ultimo = i === n - 1;
    const pct = ultimo ? restante : randomInt(15, Math.max(15, Math.min(45, restante - (n - i - 1) * 10)));
    restante -= pct;
    return { nome, pct };
  });
  return { tipo: 'via', itens };
}

// 9 faixas horárias (06h, 08h, ..., 22h), com pico no fim de tarde/início de noite.
const HORAS = ['06h', '08h', '10h', '12h', '14h', '16h', '18h', '20h', '22h'];
function gerarPorHora() {
  const base = [12, 18, 24, 30, 42, 58, 70, 52, 28];
  return base.map(v => Math.max(0, v + randomInt(-6, 6)));
}

// 7 dias da semana, Dom a Sáb.
function gerarPorDia() {
  const base = [30, 38, 44, 41, 47, 55, 36];
  return base.map(v => Math.max(0, v + randomInt(-5, 5)));
}

// Pontos arredondados (3 casas) e agrupados por cluster, para não expor ocorrência individual.
function gerarPontos(total) {
  const clusters = [
    { lat: -21.2076, lon: -50.4401 },
    { lat: -21.1958, lon: -50.4487 },
    { lat: -21.2187, lon: -50.4285 },
    { lat: -21.2021, lon: -50.4601 },
    { lat: -21.1889, lon: -50.4232 },
  ];
  let restante = total;
  const pontos = clusters.map((c, i) => {
    const ultimo = i === clusters.length - 1;
    const n = ultimo ? restante : randomInt(3, Math.max(3, Math.floor(total / clusters.length)));
    restante -= n;
    return {
      lat: Number((c.lat + randomFloat(-0.01, 0.01, 3)).toFixed(3)),
      lon: Number((c.lon + randomFloat(-0.01, 0.01, 3)).toFixed(3)),
      n: Math.max(1, n),
    };
  });
  return pontos.filter(p => p.n > 0);
}

async function main() {
  const porHora = gerarPorHora();
  const porDia = gerarPorDia();
  const total = porDia.reduce((a, b) => a + b, 0);
  const picoIndex = porHora.indexOf(Math.max(...porHora));

  const municipio = {
    ibge: MUNICIPIO.ibge,
    nome: MUNICIPIO.nome,
    uf: MUNICIPIO.uf,
    fonte: 'Infosiga-SP (dados simulados para desenvolvimento)',
    periodo: '01–07 nov 2026',
    simulado: true,
    total,
    porHora,
    porDia,
    variacaoSemanaPct: randomFloat(-12, 12, 1),
    pico: HORAS[picoIndex],
    ranking: gerarRanking(),
    pontos: gerarPontos(total),
  };

  const indice = [{ ibge: MUNICIPIO.ibge, nome: MUNICIPIO.nome, uf: MUNICIPIO.uf, lat: MUNICIPIO.lat, lon: MUNICIPIO.lon }];

  const raiz = fileURLToPath(new URL('..', import.meta.url));
  await mkdir(path.join(raiz, 'data', 'municipios'), { recursive: true });
  await writeFile(path.join(raiz, 'data', 'indice.json'), JSON.stringify(indice, null, 2) + '\n');
  await writeFile(path.join(raiz, 'data', 'municipios', `${MUNICIPIO.ibge}.json`), JSON.stringify(municipio, null, 2) + '\n');
  console.log(`Gerado data/indice.json e data/municipios/${MUNICIPIO.ibge}.json (simulado: true)`);
}

main();
