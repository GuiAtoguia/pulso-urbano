// Pulso Urbano — app.js
// Widgets da Grade (stats, intensidade por horário, variação, vias em destaque)
// são alimentados por data/municipios/<ibge>.json (ver js/data.js e CLAUDE.md).
// Clima e visão geral ainda não estão ligados a dados reais (fora do escopo desta etapa).

import { scaleHeat, formatVariacaoPct, fimDoPeriodo, topVias, buildWeekPath, raioPonto, buildLegendaPontos, classificarPonto, CORES_PONTOS, FAIXAS_HORARIAS } from './calc.js';
import { carregarMunicipio, carregarIndice } from './data.js';
import { gerarInsights, TOTAL_MINIMO_RANKING } from './insights.js';
import { buscarClima, weathercodeParaIcone, weathercodeParaTexto } from './clima.js';
import { montarConteudoFontes } from './fontes.js';
import { MSG } from './mensagens.js';
import { criarGuardaSequencia } from './sequencia.js';
import { lerTemaSalvo, salvarTema, lerRegiaoSalva, salvarRegiao as salvarRegiaoStorage, lerIbgeDaURL } from './preferencias.js';

const escapeHTML = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const $ = s => document.querySelector(s);

const state = { mode: document.documentElement.dataset.mode || 'light' };
const region = { name: 'Araçatuba', uf: 'SP', ibge: '3502804', lat: -21.2076, lon: -50.4401, resolving: false };
const guardaMunicipio = criarGuardaSequencia();
const guardaGeocode = criarGuardaSequencia();
const guardaClima = criarGuardaSequencia();

// status: 'carregando' | 'ok' | 'sem-dados' | 'invalido' | 'erro'
const municipioData = { status: 'carregando', dados: null };

// status: 'carregando' | 'ok' | 'erro'
const climaData = { status: 'carregando', dados: null };
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// Salva a região atual — usa as funções puras testadas em js/preferencias.test.js.
function salvarRegiao() {
  salvarRegiaoStorage({ ibge: region.ibge, nome: region.name, uf: region.uf });
}

function topHeader() {
  return `<header class="pu-header">
    <div class="pu-header-brand"><div class="pu-header-mark"><i data-lucide="activity"></i></div><div><strong>Pulso <em>Urbano</em></strong><small>Observatório de mobilidade</small></div></div>
    <nav class="pu-navigation" aria-label="Navegação"><span class="pu-nav-current"><i data-lucide="map"></i>Mapa</span><button type="button" data-open-fontes aria-haspopup="dialog"><i data-lucide="book-open-text"></i>Fontes</button></nav>
    <div class="pu-header-tools"><button type="button" class="pu-location" data-open-location aria-haspopup="dialog" aria-label="${escapeHTML(region.name)}, ${escapeHTML(region.uf)}: selecionar outro estado ou cidade"><i data-lucide="map-pin"></i><span class="location-name">${escapeHTML(region.name)}, ${escapeHTML(region.uf)}</span><i data-lucide="chevron-down" class="city-chevron"></i></button><button type="button" class="pu-round-icon demo-theme-toggle" data-demo-theme aria-label="Alternar tema claro e escuro" title="Alternar tema"><i data-lucide="${state.mode === 'dark' ? 'sun' : 'moon'}"></i></button></div>
  </header>`;
}

// Os 4 links abrem o modal "Fontes e metodologia" (mesmo listener delegado do
// botão "Fontes" do header, ver [data-open-fontes] mais abaixo) — é onde Dados
// abertos, Metodologia, Acessibilidade e Sobre o projeto realmente têm conteúdo.
function demoFooter() {
  return `<footer class="pu-footer"><div class="pu-footer-primary"><div class="pu-foot-links"><button type="button" data-open-fontes aria-haspopup="dialog"><i data-lucide="database"></i>Dados abertos</button><button type="button" data-open-fontes aria-haspopup="dialog"><i data-lucide="shield-check"></i>Metodologia</button><button type="button" data-open-fontes aria-haspopup="dialog"><i data-lucide="accessibility"></i>Acessibilidade</button><button type="button" data-open-fontes aria-haspopup="dialog"><i data-lucide="info"></i>Sobre o projeto</button></div></div><div class="pu-footer-secondary"><span><i data-lucide="calendar-days"></i>2026 · Ideathon Fatec</span></div></footer>`;
}

