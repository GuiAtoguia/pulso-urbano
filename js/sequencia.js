// Pulso Urbano — sequencia.js
// Guarda de sequência: evita que uma resposta atrasada (de uma busca antiga, já
// superada por uma mais nova) seja aplicada na tela. Puro, sem fetch/DOM — usado
// por carregarDadosDoMunicipio, carregarClima, selectCity e selectState em app.js.
//
// Uso:
//   const guarda = criarGuardaSequencia();
//   const minha = guarda.novo();      // ao iniciar uma busca
//   ...await fetch...
//   if (!guarda.aindaValido(minha)) return; // uma busca mais nova já começou — ignora

export function criarGuardaSequencia() {
  let atual = 0;
  return {
    novo: () => ++atual,
    aindaValido: esperado => esperado === atual,
  };
}
