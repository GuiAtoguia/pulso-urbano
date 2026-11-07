// Pulso Urbano — app.js (extraído da galeria de wireframes).
// Mantém exatamente o comportamento original do tema e do seletor de região.
// Os widgets da Grade ainda usam números fixos (ver CLAUDE.md > TODO dados reais).

const escapeHTML = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const state = { mode: document.documentElement.dataset.mode || 'light' };
const region = { name: 'Araçatuba', uf: 'SP', lat: -21.2076, lon: -50.4401, resolving: false };
let geocodeSequence = 0;

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

function sectionTitle(title, description = '') {
  const [first, ...rest] = title.split(' ');
  return `<div class="pu-section-label"><div><div class="overline">EXPLORAR TERRITÓRIO</div><h2><span class="pu-title-accent">${first}</span> ${rest.join(' ')}</h2>${description ? `<p>${description}</p>` : ''}</div><span class="pu-section-pill"><i data-lucide="calendar-days"></i>01–07 nov 2026</span></div>`;
}

function widget(label, icon, content, subtype = '') {
  const [first, ...rest] = label.split(' ');
  return `<article class="pu-widget ${subtype}"><div class="pu-widget-head"><span><span class="pu-widget-mark"><i data-lucide="${icon}"></i></span><strong><em>${first}</em> ${rest.join(' ')}</strong></span><i data-lucide="ellipsis"></i></div>${content}</article>`;
}

function softHeat() {
  const levels = [18, 29, 38, 53, 77, 96, 82, 47, 26];
  return widget('Intensidade por horário', 'waves', `<div class="pu-heat-intro"><strong>17h–20h</strong><span>faixa de maior atividade · demonstração</span></div><div class="pu-soft-heat">${levels.map(v => `<div class="pu-soft-tile" style="--heat:${v}"><span></span></div>`).join('')}</div><div class="pu-heat-labels"><span>06h</span><span>12h</span><span>18h</span><span>23h</span></div>`, 'pu-heat-widget');
}

function smoothTrend() {
  return widget('Variação na semana', 'chart-spline', `<div class="pu-chart-value"><strong>+8,4%</strong><span>comparação ilustrativa</span></div><svg class="pu-smooth-chart" viewBox="0 0 480 150" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="softFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--accent)" stop-opacity=".27"/><stop offset="100%" stop-color="var(--accent)" stop-opacity=".025"/></linearGradient></defs><path class="pu-chart-grid" d="M0 35H480 M0 82H480 M0 130H480"/><path class="pu-chart-fill" d="M0 116 C35 110 44 82 85 91 S153 110 188 74 S240 56 275 65 S340 24 367 34 S432 36 480 18 L480 150 L0 150Z"/><path class="pu-chart-stroke" d="M0 116 C35 110 44 82 85 91 S153 110 188 74 S240 56 275 65 S340 24 367 34 S432 36 480 18"/><circle cx="367" cy="34" r="5" fill="var(--accent)" stroke="var(--surface)" stroke-width="3"/></svg><div class="pu-week-labels"><span>Dom</span><span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span></div>`, 'pu-trend-widget');
}

function softWeather() {
  return widget('Clima da região', 'cloud-sun', `<div class="pu-weather-main"><div><strong>32°</strong><span>Parcialmente nublado</span></div><div class="pu-weather-icon"><i data-lucide="cloud-sun"></i></div></div><div class="pu-weather-days"><span><b>Sex</b>35°</span><span><b>Sáb</b>36°</span><span><b>Dom</b>31°</span><span><b>Seg</b>29°</span></div><div class="pu-widget-foot">Exemplo visual • não é medição ao vivo</div>`, 'pu-weather-widget');
}

function softStats() {
  return `<div class="pu-stats"><div class="pu-stat"><div><i data-lucide="map-pinned"></i><span>Áreas</span></div><strong>12</strong><small>pontos ilustrativos</small></div><div class="pu-stat"><div><i data-lucide="clock-4"></i><span>Pico</span></div><strong>18h</strong><small>período de referência</small></div><div class="pu-stat"><div><i data-lucide="route"></i><span>Mobilidade</span></div><strong>Moderada</strong><small>recorte ilustrativo</small></div></div>`;
}

function areaList() {
  return widget('Bairros em destaque', 'list-filter', `<div class="pu-areas">${[['Centro', 72], ['Vila Mendonça', 48], ['Santana', 34]].map(([n, p], i) => `<div class="pu-area"><span class="pu-area-num">0${i + 1}</span><div><b>${n}</b><div class="pu-area-track"><i style="width:${p}%"></i></div></div></div>`).join('')}</div><div class="pu-widget-foot">Valores fictícios para a composição</div>`, 'pu-list-widget');
}

