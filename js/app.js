// Pulso Urbano — app.js
// Widgets da Grade (stats, intensidade por horário, variação, vias em destaque)
// são alimentados por data/municipios/<ibge>.json (ver js/data.js e CLAUDE.md).
// Clima e visão geral ainda não estão ligados a dados reais (fora do escopo desta etapa).

import { scaleHeat, formatVariacaoPct, topVias, buildWeekPath, raioPonto, buildLegendaPontos, classificarPonto, CORES_PONTOS } from './calc.js';
import { carregarMunicipio } from './data.js';
import { gerarInsights } from './insights.js';
import { buscarClima, weathercodeParaIcone, weathercodeParaTexto } from './clima.js';

const escapeHTML = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const $ = s => document.querySelector(s);

const state = { mode: document.documentElement.dataset.mode || 'light' };
const region = { name: 'Araçatuba', uf: 'SP', ibge: '3502804', lat: -21.2076, lon: -50.4401, resolving: false };
let geocodeSequence = 0;

// status: 'carregando' | 'ok' | 'sem-dados' | 'erro'
const municipioData = { status: 'carregando', dados: null };

// status: 'carregando' | 'ok' | 'erro'
const climaData = { status: 'carregando', dados: null };
let climaSequence = 0;
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function topHeader() {
  return `<header class="pu-header">
    <div class="pu-header-brand"><div class="pu-header-mark"><i data-lucide="activity"></i></div><div><strong>Pulso <em>Urbano</em></strong><small>Observatório de mobilidade</small></div></div>
    <nav class="pu-navigation" aria-label="Navegação"><span class="pu-nav-current"><i data-lucide="map"></i>Mapa</span><span title="Em breve"><i data-lucide="book-open-text"></i>Fontes</span></nav>
    <div class="pu-header-tools"><button type="button" class="pu-location" data-open-location aria-haspopup="dialog" aria-label="Selecionar estado e cidade"><i data-lucide="map-pin"></i><span class="location-name">${escapeHTML(region.name)}, ${escapeHTML(region.uf)}</span><i data-lucide="chevron-down" class="city-chevron"></i></button><button type="button" class="pu-round-icon demo-theme-toggle" data-demo-theme aria-label="Alternar tema claro e escuro" title="Alternar tema"><i data-lucide="${state.mode === 'dark' ? 'sun' : 'moon'}"></i></button></div>
  </header>`;
}

function demoFooter() {
  return `<footer class="pu-footer"><div class="pu-footer-primary"><div class="pu-foot-links"><span><i data-lucide="database"></i>Dados abertos</span><span><i data-lucide="shield-check"></i>Metodologia</span><span><i data-lucide="accessibility"></i>Acessibilidade</span><span><i data-lucide="info"></i>Sobre o projeto</span></div></div><div class="pu-footer-secondary"><span><i data-lucide="calendar-days"></i>2026 · Ideathon Fatec</span><span><i data-lucide="map"></i>Pesquisa territorial · Interface demonstrativa</span></div></footer>`;
}

// O selo "Simulado" só aparece quando a flag `simulado` do JSON é true — nunca por texto fixo.
function sectionTitle(title, description = '', simulado = false) {
  const [first, ...rest] = title.split(' ');
  const selo = simulado ? `<span class="pu-section-pill is-simulado" title="Estes números vêm de um conjunto de dados simulado"><i data-lucide="flask-conical"></i>Simulado</span>` : '';
  return `<div class="pu-section-label"><div><div class="overline">EXPLORAR TERRITÓRIO</div><h2><span class="pu-title-accent">${first}</span> ${rest.join(' ')}</h2>${description ? `<p>${description}</p>` : ''}</div><span class="pu-section-pill"><i data-lucide="calendar-days"></i>01–07 nov 2026</span>${selo}</div>`;
}

