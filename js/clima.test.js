import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { weathercodeParaIcone, weathercodeParaTexto, buscarClima } from './clima.js';

describe('weathercodeParaIcone', () => {
  it('mapeia códigos conhecidos para ícones Lucide', () => {
    expect(weathercodeParaIcone(0)).toBe('sun');
    expect(weathercodeParaIcone(3)).toBe('cloud');
    expect(weathercodeParaIcone(61)).toBe('cloud-rain');
    expect(weathercodeParaIcone(95)).toBe('cloud-lightning');
  });
  it('retorna um ícone de fallback para código desconhecido', () => {
    expect(weathercodeParaIcone(999)).toBe('cloud-off');
    expect(weathercodeParaIcone(undefined)).toBe('cloud-off');
  });
});

describe('weathercodeParaTexto', () => {
  it('mapeia códigos conhecidos para texto em português', () => {
    expect(weathercodeParaTexto(0)).toBe('Céu limpo');
    expect(weathercodeParaTexto(65)).toBe('Chuva forte');
  });
  it('retorna texto de fallback para código desconhecido', () => {
    expect(weathercodeParaTexto(999)).toBe('Condição desconhecida');
  });
});

describe('buscarClima', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.resetAllMocks();
  });
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('retorna ok:false sem rede quando o fetch rejeita', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('offline'));
    const resultado = await buscarClima(-21.21, -50.65);
    expect(resultado.ok).toBe(false);
    expect(resultado.motivo).toBe('rede');
  });

  it('retorna motivo timeout quando o AbortSignal expira', async () => {
    global.fetch = vi.fn().mockRejectedValue(Object.assign(new Error('timeout'), { name: 'TimeoutError' }));
    const resultado = await buscarClima(-21.22, -50.66);
    expect(resultado.ok).toBe(false);
    expect(resultado.motivo).toBe('timeout');
  });

  it('retorna ok:false quando a resposta HTTP não é ok', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false });
    const resultado = await buscarClima(-21.23, -50.67);
    expect(resultado.ok).toBe(false);
    expect(resultado.motivo).toBe('indisponivel');
  });

  it('retorna ok:false quando o JSON não tem o formato esperado', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    const resultado = await buscarClima(-21.24, -50.68);
    expect(resultado.ok).toBe(false);
    expect(resultado.motivo).toBe('invalido');
  });

  it('retorna motivo invalido quando o JSON vem malformado (res.json() rejeita)', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.reject(new SyntaxError('bad json')) });
    const resultado = await buscarClima(-21.25, -50.69);
    expect(resultado.ok).toBe(false);
    expect(resultado.motivo).toBe('invalido');
  });

  it('retorna ok:false para coordenadas inválidas sem chamar fetch', async () => {
    global.fetch = vi.fn();
    const resultado = await buscarClima(NaN, undefined);
    expect(resultado.ok).toBe(false);
    expect(resultado.motivo).toBe('sem-coordenadas');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('monta atual e dias a partir de uma resposta válida', async () => {
    const body = {
      current: { temperature_2m: 26.3, weather_code: 3 },
      daily: {
        time: ['2026-11-07', '2026-11-08'],
        temperature_2m_max: [36.8, 28.2],
        temperature_2m_min: [23.3, 18.8],
        weather_code: [96, 95],
      },
    };
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => body });
    const resultado = await buscarClima(-21.25, -50.69);
    expect(resultado.ok).toBe(true);
    expect(resultado.dados.atual).toEqual({ temperatura: 26.3, codigo: 3 });
    expect(resultado.dados.dias).toEqual([
      { data: '2026-11-07', max: 36.8, min: 23.3, codigo: 96 },
      { data: '2026-11-08', max: 28.2, min: 18.8, codigo: 95 },
    ]);
    expect(resultado.dados.fonte).toContain('Open-Meteo');
  });

  it('usa cache em memória para a mesma coordenada (não chama fetch de novo)', async () => {
    const body = {
      current: { temperature_2m: 20, weather_code: 0 },
      daily: { time: ['2026-11-07'], temperature_2m_max: [25], temperature_2m_min: [15], weather_code: [0] },
    };
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => body });
    await buscarClima(-10.5, -40.5);
    await buscarClima(-10.5, -40.5);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