function overviewWidget() {
  return widget('Visão geral', 'notebook-tabs', `
    <div class="pu-overview-layout">
      <div class="pu-overview-main">
        <div class="pu-overview-eyebrow"><i data-lucide="sparkles"></i> Síntese da região</div>
        <h3 class="pu-overview-title">${escapeHTML(region.name)} em perspectiva</h3>
        <p class="pu-overview-desc">Área dedicada ao futuro resumo inteligente: informações principais do território, padrões de deslocamento, mudanças ao longo do dia e observações sobre as condições locais. Os conteúdos apresentados nesta prévia são demonstrativos.</p>
      </div>
      <div class="pu-overview-side">
        <div><i data-lucide="clock-3"></i><span>Maior movimentação ilustrativa <b>17h–20h</b></span></div>
        <div><i data-lucide="cloud-sun"></i><span>Condição de referência <b>Calor e nebulosidade</b></span></div>
        <div><i data-lucide="map-pinned"></i><span>Recorte territorial <b>${escapeHTML(region.name)} · ${escapeHTML(region.uf)}</b></span></div>
      </div>
    </div>`, 'pu-overview-widget');
}

function mapFilled() {
  // O mapa mantém só a indicação da região e o atalho externo.
  if (region.resolving) return `<div class="map-frame map-status"><div class="location-loading"><i data-lucide="loader-circle"></i><strong>Localizando ${escapeHTML(region.name)}...</strong><small>Consultando coordenadas do município.</small></div></div>`;
  if (!Number.isFinite(region.lat) || !Number.isFinite(region.lon)) return `<div class="map-frame map-status"><div class="location-loading"><i data-lucide="map-pin-off"></i><strong>Mapa ainda não disponível</strong><small>Não foi possível encontrar as coordenadas de ${escapeHTML(region.name)}. Selecione outra cidade.</small></div></div>`;
  const lat = region.lat, lon = region.lon;
  const deg = 0.05, bb = [lon - deg, lat - deg, lon + deg, lat + deg];
  const bbox = bb.map(n => n.toFixed(6)).join(',');
  const src = 'https://www.openstreetmap.org/export/embed.html?bbox=' + encodeURIComponent(bbox) + '&layer=mapnik&marker=' + encodeURIComponent(lat + ',' + lon);
  const out = 'https://www.openstreetmap.org/#map=13/' + lat.toFixed(5) + '/' + lon.toFixed(5);
  return `<div class="map-frame">
    <iframe loading="lazy" title="Mapa de ${escapeHTML(region.name)} no OpenStreetMap" referrerpolicy="strict-origin-when-cross-origin" src="${src}"></iframe>
    <div class="map-quiet-head"><span><i data-lucide="map-pin"></i> ${escapeHTML(region.name)}, ${escapeHTML(region.uf)}</span></div>
    <div class="map-quiet-tools"><a class="map-open-external" title="Abrir mapa no OpenStreetMap" aria-label="Abrir mapa no OpenStreetMap" href="${out}" target="_blank" rel="noopener noreferrer"><i data-lucide="external-link"></i></a></div>
    <span class="map-attribution">© OpenStreetMap</span>
  </div>`;
}

function renderAppContent() {
  return `<div class="pu-demo is-filled">${topHeader()}<section class="pu-demo-body">
    <div class="pu-content-title">${sectionTitle('Grade de observação', 'Indicadores, cartografia e contexto')}</div>
    <div class="pu-layout pu-grid">
      <div class="pu-structure pu-grid-structure">
        <div class="pu-grid-stats">${softStats()}</div>
        <div class="pu-grid-map">${mapFilled()}</div>
        <div class="pu-grid-side">${areaList()}${softWeather()}</div>
        <div class="pu-grid-bottom">${smoothTrend()}${softHeat()}</div>
      </div>
    </div>
    <div class="pu-overview-last">${overviewWidget()}</div>
  </section>${demoFooter()}</div>`;
}

function render() {
  $('#app').innerHTML = renderAppContent();
  document.documentElement.dataset.mode = state.mode;
  if (window.lucide?.createIcons) window.lucide.createIcons();
}

document.addEventListener('click', e => {
  const theme = e.target.closest('[data-demo-theme]');
  if (theme) { state.mode = state.mode === 'dark' ? 'light' : 'dark'; render(); return; }
});

