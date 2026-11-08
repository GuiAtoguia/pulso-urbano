import { describe, it, expect } from 'vitest';
import { criarGuardaSequencia } from './sequencia.js';

describe('criarGuardaSequencia', () => {
  it('a primeira busca iniciada continua válida se nenhuma outra começou', () => {
    const guarda = criarGuardaSequencia();
    const minha = guarda.novo();
    expect(guarda.aindaValido(minha)).toBe(true);
  });

  it('uma busca antiga fica inválida quando uma nova começa depois dela', () => {
    const guarda = criarGuardaSequencia();
    const antiga = guarda.novo();
    const nova = guarda.novo();
    expect(guarda.aindaValido(antiga)).toBe(false);
    expect(guarda.aindaValido(nova)).toBe(true);
  });

  it('simula troca rápida de município: só a última resposta é aplicada', () => {
    const guarda = criarGuardaSequencia();
    const buscaAracatuba = guarda.novo();
    const buscaBirigui = guarda.novo();
    const buscaSaoPaulo = guarda.novo();
    // respostas chegam fora de ordem (Araçatuba demora mais que São Paulo, por ex.)
    expect(guarda.aindaValido(buscaBirigui)).toBe(false);
    expect(guarda.aindaValido(buscaAracatuba)).toBe(false);
    expect(guarda.aindaValido(buscaSaoPaulo)).toBe(true);
  });

  it('duas instâncias de guarda são independentes entre si', () => {
    const guardaA = criarGuardaSequencia();
    const guardaB = criarGuardaSequencia();
    const a1 = guardaA.novo();
    const b1 = guardaB.novo();
    expect(guardaA.aindaValido(a1)).toBe(true);
    expect(guardaB.aindaValido(b1)).toBe(true);
  });
});
