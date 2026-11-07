import { describe, it, expect } from 'vitest';
import { scaleHeat, formatVariacaoPct, topVias, buildWeekPath } from './calc.js';

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
