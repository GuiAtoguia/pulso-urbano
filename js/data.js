// Carregamento dos dados estáticos gerados em data/ (ver scripts/gerar-dados.js
// e o contrato em CLAUDE.md). Sempre com timeout e tratamento de erro — nunca lança,
// retorna { ok, dados } ou { ok:false, motivo }. Todo erro tratado é logado com
// console.warn (contexto: qual requisição, qual motivo) — nunca um catch vazio.

const TIMEOUT_MS = 8000;

function motivoDoErro(erro) {
  return erro?.name === 'TimeoutError' || erro?.name === 'AbortError' ? 'timeout' : 'rede';
}

function numeroFinito(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

function arrayDeNumeros(v) {
  return Array.isArray(v) && v.every(numeroFinito);
}

// Valida o contrato de data/municipios/<ibge>.json (ver CLAUDE.md) antes de confiar
// no JSON. Rejeita campo ausente ou de tipo errado; aceita total 0 e arrays vazios
// (dado válido, só sem ocorrência) — essas duas coisas não são a mesma falha.
// Função pura: não lança, não acessa rede/DOM.
export function validarMunicipio(dados) {
  if (!dados || typeof dados !== 'object') return false;
  if (typeof dados.ibge !== 'string' && typeof dados.ibge !== 'number') return false;
  if (typeof dados.nome !== 'string' || !dados.nome) return false;
  if (typeof dados.uf !== 'string') return false;
  if (typeof dados.simulado !== 'boolean') return false;
  if (!numeroFinito(dados.total)) return false;
  if (!arrayDeNumeros(dados.porHora)) return false;
  if (!arrayDeNumeros(dados.porDia)) return false;
  if (dados.variacaoSemanaPct !== null && !numeroFinito(dados.variacaoSemanaPct)) return false;
  if (dados.pico !== null && typeof dados.pico !== 'string') return false;
  if (!dados.ranking || typeof dados.ranking !== 'object' || !Array.isArray(dados.ranking.itens)) return false;
  if (!dados.ranking.itens.every(item => item && typeof item.nome === 'string' && numeroFinito(item.pct))) return false;
  if (!Array.isArray(dados.pontos)) return false;
  if (!dados.pontos.every(p => p && numeroFinito(p.lat) && numeroFinito(p.lon) && numeroFinito(p.n))) return false;
  return true;
}

async function buscarJSON(url, contexto) {
  let res;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (erro) {
    console.warn(`[data] ${contexto}: falha de rede ao buscar ${url}`, erro);
    return { ok: false, motivo: motivoDoErro(erro) };
  }
  if (res.status === 404) return { ok: false, motivo: 'nao-encontrado' };
  if (!res.ok) {
    console.warn(`[data] ${contexto}: resposta HTTP ${res.status} de ${url}`);
    return { ok: false, motivo: 'indisponivel' };
  }
  try {
    const dados = await res.json();
    return { ok: true, dados };
  } catch (erro) {
    console.warn(`[data] ${contexto}: JSON inválido em ${url}`, erro);
    return { ok: false, motivo: 'invalido' };
  }
}

export async function carregarIndice() {
  const resultado = await buscarJSON('data/indice.json', 'carregarIndice');
  if (!resultado.ok) return resultado.motivo === 'nao-encontrado' ? { ok: false, motivo: 'indisponivel' } : resultado;
  if (!Array.isArray(resultado.dados)) {
    console.warn('[data] carregarIndice: data/indice.json não é um array', resultado.dados);
    return { ok: false, motivo: 'invalido' };
  }
  return resultado;
}

export async function carregarMunicipio(ibge) {
  if (!ibge) return { ok: false, motivo: 'sem-ibge' };
  const resultado = await buscarJSON(`data/municipios/${encodeURIComponent(ibge)}.json`, `carregarMunicipio(${ibge})`);
  if (!resultado.ok) return resultado.motivo === 'nao-encontrado' ? { ok: false, motivo: 'sem-dados' } : resultado;
  if (!validarMunicipio(resultado.dados)) {
    console.warn(`[data] carregarMunicipio(${ibge}): JSON não passou na validação do contrato`, resultado.dados);
    return { ok: false, motivo: 'invalido' };
  }
  return resultado;
}