function widget(label, icon, content, subtype = '') {
  const [first, ...rest] = label.split(' ');
  return `<article class="pu-widget ${subtype}"><div class="pu-widget-head"><span><span class="pu-widget-mark"><i data-lucide="${icon}"></i></span><strong><em>${first}</em> ${rest.join(' ')}</strong></span><i data-lucide="ellipsis"></i></div>${content}</article>`;
}

function mensagemSemDados() {
  const texto = municipioData.status === 'carregando' ? 'carregando dados…' : 'sem dados para este município';
  return `<p class="pu-widget-foot" style="margin-top:0;padding-top:0;border-top:0">${texto}</p>`;
}

function statsWidget(dados) {
  if (!dados) return `<div class="pu-stats"><div class="pu-stat" style="grid-column:1/-1"><div><i data-lucide="circle-off"></i><span>Sinistros</span></div><strong>—</strong><small>${municipioData.status === 'carregando' ? 'carregando dados…' : 'sem dados para este município'}</small></div></div>`;
  const viasMapeadas = dados.ranking?.itens?.length ?? 0;
  return `<div class="pu-stats">
    <div class="pu-stat"><div><i data-lucide="map-pinned"></i><span>Total</span></div><strong>${Number.isFinite(dados.total) ? dados.total : '—'}</strong><small>sinistros no período</small></div>
    <div class="pu-stat"><div><i data-lucide="clock-4"></i><span>Pico</span></div><strong>${escapeHTML(dados.pico ?? '—')}</strong><small>horário de maior concentração</small></div>
    <div class="pu-stat"><div><i data-lucide="route"></i><span>Vias</span></div><strong>${viasMapeadas}</strong><small>mapeadas no ranking</small></div>
  </div>`;
}

function heatWidget(dados) {
  if (!dados) return widget('Intensidade por horário', 'waves', mensagemSemDados(), 'pu-heat-widget');
  const porHora = Array.isArray(dados.porHora) ? dados.porHora : [];
  const max = Math.max(...porHora, 1);
  const tiles = porHora.map(v => `<div class="pu-soft-tile" style="--heat:${scaleHeat(v, max)}"><span></span></div>`).join('');
  return widget('Intensidade por horário', 'waves', `<div class="pu-heat-intro"><strong>${escapeHTML(dados.pico ?? '—')}</strong><span>horário de maior atividade</span></div><div class="pu-soft-heat">${tiles}</div><div class="pu-heat-labels"><span>06h</span><span>12h</span><span>18h</span><span>23h</span></div>`, 'pu-heat-widget');
}

function trendWidget(dados) {
  if (!dados) return widget('Variação na semana', 'chart-spline', mensagemSemDados(), 'pu-trend-widget');
  const porDia = Array.isArray(dados.porDia) ? dados.porDia : [];
  const { line, area, points } = buildWeekPath(porDia);
  const ultimo = points[points.length - 1];
  const ponteiro = ultimo ? `<circle cx="${ultimo[0]}" cy="${ultimo[1]}" r="5" fill="var(--accent)" stroke="var(--surface)" stroke-width="3"/>` : '';
  return widget('Variação na semana', 'chart-spline', `<div class="pu-chart-value"><strong>${formatVariacaoPct(dados.variacaoSemanaPct)}</strong><span>em relação à semana anterior</span></div><svg class="pu-smooth-chart" viewBox="0 0 480 150" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="softFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--accent)" stop-opacity=".27"/><stop offset="100%" stop-color="var(--accent)" stop-opacity=".025"/></linearGradient></defs><path class="pu-chart-grid" d="M0 35H480 M0 82H480 M0 130H480"/><path class="pu-chart-fill" d="${area}"/><path class="pu-chart-stroke" d="${line}"/>${ponteiro}</svg><div class="pu-week-labels"><span>Dom</span><span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span></div>`, 'pu-trend-widget');
}