// O selo "Simulado" só aparece quando a flag `simulado` do JSON é true — nunca por texto fixo.
// `periodoLabel` vem do período real do JSON (ver fimDoPeriodo em calc.js) — nunca uma data fixa.
function sectionTitle(title, description = '', simulado = false, periodoLabel = '—') {
  const [first, ...rest] = title.split(' ');
  const selo = simulado ? `<span class="pu-section-pill is-simulado" title="Estes números vêm de um conjunto de dados simulado"><i data-lucide="flask-conical"></i>Simulado</span>` : '';
  return `<div class="pu-section-label"><div><div class="overline">EXPLORAR TERRITÓRIO</div><h1><span class="pu-title-accent">${first}</span> ${rest.join(' ')}</h1>${description ? `<p>${description}</p>` : ''}</div><span class="pu-section-pill"><i data-lucide="calendar-days"></i>${escapeHTML(periodoLabel)}</span>${selo}</div>`;
}

function widget(label, icon, content, subtype = '') {
  const [first, ...rest] = label.split(' ');
  return `<article class="pu-widget ${subtype}"><div class="pu-widget-head"><span><span class="pu-widget-mark" aria-hidden="true"><i data-lucide="${icon}"></i></span><h2><em>${first}</em> ${rest.join(' ')}</h2></span><i data-lucide="ellipsis" aria-hidden="true"></i></div>${content}</article>`;
}

// Tabela visualmente oculta (mas lida por leitor de tela) com os valores exatos
// de um gráfico — alternativa textual exigida pra intensidade por horário e variação.
function tabelaOculta(legenda, cabecalhoLinha, linhas) {
  const corpo = linhas.map(([rotulo, valor]) => `<tr><th scope="row">${escapeHTML(rotulo)}</th><td>${escapeHTML(valor)}</td></tr>`).join('');
  return `<table class="sr-only"><caption>${escapeHTML(legenda)}</caption><thead><tr><th scope="col">${escapeHTML(cabecalhoLinha)}</th><th scope="col">Sinistros</th></tr></thead><tbody>${corpo}</tbody></table>`;
}

// Mensagem de estado do widget (carregando/sem-dados/inválido/erro) com ação de
// saída quando faz sentido — reaproveitada por todo widget que depende de `dados`,
// inclusive statsWidget (que não tem ação, só o texto curto).
function textoEstadoMunicipio() {
  if (municipioData.status === 'carregando') return MSG.carregandoGenerico;
  if (municipioData.status === 'invalido') return MSG.dadosInvalidos;
  if (municipioData.status === 'erro') return MSG.erroCarregarMunicipio(region.name);
  return MSG.semDadosMunicipio; // 'sem-dados', e o status inicial antes de qualquer resposta
}
function mensagemSemDados() {
  const base = 'pu-widget-foot" style="margin-top:0;padding-top:0;border-top:0';
  if (municipioData.status === 'carregando') {
    return `<p class="${base}">${MSG.carregandoGenerico}</p>`;
  }
  const texto = escapeHTML(textoEstadoMunicipio());
  if (municipioData.status === 'erro') {
    return `<div class="${base}"><p style="margin:0 0 10px">${texto}</p><button type="button" class="pu-estado-acao" data-retry-municipio>${MSG.tentarNovamente}</button></div>`;
  }
  // 'invalido' ou 'sem-dados': melhor saída é trocar de município, não tentar de novo
  return `<div class="${base}"><p style="margin:0 0 10px">${texto}</p><button type="button" class="pu-estado-acao" data-open-location>${MSG.escolherOutroMunicipio}</button></div>`;
}

