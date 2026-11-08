import { describe, it, expect } from 'vitest';
import { scaleHeat, formatVariacaoPct, fimDoPeriodo, topVias, buildWeekPath, raioPonto, buildLegendaPontos, classificarPonto } from './calc.js';

describe('scaleHeat', () => {
  it('escala um valor dentro da faixa para 0-100', () => {
    expect(scaleHeat(50, 100)).toBe(50);
    expect(scaleHeat(25, 50)).toBe(50);
  });
  it('arredonda para o inteiro mais próximo', () => {
    expect(scaleHeat(1, 3)).toBe(33);
  });
  it('satura em 100 quando o valor excede o máximo', () => {
    expect(scaleHeat(150, 100)).toBe(100);
  });
  it('nunca retorna negativo', () => {
    expect(scaleHeat(-10, 100)).toBe(0);
  });
  it('retorna 0 quando max é inválido', () => {
    expect(scaleHeat(5, 0)).toBe(0);
    expect(scaleHeat(5, -10)).toBe(0);
    expect(scaleHeat(5, NaN)).toBe(0);
  });
  it('retorna 0 quando valor não é finito', () => {
    expect(scaleHeat(NaN, 100)).toBe(0);
  });
});

describe('fimDoPeriodo', () => {
  it('extrai a data final de um período "início a fim"', () => {
    expect(fimDoPeriodo('20 set 2026 a 26 set 2026')).toBe('26 set 2026');
  });
  it('retorna null para período ausente, vazio ou de tipo errado', () => {
    expect(fimDoPeriodo(null)).toBeNull();
    expect(fimDoPeriodo(undefined)).toBeNull();
    expect(fimDoPeriodo('')).toBeNull();
    expect(fimDoPeriodo(42)).toBeNull();
  });
  it('retorna null quando a parte final, depois de split, fica vazia ao aparar espaços', () => {
    expect(fimDoPeriodo('20 set 2026 a ')).toBeNull();
  });
});

describe('formatVariacaoPct', () => {
  it('formata valores positivos com sinal + e vírgula decimal', () => {
    expect(formatVariacaoPct(8.4)).toBe('+8,4%');
  });
  it('formata valores negativos com sinal -', () => {
    expect(formatVariacaoPct(-3.2)).toBe('-3,2%');
  });
  it('trata zero sem sinal', () => {
    expect(formatVariacaoPct(0)).toBe('0%');
  });
  it('arredonda para uma casa decimal', () => {
    expect(formatVariacaoPct(8.449)).toBe('+8,4%');
  });
  it('retorna travessão para valores não numéricos', () => {
    expect(formatVariacaoPct(NaN)).toBe('—');
    expect(formatVariacaoPct(undefined)).toBe('—');
  });
});

describe('topVias', () => {
  const itens = [
    { nome: 'Rua A', pct: 10 },
    { nome: 'Rua B', pct: 50 },
    { nome: 'Rua C', pct: 20 },
    { nome: 'Rua D', pct: 20 },
  ];
  it('ordena por pct decrescente e limita a n itens', () => {
    expect(topVias(itens, 2)).toEqual([
      { nome: 'Rua B', pct: 50 },
      { nome: 'Rua C', pct: 20 },
    ]);
  });
  it('não modifica o array original', () => {
    const copia = [...itens];
    topVias(itens, 2);
    expect(itens).toEqual(copia);
  });
  it('usa 3 como padrão de n', () => {
    expect(topVias(itens)).toHaveLength(3);
  });
  it('retorna array vazio para entrada inválida', () => {
    expect(topVias(undefined)).toEqual([]);
    expect(topVias(null)).toEqual([]);
  });
});