function viasWidget(dados) {
  if (!dados) return widget('Vias em destaque', 'list-filter', mensagemSemDados(), 'pu-list-widget');
  const itens = topVias(dados.ranking?.itens, 3);
  if (!itens.length) return widget('Vias em destaque', 'list-filter', mensagemSemDados(), 'pu-list-widget');
  const linhas = itens.map((via, i) => `<div class="pu-area"><span class="pu-area-num">0${i + 1}</span><div><b>${escapeHTML(via.nome)}</b><div class="pu-area-track"><i style="width:${via.pct}%"></i></div></div></div>`).join('');
  return widget('Vias em destaque', 'list-filter', `<div class="pu-areas">${linhas}</div><div class="pu-widget-foot">Ranking por via · sem coluna de bairro na fonte</div>`, 'pu-list-widget');
}

function softWeather() {
  if (climaData.status === 'carregando') {
    return widget('Clima da região', 'cloud-sun', `<div class="pu-weather-main"><div><strong>—</strong><span>carregando clima…</span></div><div class="pu-weather-icon"><i data-lucide="loader-circle"></i></div></div>`, 'pu-weather-widget');
  }
  const dados = climaData.dados;
  if (climaData.status !== 'ok' || !dados) {
    return widget('Clima da região', 'cloud-sun', `<div class="pu-weather-main"><div><strong>—</strong><span>clima indisponível</span></div><div class="pu-weather-icon"><i data-lucide="cloud-off"></i></div></div>`, 'pu-weather-widget');
  }
  const atual = dados.atual;
  const icone = weathercodeParaIcone(atual.codigo);
  const texto = weathercodeParaTexto(atual.codigo);
  const proximos = dados.dias.slice(1, 5).map(dia => {
    const data = new Date(`${dia.data}T00:00:00`);
    const label = DIAS_SEMANA[data.getDay()] ?? '—';
    return `<span><b>${label}</b>${Number.isFinite(dia.max) ? Math.round(dia.max) + '°' : '—'}</span>`;
  }).join('');
  return widget('Clima da região', icone, `<div class="pu-weather-main"><div><strong>${Number.isFinite(atual.temperatura) ? Math.round(atual.temperatura) + '°' : '—'}</strong><span>${escapeHTML(texto)}</span></div><div class="pu-weather-icon"><i data-lucide="${icone}"></i></div></div><div class="pu-weather-days">${proximos}</div><div class="pu-widget-foot">Fonte: ${escapeHTML(dados.fonte)}</div>`, 'pu-weather-widget');
}

function overviewWidget(dados) {
  const insights = dados ? gerarInsights(dados) : null;
  const semDadosTexto = municipioData.status === 'carregando' ? 'carregando dados…' : 'sem dados para este município';
  const resumo = dados
    ? `${Number.isFinite(dados.total) ? dados.total : '—'} sinistros registrados no período de ${escapeHTML(dados.periodo ?? '—')}, segundo ${escapeHTML(dados.fonte ?? 'fonte não informada')}.`
    : semDadosTexto;
  return widget('Visão geral', 'notebook-tabs', `
    <div class="pu-overview-layout">
      <div class="pu-overview-main">
        <div class="pu-overview-eyebrow"><i data-lucide="sparkles"></i> Síntese da região</div>
        <h3 class="pu-overview-title">${escapeHTML(region.name)} em perspectiva</h3>
        <p class="pu-overview-desc">${resumo}</p>
      </div>
      <div class="pu-overview-side">
        <div><i data-lucide="clock-3"></i><span>${insights ? escapeHTML(insights.pico) : escapeHTML(semDadosTexto)}</span></div>
        <div><i data-lucide="route"></i><span>${insights ? escapeHTML(insights.via) : escapeHTML(semDadosTexto)}</span></div>
        <div><i data-lucide="chart-spline"></i><span>${insights ? escapeHTML(insights.variacao) : escapeHTML(semDadosTexto)}</span></div>
      </div>
    </div>`, 'pu-overview-widget');
}

