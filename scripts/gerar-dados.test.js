import { describe, it, expect, afterEach } from 'vitest';
import { writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { lerCsv, TIPOS_VALIDOS, calcularTotais } from './gerar-dados.js';

const HEADER = [
  'id_sinistro', 'tipo_registro', 'data_sinistro', 'ano_sinistro', 'mes_sinistro', 'dia_sinistro',
  'hora_sinistro', 'ano_mes_sinistro', 'dia_da_semana', 'turno', 'logradouro', 'numero_logradouro',
  'tipo_via', 'tipo_local', 'latitude', 'longitude', 'cod_ibge', 'municipio', 'regiao_administrativa',
].join(';');

function linha({ tipo, data = '10/03/2024', hora = '14:00', logradouro = 'RUA TESTE', lat = '-21,2', lon = '-50,4', ibge = '3501103', municipio = 'ARACATUBA' }) {
  return [
    '1', tipo, data, data.slice(6), data.slice(3, 5), data.slice(0, 2),
    hora, '', '', '', logradouro, '0', '', '', lat, lon, ibge, municipio, 'ARAÇATUBA',
  ].join(';');
}

const CSV_FIXTURE = [
  HEADER,
  linha({ tipo: 'SINISTRO FATAL' }),
  linha({ tipo: 'SINISTRO NAO FATAL' }),
  linha({ tipo: 'NOTIFICACAO' }),
  linha({ tipo: 'NOTIFICACAO' }),
].join('\n');

describe('gerar-dados: filtro de tipo_registro', () => {
  const caminhoFixture = path.join(os.tmpdir(), `pulso-urbano-fixture-${process.pid}.csv`);

  afterEach(async () => {
    await unlink(caminhoFixture).catch(() => {});
  });

  it('TIPOS_VALIDOS não inclui NOTIFICACAO', () => {
    expect(TIPOS_VALIDOS.has('NOTIFICACAO')).toBe(false);
    expect(TIPOS_VALIDOS.has('SINISTRO FATAL')).toBe(true);
    expect(TIPOS_VALIDOS.has('SINISTRO NAO FATAL')).toBe(true);
  });

  it('lerCsv ignora linhas NOTIFICACAO e conta só fatal/não fatal', async () => {
    await writeFile(caminhoFixture, CSV_FIXTURE, 'latin1');

    const porMunicipio = new Map();
    const estadoGlobal = { maxTs: null };
    await lerCsv(caminhoFixture, porMunicipio, estadoGlobal);

    const registros = porMunicipio.get('3501103').registros;
    expect(registros).toHaveLength(2); // só as 2 linhas fatal/não fatal, as 2 NOTIFICACAO ficam fora
  });
});

describe('calcularTotais', () => {
  // Janela fixa de teste: semana atual 20-26/09/2026 (dom-sáb), anterior 13-19/09/2026.
  const JANELA = {
    inicioSemanaAtualTs: Date.UTC(2026, 8, 20),
    fimSemanaAtualTs: Date.UTC(2026, 8, 26),
    inicioSemanaAnteriorTs: Date.UTC(2026, 8, 13),
    fimSemanaAnteriorTs: Date.UTC(2026, 8, 19),
  };

  function registro(ts) {
    return { ts, hora: 10, logradouroRaw: 'RUA X', lat: null, lon: null };
  }

  it('totalPeriodoCompleto é o total de registros (histórico completo, não só as 2 semanas)', () => {
    const registros = [
      registro(Date.UTC(2022, 0, 1)), registro(Date.UTC(2023, 5, 1)), registro(Date.UTC(2026, 8, 22)),
    ];
    expect(calcularTotais(registros, JANELA).totalPeriodoCompleto).toBe(3);
  });

  it('totalUltimas2Semanas soma a semana atual + a anterior (nunca só a mais recente)', () => {
    const registros = [
      ...Array(18).fill(Date.UTC(2026, 8, 22)), // semana atual
      ...Array(16).fill(Date.UTC(2026, 8, 15)), // semana anterior
    ].map(registro);
    const totais = calcularTotais(registros, JANELA);
    expect(totais.totalUltimas2Semanas).toBe(34);
    expect(totais.amostraSemanalPequena).toBe(false);
  });

  it('amostra pequena (< 30 nas 2 semanas somadas): variacaoSemanaPct null, mesmo com dados em ambas', () => {
    const registros = [
      ...Array(10).fill(Date.UTC(2026, 8, 22)).map(registro),
      ...Array(10).fill(Date.UTC(2026, 8, 15)).map(registro),
    ];
    const totais = calcularTotais(registros, JANELA);
    expect(totais.totalUltimas2Semanas).toBe(20);
    expect(totais.amostraSemanalPequena).toBe(true);
    expect(totais.variacaoSemanaPct).toBeNull();
  });

  it('amostra suficiente (>= 30): calcula a variação percentual normalmente', () => {
    const registros = [
      ...Array(20).fill(Date.UTC(2026, 8, 22)).map(registro), // atual
      ...Array(16).fill(Date.UTC(2026, 8, 15)).map(registro), // anterior
    ];
    const totais = calcularTotais(registros, JANELA);
    expect(totais.amostraSemanalPequena).toBe(false);
    expect(totais.variacaoSemanaPct).toBe(25); // (20-16)/16 * 100
  });

  it('30 sinistros nas 2 semanas é o limite suficiente (inclusivo)', () => {
    const registros = [
      ...Array(15).fill(Date.UTC(2026, 8, 22)).map(registro),
      ...Array(15).fill(Date.UTC(2026, 8, 15)).map(registro),
    ];
    expect(calcularTotais(registros, JANELA).amostraSemanalPequena).toBe(false);
  });
});
