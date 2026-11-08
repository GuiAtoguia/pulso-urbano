// Verificação offline do índice e dos JSONs de municípios (sem dependências).
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { validarMunicipio } from '../js/data.js';
import { topVias, buildWeekPath, buildLegendaPontos } from '../js/calc.js';

const indice = JSON.parse(await readFile(new URL('../data/indice.json', import.meta.url),'utf-8'));
if (!Array.isArray(indice) || indice.length !== 43) throw new Error(`Esperados 43 municípios no índice, vieram ${indice?.length}`);
const codigo = new Set();
for (const info of indice) {
  const id=String(info.ibge);
  if (codigo.has(id)) throw new Error(`Código IBGE repetido: ${id}`);
  codigo.add(id);
  const path=new URL(`../data/municipios/${id}.json`,import.meta.url);
  if (!existsSync(path)) throw new Error(`JSON não encontrado para ${info.nome}`);
  const dado=JSON.parse(await readFile(path,'utf-8'));
  if (!validarMunicipio(dado)) throw new Error(`JSON inválido: ${id}`);
  if (dado.nome !== info.nome || String(dado.ibge) !== id) throw new Error(`Índice divergente: ${id}`);
  if (!Number.isFinite(info.lat) || !Number.isFinite(info.lon)) throw new Error(`Coordenada ausente: ${id}`);
  if (dado.porHora.length !== 9 || dado.porDia.length !== 7) throw new Error(`Eixos inconsistentes: ${id}`);
  if (dado.totalUltimas2Semanas > dado.totalPeriodoCompleto) throw new Error(`Quinzena maior que histórico: ${id}`);
  if (topVias(dado.ranking.itens,3).length > 3) throw new Error(`Ranking inválido: ${id}`);
  if (buildWeekPath(dado.porDia).points.length !== 7) throw new Error(`Curva inválida: ${id}`);
  if (dado.pontos.length && buildLegendaPontos(dado.pontos).length !== 3) throw new Error(`Legenda inválida: ${id}`);
}
console.log(`OK: ${indice.length} municípios, contratos e eixos validados; nenhuma cidade sem arquivo disponível no seletor.`);
