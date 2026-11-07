// Carregamento dos dados estáticos gerados em data/ (ver scripts/gerar-simulado.js
// e o contrato em CLAUDE.md). Sempre com timeout e tratamento de erro — nunca lança,
// retorna { ok, dados } ou { ok:false, motivo }.

const TIMEOUT_MS = 8000;

function motivoDoErro(erro) {
  return erro?.name === 'TimeoutError' || erro?.name === 'AbortError' ? 'timeout' : 'rede';
}

export async function carregarIndice() {
  try {
    const res = await fetch('data/indice.json', { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) return { ok: false, motivo: 'indisponivel' };
    const dados = await res.json();
    if (!Array.isArray(dados)) return { ok: false, motivo: 'invalido' };
    return { ok: true, dados };
  } catch (erro) {
    return { ok: false, motivo: motivoDoErro(erro) };
  }
}

export async function carregarMunicipio(ibge) {
  if (!ibge) return { ok: false, motivo: 'sem-ibge' };
  try {
    const res = await fetch(`data/municipios/${encodeURIComponent(ibge)}.json`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (res.status === 404) return { ok: false, motivo: 'sem-dados' };
    if (!res.ok) return { ok: false, motivo: 'indisponivel' };
    const dados = await res.json();
    if (!dados || typeof dados !== 'object') return { ok: false, motivo: 'invalido' };
    return { ok: true, dados };
  } catch (erro) {
    return { ok: false, motivo: motivoDoErro(erro) };
  }
}
