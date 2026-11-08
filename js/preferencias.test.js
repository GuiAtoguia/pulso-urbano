import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { lerTemaSalvo, salvarTema, lerRegiaoSalva, salvarRegiao, lerIbgeDaURL } from './preferencias.js';

function storageFalso(valores = {}) {
  const dados = { ...valores };
  return {
    getItem: vi.fn(chave => (chave in dados ? dados[chave] : null)),
    setItem: vi.fn((chave, valor) => { dados[chave] = valor; }),
    _dados: dados,
  };
}

function storageQueLanca() {
  return {
    getItem: vi.fn(() => { throw new DOMException('acesso negado'); }),
    setItem: vi.fn(() => { throw new DOMException('acesso negado'); }),
  };
}

describe('lerTemaSalvo', () => {
  const originalWarn = console.warn;
  beforeEach(() => { console.warn = vi.fn(); });
  afterEach(() => { console.warn = originalWarn; });

  it('lê "dark" ou "light" salvos', () => {
    expect(lerTemaSalvo(storageFalso({ 'pulso-urbano-tema': 'dark' }))).toBe('dark');
    expect(lerTemaSalvo(storageFalso({ 'pulso-urbano-tema': 'light' }))).toBe('light');
  });

  it('retorna null quando nada foi salvo', () => {
    expect(lerTemaSalvo(storageFalso())).toBeNull();
  });

  it('retorna null (não lança) para um valor corrompido/inesperado', () => {
    expect(lerTemaSalvo(storageFalso({ 'pulso-urbano-tema': 'roxo-com-brilho' }))).toBeNull();
    expect(lerTemaSalvo(storageFalso({ 'pulso-urbano-tema': '{"quebrado"' }))).toBeNull();
  });

  it('retorna null (não lança) quando localStorage lança (navegação privada etc.)', () => {
    expect(() => lerTemaSalvo(storageQueLanca())).not.toThrow();
    expect(lerTemaSalvo(storageQueLanca())).toBeNull();
    expect(console.warn).toHaveBeenCalled();
  });

  it('retorna null quando não há storage nenhum (undefined)', () => {
    expect(lerTemaSalvo(undefined)).toBeNull();
  });
});

describe('salvarTema', () => {
  it('salva e retorna true em caso de sucesso', () => {
    const storage = storageFalso();
    expect(salvarTema('dark', storage)).toBe(true);
    expect(storage._dados['pulso-urbano-tema']).toBe('dark');
  });

  it('não lança e retorna false quando o storage lança', () => {
    const storage = storageQueLanca();
    expect(() => salvarTema('dark', storage)).not.toThrow();
    expect(salvarTema('dark', storage)).toBe(false);
  });
});

describe('lerRegiaoSalva', () => {
  it('lê uma região salva válida', () => {
    const storage = storageFalso({ 'pulso-urbano-regiao': JSON.stringify({ ibge: '3502804', nome: 'Araçatuba', uf: 'SP' }) });
    expect(lerRegiaoSalva(storage)).toEqual({ ibge: '3502804', nome: 'Araçatuba', uf: 'SP' });
  });

  it('retorna null quando nada foi salvo', () => {
    expect(lerRegiaoSalva(storageFalso())).toBeNull();
  });

  it('retorna null (não lança) para JSON corrompido', () => {
    const storage = storageFalso({ 'pulso-urbano-regiao': '{ibge: sem aspas' });
    expect(() => lerRegiaoSalva(storage)).not.toThrow();
    expect(lerRegiaoSalva(storage)).toBeNull();
  });

  it('retorna null para um objeto sem campo ibge', () => {
    const storage = storageFalso({ 'pulso-urbano-regiao': JSON.stringify({ nome: 'Araçatuba' }) });
    expect(lerRegiaoSalva(storage)).toBeNull();
  });

  it('retorna null para um valor que não é objeto (ex.: número, array)', () => {
    expect(lerRegiaoSalva(storageFalso({ 'pulso-urbano-regiao': '42' }))).toBeNull();
    expect(lerRegiaoSalva(storageFalso({ 'pulso-urbano-regiao': '[1,2,3]' }))).toBeNull();
  });

  it('não lança quando o storage lança', () => {
    expect(() => lerRegiaoSalva(storageQueLanca())).not.toThrow();
    expect(lerRegiaoSalva(storageQueLanca())).toBeNull();
  });
});

describe('salvarRegiao', () => {
  it('salva ibge/nome/uf como JSON', () => {
    const storage = storageFalso();
    expect(salvarRegiao({ ibge: '3506508', nome: 'Birigui', uf: 'SP' }, storage)).toBe(true);
    expect(JSON.parse(storage._dados['pulso-urbano-regiao'])).toEqual({ ibge: '3506508', nome: 'Birigui', uf: 'SP' });
  });

  it('não lança quando o storage lança', () => {
    expect(() => salvarRegiao({ ibge: '1', nome: 'X', uf: 'SP' }, storageQueLanca())).not.toThrow();
  });
});

describe('lerIbgeDaURL', () => {
  it('lê um ibge numérico do parâmetro municipio', () => {
    expect(lerIbgeDaURL('?municipio=3502804')).toBe('3502804');
  });

  it('retorna null quando o parâmetro não existe', () => {
    expect(lerIbgeDaURL('?outraCoisa=1')).toBeNull();
    expect(lerIbgeDaURL('')).toBeNull();
  });

  it('rejeita valores não numéricos (proteção básica contra injeção)', () => {
    expect(lerIbgeDaURL('?municipio=<script>alert(1)</script>')).toBeNull();
    expect(lerIbgeDaURL('?municipio=abc123')).toBeNull();
    expect(lerIbgeDaURL('?municipio=')).toBeNull();
  });
});