function statsWidget(dados) {
  if (!dados) return `<div class="pu-stats"><div class="pu-stat" style="grid-column:1/-1"><div><i data-lucide="circle-off"></i><span>Sinistros</span></div><strong>—</strong><small>${escapeHTML(textoEstadoMunicipio())}</small></div></div>`;
  // Mesmo limiar do ranking de vias (ver insights.js) — sem ranking confiável, o KPI some em vez de mostrar uma contagem solta.
  const rankingSuficiente = Number.isFinite(dados.totalPeriodoCompleto) && dados.totalPeriodoCompleto >= TOTAL_MINIMO_RANKING;
  const viasMapeadas = rankingSuficiente ? (dados.ranking?.itens?.length ?? 0) : null;
  return `<div class="pu-stats">
    <div class="pu-stat"><div><i data-lucide="map-pinned"></i><span>Total</span></div><strong>${Number.isFinite(dados.totalPeriodoCompleto) ? dados.totalPeriodoCompleto : '—'}</strong><small>desde 2022 · últimas 2 semanas: ${Number.isFinite(dados.totalUltimas2Semanas) ? dados.totalUltimas2Semanas : '—'}</small></div>
    <div class="pu-stat"><div><i data-lucide="clock-4"></i><span>Pico</span></div><strong>${escapeHTML(dados.pico ?? '—')}</strong><small>horário de maior concentração</small></div>
    <div class="pu-stat"><div><i data-lucide="route"></i><span>Vias</span></div><strong>${viasMapeadas === null ? '—' : viasMapeadas}</strong><small>mapeadas no ranking</small></div>
  </div>`;
}

function heatWidget(dados) {
  if (!dados) return widget('Intensidade por horário', 'waves', mensagemSemDados(), 'pu-heat-widget');
  const porHora = Array.isArray(dados.porHora) ? dados.porHora : [];
  const max = Math.max(...porHora, 1);
  const totalFaixas = porHora.reduce((soma, v) => soma + v, 0);
  const indicePico = FAIXAS_HORARIAS.indexOf(dados.pico);
  const tiles = porHora.map((v, i) => {
    const faixaLabel = `${FAIXAS_HORARIAS[i]} a ${FAIXAS_HORARIAS[i + 1] ?? '24h'}`;
    const pct = totalFaixas > 0 ? Math.round((v / totalFaixas) * 100) : 0;
    const descricao = `${faixaLabel}: ${v} sinistro${v === 1 ? '' : 's'} (${pct}% do total)`;
    const classeExtra = i === indicePico ? ' is-pico' : '';
    return `<div class="pu-soft-tile${classeExtra}" style="--heat:${scaleHeat(v, max)}" role="img" title="${escapeHTML(descricao)}" aria-label="${escapeHTML(descricao)}${i === indicePico ? ', horário de pico' : ''}"><span></span></div>`;
  }).join('');
  const tabela = tabelaOculta(
    'Sinistros por faixa de horário, das 06h às 24h (sinistros de madrugada, 00h às 06h, não entram neste gráfico)',
    'Faixa',
    porHora.map((v, i) => [`${FAIXAS_HORARIAS[i]} a ${FAIXAS_HORARIAS[i + 1] ?? '24h'}`, v]),
  );
  return widget('Intensidade por horário', 'waves', `<div class="pu-heat-intro"><strong>${escapeHTML(dados.pico ?? '—')}</strong><span>horário de maior atividade</span></div><div class="pu-soft-heat">${tiles}</div><div class="pu-heat-labels" aria-hidden="true"><span>06h</span><span>12h</span><span>18h</span><span>23h</span></div>${tabela}`, 'pu-heat-widget');
}

