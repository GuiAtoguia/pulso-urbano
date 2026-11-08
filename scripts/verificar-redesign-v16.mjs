// Validação offline da v16 (Node.js padrão; sem instalar dependências).
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { validarMunicipio } from '../js/data.js';
import { dataFinalExtrato, obterRecorte } from '../js/recortes.js';
import { montarConteudoFontes } from '../js/fontes.js';

const indice = JSON.parse(await readFile(new URL('../data/indice.json', import.meta.url), 'utf8'));
assert.equal(indice.length, 43, 'Índice deve conter os 43 municípios publicados');
for (const item of indice) {
  assert.equal(item.uf,'SP','Somente municípios de SP estão disponíveis');
  const dados = JSON.parse(await readFile(new URL(`../data/municipios/${item.ibge}.json`, import.meta.url), 'utf8'));
  assert.ok(validarMunicipio(dados), `Contrato inválido: ${item.nome}`);
  const his = obterRecorte(dados, 'historico');
  const q = obterRecorte(dados, 'quinzena');
  const s = obterRecorte(dados, 'semana');
  assert.equal(his.total, dados.totalPeriodoCompleto);
  assert.equal(q.total, dados.totalUltimas2Semanas);
  assert.equal(s.total, dados.porDia.reduce((a,b) => a + b,0));
  assert.ok(s.total <= q.total && q.total <= his.total, `Totais temporais inconsistentes em ${item.nome}`);
  assert.ok(s.selo.startsWith('7 dias') && q.selo.startsWith('14 dias'));
  assert.ok(dataFinalExtrato(dados.periodo) instanceof Date);
  const fontes = montarConteudoFontes(dados);
  assert.equal((fontes.match(/class="fontes-secao pu-method-detail"/g) || []).length,5);
  assert.ok(fontes.includes('Dados de sinistros') && fontes.includes('Infosiga-SP'));
}
const ar = JSON.parse(await readFile(new URL('../data/municipios/3502804.json',import.meta.url)));
assert.deepEqual(['historico','quinzena','semana'].map(k=>obterRecorte(ar,k).total),[5283,34,18]);
assert.equal(obterRecorte(ar, 'semana').periodoLabel,'20–26 set 2026');
assert.equal(obterRecorte(ar, 'quinzena').periodoLabel,'13–26 set 2026');
const app = await readFile(new URL('../js/app.js',import.meta.url),'utf8');
const index = await readFile(new URL('../index.html',import.meta.url),'utf8');
assert.ok(app.includes('event.ctrlKey') && app.includes('leafletMap.setZoomAround('));
assert.ok(app.includes('bindTooltip(') && app.includes('paletaDosPontos()'));
assert.ok(app.includes('Escolher município') && !app.includes('function selectState('));
assert.ok(index.includes('css/material-you-v16.css'));
console.log(`v16 OK · ${indice.length} municípios · recortes históricos, 14 dias e 7 dias validados · metodologia + mapa conferidos.`);