// Legenda (tamanho + cor) dos pontos do mapa — mesma função pura usada para colorir os
// circleMarker em desenharPontos(), para nunca divergir do que é mostrado no mapa.
function legendaMapaHTML(dados) {
  const legenda = buildLegendaPontos(dados?.pontos);
  if (!legenda.length) return '';
  const linhas = legenda.map(f => {
    const cor = CORES_PONTOS[f.chave] ?? CORES_PONTOS.baixo;
    const tamanho = Math.max(10, f.raio * 1.5);
    return `<li><span class="pu-legenda-marca" style="width:${tamanho}px;height:${tamanho}px;background:${cor.fill};border-color:${cor.stroke}"></span><span>${f.rotulo} sinistro${f.max === 1 ? '' : 's'}</span></li>`;
  }).join('');
  return `<ul class="map-legend" aria-label="Legenda: tamanho e cor dos pontos indicam o número de sinistros">${linhas}</ul>`;
}

function mapFilled(dados) {
  // O mapa em si (Leaflet) é montado por montarMapa() depois do render — aqui só
  // preparamos o invólucro e, quando as coordenadas ainda não existem, o aviso.
  if (region.resolving) return `<div class="map-frame map-status"><div class="location-loading"><i data-lucide="loader-circle"></i><strong>Localizando ${escapeHTML(region.name)}...</strong><small>Consultando coordenadas do município.</small></div></div>`;
  if (!Number.isFinite(region.lat) || !Number.isFinite(region.lon)) return `<div class="map-frame map-status"><div class="location-loading"><i data-lucide="map-pin-off"></i><strong>Mapa ainda não disponível</strong><small>Não foi possível encontrar as coordenadas de ${escapeHTML(region.name)}. Selecione outra cidade.</small></div></div>`;
  const out = 'https://www.openstreetmap.org/#map=13/' + region.lat.toFixed(5) + '/' + region.lon.toFixed(5);
  return `<div class="map-frame">
    <div class="pu-leaflet-slot" id="leafletSlot"></div>
    <div class="map-quiet-head"><span><i data-lucide="map-pin"></i> ${escapeHTML(region.name)}, ${escapeHTML(region.uf)}</span></div>
    <div class="map-quiet-tools"><a class="map-open-external" title="Abrir mapa no OpenStreetMap" aria-label="Abrir mapa no OpenStreetMap" href="${out}" target="_blank" rel="noopener noreferrer"><i data-lucide="external-link"></i></a></div>
    <div class="map-tile-warning" id="mapTileWarning" role="status" hidden><i data-lucide="triangle-alert"></i>Tiles do mapa indisponíveis no momento</div>
    ${legendaMapaHTML(dados)}
    <span class="map-attribution">© OpenStreetMap contributors</span>
  </div>`;
}

// --- Leaflet: uma única instância reaproveitada entre re-renders -----------------
// O #app inteiro é substituído a cada render(), então o container do mapa é
// recriado como string a cada vez. Para não recriar o mapa (e não duplicá-lo),
// mantemos o DOM do Leaflet num elemento próprio e o reinserimos no novo slot.
const leafletEl = document.createElement('div');
leafletEl.className = 'pu-leaflet-map';
let leafletMap = null;
let leafletTiles = null;
let leafletPontos = null;
let tileAvisoAtivo = false;
let ultimoCentro = null;

