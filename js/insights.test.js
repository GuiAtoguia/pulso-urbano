import { describe, it, expect } from 'vitest';
import { frasePico, fraseVia, fraseVariacao, gerarInsights } from './insights.js';

function municipio(sobrescritas = {}) {
  return {
    ibge: '3502804',
    nome: 'Araçatuba',
    uf: 'SP',
    simulado: true,
    totalPeriodoCompleto: 298,
    totalUltimas2Semanas: 34,
    amostraSemanalPequena: false,
    pico: '18h',
    variacaoSemanaPct: -4.4,
    ranking: {
      tipo: 'via',
      itens: [
        { nome: 'Avenida Floriano Peixoto', pct: 33 },
        { nome: 'Rua Coronel José Dias', pct: 50 },
        { nome: 'Avenida Governador Mário Covas', pct: 17 },
      ],
    },
    ...sobrescritas,
  };
}

describe('frasePico', () => {
  it('monta a faixa de horário a partir de "pico" (ex.: entre 18h e 20h)', () => {
    const frase = frasePico(municipio({ pico: '18h' }));
    expect(frase).toContain('18h');
    expect(frase).toContain('20h');
  });
  it('trata o fim da faixa virando a meia-noite (22h -> 00h)', () => {
    const frase = frasePico(municipio({ pico: '22h' }));
    expect(frase).toContain('22h');
    expect(frase).toContain('00h');
  });
  it('é determinística: mesmo ibge e mesmo pico sempre geram a mesma frase', () => {
    const d = municipio();
    expect(frasePico(d)).toBe(frasePico(d));
    expect(frasePico(d)).toBe(frasePico(municipio()));
  });
  it('não lança e ainda monta uma frase quando ibge está ausente (sem município pra chavear o índice)', () => {
    expect(() => frasePico(municipio({ ibge: undefined }))).not.toThrow();
    expect(frasePico(municipio({ ibge: undefined }))).toMatch(/18h|20h/);
  });
  it('varia a frase entre municípios diferentes (cobre as 4 variações)', () => {
    const frases = new Set(
      ['3502804', '3550308', '3509502', '3501608', '3505708', '3503208', '3515103', '3522208'].map(ibge =>
        frasePico(municipio({ ibge }))
      )
    );
    expect(frases.size).toBeGreaterThan(1);
  });
  it('retorna um aviso quando "pico" está ausente ou inválido (amostra suficiente)', () => {
    expect(frasePico(municipio({ pico: null }))).toBe('sem horário de pico identificado para este município');
    expect(frasePico(municipio({ pico: 'abc' }))).toBe('sem horário de pico identificado para este município');
  });
  it('retorna o mesmo aviso quando "pico" tem formato válido mas hora fora de 0-23', () => {
    expect(frasePico(municipio({ pico: '25h' }))).toBe('sem horário de pico identificado para este município');
    expect(frasePico(municipio({ pico: '99h' }))).toBe('sem horário de pico identificado para este município');
  });
  it('avisa dados insuficientes quando o total do período completo é menor que 20', () => {
    expect(frasePico(municipio({ totalPeriodoCompleto: 19 }))).toBe('dados insuficientes para identificar horário de pico');
    expect(frasePico(municipio({ totalPeriodoCompleto: 0 }))).toBe('dados insuficientes para identificar horário de pico');
    expect(frasePico({})).toBe('dados insuficientes para identificar horário de pico');
  });
  it('considera 20 como suficiente (limite inclusivo)', () => {
    expect(frasePico(municipio({ totalPeriodoCompleto: 20 }))).not.toBe('dados insuficientes para identificar horário de pico');
  });
});

describe('fraseVia', () => {
  it('cita a via com mais sinistros e o percentual', () => {
    const frase = fraseVia(municipio());
    expect(frase).toContain('Rua Coronel José Dias');
    expect(frase).toContain('50');
  });
  it('é determinística: mesmo ibge sempre gera a mesma frase', () => {
    const d = municipio();
    expect(fraseVia(d)).toBe(fraseVia(d));
    expect(fraseVia(d)).toBe(fraseVia(municipio()));
  });
  it('varia a frase entre municípios diferentes (cobre as 4 variações)', () => {
    const frases = new Set(
      ['3502804', '3550308', '3509502', '3501608', '3505708', '3503208', '3515103', '3522208'].map(ibge =>
        fraseVia(municipio({ ibge }))
      )
    );
    expect(frases.size).toBeGreaterThan(1);
  });
  it('avisa dados insuficientes quando o total do período completo é menor que 20', () => {
    expect(fraseVia(municipio({ totalPeriodoCompleto: 19 }))).toBe('dados insuficientes para ranking');
    expect(fraseVia(municipio({ totalPeriodoCompleto: 0 }))).toBe('dados insuficientes para ranking');
  });
  it('considera 20 como suficiente (limite inclusivo)', () => {
    expect(fraseVia(municipio({ totalPeriodoCompleto: 20 }))).not.toBe('dados insuficientes para ranking');
  });
  it('usa o total do período completo, não o das últimas 2 semanas', () => {
    // poucos sinistros nas últimas 2 semanas, mas ranking confiável no histórico completo
    expect(fraseVia(municipio({ totalPeriodoCompleto: 298, totalUltimas2Semanas: 3 }))).not.toBe('dados insuficientes para ranking');
  });
  it('avisa dados insuficientes quando não há itens de ranking', () => {
    expect(fraseVia(municipio({ ranking: { tipo: 'via', itens: [] } }))).toBe('dados insuficientes para ranking');
    expect(fraseVia(municipio({ ranking: undefined }))).toBe('dados insuficientes para ranking');
  });
});

