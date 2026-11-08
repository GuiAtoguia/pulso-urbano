import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validarMunicipio, carregarMunicipio, carregarIndice } from './data.js';

const municipioValido = {
  ibge: '3502804',
  nome: 'Araçatuba',
  uf: 'SP',
  fonte: 'Infosiga-SP',
  periodo: '20 set 2026 – 26 set 2026',
  simulado: false,
  total: 18,
  porHora: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  porDia: [1, 2, 3, 2, 3, 4, 3],
  variacaoSemanaPct: 12.5,
  pico: '18h',
  ranking: { tipo: 'via', itens: [{ nome: 'Rua A', pct: 50 }] },
  pontos: [{ lat: -21.2, lon: -50.4, n: 3 }],
};

describe('validarMunicipio', () => {
  it('aceita um JSON válido e completo', () => {
    expect(validarMunicipio(municipioValido)).toBe(true);
  });

  it('aceita total 0 e arrays vazios (dado válido, só sem ocorrência)', () => {
    expect(validarMunicipio({
      ...municipioValido,
      total: 0,
      porHora: [],
      porDia: [],
      ranking: { tipo: 'via', itens: [] },
      pontos: [],
      variacaoSemanaPct: null,
      pico: null,
    })).toBe(true);
  });

  it('rejeita null, undefined e não-objeto', () => {
    expect(validarMunicipio(null)).toBe(false);
    expect(validarMunicipio(undefined)).toBe(false);
    expect(validarMunicipio('string')).toBe(false);
    expect(validarMunicipio(42)).toBe(false);
  });

  it('rejeita quando falta um campo obrigatório', () => {
    const { total, ...semTotal } = municipioValido;
    expect(validarMunicipio(semTotal)).toBe(false);
    const { ranking, ...semRanking } = municipioValido;
    expect(validarMunicipio(semRanking)).toBe(false);
    const { nome, ...semNome } = municipioValido;
    expect(validarMunicipio(semNome)).toBe(false);
  });

  it('rejeita quando um campo tem tipo errado', () => {
    expect(validarMunicipio({ ...municipioValido, total: '18' })).toBe(false);
    expect(validarMunicipio({ ...municipioValido, porHora: 'não é array' })).toBe(false);
    expect(validarMunicipio({ ...municipioValido, porHora: [1, 2, 'x'] })).toBe(false);
    expect(validarMunicipio({ ...municipioValido, simulado: 'false' })).toBe(false);
    expect(validarMunicipio({ ...municipioValido, ranking: { tipo: 'via', itens: 'não é array' } })).toBe(false);
    expect(validarMunicipio({ ...municipioValido, ranking: { tipo: 'via', itens: [{ nome: 'Rua A', pct: 'cinquenta' }] } })).toBe(false);
    expect(validarMunicipio({ ...municipioValido, pontos: [{ lat: 'x', lon: -50.4, n: 3 }] })).toBe(false);
  });

  it('aceita variacaoSemanaPct e pico como null (sem base de comparação)', () => {
    expect(validarMunicipio({ ...municipioValido, variacaoSemanaPct: null, pico: null })).toBe(true);
  });

  it('rejeita NaN/Infinity em campos numéricos', () => {
    expect(validarMunicipio({ ...municipioValido, total: NaN })).toBe(false);
    expect(validarMunicipio({ ...municipioValido, total: Infinity })).toBe(false);
  });
});

describe('carregarMunicipio', () => {
  const originalFetch = global.fetch;
  const originalWarn = console.warn;

  beforeEach(() => {
    vi.resetAllMocks();
    console.warn = vi.fn();
  });
  afterEach(() => {
    global.fetch = originalFetch;
    console.warn = originalWarn;
  });

  it('sem ibge, retorna motivo sem-ibge sem chamar fetch', async () => {
    global.fetch = vi.fn();
    const r = await carregarMunicipio(null);
    expect(r).toEqual({ ok: false, motivo: 'sem-ibge' });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('404 vira motivo sem-dados', async () => {
    global.fetch = vi.fn().mockResolvedValue({ status: 404, ok: false });
    const r = await carregarMunicipio('9999999');
    expect(r).toEqual({ ok: false, motivo: 'sem-dados' });
  });

  it('resposta HTTP não-ok (ex: 500) vira motivo indisponivel e loga', async () => {
    global.fetch = vi.fn().mockResolvedValue({ status: 500, ok: false });
    const r = await carregarMunicipio('3502804');
    expect(r).toEqual({ ok: false, motivo: 'indisponivel' });
    expect(console.warn).toHaveBeenCalled();
  });

  it('JSON malformado vira motivo invalido (não rede) e loga', async () => {
    global.fetch = vi.fn().mockResolvedValue({ status: 200, ok: true, json: () => Promise.reject(new SyntaxError('bad json')) });
    const r = await carregarMunicipio('3502804');
    expect(r).toEqual({ ok: false, motivo: 'invalido' });
    expect(console.warn).toHaveBeenCalled();
  });

  it('JSON válido mas fora do contrato vira motivo invalido e loga', async () => {
    global.fetch = vi.fn().mockResolvedValue({ status: 200, ok: true, json: () => Promise.resolve({ foo: 'bar' }) });
    const r = await carregarMunicipio('3502804');
    expect(r).toEqual({ ok: false, motivo: 'invalido' });
    expect(console.warn).toHaveBeenCalled();
  });

  it('erro de rede (fetch rejeita) vira motivo rede e loga', async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    const r = await carregarMunicipio('3502804');
    expect(r).toEqual({ ok: false, motivo: 'rede' });
    expect(console.warn).toHaveBeenCalled();
  });

  it('timeout (AbortError) vira motivo timeout', async () => {
    global.fetch = vi.fn().mockRejectedValue(Object.assign(new Error('timeout'), { name: 'TimeoutError' }));
    const r = await carregarMunicipio('3502804');
    expect(r.motivo).toBe('timeout');
  });

  it('JSON válido e dentro do contrato retorna ok:true', async () => {
    global.fetch = vi.fn().mockResolvedValue({ status: 200, ok: true, json: () => Promise.resolve(municipioValido) });
    const r = await carregarMunicipio('3502804');
    expect(r.ok).toBe(true);
    expect(r.dados).toEqual(municipioValido);
  });
});

describe('carregarIndice', () => {
  const originalFetch = global.fetch;
  beforeEach(() => { vi.resetAllMocks(); });
  afterEach(() => { global.fetch = originalFetch; });

  it('retorna a lista quando o JSON é um array', async () => {
    const lista = [{ ibge: '3502804', nome: 'Araçatuba', uf: 'SP', lat: -21.2, lon: -50.4 }];
    global.fetch = vi.fn().mockResolvedValue({ status: 200, ok: true, json: () => Promise.resolve(lista) });
    const r = await carregarIndice();
    expect(r).toEqual({ ok: true, dados: lista });
  });

  it('rejeita quando o JSON não é um array', async () => {
    global.fetch = vi.fn().mockResolvedValue({ status: 200, ok: true, json: () => Promise.resolve({ não: 'é array' }) });
    const r = await carregarIndice();
    expect(r.ok).toBe(false);
    expect(r.motivo).toBe('invalido');
  });

  it('404 vira indisponivel (não existe "sem-dados" pro índice geral)', async () => {
    global.fetch = vi.fn().mockResolvedValue({ status: 404, ok: false });
    const r = await carregarIndice();
    expect(r).toEqual({ ok: false, motivo: 'indisponivel' });
  });
});