function desenharPontos() {
  if (!leafletPontos) return;
  leafletPontos.clearLayers();
  const dados = municipioData.status === 'ok' ? municipioData.dados : null;
  const pontos = Array.isArray(dados?.pontos)
    ? dados.pontos.filter(p => Number.isFinite(p?.lat) && Number.isFinite(p?.lon) && Number.isFinite(p?.n) && p.n > 0)
    : [];
  if (!pontos.length) return; // sem pontos: mostra só o mapa
  const maxN = Math.max(...pontos.map(p => p.n));
  const legenda = buildLegendaPontos(pontos);
  for (const ponto of pontos) {
    const faixa = classificarPonto(ponto.n, legenda);
    const cor = CORES_PONTOS[faixa?.chave] ?? CORES_PONTOS.baixo;
    window.L.circleMarker([ponto.lat, ponto.lon], {
      radius: raioPonto(ponto.n, maxN),
      color: cor.stroke,
      weight: 1.5,
      fillColor: cor.fill,
      fillOpacity: 0.85,
    })
      .bindPopup(`<strong>${ponto.n}</strong> sinistro${ponto.n === 1 ? '' : 's'} registrado${ponto.n === 1 ? '' : 's'} nesta área`)
      .addTo(leafletPontos);
  }
}

// Monta o Leaflet no slot atual (se houver) e atualiza centro/pontos sem duplicar a instância.
function montarMapa() {
  const slot = $('#leafletSlot');
  if (!slot || !window.L) return; // sem coordenadas ainda, ou Leaflet não carregou
  slot.appendChild(leafletEl); // reparenta o mesmo nó; remove automaticamente do local anterior
  if (!leafletMap) {
    leafletMap = window.L.map(leafletEl, { attributionControl: false }).setView([region.lat, region.lon], 13);
    leafletTiles = window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      minZoom: 3,
    }).addTo(leafletMap);
    leafletTiles.on('tileerror', () => {
      tileAvisoAtivo = true;
      const aviso = $('#mapTileWarning');
      if (aviso) aviso.hidden = false;
    });
    leafletPontos = window.L.layerGroup().addTo(leafletMap);
    ultimoCentro = `${region.lat},${region.lon}`;
  } else {
    const centroAtual = `${region.lat},${region.lon}`;
    if (centroAtual !== ultimoCentro) {
      leafletMap.setView([region.lat, region.lon], 13);
      ultimoCentro = centroAtual;
    }
  }
  leafletEl.setAttribute('aria-label', `Mapa de ${region.name}, ${region.uf}. Use as setas para mover e + ou - para dar zoom.`);
  const aviso = $('#mapTileWarning');
  if (aviso) aviso.hidden = !tileAvisoAtivo;
  desenharPontos();
  requestAnimationFrame(() => leafletMap.invalidateSize());
}

window.addEventListener('resize', () => { if (leafletMap) leafletMap.invalidateSize(); });

function renderAppContent() {
  const dados = municipioData.status === 'ok' ? municipioData.dados : null;
  const simulado = Boolean(dados?.simulado);
  return `<div class="pu-demo is-filled">${topHeader()}<section class="pu-demo-body">
    <div class="pu-content-title">${sectionTitle('Grade de observação', 'Indicadores, cartografia e contexto', simulado)}</div>
    <div class="pu-layout pu-grid">
      <div class="pu-structure pu-grid-structure">
        <div class="pu-grid-stats">${statsWidget(dados)}</div>
        <div class="pu-grid-map">${mapFilled(dados)}</div>
        <div class="pu-grid-side">${viasWidget(dados)}${softWeather()}</div>
        <div class="pu-grid-bottom">${trendWidget(dados)}${heatWidget(dados)}</div>
      </div>
    </div>
    <div class="pu-overview-last">${overviewWidget(dados)}</div>
  </section>${demoFooter()}</div>`;
}

function render() {
  $('#app').innerHTML = renderAppContent();
  document.documentElement.dataset.mode = state.mode;
  if (window.lucide?.createIcons) window.lucide.createIcons();
  montarMapa();
}