function trendWidget(dados) {
  if (!dados) return widget('Sinistros por dia da semana', 'chart-spline', mensagemSemDados(), 'pu-trend-widget');
  const porDia = Array.isArray(dados.porDia) ? dados.porDia : [];
  const { line, area, points } = buildWeekPath(porDia);
  const ultimo = points[points.length - 1];
  const ponteiro = ultimo ? `<circle cx="${ultimo[0]}" cy="${ultimo[1]}" r="5" fill="var(--accent)" stroke="var(--surface)" stroke-width="3"/>` : '';
  const tabela = tabelaOculta('Sinistros por dia, última semana completa', 'Dia', DIAS_SEMANA.map((d, i) => [d, porDia[i] ?? 0]));
  // Variação semanal: valor secundário do cartão. Com amostra pequena (menos de
  // TOTAL_MINIMO_VARIACAO sinistros nas 2 últimas semanas somadas), não falamos em
  // aumento/queda — mesma regra de insights.js (ver dados.amostraSemanalPequena).
  const valorVariacao = dados.amostraSemanalPequena
    ? `<strong>${escapeHTML(MSG.amostraSemanalPequena)}</strong><span>${escapeHTML(MSG.amostraSemanalPequenaDetalhe)}</span>`
    : (() => {
        const sinal = Number.isFinite(dados.variacaoSemanaPct) ? (dados.variacaoSemanaPct > 0 ? 'aumento' : dados.variacaoSemanaPct < 0 ? 'queda' : 'estável') : 'sem comparação possível';
        return `<strong>${formatVariacaoPct(dados.variacaoSemanaPct)}</strong><span>em relação à semana anterior (${sinal})</span>`;
      })();
  return widget('Sinistros por dia da semana', 'chart-spline', `<div class="pu-chart-value">${valorVariacao}</div><svg class="pu-smooth-chart" viewBox="0 0 480 150" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="softFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--accent)" stop-opacity=".27"/><stop offset="100%" stop-color="var(--accent)" stop-opacity=".025"/></linearGradient></defs><path class="pu-chart-grid" d="M0 35H480 M0 82H480 M0 130H480"/><path class="pu-chart-fill" d="${area}"/><path class="pu-chart-stroke" d="${line}"/>${ponteiro}</svg><div class="pu-week-labels" aria-hidden="true"><span>Dom</span><span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span></div>${tabela}`, 'pu-trend-widget');
}

function viasWidget(dados) {
  if (!dados) return widget('Vias em destaque', 'list-filter', mensagemSemDados(), 'pu-list-widget');
  // Mesmo limiar da "Visão geral" (ver insights.js) — com poucos sinistros no período
  // completo, o ranking de vias não é estatisticamente confiável, então nenhum dos
  // dois widgets o mostra. Nunca usa o total de 2 semanas: o ranking é sobre o histórico.
  if (!Number.isFinite(dados.totalPeriodoCompleto) || dados.totalPeriodoCompleto < TOTAL_MINIMO_RANKING) {
    return widget('Vias em destaque', 'list-filter', `<p class="pu-widget-foot" style="margin-top:0;padding-top:0;border-top:0">${MSG.rankingInsuficiente}</p>`, 'pu-list-widget');
  }
  const itens = topVias(dados.ranking?.itens, 3);
  if (!itens.length) return widget('Vias em destaque', 'list-filter', mensagemSemDados(), 'pu-list-widget');
  const linhas = itens.map((via, i) => `<li class="pu-area"><span class="pu-area-num" aria-hidden="true">0${i + 1}</span><div><b>${escapeHTML(via.nome)}</b><div class="pu-area-track"><i style="width:${via.pct}%"></i><span class="sr-only">${via.pct}% dos sinistros com via identificada</span></div></div></li>`).join('');
  return widget('Vias em destaque', 'list-filter', `<ol class="pu-areas">${linhas}</ol><div class="pu-widget-foot">Ranking por via · sem coluna de bairro na fonte</div>`, 'pu-list-widget');
}

