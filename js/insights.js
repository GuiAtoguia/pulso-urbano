// Funções puras: a partir do JSON de um município (contrato em CLAUDE.md),
// devolvem as frases do widget "Visão geral" (pico de horário, via com mais
// sinistros, variação da semana). Sem DOM — ver js/insights.test.js.
//
// A variação de frase por situação é escolhida de forma DETERMINÍSTICA a partir
// do código IBGE do município (não é sorteada a cada render): o mesmo município,
// na mesma situação, sempre recebe a mesma frase.

import { topVias } from './calc.js';

const TOTAL_MINIMO_RANKING = 20;
const LIMIAR_ESTAVEL = 1; // |variação| < 1% é tratada como estável

const TEMPLATES_PICO = [
  'O maior volume de sinistros ocorre entre {inicio} e {fim}.',
  'Horário de maior risco: de {inicio} a {fim}.',
  'A faixa entre {inicio} e {fim} concentra o maior número de ocorrências.',
  'Atenção redobrada é recomendada entre {inicio} e {fim}, horário de pico.',
];

const TEMPLATES_VIA = [
  '{via} concentra o maior número de sinistros, com {pct}% do total.',
  'A via com mais ocorrências é {via} ({pct}%).',
  '{pct}% dos sinistros registrados aconteceram em {via}.',
  'Entre as vias mapeadas, {via} lidera com {pct}% das ocorrências.',
];

const TEMPLATES_VARIACAO_POSITIVA = [
  'Os sinistros aumentaram {pct} em relação à semana anterior.',
  'Alta de {pct} na comparação semanal.',
  'Houve um crescimento de {pct} frente à semana passada.',
  'Mais ocorrências essa semana: variação de {pct}.',
];

const TEMPLATES_VARIACAO_NEGATIVA = [
  'Os sinistros caíram {pct} em relação à semana anterior.',
  'Queda de {pct} na comparação semanal.',
  'Houve {pct} menos ocorrências que na semana passada.',
  'Redução de {pct} frente à semana anterior.',
];

const TEMPLATES_VARIACAO_ESTAVEL = [
  'O número de sinistros ficou estável em relação à semana anterior.',
  'Sem variação relevante na comparação semanal.',
  'A semana se manteve no mesmo patamar da anterior.',
  'Nenhuma mudança significativa frente à semana passada.',
];

function hashTexto(texto) {
  let h = 0;
  for (const c of String(texto)) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

// Escolhe sempre o mesmo índice para o mesmo (ibge, categoria) — nunca aleatório.
function escolherIndice(ibge, categoria, n) {
  return hashTexto(`${ibge ?? ''}:${categoria}`) % n;
}

function preencher(template, valores) {
  return Object.entries(valores).reduce(
    (acc, [chave, valor]) => acc.replaceAll(`{${chave}}`, String(valor)),
    template
  );
}

function formatarPctComSinal(valor) {
  const sinal = valor > 0 ? '+' : valor < 0 ? '-' : '';
  return `${sinal}${Math.abs(valor).toFixed(1).replace('.', ',')}%`;
}

function formatarPctAbsoluto(valor) {
  return `${Math.abs(valor).toFixed(1).replace('.', ',')}%`;
}

// "18h" -> { inicio: 18, fim: 20 }; cada faixa de porHora cobre 2 horas.
function faixaHorario(pico) {
  const m = /^(\d{1,2})h?$/.exec(String(pico ?? '').trim());
  if (!m) return null;
  const inicio = Number(m[1]);
  if (!Number.isFinite(inicio) || inicio < 0 || inicio > 23) return null;
  const fim = (inicio + 2) % 24;
  return {
    inicio: `${String(inicio).padStart(2, '0')}h`,
    fim: `${String(fim).padStart(2, '0')}h`,
  };
}

// Frase sobre o horário de maior concentração de sinistros.
export function frasePico(dados) {
  const faixa = faixaHorario(dados?.pico);
  if (!faixa) return 'sem horário de pico identificado para este município';
  const indice = escolherIndice(dados?.ibge, 'pico', TEMPLATES_PICO.length);
  return preencher(TEMPLATES_PICO[indice], faixa);
}

// Frase sobre a via com mais sinistros. Com poucos dados, o ranking não é confiável.
export function fraseVia(dados) {
  const total = Number(dados?.total);
  const itens = dados?.ranking?.itens;
  if (!Number.isFinite(total) || total < TOTAL_MINIMO_RANKING || !Array.isArray(itens) || itens.length === 0) {
    return 'dados insuficientes para ranking';
  }
  const [principal] = topVias(itens, 1);
  if (!principal) return 'dados insuficientes para ranking';
  const indice = escolherIndice(dados?.ibge, 'via', TEMPLATES_VIA.length);
  return preencher(TEMPLATES_VIA[indice], { via: principal.nome, pct: principal.pct });
}

// Frase sobre a variação semanal (positiva, negativa ou estável).
export function fraseVariacao(dados) {
  const bruto = dados?.variacaoSemanaPct;
  if (bruto === null || bruto === undefined) return 'sem dados de variação semanal para este município';
  const valor = Number(bruto);
  if (!Number.isFinite(valor)) return 'sem dados de variação semanal para este município';
  const ibge = dados?.ibge;
  if (Math.abs(valor) < LIMIAR_ESTAVEL) {
    const indice = escolherIndice(ibge, 'variacao-estavel', TEMPLATES_VARIACAO_ESTAVEL.length);
    return TEMPLATES_VARIACAO_ESTAVEL[indice];
  }
  if (valor > 0) {
    const indice = escolherIndice(ibge, 'variacao-positiva', TEMPLATES_VARIACAO_POSITIVA.length);
    return preencher(TEMPLATES_VARIACAO_POSITIVA[indice], { pct: formatarPctComSinal(valor) });
  }
  const indice = escolherIndice(ibge, 'variacao-negativa', TEMPLATES_VARIACAO_NEGATIVA.length);
  return preencher(TEMPLATES_VARIACAO_NEGATIVA[indice], { pct: formatarPctAbsoluto(valor) });
}

// Reúne as três frases do widget "Visão geral".
export function gerarInsights(dados) {
  return {
    pico: frasePico(dados),
    via: fraseVia(dados),
    variacao: fraseVariacao(dados),
  };
}