// Busca os dados do município atual (region.ibge) e atualiza os widgets quando chegarem.
async function carregarDadosDoMunicipio() {
  const ibgeAlvo = region.ibge;
  municipioData.status = 'carregando';
  municipioData.dados = null;
  render();
  const resultado = await carregarMunicipio(ibgeAlvo);
  if (region.ibge !== ibgeAlvo) return; // região trocada enquanto buscava
  if (resultado.ok) {
    municipioData.status = 'ok';
    municipioData.dados = resultado.dados;
  } else if (resultado.motivo === 'sem-dados' || resultado.motivo === 'sem-ibge') {
    municipioData.status = 'sem-dados';
    municipioData.dados = null;
  } else {
    municipioData.status = 'erro';
    municipioData.dados = null;
  }
  render();
}

// Busca o clima para as coordenadas atuais da região (region.lat/lon) e atualiza o widget.
async function carregarClima() {
  const lat = region.lat, lon = region.lon;
  const seq = ++climaSequence;
  climaData.status = 'carregando';
  climaData.dados = null;
  render();
  const resultado = await buscarClima(lat, lon);
  if (seq !== climaSequence) return; // região trocada enquanto buscava
  if (resultado.ok) {
    climaData.status = 'ok';
    climaData.dados = resultado.dados;
  } else {
    climaData.status = 'erro';
    climaData.dados = null;
  }
  render();
}

document.addEventListener('click', e => {
  const theme = e.target.closest('[data-demo-theme]');
  if (theme) { state.mode = state.mode === 'dark' ? 'light' : 'dark'; render(); return; }
});

// Seletor Estado -> Município inspirado no Material You.
// O menu é colocado fora do #app para nunca sofrer recorte pelo overflow do iframe.
const BR_STATES = [['AC', 'Acre'], ['AL', 'Alagoas'], ['AP', 'Amapá'], ['AM', 'Amazonas'], ['BA', 'Bahia'], ['CE', 'Ceará'], ['DF', 'Distrito Federal'], ['ES', 'Espírito Santo'], ['GO', 'Goiás'], ['MA', 'Maranhão'], ['MT', 'Mato Grosso'], ['MS', 'Mato Grosso do Sul'], ['MG', 'Minas Gerais'], ['PA', 'Pará'], ['PB', 'Paraíba'], ['PR', 'Paraná'], ['PE', 'Pernambuco'], ['PI', 'Piauí'], ['RJ', 'Rio de Janeiro'], ['RN', 'Rio Grande do Norte'], ['RS', 'Rio Grande do Sul'], ['RO', 'Rondônia'], ['RR', 'Roraima'], ['SC', 'Santa Catarina'], ['SP', 'São Paulo'], ['SE', 'Sergipe'], ['TO', 'Tocantins']];
// ibge: null quando ainda não temos o código confirmado para a lista instantânea (offline);
// ao buscar municípios do estado pela API do IBGE, o código real vem direto da resposta.
const FALLBACK_CITIES = {
  SP: [{ nome: 'Araçatuba', ibge: '3502804' }, { nome: 'Birigui', ibge: null }, { nome: 'Campinas', ibge: null }, { nome: 'Bauru', ibge: null }, { nome: 'Ribeirão Preto', ibge: null }, { nome: 'São José do Rio Preto', ibge: null }, { nome: 'Santos', ibge: null }, { nome: 'São Paulo', ibge: null }, { nome: 'Sorocaba', ibge: null }],
  RJ: [{ nome: 'Niterói', ibge: null }, { nome: 'Rio de Janeiro', ibge: null }, { nome: 'Petrópolis', ibge: null }],
  MG: [{ nome: 'Belo Horizonte', ibge: null }, { nome: 'Uberlândia', ibge: null }, { nome: 'Juiz de Fora', ibge: null }],
  PR: [{ nome: 'Curitiba', ibge: null }, { nome: 'Londrina', ibge: null }, { nome: 'Maringá', ibge: null }],
  DF: [{ nome: 'Brasília', ibge: null }],
  GO: [{ nome: 'Goiânia', ibge: null }, { nome: 'Anápolis', ibge: null }],
  BA: [{ nome: 'Salvador', ibge: null }, { nome: 'Feira de Santana', ibge: null }],
  SC: [{ nome: 'Florianópolis', ibge: null }, { nome: 'Joinville', ibge: null }],
  RS: [{ nome: 'Porto Alegre', ibge: null }, { nome: 'Caxias do Sul', ibge: null }],
};
const CITY_COORDS = { 'SP|Araçatuba': [-21.2076, -50.4401], 'SP|Birigui': [-21.2881, -50.3395], 'SP|São Paulo': [-23.5505, -46.6333], 'SP|Campinas': [-22.9056, -47.0608], 'RJ|Rio de Janeiro': [-22.9068, -43.1729], 'MG|Belo Horizonte': [-19.9167, -43.9345], 'PR|Curitiba': [-25.4284, -49.2733], 'DF|Brasília': [-15.7939, -47.8828] };
const pick = { open: false, step: 'state', uf: 'SP', stateName: 'São Paulo', cities: [], anchor: null, fetchSeq: 0 };
const DIACRITICS_RE = new RegExp('[' + String.fromCharCode(0x0300) + '-' + String.fromCharCode(0x036f) + ']', 'g');
const norm = t => String(t).normalize('NFD').replace(DIACRITICS_RE, '').toLowerCase();

