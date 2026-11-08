// Pulso Urbano — preferencias.js
// Leitura/escrita de preferências persistidas (tema, região) e do parâmetro de URL
// ?municipio=. Nunca lança: localStorage pode estar indisponível (navegação privada,
// política do navegador) ou conter um valor corrompido — os dois casos caem em null,
// e quem chama decide o padrão. Todo erro tratado é logado com console.warn.
//
// `storage`/`search` são parâmetros com default pra window.localStorage/location.search
// em produção, e injetáveis nos testes (sem precisar de jsdom nem localStorage real).

export const CHAVE_TEMA = 'pulso-urbano-tema';
export const CHAVE_REGIAO = 'pulso-urbano-regiao';

function storagePadrao() {
  // A propriedade localStorage pode lançar SecurityError antes de qualquer getItem
  // (iframes restritos, páginas locais e políticas de privacidade do navegador).
  try { return typeof window !== 'undefined' ? window.localStorage : undefined; }
  catch { return undefined; }
}

export function lerTemaSalvo(storage = storagePadrao()) {
  try {
    const salvo = storage?.getItem(CHAVE_TEMA);
    return salvo === 'dark' || salvo === 'light' ? salvo : null;
  } catch (erro) {
    console.warn('[preferencias] não foi possível ler o tema salvo (armazenamento indisponível)', erro);
    return null;
  }
}

export function salvarTema(modo, storage = storagePadrao()) {
  try {
    storage?.setItem(CHAVE_TEMA, modo);
    return true;
  } catch (erro) {
    console.warn('[preferencias] não foi possível salvar o tema (armazenamento indisponível)', erro);
    return false;
  }
}

// { ibge, nome, uf } ou null (nunca salvo, armazenamento indisponível, ou JSON corrompido).
export function lerRegiaoSalva(storage = storagePadrao()) {
  try {
    const bruto = storage?.getItem(CHAVE_REGIAO);
    if (!bruto) return null;
    const obj = JSON.parse(bruto);
    if (!obj || typeof obj !== 'object' || typeof obj.ibge !== 'string' || !obj.ibge) return null;
    return obj;
  } catch (erro) {
    console.warn('[preferencias] região salva em localStorage está corrompida — ignorando', erro);
    return null;
  }
}

export function salvarRegiao(regiao, storage = storagePadrao()) {
  try {
    storage?.setItem(CHAVE_REGIAO, JSON.stringify({ ibge: regiao.ibge, nome: regiao.nome, uf: regiao.uf }));
    return true;
  } catch (erro) {
    console.warn('[preferencias] não foi possível salvar a região (armazenamento indisponível)', erro);
    return false;
  }
}

function searchPadrao() {
  return typeof location === 'undefined' ? '' : location.search;
}

// Lê ?municipio=<ibge> da URL. Só aceita dígitos — qualquer outra coisa (string
// vazia, texto, código malicioso) volta null, e quem chama usa o padrão.
export function lerIbgeDaURL(search = searchPadrao()) {
  try {
    const ibge = new URLSearchParams(search).get('municipio');
    return ibge && /^\d+$/.test(ibge) ? ibge : null;
  } catch (erro) {
    console.warn('[preferencias] não foi possível ler parâmetros da URL', erro);
    return null;
  }
}