describe('raioPonto', () => {
  it('retorna o raio máximo para o maior valor do conjunto', () => {
    expect(raioPonto(100, 100, { min: 6, max: 22 })).toBe(22);
  });
  it('retorna um raio entre min e max para valores intermediários', () => {
    const r = raioPonto(25, 100, { min: 6, max: 22 });
    expect(r).toBeGreaterThan(6);
    expect(r).toBeLessThan(22);
  });
  it('usa escala de área (sqrt), não linear', () => {
    const rMeio = raioPonto(50, 100, { min: 0, max: 100 });
    expect(rMeio).toBeCloseTo(70.7, 0);
  });
  it('satura no mínimo quando n é 0, negativo ou não numérico', () => {
    expect(raioPonto(0, 100)).toBe(4);
    expect(raioPonto(-5, 100)).toBe(4);
    expect(raioPonto(NaN, 100)).toBe(4);
    expect(raioPonto(undefined, 100)).toBe(4);
  });
  it('retorna min quando maxN é inválido', () => {
    expect(raioPonto(10, 0)).toBe(4);
    expect(raioPonto(10, -1)).toBe(4);
    expect(raioPonto(10, NaN)).toBe(4);
  });
  it('não excede o maxN ao calcular a escala (clamp)', () => {
    expect(raioPonto(500, 100, { min: 6, max: 22 })).toBe(22);
  });
});

describe('buildLegendaPontos', () => {
  it('retorna array vazio para entrada vazia ou inválida', () => {
    expect(buildLegendaPontos([])).toEqual([]);
    expect(buildLegendaPontos(null)).toEqual([]);
    expect(buildLegendaPontos([{ n: 0 }, { n: -3 }])).toEqual([]);
  });
  it('gera 3 faixas (baixo, medio, alto) com raio crescente', () => {
    const pontos = [{ n: 5 }, { n: 34 }, { n: 42 }, { n: 8 }, { n: 209 }];
    const legenda = buildLegendaPontos(pontos);
    expect(legenda.map(f => f.chave)).toEqual(['baixo', 'medio', 'alto']);
    expect(legenda[0].raio).toBeLessThan(legenda[1].raio);
    expect(legenda[1].raio).toBeLessThan(legenda[2].raio);
  });
  it('a última faixa termina no maior valor e a primeira começa no menor', () => {
    const pontos = [{ n: 1 }, { n: 50 }, { n: 100 }];
    const legenda = buildLegendaPontos(pontos);
    expect(legenda[0].min).toBe(1);
    expect(legenda[legenda.length - 1].max).toBe(100);
  });
  it('não lança quando todos os pontos têm o mesmo n', () => {
    const legenda = buildLegendaPontos([{ n: 10 }, { n: 10 }]);
    expect(legenda).toHaveLength(3);
    expect(legenda.every(f => Number.isFinite(f.raio))).toBe(true);
  });
  it('ignora itens sem n numérico válido', () => {
    const legenda = buildLegendaPontos([{ n: 5 }, { lat: 1, lon: 2 }, { n: 'x' }, { n: 50 }]);
    expect(legenda).toHaveLength(3);
  });
});

describe('classificarPonto', () => {
  const legenda = buildLegendaPontos([{ n: 5 }, { n: 34 }, { n: 42 }, { n: 8 }, { n: 209 }]);
  it('classifica um valor baixo na primeira faixa', () => {
    expect(classificarPonto(5, legenda).chave).toBe('baixo');
  });
  it('classifica o maior valor na última faixa', () => {
    expect(classificarPonto(209, legenda).chave).toBe('alto');
  });
  it('classifica um valor acima do máximo na última faixa (sem lançar)', () => {
    expect(classificarPonto(9999, legenda).chave).toBe('alto');
  });
  it('retorna null para legenda vazia ou inválida', () => {
    expect(classificarPonto(5, [])).toBeNull();
    expect(classificarPonto(5, null)).toBeNull();
  });
  it('retorna a primeira faixa para n não numérico', () => {
    expect(classificarPonto(NaN, legenda)).toBe(legenda[0]);
  });
  it('a cor/faixa de cada ponto (classificarPonto) nunca diverge da legenda construída a partir do mesmo pontos[] (ver desenharPontos/legendaMapaHTML em app.js)', () => {
    const pontos = [{ n: 1 }, { n: 5 }, { n: 34 }, { n: 42 }, { n: 8 }, { n: 209 }];
    const legendaDoConjunto = buildLegendaPontos(pontos);
    for (const p of pontos) {
      const faixa = classificarPonto(p.n, legendaDoConjunto);
      expect(legendaDoConjunto).toContain(faixa); // nunca uma faixa "de fora" da legenda mostrada
    }
  });
});

