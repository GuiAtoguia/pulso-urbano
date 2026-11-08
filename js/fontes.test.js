import { describe, it, expect } from 'vitest';
import { montarConteudoFontes } from './fontes.js';

const municipioBase = {
  ibge: '3502804',
  nome: 'Araçatuba',
  uf: 'SP',
  fonte: 'Infosiga-SP — últimas 2 semanas completas disponíveis no extrato',
  periodo: '20 set 2026 – 26 set 2026',
  simulado: false,
  total: 18,
};

describe('montarConteudoFontes', () => {
  it('nunca lança, mesmo sem dados (município sem arquivo)', () => {
    expect(() => montarConteudoFontes(undefined)).not.toThrow();
    expect(() => montarConteudoFontes(null)).not.toThrow();
  });

  it('município sem arquivo: mostra aviso de que não há dados carregados, mas mantém as seções estáticas', () => {
    const html = montarConteudoFontes(null);
    expect(html).toContain('Nenhum dado está carregado');
    expect(html).toContain('2. Metodologia');
    expect(html).toContain('3. Clima');
    expect(html).toContain('4. Bibliotecas e serviços');
    expect(html).toContain('5. Uso de IA');
  });

  it('mostra periodo e fonte vindos do JSON, sem valores fixos', () => {
    const html = montarConteudoFontes(municipioBase);
    expect(html).toContain('20 set 2026 – 26 set 2026');
    expect(html).toContain('Infosiga-SP — últimas 2 semanas completas disponíveis no extrato');
  });

  it('simulado: true mostra o aviso destacado "Dados simulados"', () => {
    const html = montarConteudoFontes({ ...municipioBase, simulado: true });
    expect(html).toContain('Dados simulados');
    expect(html).toContain('fontes-aviso-simulado');
  });

  it('simulado: false não mostra nenhum aviso de dado simulado', () => {
    const html = montarConteudoFontes({ ...municipioBase, simulado: false });
    expect(html).not.toContain('fontes-aviso-simulado');
    expect(html).not.toContain('Dados simulados');
  });

  it('JSON sem o campo periodo não lança e mostra um traço no lugar', () => {
    const { periodo, ...semPeriodo } = municipioBase;
    const html = montarConteudoFontes(semPeriodo);
    expect(html).toContain('<dt>Período mostrado</dt><dd>—</dd>');
  });

  it('JSON sem o campo fonte não lança e mostra um traço no lugar', () => {
    const { fonte, ...semFonte } = municipioBase;
    const html = montarConteudoFontes(semFonte);
    expect(html).toContain('<dt>Fonte</dt><dd>—</dd>');
  });

  it('escapa caracteres HTML vindos de periodo/fonte (sem XSS)', () => {
    const html = montarConteudoFontes({ ...municipioBase, periodo: '<script>alert(1)</script>', fonte: '<img src=x onerror=alert(1)>' });
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;script&gt;');
  });

  it('sempre inclui as 5 seções, nessa ordem, quando há dados', () => {
    const html = montarConteudoFontes(municipioBase);
    const posicoes = ['1. Dados de sinistros', '2. Metodologia', '3. Clima', '4. Bibliotecas e serviços', '5. Uso de IA'].map(t => html.indexOf(t));
    expect(posicoes.every(p => p >= 0)).toBe(true);
    expect(posicoes).toEqual([...posicoes].sort((a, b) => a - b));
  });

  it('menciona os links exigidos, com rel="noopener noreferrer"', () => {
    const html = montarConteudoFontes(municipioBase);
    expect(html).toContain('href="https://infosiga.detran.sp.gov.br"');
    expect(html).toContain('href="https://open-meteo.com"');
    const links = [...html.matchAll(/<a\s[^>]*>/g)].map(m => m[0]);
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(link).toContain('rel="noopener noreferrer"');
    }
  });

  it('menciona o mínimo de 20 sinistros e a janela de 06h-23h na metodologia', () => {
    const html = montarConteudoFontes(municipioBase);
    expect(html).toContain('20 sinistros');
    expect(html).toContain('06h às 23h');
  });

  it('declara Claude Code na seção de uso de IA', () => {
    const html = montarConteudoFontes(municipioBase);
    expect(html).toContain('Claude Code');
  });
});