describe('fraseVariacao', () => {
  it('trata variação positiva', () => {
    const frase = fraseVariacao(municipio({ variacaoSemanaPct: 8.4 }));
    expect(frase).toContain('+8,4%');
  });
  it('trata variação negativa (sem sinal duplicado na frase)', () => {
    const frase = fraseVariacao(municipio({ variacaoSemanaPct: -8.4 }));
    expect(frase).toContain('8,4%');
    expect(frase).not.toContain('-8,4%');
  });
  it('trata variação estável (|valor| < 1)', () => {
    expect(fraseVariacao(municipio({ variacaoSemanaPct: 0 }))).toMatch(/estável|variação relevante|mesmo patamar|mudança significativa/i);
    expect(fraseVariacao(municipio({ variacaoSemanaPct: 0.9 }))).toBe(fraseVariacao(municipio({ variacaoSemanaPct: -0.9 })));
  });
  it('o limiar de estabilidade é exclusivo em 1%', () => {
    const estavel = fraseVariacao(municipio({ variacaoSemanaPct: 0.99 }));
    const positiva = fraseVariacao(municipio({ variacaoSemanaPct: 1 }));
    expect(estavel).not.toBe(positiva);
    expect(positiva).toContain('+1,0%');
  });
  it('é determinística: mesmo ibge e mesma situação sempre geram a mesma frase', () => {
    const d = municipio({ variacaoSemanaPct: 5 });
    expect(fraseVariacao(d)).toBe(fraseVariacao(d));
  });
  it('varia a frase entre municípios diferentes, em cada situação (cobre as 4 variações)', () => {
    const ibges = ['3502804', '3550308', '3509502', '3501608', '3505708', '3503208', '3515103', '3522208'];
    const positivas = new Set(ibges.map(ibge => fraseVariacao(municipio({ ibge, variacaoSemanaPct: 5 }))));
    const negativas = new Set(ibges.map(ibge => fraseVariacao(municipio({ ibge, variacaoSemanaPct: -5 }))));
    const estaveis = new Set(ibges.map(ibge => fraseVariacao(municipio({ ibge, variacaoSemanaPct: 0 }))));
    expect(positivas.size).toBeGreaterThan(1);
    expect(negativas.size).toBeGreaterThan(1);
    expect(estaveis.size).toBeGreaterThan(1);
  });
  it('retorna um aviso quando a variação não é numérica', () => {
    expect(fraseVariacao(municipio({ variacaoSemanaPct: null }))).toBe('sem dados de variação semanal para este município');
    expect(fraseVariacao({})).toBe('sem dados de variação semanal para este município');
  });
  it('retorna o mesmo aviso quando a variação não é null/undefined mas também não é um número (NaN)', () => {
    expect(fraseVariacao(municipio({ variacaoSemanaPct: 'oito' }))).toBe('sem dados de variação semanal para este município');
    expect(fraseVariacao(municipio({ variacaoSemanaPct: NaN }))).toBe('sem dados de variação semanal para este município');
  });
  it('com amostraSemanalPequena, nunca fala em aumento/queda, mesmo se variacaoSemanaPct vier preenchida', () => {
    const frase = fraseVariacao(municipio({ amostraSemanalPequena: true, variacaoSemanaPct: 50 }));
    expect(frase).toBe('amostra pequena para avaliar a variação semanal');
    expect(frase).not.toMatch(/aumento|queda|cresc|redu|alta/i);
  });
});

describe('gerarInsights', () => {
  it('reúne as três frases num objeto {pico, via, variacao}', () => {
    const d = municipio();
    expect(gerarInsights(d)).toEqual({
      pico: frasePico(d),
      via: fraseVia(d),
      variacao: fraseVariacao(d),
    });
  });
});

// Regressão (P13b item 8): com amostra insuficiente, nenhuma das 3 frases pode
// afirmar tendência, pico ou ranking — só avisar que faltam dados.
describe('nenhuma frase afirma tendência/pico/ranking quando a amostra não sustenta', () => {
  const PALAVRAS_DE_AFIRMACAO = /aumento|queda|cresc|redu|alta|concentra o maior|horário de maior|horário de risco|atenção redobrada|lidera/i;

  it('período completo pequeno (<20): nem pico nem via afirmam nada, só avisam dados insuficientes', () => {
    const d = municipio({ totalPeriodoCompleto: 6, totalUltimas2Semanas: 0, amostraSemanalPequena: true });
    const insights = gerarInsights(d);
    expect(insights.pico).toBe('dados insuficientes para identificar horário de pico');
    expect(insights.via).toBe('dados insuficientes para ranking');
    expect(insights.pico).not.toMatch(PALAVRAS_DE_AFIRMACAO);
    expect(insights.via).not.toMatch(PALAVRAS_DE_AFIRMACAO);
  });

  it('amostra semanal pequena (<30 nas 2 últimas semanas): variação não afirma aumento/queda, mesmo com período completo grande', () => {
    const d = municipio({ amostraSemanalPequena: true, variacaoSemanaPct: null });
    const insights = gerarInsights(d);
    expect(insights.variacao).not.toMatch(PALAVRAS_DE_AFIRMACAO);
    // período completo ainda é suficiente, então pico e via continuam afirmando normalmente
    expect(insights.pico).not.toBe('dados insuficientes para identificar horário de pico');
    expect(insights.via).not.toBe('dados insuficientes para ranking');
  });
});