function locatePicker() {
  const box = $('#regionPicker'); if (!pick.open || !pick.anchor || !pick.anchor.isConnected) { closePicker(); return; }
  const r = pick.anchor.getBoundingClientRect(); const w = Math.min(364, window.innerWidth - 24);
  const belowSpace = window.innerHeight - r.bottom, aboveSpace = r.top;
  const upward = belowSpace < 310 && aboveSpace > belowSpace;
  box.style.width = w + 'px';
  const x = Math.max(12, Math.min(window.innerWidth - w - 12, r.left));
  const y = upward ? Math.max(12, r.top - box.offsetHeight - 10) : Math.min(window.innerHeight - 130, r.bottom + 9);
  box.style.left = x + 'px'; box.style.top = Math.max(12, y) + 'px';
  box.classList.toggle('opens-up', upward);
}
function showPicker(anchor) {
  if (pick.open && pick.anchor === anchor) { closePicker(); return; }
  pick.anchor = anchor; pick.open = true; pick.step = 'state'; pick.uf = region.uf;
  $('#regionPicker').hidden = false;
  $('#regionSearch').value = ''; drawPicker();
  requestAnimationFrame(() => { locatePicker(); $('#regionSearch').focus({ preventScroll: true }); });
}
function closePicker() { pick.open = false; pick.anchor = null; $('#regionPicker').hidden = true; }
function drawPicker() {
  const inCities = pick.step === 'city';
  $('#rpBack').hidden = !inCities;
  $('#rpHeading').textContent = inCities ? pick.stateName : 'Selecionar estado';
  $('#rpSubtitle').textContent = inCities ? 'Agora selecione um município' : 'Escolha seu estado';
  $('#regionSearch').placeholder = inCities ? 'Pesquisar cidade' : 'Pesquisar estado';
  const v = norm($('#regionSearch').value.trim());
  const items = inCities
    ? pick.cities.map(c => ({ value: c.nome, label: c.nome, sub: pick.uf, ibge: c.ibge }))
    : BR_STATES.map(([uf, name]) => ({ value: uf, label: name, sub: uf, ibge: null }));
  const matches = items.filter(item => norm(item.label).includes(v) || norm(item.sub).includes(v)).slice(0, 80);
  $('#rpList').innerHTML = matches.length ? matches.map(item => `<button type="button" class="rp-item" role="option" data-rp-value="${escapeHTML(item.value)}" data-rp-ibge="${escapeHTML(item.ibge ?? '')}"><span class="rp-item-icon"><i data-lucide="${inCities ? 'map-pin' : 'map'}"></i></span><span class="rp-item-copy"><strong>${escapeHTML(item.label)}</strong><small>${inCities ? 'Município' : 'Estado brasileiro'}</small></span><span class="rp-code">${escapeHTML(item.sub)}</span></button>`).join('') : '<div class="rp-empty">Nenhum resultado encontrado.</div>';
  $('#rpFoot').textContent = inCities ? `${items.length} município(s) disponíveis · ${pick.uf}` : 'Selecione um estado para continuar';
  if (window.lucide?.createIcons) window.lucide.createIcons();
  requestAnimationFrame(locatePicker);
}
async function selectState(uf) {
  pick.uf = uf; pick.stateName = BR_STATES.find(x => x[0] === uf)?.[1] || uf;
  pick.step = 'city'; pick.cities = FALLBACK_CITIES[uf] || [];
  $('#regionSearch').value = ''; drawPicker();
  const seq = ++pick.fetchSeq;
  $('#rpFoot').textContent = `Buscando municípios de ${pick.stateName}...`;
  try {
    const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${encodeURIComponent(uf)}/municipios?orderBy=nome`, { signal: AbortSignal.timeout(9000) });
    if (!res.ok) throw new Error('Dados IBGE indisponíveis');
    const body = await res.json();
    if (seq !== pick.fetchSeq || !pick.open || pick.uf !== uf) return;
    pick.cities = body.map(x => ({ nome: x.nome, ibge: x.id != null ? String(x.id) : null })).filter(c => c.nome);
  } catch (e) { if (seq !== pick.fetchSeq) return; pick.cities = FALLBACK_CITIES[uf] || []; }
  if (pick.open && pick.step === 'city' && pick.uf === uf) drawPicker();
}
async function selectCity(name, ibge) {
  const uf = pick.uf, key = uf + '|' + name, seq = ++geocodeSequence;
  region.name = name; region.uf = uf; region.ibge = ibge || null;
  let coord = CITY_COORDS[key];
  region.lat = coord ? coord[0] : null; region.lon = coord ? coord[1] : null;
  region.resolving = !coord;
  closePicker();
  render();
  carregarDadosDoMunicipio();
  if (coord) { carregarClima(); return; }
  try {
    const query = encodeURIComponent(`${name}, ${pick.stateName}, Brasil`);
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${query}`, { signal: AbortSignal.timeout(9000), headers: { 'Accept': 'application/json' } });
    if (!r.ok) throw new Error('Geocodificação falhou');
    const arr = await r.json();
    if (!arr.length) throw new Error('Município não encontrado');
    coord = [Number(arr[0].lat), Number(arr[0].lon)];
  } catch (e) { coord = null; }
  if (seq !== geocodeSequence) return;
  region.lat = coord ? coord[0] : null; region.lon = coord ? coord[1] : null; region.resolving = false; render();
  carregarClima();
}
document.addEventListener('click', e => {
  const pickerBtn = e.target.closest('[data-open-location]');
  if (pickerBtn) { showPicker(pickerBtn); return; }
  const item = e.target.closest('[data-rp-value]');
  if (item) { if (pick.step === 'state') selectState(item.dataset.rpValue); else selectCity(item.dataset.rpValue, item.dataset.rpIbge || null); return; }
  if (pick.open && !e.target.closest('#regionPicker')) closePicker();
});
$('#regionSearch').addEventListener('input', drawPicker);
$('#rpBack').addEventListener('click', () => { pick.step = 'state'; pick.fetchSeq++; $('#regionSearch').value = ''; drawPicker(); $('#regionSearch').focus(); });
$('#rpClose').addEventListener('click', closePicker);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && pick.open) { e.stopPropagation(); closePicker(); } });
window.addEventListener('scroll', () => { if (pick.open) locatePicker(); }, true);
window.addEventListener('resize', () => { if (pick.open) locatePicker(); });

render();
carregarDadosDoMunicipio();
carregarClima();
