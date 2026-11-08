// Funções puras de cálculo para os widgets da Grade de observação.
// Sem DOM, sem fetch — fáceis de testar isoladamente (ver js/calc.test.js).

export function scaleHeat(valor, max) {
  if (!Number.isFinite(valor) || !Number.isFinite(max) || max <= 0) return 0;
  const pct = (valor / max) * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

export function formatVariacaoPct(valor) {
  if (!Number.isFinite(valor)) return '—';
  if (valor === 0) return '0%';
  const sinal = valor > 0 ? '+' : '-';
  const abs = Math.abs(valor).toFixed(1).replace('.', ',');
  return `${sinal}${abs}%`;
}

export function topVias(itens, n = 3) {
  if (!Array.isArray(itens)) return [];
  return [...itens].sort((a, b) => b.pct - a.pct).slice(0, n);
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function catmullRomPath(pontos) {
  if (pontos.length === 1) return `M${round2(pontos[0][0])} ${round2(pontos[0][1])}`;
  let d = `M${round2(pontos[0][0])} ${round2(pontos[0][1])}`;
  for (let i = 0; i < pontos.length - 1; i++) {
    const p0 = pontos[i - 1] || pontos[i];
    const p1 = pontos[i];
    const p2 = pontos[i + 1];
    const p3 = pontos[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${round2(c1x)} ${round2(c1y)} ${round2(c2x)} ${round2(c2y)} ${round2(p2[0])} ${round2(p2[1])}`;
  }
  return d;
}

// Cores dos pontos do mapa, por faixa de intensidade (fonte única para marcador e legenda).
export const CORES_PONTOS = {
  baixo: { fill: '#60a5fa', stroke: '#ffffff' },
  medio: { fill: '#2563eb', stroke: '#ffffff' },
  alto: { fill: '#1e3a8a', stroke: '#ffffff' },
};

const FAIXAS_CHAVES = ['baixo', 'medio', 'alto'];

// Raio (px) de um circleMarker proporcional a n, em escala de área (sqrt) — evita que
// valores grandes dominem visualmente demais o mapa. Satura entre min e max.
export function raioPonto(n, maxN, { min = 6, max = 22 } = {}) {
  if (!Number.isFinite(maxN) || maxN <= 0) return min;
  if (!Number.isFinite(n) || n <= 0) return min;
  const escala = Math.sqrt(Math.min(n, maxN) / maxN);
  return Math.round(min + escala * (max - min));
}

// Gera as 3 faixas da legenda (baixo/médio/alto) a partir dos valores de n em pontos[].
// Cada faixa traz rótulo (intervalo), raio equivalente e é usada tanto para desenhar
// a legenda quanto para classificar cada ponto (ver classificarPonto).
export function buildLegendaPontos(pontos, { min = 6, max = 22 } = {}) {
  const valores = (Array.isArray(pontos) ? pontos : [])
    .map(p => p?.n)
    .filter(n => Number.isFinite(n) && n > 0);
  if (!valores.length) return [];
  const maxN = Math.max(...valores);
  const minN = Math.min(...valores);
  const span = Math.max(maxN - minN, 1);
  const n = FAIXAS_CHAVES.length;
  const limites = [minN];
  for (let i = 1; i < n; i++) {
    limites.push(Math.max(Math.round(minN + (span * i) / n), limites[i - 1]));
  }
  limites.push(Math.max(maxN, limites[n - 1]));
  return FAIXAS_CHAVES.map((chave, i) => {
    const limiteSuperior = limites[i + 1];
    const limiteInferior = i === 0 ? limites[0] : Math.min(limites[i] + 1, limiteSuperior);
    return {
      chave,
      rotulo: limiteInferior === limiteSuperior ? `${limiteInferior}` : `${limiteInferior}–${limiteSuperior}`,
      min: limiteInferior,
      max: limiteSuperior,
      raio: raioPonto(limiteSuperior, maxN, { min, max }),
    };
  });
}

// Encontra a faixa da legenda à qual um valor de n pertence.
export function classificarPonto(n, legenda) {
  if (!Array.isArray(legenda) || !legenda.length) return null;
  if (!Number.isFinite(n)) return legenda[0];
  return legenda.find(faixa => n <= faixa.max) ?? legenda[legenda.length - 1];
}

// Gera o traçado SVG (linha suavizada + área) a partir de porDia[7].
// Eixo Y invertido (SVG): valor maior -> y menor.
export function buildWeekPath(porDia, { width = 480, height = 150, padding = 18 } = {}) {
  if (!Array.isArray(porDia) || porDia.length === 0) {
    return { line: '', area: '', points: [] };
  }
  const max = Math.max(...porDia, 1);
  const min = Math.min(...porDia, 0);
  const span = Math.max(max - min, 1);
  const n = porDia.length;
  const stepX = n > 1 ? width / (n - 1) : 0;
  const points = porDia.map((v, i) => {
    const x = i * stepX;
    const y = padding + (1 - (v - min) / span) * (height - padding * 2);
    return [x, y];
  });
  const line = catmullRomPath(points);
  const area = `${line} L${width} ${height} L0 ${height}Z`;
  return { line, area, points };
}