describe('buildWeekPath', () => {
  it('retorna vazio para array vazio ou inválido', () => {
    expect(buildWeekPath([])).toEqual({ line: '', area: '', points: [] });
    expect(buildWeekPath(null)).toEqual({ line: '', area: '', points: [] });
  });
  it('gera um ponto único em "M x y" quando só há um valor', () => {
    const { line, points } = buildWeekPath([10]);
    expect(points).toHaveLength(1);
    expect(line.startsWith('M')).toBe(true);
    expect(line).not.toContain('C');
  });
  it('gera n-1 segmentos cúbicos para n pontos', () => {
    const { line } = buildWeekPath([30, 38, 44, 41, 45, 53, 41]);
    const segmentos = line.split('C').length - 1;
    expect(segmentos).toBe(6);
  });
  it('o primeiro ponto começa em x=0', () => {
    const { points } = buildWeekPath([1, 2, 3], { width: 300 });
    expect(points[0][0]).toBe(0);
  });
  it('o último ponto termina em x=width', () => {
    const { points } = buildWeekPath([1, 2, 3], { width: 300 });
    expect(points[points.length - 1][0]).toBe(300);
  });
  it('eixo Y é invertido: valor maior produz y menor', () => {
    const { points } = buildWeekPath([10, 50]);
    expect(points[1][1]).toBeLessThan(points[0][1]);
  });
  it('a área fecha o traçado até a base do viewBox', () => {
    const { area, line } = buildWeekPath([10, 20, 30], { width: 100, height: 60 });
    expect(area).toBe(`${line} L100 60 L0 60Z`);
  });
});

// Município real com total:0 (ex.: sem sinistro na janela de 2 semanas) — nenhuma
// das funções que alimentam gráficos pode gerar NaN, Infinity ou dividir por zero.
describe('cenário total 0 / arrays zerados (sem NaN, sem divisão por zero)', () => {
  it('scaleHeat com porHora todo zerado (heatWidget usa Math.max(...porHora,1) como max)', () => {
    const porHora = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    const max = Math.max(...porHora, 1);
    const escalas = porHora.map(v => scaleHeat(v, max));
    expect(escalas).toEqual(new Array(9).fill(0));
    expect(escalas.every(Number.isFinite)).toBe(true);
  });

  it('buildWeekPath com porDia todo zerado não gera NaN em nenhum ponto', () => {
    const { line, area, points } = buildWeekPath([0, 0, 0, 0, 0, 0, 0]);
    expect(points).toHaveLength(7);
    for (const [x, y] of points) {
      expect(Number.isFinite(x)).toBe(true);
      expect(Number.isFinite(y)).toBe(true);
    }
    expect(line).not.toContain('NaN');
    expect(area).not.toContain('NaN');
    expect(area).not.toContain('Infinity');
  });

  it('formatVariacaoPct com variação 0 mostra "0%", não "-0%" nem NaN', () => {
    expect(formatVariacaoPct(0)).toBe('0%');
    expect(formatVariacaoPct(-0)).toBe('0%');
  });

  it('formatVariacaoPct com variação ausente (município sem semana anterior p/ comparar) mostra travessão', () => {
    expect(formatVariacaoPct(null)).toBe('—');
    expect(formatVariacaoPct(undefined)).toBe('—');
  });

  it('topVias com ranking.itens vazio (total 0) retorna array vazio, não lança', () => {
    expect(topVias([], 3)).toEqual([]);
  });

  it('buildLegendaPontos e raioPonto com pontos:[] (sem coordenada nenhuma) não lançam', () => {
    expect(buildLegendaPontos([])).toEqual([]);
    expect(raioPonto(0, 0)).toBe(4);
  });
});