function softWeather() {
  if (climaData.status === 'carregando') {
    return widget('Clima da região', 'cloud-sun', `<div class="pu-weather-main"><div><strong>—</strong><span>carregando clima…</span></div><div class="pu-weather-icon"><i data-lucide="loader-circle"></i></div></div>`, 'pu-weather-widget');
  }
  const dados = climaData.dados;
  if (climaData.status !== 'ok' || !dados) {
    return widget('Clima da região', 'cloud-sun', `<div class="pu-weather-main"><div><strong>—</strong><span>${MSG.climaIndisponivel}</span></div><div class="pu-weather-icon"><i data-lucide="cloud-off"></i></div></div>`, 'pu-weather-widget');
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
  const semDadosTexto = textoEstadoMunicipio();
  const resumo = dados
    ? `${Number.isFinite(dados.totalPeriodoCompleto) ? dados.totalPeriodoCompleto : '—'} sinistros registrados desde 2022, segundo ${escapeHTML(dados.fonte ?? 'fonte não informada')}. Nas últimas 2 semanas completas do extrato (${escapeHTML(dados.periodo ?? '—')}), foram ${Number.isFinite(dados.totalUltimas2Semanas) ? dados.totalUltimas2Semanas : '—'}.`
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
  if (region.resolving) return `<div class="map-frame map-status"><div class="location-loading"><i data-lucide="loader-circle"></i><strong>${MSG.localizandoCidade(escapeHTML(region.name))}</strong><small>${MSG.localizandoCidadeDetalhe}</small></div></div>`;
  if (!Number.isFinite(region.lat) || !Number.isFinite(region.lon)) return `<div class="map-frame map-status"><div class="location-loading"><i data-lucide="map-pin-off"></i><strong>${MSG.mapaSemCoordenadas(escapeHTML(region.name))}</strong><small>${MSG.mapaSemCoordenadasDetalhe}</small></div></div>`;
  if (!window.L) return `<div class="map-frame map-status"><div class="location-loading"><i data-lucide="map-pin-off"></i><strong>${MSG.mapaIndisponivel}</strong><small>${MSG.mapaIndisponivelDetalhe}</small></div></div>`;
  const out = 'https://www.openstreetmap.org/#map=13/' + region.lat.toFixed(5) + '/' + region.lon.toFixed(5);
  return `<div class="map-frame">
    <div class="pu-leaflet-slot" id="leafletSlot"></div>
    <div class="map-quiet-head"><span><i data-lucide="map-pin"></i> ${escapeHTML(region.name)}, ${escapeHTML(region.uf)}</span></div>
    <div class="map-quiet-tools"><a class="map-open-external" title="Abrir mapa no OpenStreetMap" aria-label="Abrir mapa no OpenStreetMap" href="${out}" target="_blank" rel="noopener noreferrer"><i data-lucide="external-link"></i></a></div>
    <div class="map-tile-warning" id="mapTileWarning" role="status" hidden><i data-lucide="triangle-alert"></i>${MSG.tilesIndisponiveis}</div>
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
let ultimoCentro = null;

// Contadores cumulativos de tiles (não um boolean fixado no primeiro erro): o aviso só
// aparece quando a MAIORIA dos tiles falhou, com uma amostra mínima — um tile isolado
// (comum até numa rede saudável) nunca deve acender o aviso.
const MIN_AMOSTRA_TILES = 6;
const LIMIAR_AVISO_TILES = 0.5;
let tilesCarregados = 0;
let tilesComErro = 0;

function avaliarAvisoTiles() {
  const aviso = $('#mapTileWarning'); // recriado a cada render(); sempre busca o nó atual
  if (!aviso) return;
  const total = tilesCarregados + tilesComErro;
  aviso.hidden = total < MIN_AMOSTRA_TILES || (tilesComErro / total) <= LIMIAR_AVISO_TILES;
}

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
      weight: 1,
      fillColor: cor.fill,
      fillOpacity: 0.55,
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
    // scrollWheelZoom desligado: evita que a roda do mouse fique "presa" dando zoom
    // no mapa em vez de rolar a página (zoom continua por botão/teclado/pinça).
    leafletMap = window.L.map(leafletEl, { attributionControl: false, scrollWheelZoom: false }).setView([region.lat, region.lon], 13);
    leafletTiles = window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      minZoom: 3,
    }).addTo(leafletMap);
    leafletTiles.on('tileload', () => { tilesCarregados++; avaliarAvisoTiles(); });
    leafletTiles.on('tileerror', erro => {
      console.warn('[app] falha ao carregar um tile do mapa (OpenStreetMap)', erro);
      tilesComErro++;
      avaliarAvisoTiles();
    });
    leafletPontos = window.L.layerGroup().addTo(leafletMap);
    ultimoCentro = `${region.lat},${region.lon}`;
  } else {
    const centroAtual = `${region.lat},${region.lon}`;
    if (centroAtual !== ultimoCentro) {
      leafletMap.setView([region.lat, region.lon], 13);
      ultimoCentro = centroAtual;
      tilesCarregados = 0; tilesComErro = 0; // região nova: a taxa de erro da cidade anterior não vale mais
    }
  }
  leafletEl.setAttribute('role', 'region');
  leafletEl.setAttribute('aria-label', `Mapa de ${region.name}, ${region.uf}. Use as setas para mover e + ou - para dar zoom.`);
  avaliarAvisoTiles();
  desenharPontos();
  requestAnimationFrame(() => leafletMap.invalidateSize());
}

window.addEventListener('resize', () => { if (leafletMap) leafletMap.invalidateSize(); });

function renderAppContent() {
  const dados = municipioData.status === 'ok' ? municipioData.dados : null;
  const simulado = Boolean(dados?.simulado);
  const periodoLabel = dados
    ? `Dados até ${fimDoPeriodo(dados.periodo) ?? '—'}`
    : (municipioData.status === 'carregando' ? 'Carregando período…' : '—');
  return `<div class="pu-demo is-filled">${topHeader()}<main class="pu-demo-body" id="conteudo" tabindex="-1">
    <div class="pu-content-title">${sectionTitle('Grade de observação', 'Indicadores, cartografia e contexto', simulado, periodoLabel)}</div>
    <div class="pu-layout pu-grid">
      <div class="pu-structure pu-grid-structure">
        <div class="pu-grid-stats">${statsWidget(dados)}</div>
        <div class="pu-grid-map">${mapFilled(dados)}</div>
        <div class="pu-grid-side">${viasWidget(dados)}${softWeather()}</div>
        <div class="pu-grid-bottom">${trendWidget(dados)}${heatWidget(dados)}</div>
      </div>
    </div>
    <div class="pu-overview-last">${overviewWidget(dados)}</div>
  </main>${demoFooter()}</div>`;
}

function render() {
  $('#app').innerHTML = renderAppContent();
  document.documentElement.dataset.mode = state.mode;
  if (window.lucide?.createIcons) window.lucide.createIcons({ attrs: { 'aria-hidden': 'true' } }); // ícones são decorativos; o acessível vem do aria-label do controle
  montarMapa();
}

// Anúncios para leitor de tela — regiões persistentes (ver index.html), nunca
// recriadas pelo render(), senão o leitor de tela não percebe a mudança de texto.
const statusAnuncio = $('#statusAnuncio');
const erroAnuncio = $('#erroAnuncio');
function anunciar(texto) { if (statusAnuncio) statusAnuncio.textContent = texto; }
function anunciarErro(texto) { if (erroAnuncio) erroAnuncio.textContent = texto; }

// Busca os dados do município atual (region.ibge) e atualiza os widgets quando chegarem.
async function carregarDadosDoMunicipio() {
  const ibgeAlvo = region.ibge;
  const minha = guardaMunicipio.novo();
  municipioData.status = 'carregando';
  municipioData.dados = null;
  anunciar(MSG.carregandoMunicipio(region.name));
  render();
  const resultado = await carregarMunicipio(ibgeAlvo);
  if (!guardaMunicipio.aindaValido(minha)) return; // uma troca de município mais nova já começou
  if (resultado.ok) {
    municipioData.status = 'ok';
    municipioData.dados = resultado.dados;
    anunciar(`Dados de ${region.name} carregados: ${resultado.dados.totalPeriodoCompleto} sinistros desde 2022 (últimas 2 semanas: ${resultado.dados.totalUltimas2Semanas}).`);
  } else if (resultado.motivo === 'sem-dados' || resultado.motivo === 'sem-ibge') {
    municipioData.status = 'sem-dados';
    municipioData.dados = null;
    anunciar(`Sem dados disponíveis para ${region.name}.`);
  } else if (resultado.motivo === 'invalido') {
    municipioData.status = 'invalido';
    municipioData.dados = null;
    anunciarErro(MSG.dadosInvalidos);
  } else {
    municipioData.status = 'erro';
    municipioData.dados = null;
    anunciarErro(MSG.erroCarregarMunicipio(region.name));
  }
  render();
}

// Busca o clima para as coordenadas atuais da região (region.lat/lon) e atualiza o widget.
async function carregarClima() {
  const lat = region.lat, lon = region.lon;
  const minha = guardaClima.novo();
  climaData.status = 'carregando';
  climaData.dados = null;
  render();
  const resultado = await buscarClima(lat, lon);
  if (!guardaClima.aindaValido(minha)) return; // região trocada enquanto buscava
  if (resultado.ok) {
    climaData.status = 'ok';
    climaData.dados = resultado.dados;
  } else {
    climaData.status = 'erro';
    climaData.dados = null;
    anunciarErro(MSG.climaIndisponivel);
  }
  render();
}

document.addEventListener('click', e => {
  const theme = e.target.closest('[data-demo-theme]');
  if (theme) {
    state.mode = state.mode === 'dark' ? 'light' : 'dark';
    salvarTema(state.mode);
    render();
    return;
  }
  // "Tentar novamente" dentro de um widget com erro (ver mensagemSemDados()). Os
  // botões "Escolher outro município" usam [data-open-location] e já são tratados
  // pelo listener do seletor de cidade mais abaixo (mesmo atributo, mesmo delegate).
  if (e.target.closest('[data-retry-municipio]')) { carregarDadosDoMunicipio(); return; }
});

// Modal "Fontes e metodologia" — <dialog> nativo, conteúdo montado por js/fontes.js
// a partir do município atualmente carregado (ou null, se ainda não há dados).
const fontesModal = $('#fontesModal');
const fontesModalCorpo = $('#fontesModalCorpo');
const fontesModalTitulo = $('#fontesModalTitulo');

// Guarda o botão que abriu o modal (há vários agora: header + 4 do rodapé) pra
// devolver o foco exatamente a ele ao fechar, não sempre ao primeiro da página.
let fontesModalGatilho = null;
function abrirFontesModal(gatilho) {
  fontesModalGatilho = gatilho ?? null;
  const dados = municipioData.status === 'ok' ? municipioData.dados : null;
  fontesModalCorpo.innerHTML = montarConteudoFontes(dados);
  fontesModal.showModal();
  fontesModalTitulo.focus();
}
fontesModal.addEventListener('close', () => {
  (fontesModalGatilho?.isConnected ? fontesModalGatilho : document.querySelector('[data-open-fontes]'))?.focus();
});
fontesModal.addEventListener('click', e => {
  if (e.target === fontesModal) fontesModal.close(); // clique no backdrop
});
$('#fontesModalFechar').addEventListener('click', () => fontesModal.close());
document.addEventListener('click', e => {
  const gatilho = e.target.closest('[data-open-fontes]');
  if (gatilho) abrirFontesModal(gatilho);
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
const pick = { open: false, step: 'state', uf: 'SP', stateName: 'São Paulo', cities: [], anchor: null, listaReduzida: false };
const guardaEstado = criarGuardaSequencia();
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
  $('#rpFoot').textContent = inCities
    ? `${items.length} município(s) disponíveis · ${pick.uf}${pick.listaReduzida ? ' · lista reduzida' : ''}`
    : 'Selecione um estado para continuar';
  if (window.lucide?.createIcons) window.lucide.createIcons({ attrs: { 'aria-hidden': 'true' } }); // ícones são decorativos; o acessível vem do aria-label do controle
  requestAnimationFrame(locatePicker);
}
async function selectState(uf) {
  pick.uf = uf; pick.stateName = BR_STATES.find(x => x[0] === uf)?.[1] || uf;
  pick.step = 'city'; pick.cities = FALLBACK_CITIES[uf] || []; pick.listaReduzida = false;
  $('#regionSearch').value = ''; drawPicker();
  const minha = guardaEstado.novo();
  $('#rpFoot').textContent = `Buscando municípios de ${pick.stateName}...`;
  try {
    const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${encodeURIComponent(uf)}/municipios?orderBy=nome`, { signal: AbortSignal.timeout(9000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json();
    if (!Array.isArray(body)) throw new Error('resposta do IBGE não é uma lista');
    if (!guardaEstado.aindaValido(minha) || !pick.open || pick.uf !== uf) return;
    pick.cities = body.map(x => ({ nome: x.nome, ibge: x.id != null ? String(x.id) : null })).filter(c => c.nome);
  } catch (erro) {
    console.warn(`[app] API de localidades do IBGE indisponível para ${uf}, tentando lista local`, erro);
    if (!guardaEstado.aindaValido(minha)) return;
    // data/indice.json tem dado real (só da região de Araçatuba); se não cobrir o
    // estado escolhido, cai na listinha fixa de FALLBACK_CITIES como último recurso.
    const resultadoIndice = await carregarIndice();
    if (!guardaEstado.aindaValido(minha)) return;
    const doIndice = resultadoIndice.ok ? resultadoIndice.dados.filter(m => m.uf === uf) : [];
    pick.cities = doIndice.length ? doIndice.map(m => ({ nome: m.nome, ibge: String(m.ibge) })) : (FALLBACK_CITIES[uf] || []);
    pick.listaReduzida = true;
  }
  if (pick.open && pick.step === 'city' && pick.uf === uf) drawPicker();
}
async function selectCity(name, ibge) {
  const uf = pick.uf, key = uf + '|' + name;
  const seq = guardaGeocode.novo();
  region.name = name; region.uf = uf; region.ibge = ibge || null;
  let coord = CITY_COORDS[key];
  region.lat = coord ? coord[0] : null; region.lon = coord ? coord[1] : null;
  region.resolving = !coord;
  closePicker();
  render();
  carregarDadosDoMunicipio();
  salvarRegiao();
  if (coord) { carregarClima(); return; }
  anunciar(MSG.localizandoCidade(name));
  try {
    const query = encodeURIComponent(`${name}, ${pick.stateName}, Brasil`);
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${query}`, { signal: AbortSignal.timeout(9000), headers: { 'Accept': 'application/json' } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const arr = await r.json();
    if (!Array.isArray(arr) || !arr.length) throw new Error('nenhum resultado de geocodificação');
    coord = [Number(arr[0].lat), Number(arr[0].lon)];
  } catch (erro) {
    console.warn(`[app] Nominatim não encontrou coordenadas para ${name}, ${uf}`, erro);
    coord = null;
  }
  if (!guardaGeocode.aindaValido(seq)) return;
  region.lat = coord ? coord[0] : null; region.lon = coord ? coord[1] : null; region.resolving = false; render();
  if (!coord) anunciarErro(MSG.mapaSemCoordenadas(name));
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
$('#rpBack').addEventListener('click', () => { pick.step = 'state'; guardaEstado.novo(); $('#regionSearch').value = ''; drawPicker(); $('#regionSearch').focus(); });
$('#rpClose').addEventListener('click', closePicker);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && pick.open) { e.stopPropagation(); closePicker(); } });
window.addEventListener('scroll', () => { if (pick.open) locatePicker(); }, true);
window.addEventListener('resize', () => { if (pick.open) locatePicker(); });

// Banner de "sem conexão" — único aviso global, em vez de vários erros soltos
// aparecendo ao mesmo tempo quando a causa raiz é simplesmente estar offline.
const offlineBanner = $('#offlineBanner');
function atualizarBannerOffline() {
  if (!offlineBanner) return;
  offlineBanner.hidden = navigator.onLine !== false;
}
window.addEventListener('offline', () => { atualizarBannerOffline(); anunciarErro(MSG.semConexao); });
window.addEventListener('online', () => { atualizarBannerOffline(); anunciar(MSG.conexaoRestabelecida); });
offlineBanner?.addEventListener('click', e => {
  if (e.target.closest('[data-retry-offline]')) { carregarDadosDoMunicipio(); carregarClima(); }
});
atualizarBannerOffline();

// Resolve a região inicial (parâmetro ?municipio= na URL, senão a última salva em
// localStorage) DEPOIS da primeira pintura — nunca atrasa o primeiro render, que já
// sobe com Araçatuba. Se o ibge salvo/da URL não existir em data/indice.json (dado
// corrompido, cidade removida etc.), fica no padrão em vez de tentar carregar algo
// que não existe.
async function resolverRegiaoInicial() {
  const ibgeDesejado = lerIbgeDaURL() ?? lerRegiaoSalva()?.ibge ?? null;
  if (!ibgeDesejado || ibgeDesejado === region.ibge) return;
  const resultado = await carregarIndice();
  if (!resultado.ok) {
    console.warn('[app] não foi possível carregar data/indice.json para resolver a região salva/URL — mantendo o padrão', resultado.motivo);
    return;
  }
  const encontrado = resultado.dados.find(m => String(m.ibge) === String(ibgeDesejado));
  if (!encontrado) {
    console.warn(`[app] ibge=${ibgeDesejado} (salvo ou da URL) não existe em data/indice.json — mantendo o padrão`);
    anunciar(MSG.regiaoSalvaInvalida);
    return;
  }
  region.name = encontrado.nome; region.uf = encontrado.uf; region.ibge = String(encontrado.ibge);
  region.lat = encontrado.lat; region.lon = encontrado.lon; region.resolving = false;
  render();
  carregarDadosDoMunicipio();
  carregarClima();
  salvarRegiao();
}

render();
carregarDadosDoMunicipio();
carregarClima();
resolverRegiaoInicial();