// Seletor Estado -> Município inspirado no Material You.
// O menu é colocado fora do #app para nunca sofrer recorte pelo overflow do iframe.
const BR_STATES = [['AC', 'Acre'], ['AL', 'Alagoas'], ['AP', 'Amapá'], ['AM', 'Amazonas'], ['BA', 'Bahia'], ['CE', 'Ceará'], ['DF', 'Distrito Federal'], ['ES', 'Espírito Santo'], ['GO', 'Goiás'], ['MA', 'Maranhão'], ['MT', 'Mato Grosso'], ['MS', 'Mato Grosso do Sul'], ['MG', 'Minas Gerais'], ['PA', 'Pará'], ['PB', 'Paraíba'], ['PR', 'Paraná'], ['PE', 'Pernambuco'], ['PI', 'Piauí'], ['RJ', 'Rio de Janeiro'], ['RN', 'Rio Grande do Norte'], ['RS', 'Rio Grande do Sul'], ['RO', 'Rondônia'], ['RR', 'Roraima'], ['SC', 'Santa Catarina'], ['SP', 'São Paulo'], ['SE', 'Sergipe'], ['TO', 'Tocantins']];
const FALLBACK_CITIES = { SP: ['Araçatuba', 'Birigui', 'Campinas', 'Bauru', 'Ribeirão Preto', 'São José do Rio Preto', 'Santos', 'São Paulo', 'Sorocaba'], RJ: ['Niterói', 'Rio de Janeiro', 'Petrópolis'], MG: ['Belo Horizonte', 'Uberlândia', 'Juiz de Fora'], PR: ['Curitiba', 'Londrina', 'Maringá'], DF: ['Brasília'], GO: ['Goiânia', 'Anápolis'], BA: ['Salvador', 'Feira de Santana'], SC: ['Florianópolis', 'Joinville'], RS: ['Porto Alegre', 'Caxias do Sul'] };
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
  const items = inCities ? pick.cities.map(c => ({ value: c, label: c, sub: pick.uf })) : BR_STATES.map(([uf, name]) => ({ value: uf, label: name, sub: uf }));
  const matches = items.filter(item => norm(item.label).includes(v) || norm(item.sub).includes(v)).slice(0, 80);
  $('#rpList').innerHTML = matches.length ? matches.map(item => `<button type="button" class="rp-item" role="option" data-rp-value="${escapeHTML(item.value)}"><span class="rp-item-icon"><i data-lucide="${inCities ? 'map-pin' : 'map'}"></i></span><span class="rp-item-copy"><strong>${escapeHTML(item.label)}</strong><small>${inCities ? 'Município' : 'Estado brasileiro'}</small></span><span class="rp-code">${escapeHTML(item.sub)}</span></button>`).join('') : '<div class="rp-empty">Nenhum resultado encontrado.</div>';
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
    pick.cities = body.map(x => x.nome).filter(Boolean);
  } catch (e) { if (seq !== pick.fetchSeq) return; pick.cities = FALLBACK_CITIES[uf] || []; }
  if (pick.open && pick.step === 'city' && pick.uf === uf) drawPicker();
}
async function selectCity(name) {
  const uf = pick.uf, key = uf + '|' + name, seq = ++geocodeSequence;
  region.name = name; region.uf = uf;
  let coord = CITY_COORDS[key];
  region.lat = coord ? coord[0] : null; region.lon = coord ? coord[1] : null;
  region.resolving = !coord;
  closePicker(); render();
  if (coord) return;
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
}
document.addEventListener('click', e => {
  const pickerBtn = e.target.closest('[data-open-location]');
  if (pickerBtn) { showPicker(pickerBtn); return; }
  const item = e.target.closest('[data-rp-value]');
  if (item) { if (pick.step === 'state') selectState(item.dataset.rpValue); else selectCity(item.dataset.rpValue); return; }
  if (pick.open && !e.target.closest('#regionPicker')) closePicker();
});
$('#regionSearch').addEventListener('input', drawPicker);
$('#rpBack').addEventListener('click', () => { pick.step = 'state'; pick.fetchSeq++; $('#regionSearch').value = ''; drawPicker(); $('#regionSearch').focus(); });
$('#rpClose').addEventListener('click', closePicker);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && pick.open) { e.stopPropagation(); closePicker(); } });
window.addEventListener('scroll', () => { if (pick.open) locatePicker(); }, true);
window.addEventListener('resize', () => { if (pick.open) locatePicker(); });

render();
