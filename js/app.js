// Pulso Urbano — app.js
// Widgets da Grade (stats, intensidade por horário, variação, vias em destaque)
// são alimentados por data/municipios/<ibge>.json (ver js/data.js e CLAUDE.md).
// Clima vem da Open-Meteo. Sem IA generativa nem síntese de visão geral.

import { scaleHeat, formatVariacaoPct, fimDoPeriodo, topVias, buildWeekPath, raioPonto, buildLegendaPontos, classificarPonto, FAIXAS_HORARIAS } from './calc.js';
import { obterRecorte, PERIODOS_DISPONIVEIS } from './recortes.js';
import { carregarMunicipio, carregarIndice } from './data.js';
import { TOTAL_MINIMO_RANKING } from './insights.js';
import { buscarClima, weathercodeParaIcone, weathercodeParaTexto } from './clima.js';
import { montarConteudoFontes } from './fontes.js';
import { MSG } from './mensagens.js';
import { criarGuardaSequencia } from './sequencia.js';
import { lerTemaSalvo, salvarTema, lerRegiaoSalva, salvarRegiao as salvarRegiaoStorage, lerIbgeDaURL } from './preferencias.js';

const escapeHTML = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const $ = s => document.querySelector(s);

const state = {
  mode: document.documentElement.dataset.mode || 'light',
  color: document.documentElement.dataset.color || 'yellow',
  view: 'mapa',
  periodo: 'historico',
  paletteOpen: false,
};
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

const PALETAS = [
  ['violet', 'Roxo', '#9479ed'], ['blue', 'Azul', '#4a9cff'],
  ['cyan', 'Ciano', '#13b9cd'], ['green', 'Verde', '#25ae7e'],
  ['yellow', 'Amarelo', '#d8a73b'], ['orange', 'Laranja', '#e68b48'],
  ['red', 'Vermelho', '#d95f70'], ['pink', 'Rosa', '#dc65a5'],
  ['mono', 'Monocromático', 'linear-gradient(135deg,#222 50%,#e7e7e7 50%)'],
  ['poly', 'Policromático', 'conic-gradient(#7d6ee7, #3999eb, #16a789, #e6a13d, #d65a82, #7d6ee7)'],
];

function paletaHTML() {
  return `<div class="pu-palette-wrap">
    <button type="button" class="pu-round-icon pu-palette-toggle" data-palette-toggle aria-label="Cor do sistema" aria-expanded="${state.paletteOpen}" aria-controls="puPalette" title="Cor do sistema"><i data-lucide="sliders-horizontal"></i></button>
    ${state.paletteOpen ? `<section id="puPalette" class="pu-palette-pop" aria-label="Cor do sistema">
      <div class="pu-palette-top"><div><strong>Cor do sistema</strong><small>Material You · superfícies adaptáveis</small></div><button type="button" class="pu-palette-close" data-palette-close aria-label="Fechar cores"><i data-lucide="x"></i></button></div>
      <div class="pu-palette-grid">${PALETAS.map(([key, label, cor]) => `<button type="button" class="pu-color-choice ${state.color === key ? 'active' : ''}" data-palette-color="${key}" aria-pressed="${state.color === key}" title="${label}"><span class="pu-color-circle" style="background:${cor}"></span><span>${label}</span>${state.color === key ? '<i data-lucide="check"></i>' : ''}</button>`).join('')}</div>
    </section>` : ''}
  </div>`;
}
function navButton(chave, titulo, icone) {
  const ativo = state.view === chave;
  return `<button type="button" class="pu-site-tab ${ativo?'pu-nav-current':''}" data-view="${chave}" ${ativo?'aria-current="page"':''}><i data-lucide="${icone}"></i><span>${titulo}</span></button>`;
}
function topHeader() {
  return `<header class="pu-header">
    <div class="pu-header-brand"><div class="pu-header-mark"><i data-lucide="activity"></i></div><div><strong>Pulso <em>Urbano</em></strong><small>Observatório de mobilidade</small></div></div>
    <nav class="pu-navigation" aria-label="Seções do Pulso Urbano">${navButton('mapa','Mapa','map')}${navButton('painel','Painel','chart-no-axes-combined')}${navButton('fontes','Fontes','book-open-text')}</nav>
    <div class="pu-header-tools">
      <button type="button" class="pu-location" data-open-location aria-haspopup="dialog" aria-label="Escolher município. Atual: ${escapeHTML(region.name)}, ${escapeHTML(region.uf)}"><i data-lucide="map-pin"></i><span class="location-name">${escapeHTML(region.name)}, ${escapeHTML(region.uf)}</span><i data-lucide="chevron-down" class="city-chevron"></i></button>
      <button type="button" class="pu-round-icon demo-theme-toggle" data-demo-theme aria-label="Alternar para tema ${state.mode === 'dark' ? 'claro' : 'escuro'}" title="Alternar tema"><i data-lucide="${state.mode === 'dark' ? 'sun' : 'moon'}"></i></button>
      ${paletaHTML()}
    </div>
  </header>`;
}

function demoFooter() {
  return `<footer class="pu-footer pu-footer-compact"><div class="pu-footer-secondary"><span><i data-lucide="calendar-days"></i>Ideathon Fatec 2026</span><a href="https://github.com/GuiAtoguia/pulso-urbano" target="_blank" rel="noopener noreferrer"><i data-lucide="git-branch"></i>Projeto no GitHub</a></div></footer>`;
}

// O selo "Simulado" só aparece quando a flag `simulado` do JSON é true — nunca por texto fixo.
// `periodoLabel` vem do período real do JSON (ver fimDoPeriodo em calc.js) — nunca uma data fixa.
function sectionTitle(title, description = '', simulado = false, periodoLabel = '—') {
  const [first, ...rest] = title.split(' ');
  const selo = simulado ? `<span class="pu-section-pill is-simulado" title="Estes números vêm de um conjunto de dados simulado"><i data-lucide="flask-conical"></i>Simulado</span>` : '';
  return `<div class="pu-section-label"><div><div class="overline">EXPLORAR TERRITÓRIO</div><h1><span class="pu-title-accent">${first}</span> ${rest.join(' ')}</h1>${description ? `<p>${description}</p>` : ''}</div><span class="pu-section-pill"><i data-lucide="calendar-days"></i>${escapeHTML(periodoLabel)}</span>${selo}</div>`;
}

const AJUDA_WIDGET = {
  'Intensidade por horário': 'Distribuição histórica em 9 faixas de duas horas, das 06h às 24h. Registros da madrugada entram no total, mas não nesse gráfico. Passe o cursor ou toque em cada faixa para ler a contagem.',
  'Sinistros por dia da semana': 'Contagem exata por dia da última semana completa do extrato. Passe o cursor, toque ou use Tab nos pontos para consultar cada valor. A variação só é divulgada quando a amostra é suficiente.',
  'Vias em destaque': 'Ranking de logradouros baseado no histórico. Não é um ranking de bairros; só aparece com pelo menos 20 sinistros no histórico.',
  'Clima da região': 'Condições meteorológicas atuais e previsão obtidas da Open-Meteo. A previsão não é a condição observada na data de cada sinistro.',
};
function widget(label, icon, content, subtype = '') {
  const [first, ...rest] = label.split(' ');
  const descricao = AJUDA_WIDGET[label] || 'Informações associadas ao recorte e às fontes oficiais do observatório.';
  return `<article class="pu-widget ${subtype}"><div class="pu-widget-head"><span><span class="pu-widget-mark" aria-hidden="true"><i data-lucide="${icon}"></i></span><h2><em>${first}</em> ${rest.join(' ')}</h2></span><button type="button" class="pu-widget-info" data-widget-help="${escapeHTML(descricao)}" data-widget-title="${escapeHTML(label)}" aria-label="Sobre ${escapeHTML(label)}" aria-describedby="puTooltip"><i data-lucide="info"></i></button></div>${content}</article>`;
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

function statsWidget(dados, usarPeriodoDoPainel = false) {
  if (!dados) return `<div class="pu-stats"><div class="pu-stat" style="grid-column:1/-1"><div><i data-lucide="circle-off"></i><span>Sinistros</span></div><strong>—</strong><small>${escapeHTML(textoEstadoMunicipio())}</small></div></div>`;
  const rankingSuficiente = Number.isFinite(dados.totalPeriodoCompleto) && dados.totalPeriodoCompleto >= TOTAL_MINIMO_RANKING;
  const viasMapeadas = rankingSuficiente ? (dados.ranking?.itens?.length ?? 0) : null;
  const recorte = obterRecorte(dados, usarPeriodoDoPainel ? state.periodo : 'historico');
  return `<div class="pu-stats">
    <div class="pu-stat" tabindex="0" role="button" data-widget-title="Contagem de sinistros · ${escapeHTML(recorte.nome)}" data-widget-help="${escapeHTML(recorte.descricao)} Fonte: ${dados.fonte ?? 'Infosiga-SP'}. O número muda conforme o recorte de dias disponível no arquivo municipal."><div><i data-lucide="map-pinned"></i><span>${escapeHTML(recorte.nome)}</span></div><strong>${Number.isFinite(recorte.total) ? recorte.total.toLocaleString('pt-BR') : '—'}</strong><small>${escapeHTML(recorte.periodoLabel)}</small></div>
    <div class="pu-stat" tabindex="0" role="button" data-widget-title="Faixa de pico · histórico" data-widget-help="Faixa horária mais frequente no histórico consolidado. A fonte não fornece dados por hora isolados por semana ou quinzena."><div><i data-lucide="clock-4"></i><span>Pico · histórico</span></div><strong>${escapeHTML(dados.pico ?? '—')}</strong><small>distribuição desde 2022</small></div>
    <div class="pu-stat" tabindex="0" role="button" data-widget-title="Ranking de vias · histórico" data-widget-help="Quantidade de vias publicadas no ranking histórico do município. A fonte não fornece um ranking separado por semana ou quinzena."><div><i data-lucide="route"></i><span>Vias · histórico</span></div><strong>${viasMapeadas === null ? '—' : viasMapeadas}</strong><small>ranking histórico de vias</small></div>
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
    const descricao = `${faixaLabel}: ${v.toLocaleString('pt-BR')} sinistro${v === 1 ? '' : 's'} (${pct}% dos registros com hora entre 06h e 24h)`;
    const classeExtra = i === indicePico ? ' is-pico' : '';
    return `<button type="button" class="pu-soft-tile${classeExtra}" style="--heat:${scaleHeat(v, max)}" data-widget-title="${escapeHTML(faixaLabel)}" data-widget-help="${escapeHTML(descricao)}" aria-label="${escapeHTML(descricao)}${i === indicePico ? ', pico do período' : ''}"><span></span></button>`;
  }).join('');
  const tabela = tabelaOculta(
    'Sinistros por faixa de horário, das 06h às 24h (sinistros de madrugada, 00h às 06h, não entram neste gráfico)',
    'Faixa',
    porHora.map((v, i) => [`${FAIXAS_HORARIAS[i]} a ${FAIXAS_HORARIAS[i + 1] ?? '24h'}`, v]),
  );
  return widget('Intensidade por horário', 'waves', `<div class="pu-heat-intro"><strong>${escapeHTML(dados.pico ?? '—')}</strong><span>horário de maior atividade</span></div><div class="pu-soft-heat">${tiles}</div><div class="pu-heat-labels" aria-hidden="true"><span>06h</span><span>12h</span><span>18h</span><span>24h</span></div><div class="pu-widget-foot">Histórico · a madrugada (00h–06h) não entra neste gráfico, mas conta no total</div>${tabela}`, 'pu-heat-widget');
}

function trendWidget(dados) {
  if (!dados) return widget('Sinistros por dia da semana', 'chart-spline', mensagemSemDados(), 'pu-trend-widget');
  const porDia = Array.isArray(dados.porDia) ? dados.porDia : [];
  const { line, area, points } = buildWeekPath(porDia);
  const ponteiro = points.map(([x,y], i) => {
    const msg = `${DIAS_SEMANA[i]}: ${(porDia[i] ?? 0).toLocaleString('pt-BR')} sinistro(s) na semana de referência`;
    return `<button type="button" class="pu-chart-marker" style="--cx:${(x / 480 * 100).toFixed(3)}%;--cy:${(y / 150 * 100).toFixed(3)}%" aria-label="${escapeHTML(msg)}" data-widget-title="${DIAS_SEMANA[i]} · sinistros" data-widget-help="${escapeHTML(msg)}" aria-describedby="puTooltip"><span></span></button>`;
  }).join('');
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
  return widget('Sinistros por dia da semana', 'chart-spline', `<div class="pu-chart-value">${valorVariacao}</div><div class="pu-chart-plot"><svg class="pu-smooth-chart" viewBox="0 0 480 150" preserveAspectRatio="none" role="img" aria-label="Sinistros diários da última semana completa. Interaja com os sete marcadores para consultar valores exatos."><defs><linearGradient id="softFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--accent)" stop-opacity=".17"/><stop offset="100%" stop-color="var(--accent)" stop-opacity=".012"/></linearGradient></defs><path class="pu-chart-grid" d="M0 35H480 M0 82H480 M0 130H480"/><path class="pu-chart-fill" d="${area}"/><path class="pu-chart-stroke" d="${line}"/></svg>${ponteiro}</div><div class="pu-week-labels" aria-hidden="true"><span>Dom</span><span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span></div><div class="pu-widget-foot">Última semana completa do extrato · toque nos pontos para conferir os valores</div>${tabela}`, 'pu-trend-widget');
}

function viasWidget(dados) {
  if (!dados) return widget('Vias em destaque', 'list-filter', mensagemSemDados(), 'pu-list-widget');
  // Com amostra pequena no histórico, o ranking de vias não é confiável.
  // Ele não muda com o filtro de duas semanas, pois a fonte não fornece esse corte.
  if (!Number.isFinite(dados.totalPeriodoCompleto) || dados.totalPeriodoCompleto < TOTAL_MINIMO_RANKING) {
    return widget('Vias em destaque', 'list-filter', `<p class="pu-widget-foot" style="margin-top:0;padding-top:0;border-top:0">${MSG.rankingInsuficiente}</p>`, 'pu-list-widget');
  }
  const itens = topVias(dados.ranking?.itens, 3);
  if (!itens.length) return widget('Vias em destaque', 'list-filter', mensagemSemDados(), 'pu-list-widget');
  const linhas = itens.map((via, i) => `<li class="pu-area"><span class="pu-area-num" aria-hidden="true">0${i + 1}</span><button type="button" class="pu-via-action" data-widget-title="${escapeHTML(via.nome)}" data-widget-help="${via.pct}% dos sinistros com logradouro identificado no histórico. Percentual publicado na base está arredondado." aria-label="${escapeHTML(via.nome)}: ${via.pct}% dos sinistros com logradouro identificado"><b>${escapeHTML(via.nome)}</b><span class="pu-area-track"><i style="width:${via.pct}%"></i></span></button></li>`).join('');
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
    const texto = `${dia.data}: máxima de ${Number.isFinite(dia.max) ? Math.round(dia.max) + '°C' : '—'}, mínima de ${Number.isFinite(dia.min) ? Math.round(dia.min) + '°C' : '—'}. Previsão Open-Meteo, não observação histórica.`;
    return `<button type="button" data-widget-title="Previsão · ${escapeHTML(dia.data)}" data-widget-help="${escapeHTML(texto)}" aria-label="${escapeHTML(texto)}"><b>${label}</b>${Number.isFinite(dia.max) ? Math.round(dia.max) + '°' : '—'}</button>`;
  }).join('');
  return widget('Clima da região', icone, `<div class="pu-weather-main"><div><strong>${Number.isFinite(atual.temperatura) ? Math.round(atual.temperatura) + '°' : '—'}</strong><span>${escapeHTML(texto)}</span></div><div class="pu-weather-icon"><i data-lucide="${icone}"></i></div></div><div class="pu-weather-days">${proximos}</div><div class="pu-widget-foot">Fonte: ${escapeHTML(dados.fonte)}</div>`, 'pu-weather-widget');
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
  if (!window.L) {
    const externo = 'https://www.openstreetmap.org/#map=13/' + region.lat.toFixed(5) + '/' + region.lon.toFixed(5);
    const delta = 0.06;
    const bbox = [region.lon-delta,region.lat-delta,region.lon+delta,region.lat+delta].join(',');
    const embed = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${encodeURIComponent(`${region.lat},${region.lon}`)}`;
    return `<div class="map-frame map-status pu-osm-iframe-fallback"><iframe loading="lazy" title="Mapa de ${escapeHTML(region.name)} no OpenStreetMap" src="${embed}" referrerpolicy="strict-origin-when-cross-origin"></iframe><div class="pu-osm-fallback-notice">Mapa-base OpenStreetMap · sem sobreposição de sinistros porque a biblioteca interativa está indisponível. <a href="${externo}" target="_blank" rel="noopener noreferrer">Abrir no OpenStreetMap</a></div></div>`;
  }
  const out = 'https://www.openstreetmap.org/#map=13/' + region.lat.toFixed(5) + '/' + region.lon.toFixed(5);
  return `<div class="map-frame">
    <div class="pu-leaflet-slot" id="leafletSlot"></div>
    <div class="map-quiet-tools"><a class="map-open-external" title="Abrir no OpenStreetMap" aria-label="Abrir mapa completo no OpenStreetMap" href="${out}" target="_blank" rel="noopener noreferrer"><i data-lucide="external-link"></i><span>Ver no mapa</span></a></div>
    <div class="map-tile-warning" id="mapTileWarning" role="status" hidden><i data-lucide="triangle-alert"></i>${MSG.tilesIndisponiveis}</div>
    <ul class="map-legend" aria-label="Legenda dinâmica de intensidade dos pontos no mapa"></ul>

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
let ultimoTemaMapa = null;
const OSM_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
let leafletCanvas = null;
let pontosVisiveis = [];
// Agrupa coordenadas próximas apenas no nível de visualização (JSON intacto).
// A agregação evita a massa de marcadores sobrepostos na região central.
function agregarPontosPorPixel(pontos, zoom, mapa) {
  if (zoom >= 16 || !mapa) return pontos.map(p => ({...p, quantidadeLocais: 1}));
  const grade = zoom <= 12 ? 37 : zoom <= 14 ? 27 : 19;
  const bins = new Map();
  for (const ponto of pontos) {
    const px = mapa.project([ponto.lat, ponto.lon], zoom);
    const key = `${Math.floor(px.x / grade)}:${Math.floor(px.y / grade)}`;
    const atual = bins.get(key);
    if (atual) {
      atual.n += ponto.n;
      atual.quantidadeLocais++;
      atual.latSoma += ponto.lat * ponto.n;
      atual.lonSoma += ponto.lon * ponto.n;
    } else {
      bins.set(key, { n: ponto.n, quantidadeLocais: 1, latSoma: ponto.lat * ponto.n, lonSoma: ponto.lon * ponto.n });
    }
  }
  return [...bins.values()].map(b => ({
    lat: b.latSoma / b.n, lon: b.lonSoma / b.n, n:b.n, quantidadeLocais:b.quantidadeLocais,
  }));
}

// Contadores cumulativos de tiles (não um boolean fixado no primeiro erro): o aviso só
// aparece quando a MAIORIA dos tiles falhou, com uma amostra mínima — um tile isolado
// (comum até numa rede saudável) nunca deve acender o aviso.
const MIN_AMOSTRA_TILES = 6;
const LIMIAR_AVISO_TILES = 0.5;
let tilesCarregados = 0;
let tilesComErro = 0;

function avaliarAvisoTiles() {
  const aviso = $('#mapTileWarning'); // aviso no DOM atual
  if (!aviso) return;
  const total = tilesCarregados + tilesComErro;
  aviso.hidden = total < MIN_AMOSTRA_TILES || (tilesComErro / total) <= LIMIAR_AVISO_TILES;
  leafletEl.classList.toggle('pu-map-tiles-failed', !aviso.hidden);
  if (!aviso.hidden) aviso.innerHTML = `<i data-lucide="wifi-off"></i><span>Mapa-base temporariamente indisponível. Os pontos permanecem representados sobre a área.</span><a href="https://www.openstreetmap.org/#map=13/${region.lat}/${region.lon}" target="_blank" rel="noopener noreferrer">Abrir OSM</a>`;
}

// Resolve a tonalidade de cada faixa a partir da cor de destaque do tema atual.
// O uso de color-mix fica restrito à conversão por CSS antes de passar valores
// concretos ao Canvas do Leaflet; evita marcadores azuis fixos em todas as paletas.
function paletaDosPontos() {
  const probe = document.createElement('span');
  probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none';
  document.body.appendChild(probe);
  const superficie = state.mode === 'dark' ? '#e5edfa' : '#f8fcff';
  const misturas = { baixo: 43, medio: 73, alto: 95 };
  const cores = {};
  for (const [faixa, intensidade] of Object.entries(misturas)) {
    probe.style.color = `color-mix(in srgb, var(--accent) ${intensidade}%, ${superficie})`;
    cores[faixa] = getComputedStyle(probe).color || '#4a9cff';
  }
  probe.remove();
  return { cores, contorno: state.mode === 'dark' ? '#15243a' : '#ffffff' };
}

function desenharPontos() {
  if (!leafletPontos) return;
  leafletPontos.clearLayers();
  const dados = municipioData.status === 'ok' ? municipioData.dados : null;
  const pontos = Array.isArray(dados?.pontos)
    ? dados.pontos.filter(p => Number.isFinite(p?.lat) && Number.isFinite(p?.lon) && Number.isFinite(p?.n) && p.n > 0)
    : [];
  if (!pontos.length) { const legend = document.querySelector('.map-legend'); if (legend) legend.innerHTML = ''; return; }
  const exibidos = agregarPontosPorPixel(pontos, leafletMap?.getZoom() ?? 13, leafletMap);
  pontosVisiveis = exibidos;
  const maxN = Math.max(...exibidos.map(p => p.n));
  const legenda = buildLegendaPontos(exibidos);
  const mapaPaleta = paletaDosPontos();
  const legendaEl = document.querySelector('.map-legend');
  if (legendaEl) {
    const content = legenda.map(f => {
      const fill = mapaPaleta.cores[f.chave] ?? mapaPaleta.cores.baixo;
      return `<li><span class="pu-legenda-marca" style="width:12px;height:12px;background:${fill};border-color:${mapaPaleta.contorno}"></span><span>${f.rotulo} sinistros</span></li>`;
    }).join('');
    legendaEl.innerHTML = `<li class="pu-legend-title">${leafletMap?.getZoom() < 16 ? 'Pontos próximos agrupados' : 'Sinistros por coordenada aproximada'}</li>${content}`;
  }
  for (const ponto of exibidos) {
    const faixa = classificarPonto(ponto.n, legenda);
    const fill = mapaPaleta.cores[faixa?.chave] ?? mapaPaleta.cores.baixo;
    const raio = Math.min(13, raioPonto(ponto.n, maxN, {min:4, max:11}));
    const quantidade = ponto.n.toLocaleString('pt-BR');
    const agrupados = ponto.quantidadeLocais > 1;
    const descricao = agrupados ? `${ponto.quantidadeLocais} coordenadas agrupadas nesta escala` : 'Coordenada aproximada';
    const marcador = window.L.circleMarker([ponto.lat, ponto.lon], {
      radius: raio, renderer: leafletCanvas,
      color: mapaPaleta.contorno, weight: 2.1,
      fillColor: fill, fillOpacity: .88,
      opacity: 1,
    });
    marcador.bindTooltip(`<span class="pu-map-tip-value">${quantidade} sinistro${ponto.n === 1 ? '' : 's'}</span><span class="pu-map-tip-note">${descricao} · histórico</span>`, {
      direction: 'top', offset: [0, -raio - 5], className: 'pu-map-tooltip', opacity: 1,
    });
    marcador.bindPopup(`<div class="pu-map-popup-content"><strong>${quantidade} sinistro${ponto.n === 1 ? '' : 's'}</strong><span>${descricao}</span><small>Registros históricos agregados · Infosiga-SP</small></div>`, {className:'pu-map-popup'});
    marcador.on('mouseover', () => { marcador.setStyle({ radius: raio + 1.5, weight: 3, fillOpacity: 1 }); });
    marcador.on('mouseout', () => { marcador.setStyle({ radius: raio, weight: 2.1, fillOpacity: .88 }); });
    marcador.addTo(leafletPontos);
  }
}

// Monta o Leaflet no slot atual (se houver) e atualiza centro/pontos sem duplicar a instância.
function montarMapa() {
  const slot = $('#leafletSlot');
  if (!slot || !window.L) return; // sem coordenadas ainda, ou Leaflet não carregou
  slot.appendChild(leafletEl); // reutiliza o mapa e respeita o cache HTTP do navegador
  if (!leafletMap) {
    // Rolagem normal move a página; Ctrl + roda permite zoom sob o cursor.
    leafletMap = window.L.map(leafletEl, {
      attributionControl: true, scrollWheelZoom: false, preferCanvas: true,
      zoomControl: true, zoomSnap: 1, maxZoom: 18, minZoom: 9,
    }).setView([region.lat, region.lon], 13);
    // Ctrl+roda: intercepta somente enquanto o ponteiro está sobre o mapa.
    // Mantém scrollWheelZoom do Leaflet desativado para o scroll normal da página.
    let ultimoZoomDaRoda = 0;
    let deltaAcumulado = 0;
    leafletEl.addEventListener('wheel', event => {
      if (!event.ctrlKey || !leafletMap) { deltaAcumulado = 0; return; }
      event.preventDefault();
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 300 : 1);
      deltaAcumulado += delta;
      const agora = performance.now();
      if (Math.abs(deltaAcumulado) < 42 || agora - ultimoZoomDaRoda < 110) return;
      const sentido = deltaAcumulado < 0 ? 1 : -1;
      deltaAcumulado = 0;
      ultimoZoomDaRoda = agora;
      const alvo = Math.max(leafletMap.getMinZoom(), Math.min(leafletMap.getMaxZoom(), leafletMap.getZoom() + sentido));
      if (alvo !== leafletMap.getZoom()) leafletMap.setZoomAround(leafletMap.mouseEventToContainerPoint(event), alvo, {animate: true});
    }, {passive: false});
    leafletCanvas = window.L.canvas({padding: .15});
    leafletTiles = window.L.tileLayer(OSM_TILES, {
      maxZoom: 18, maxNativeZoom: 19, minZoom: 9,
      updateWhenIdle: true, keepBuffer: 1, detectRetina: false,
      crossOrigin: false, referrerPolicy: 'strict-origin-when-cross-origin',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>',
    }).addTo(leafletMap);
    // Somente as áreas exibidas em tela são requisitadas, sem pré-carregar tiles.
    leafletMap.on('zoomend', desenharPontos);
    ultimoTemaMapa = state.mode;
    leafletTiles.on('tileload', () => { tilesCarregados++; avaliarAvisoTiles(); });
    leafletTiles.on('tileerror', erro => {
      console.warn('[app] falha ao carregar tile do OpenStreetMap', erro);
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
  // O mapa padrão OpenStreetMap mantém as mesmas cores em claro e escuro.
  ultimoTemaMapa = state.mode;
  leafletEl.setAttribute('role', 'region');
  leafletEl.setAttribute('aria-label', `Mapa de ${region.name}, ${region.uf}. Ctrl e roda do mouse para zoom; use as setas para mover e as teclas + ou - para ampliar.`);
  avaliarAvisoTiles();
  desenharPontos();
  requestAnimationFrame(() => leafletMap.invalidateSize());
}

window.addEventListener('resize', () => { if (leafletMap) leafletMap.invalidateSize(); });

function periodoSelo(dados, recorteSelecionado = null) {
  if (!dados) return municipioData.status === 'carregando' ? 'Carregando período…' : 'Período indisponível';
  if (recorteSelecionado) return obterRecorte(dados, recorteSelecionado).selo;
  return `Dados até ${fimDoPeriodo(dados.periodo) ?? '—'}`;
}

function mapaPagina(dados) {
  return `<div class="pu-content-title">${sectionTitle('Explorador urbano', 'Cartografia, sinistros e indicadores da região', Boolean(dados?.simulado), periodoSelo(dados))}</div>
    <div class="pu-explorer-grid">
      <section class="pu-explorer-map" aria-label="Mapa de sinistros">${mapFilled(dados)}</section>
      <aside class="pu-explorer-side" aria-label="Indicadores da região">
        ${statsWidget(dados)}
        ${trendWidget(dados)}
      </aside>
      <section class="pu-explorer-bottom" aria-label="Distribuição e contexto">${heatWidget(dados)}${viasWidget(dados)}${softWeather()}</section>
    </div>
    `;
}

function painelDestaque(dados) {
  if (!dados) return `<div class="pu-panel-headline"><i data-lucide="clock"></i><div><strong>Dados indisponíveis</strong><span>${escapeHTML(textoEstadoMunicipio())}</span></div></div>`;
  const recorte = obterRecorte(dados, state.periodo);
  return `<div class="pu-panel-headline"><span class="pu-panel-head-icon"><i data-lucide="${state.periodo === 'historico' ? 'chart-no-axes-combined' : 'calendar-range'}"></i></span><div><div class="overline">${escapeHTML(recorte.nome)} · ${escapeHTML(recorte.periodoLabel)}</div><strong>${Number.isFinite(recorte.total) ? recorte.total.toLocaleString('pt-BR') : '—'}</strong><span>sinistros com vítimas · ${escapeHTML(recorte.descricao)}</span></div></div>`;
}

function painelPagina(dados) {
  const selo = dados?.simulado ? '<span class="pu-section-pill is-simulado"><i data-lucide="flask-conical"></i>Simulado</span>':'';
  const recorte = dados ? obterRecorte(dados, state.periodo) : null;
  const botoes = PERIODOS_DISPONIVEIS.map(item => `<button type="button" data-period="${item.id}" aria-pressed="${state.periodo === item.id}" class="${state.periodo === item.id ? 'active' : ''}" title="${escapeHTML(item.ajuda)}">${escapeHTML(item.titulo)}</button>`).join('');
  return `<div class="pu-content-title"><div class="pu-section-label"><div><div class="overline">INDICADORES URBANOS</div><h1>Explorar <span class="pu-title-accent">indicadores</span></h1><p>Dados consolidados para compreender como e quando ocorrem sinistros</p></div><span class="pu-section-pill"><i data-lucide="calendar-days"></i>${escapeHTML(periodoSelo(dados, state.periodo))}</span>${selo}</div></div>
  <section class="pu-period-bar" aria-label="Recorte da contagem de sinistros"><div class="pu-period-intro"><i data-lucide="calendar-range"></i><span>Período</span></div><div class="pu-period-switch" role="group" aria-label="Selecionar dias disponíveis da contagem">${botoes}</div><button class="pu-period-help" type="button" aria-label="Quais dados mudam com o período?" data-widget-title="Recortes realmente disponíveis" data-widget-help="Histórico: soma desde 2022; 2 semanas: soma das duas semanas completas mais recentes; 7 dias: dias detalhados no extrato. Os horários e o ranking de vias continuam históricos, porque não existe desagregação temporal dessas métricas no JSON. O clima mostra previsão atual da Open-Meteo."><i data-lucide="info"></i></button></section>
  <div class="pu-panel-summary">${painelDestaque(dados)}<div class="pu-panel-summary-side">${statsWidget(dados, true)}</div></div>
  <section class="pu-analytics-grid" aria-label="Gráficos e indicadores">
    ${trendWidget(dados)}${heatWidget(dados)}${viasWidget(dados)}${softWeather()}
  </section>`;
}

function fonteCard(icon, nome, descricao, href, etiqueta) {
  return `<a class="pu-source-link" href="${href}" target="_blank" rel="noopener noreferrer"><span class="pu-source-icon"><i data-lucide="${icon}"></i></span><span class="pu-source-copy"><strong>${nome}</strong><small>${descricao}</small></span><span class="pu-source-tag">${etiqueta}</span><i data-lucide="arrow-up-right" class="pu-source-arrow"></i></a>`;
}

function fontesPagina(dados) {
  const origem = dados?.fonte || 'Infosiga-SP / Detran-SP';
  const periodo = dados?.periodo || 'Aguardando dados do município';
  return `<div class="pu-sources-hero"><div><div class="overline">ORIGEM E VERIFICAÇÃO</div><h1>Fontes em <span class="pu-title-accent">destaque.</span></h1><p>Acompanhe as bases públicas utilizadas para produzir os indicadores de <strong>${escapeHTML(region.name)}, ${escapeHTML(region.uf)}</strong>. Os números vêm de registros oficiais, e os textos de análise são produzidos por <strong>regras fixas</strong>, sem IA generativa em tempo real.</p></div><div class="pu-source-counter"><i data-lucide="shield-check"></i><strong>Dados rastreáveis</strong><small>Período e metodologia acessíveis</small></div></div>
  <div class="pu-verify-strip"><strong><i data-lucide="list-checks"></i>Confira antes de interpretar</strong><div><span><i data-lucide="external-link"></i>Abra a fonte</span><i data-lucide="arrow-right"></i><span><i data-lucide="calendar-days"></i>Confira a data</span><i data-lucide="arrow-right"></i><span><i data-lucide="map-pin"></i>Confirme a região</span></div></div>
  <section class="pu-source-section" aria-labelledby="fontesPrincipais"><div class="pu-sources-heading"><span><i data-lucide="database"></i><div><h2 id="fontesPrincipais">Fontes principais</h2><p>Dados que alimentam diretamente a cartografia, os totais e o clima.</p></div></span><span class="pu-source-number">03</span></div><div class="pu-source-grid">
  ${fonteCard('route','Infosiga-SP / Detran-SP','Sinistros com vítimas, contagens, vias e coordenadas agregadas.','https://infosiga.detran.sp.gov.br','Segurança viária')}
  ${fonteCard('cloud-sun','Open-Meteo','Previsão do tempo para a localização escolhida.','https://open-meteo.com/','Meteorologia')}
  ${fonteCard('map','OpenStreetMap','Mapa-base com dados abertos de colaboradores do OpenStreetMap.','https://www.openstreetmap.org/copyright','Cartografia')}
  </div><div class="pu-sources-foot"><i data-lucide="info"></i><span>Base de sinistros: <strong>${escapeHTML(origem)}</strong>. Janela semanal mais recente: <strong>${escapeHTML(periodo)}</strong>. O histórico completo e a janela recente usam recortes distintos.</span></div></section>
  <section class="pu-source-section" aria-labelledby="fontesComplementares"><div class="pu-sources-heading"><span><i data-lucide="layers-3"></i><div><h2 id="fontesComplementares">Referências complementares</h2><p>Documentação, localidades e critérios para conferir os resultados.</p></div></span><span class="pu-source-number">03</span></div><div class="pu-source-grid">
  ${fonteCard('landmark','IBGE — Localidades','Códigos de municípios do índice publicado com o projeto.','https://servicodados.ibge.gov.br/api/docs/localidades','Território')}
  ${fonteCard('file-check-2','Metodologia de cálculo','Critérios de ranking, horários e variação disponíveis no projeto.','https://github.com/GuiAtoguia/pulso-urbano#dados','Cálculos')}
  ${fonteCard('git-branch','Código e arquivos do projeto','Estrutura e procedimentos para regenerar os dados.','https://github.com/GuiAtoguia/pulso-urbano','Código aberto')}
  </div></section>
  <section class="pu-source-section pu-method-section" aria-labelledby="metodologiaInline"><div class="pu-sources-heading"><span><i data-lucide="book-open-check"></i><div><h2 id="metodologiaInline">Metodologia e limitações</h2><p>Como interpretar os registros, o que cada métrica realmente representa e onde há lacunas.</p></div></span></div><div class="pu-method-keypoints"><span><i data-lucide="database"></i> Dados do Infosiga-SP</span><span><i data-lucide="calendar-range"></i> Períodos documentados</span><span><i data-lucide="shield-alert"></i> Limitações explícitas</span></div><div class="pu-method-inline">${montarConteudoFontes(dados)}</div></section>`;
}

function renderAppContent() {
  const dados = municipioData.status === 'ok' ? municipioData.dados : null;
  const pagina = state.view === 'fontes' ? fontesPagina(dados) : state.view === 'painel' ? painelPagina(dados) : mapaPagina(dados);
  return `<div class="pu-demo is-filled">${topHeader()}<main class="pu-demo-body" id="conteudo" tabindex="-1">${pagina}</main>${demoFooter()}</div>`;
}

function render() {
  $('#app').innerHTML = renderAppContent();
  document.documentElement.dataset.mode = state.mode;
  document.documentElement.dataset.color = state.color;
  if (window.lucide?.createIcons) window.lucide.createIcons({ attrs: { 'aria-hidden': 'true' } });
  if (state.view === 'mapa') montarMapa();
}

// Anúncios para leitor de tela — regiões persistentes (ver index.html), nunca
// recriadas pelo render(), senão o leitor de tela não percebe a mudança de texto.
const tooltip = document.createElement('div');
tooltip.id = 'puTooltip'; tooltip.setAttribute('role','tooltip');
document.body.appendChild(tooltip);
let tooltipAnchor = null;
function esconderTooltip() { tooltip.classList.remove('visible'); tooltipAnchor = null; }
function mostrarTooltip(anchor) {
  if (!anchor || !anchor.isConnected) return;
  tooltipAnchor = anchor;
  const titulo = anchor.dataset.widgetTitle ?? '';
  const descricao = anchor.dataset.widgetHelp ?? '';
  tooltip.innerHTML = `<strong>${escapeHTML(titulo)}</strong><span>${escapeHTML(descricao)}</span>`;
  tooltip.classList.add('visible');
  const r = anchor.getBoundingClientRect();
  const w = Math.min(320, window.innerWidth - 24);
  tooltip.style.width = `${w}px`;
  const x = Math.max(12, Math.min(window.innerWidth - w - 12, r.right - w));
  const altura = tooltip.getBoundingClientRect().height;
  const y = r.bottom + 10 + altura < window.innerHeight ? r.bottom + 10 : Math.max(12, r.top - altura - 10);
  tooltip.style.left = `${x}px`; tooltip.style.top = `${y}px`;
}
document.addEventListener('pointerover', e => {
  const b = e.target.closest?.('[data-widget-help]');
  if (b && b !== tooltipAnchor && e.pointerType !== 'touch') mostrarTooltip(b);
});
document.addEventListener('pointerout', e => {
  if (tooltipAnchor && tooltipAnchor.contains(e.target) && !tooltipAnchor.contains(e.relatedTarget)) esconderTooltip();
});
document.addEventListener('focusin', e => {
  const b=e.target.closest?.('[data-widget-help]'); if(b)mostrarTooltip(b);
});
document.addEventListener('focusout', e => {
  if(tooltipAnchor && tooltipAnchor.contains(e.target) && !tooltipAnchor.contains(e.relatedTarget)) esconderTooltip();
});
document.addEventListener('click', e => {
  const b=e.target.closest?.('[data-widget-help]');
  if (b) mostrarTooltip(b); // clicar conserva a dica visível mesmo após hover de mouse
  else if(tooltipAnchor)esconderTooltip();
});
document.addEventListener('keydown',e=>{if(e.key==='Escape')esconderTooltip();});
window.addEventListener('scroll',esconderTooltip,{passive:true});
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
  const trocarPagina = e.target.closest('[data-view]');
  if (trocarPagina) {
    const alvo = trocarPagina.dataset.view;
    if (['mapa','painel','fontes'].includes(alvo) && state.view !== alvo) {
      state.view = alvo; state.paletteOpen = false;
      render(); window.scrollTo({ top: 0, behavior: 'instant' });
      anunciar(`Seção ${alvo} aberta.`);
    }
    return;
  }
  const periodo = e.target.closest('[data-period]');
  if (periodo && PERIODOS_DISPONIVEIS.some(p => p.id === periodo.dataset.period)) {
    state.periodo = periodo.dataset.period; render(); return;
  }
  const escolha = e.target.closest('[data-palette-color]');
  if (escolha) {
    state.color = escolha.dataset.paletteColor; state.paletteOpen = false;
    try { localStorage.setItem('pulso-urbano-cor', state.color); } catch (_) {}
    render(); return;
  }
  if (e.target.closest('[data-palette-close]')) { state.paletteOpen = false; render(); return; }
  if (e.target.closest('[data-palette-toggle]')) { state.paletteOpen = !state.paletteOpen; render(); return; }
  if (state.paletteOpen && !e.target.closest('.pu-palette-wrap')) {
    state.paletteOpen = false;
    document.querySelector('#puPalette')?.remove();
    document.querySelector('[data-palette-toggle]')?.setAttribute('aria-expanded','false');
  }
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

// Seletor Estado -> Município inspirado no Material You.
// O menu é colocado fora do #app para nunca sofrer recorte pelo overflow do iframe.
// Somente municípios com dados gerados em data/municipios/*.json.
// O índice embutido em data/indice.json é a fonte única de localidades disponíveis.
let cidadesDisponiveis = [];
let indiceStatus = 'carregando';
let indiceErro = '';
async function carregarMunicipiosDisponiveis() {
  const resultado = await carregarIndice();
  if (!resultado.ok) {
    indiceStatus = 'erro';
    indiceErro = 'Não foi possível ler o índice de municípios. Verifique o servidor local.';
    if (pick.open) drawPicker();
    return;
  }
  cidadesDisponiveis = resultado.dados.filter(item =>
    item && typeof item.nome === 'string' && /^\d{7}$/.test(String(item.ibge)) &&
    Number.isFinite(item.lat) && Number.isFinite(item.lon) && item.uf === 'SP'
  ).sort((a,b) => a.nome.localeCompare(b.nome,'pt-BR'));
  indiceStatus = 'ok';
  if (pick.open) drawPicker();
}

const pick = { open: false, anchor: null };
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
  pick.anchor = anchor; pick.open = true;
  $('#regionPicker').hidden = false;
  $('#regionSearch').value = ''; drawPicker();
  requestAnimationFrame(() => { locatePicker(); $('#regionSearch').focus({ preventScroll: true }); });
}
function closePicker() { pick.open = false; pick.anchor = null; $('#regionPicker').hidden = true; }
function drawPicker() {
  $('#rpHeading').textContent = 'Escolher município';
  $('#rpSubtitle').textContent = 'Cidades com dados disponíveis no projeto';
  $('#regionSearch').placeholder = 'Pesquisar município…';
  $('#rpBack').hidden = true;
  const texto = norm($('#regionSearch').value.trim());
  const resultados = cidadesDisponiveis.filter(item => norm(item.nome).includes(texto));
  $('#rpList').innerHTML = indiceStatus === 'carregando'
    ? '<div class="rp-empty">Carregando cidades disponíveis…</div>'
    : indiceStatus === 'erro'
      ? `<div class="rp-empty">${escapeHTML(indiceErro)}<button type="button" data-retry-index>Recarregar lista</button></div>`
      : resultados.length
        ? resultados.map(item => `<button type="button" class="rp-item ${item.ibge === region.ibge ? 'is-selected' : ''}" role="option" aria-selected="${item.ibge === region.ibge}" data-rp-value="${escapeHTML(item.nome)}" data-rp-ibge="${escapeHTML(item.ibge)}"><span class="rp-item-icon"><i data-lucide="map-pin"></i></span><span class="rp-item-copy"><strong>${escapeHTML(item.nome)}</strong><small>${item.ibge === region.ibge ? 'Município atual' : 'Disponível para consulta'}</small></span>${item.ibge === region.ibge ? '<i data-lucide="check" class="rp-selected-check"></i>' : ''}</button>`).join('')
        : '<div class="rp-empty">Nenhuma cidade encontrada.</div>';
  $('#rpFoot').textContent = `${cidadesDisponiveis.length} municípios com dados · São Paulo`;
  if (window.lucide?.createIcons) window.lucide.createIcons({ attrs: { 'aria-hidden': 'true' } });
  requestAnimationFrame(locatePicker);
}

function selectCity(name, ibge) {
  const cidade = cidadesDisponiveis.find(c => String(c.ibge) === String(ibge) && c.nome === name);
  if (!cidade) { anunciarErro('Esse município não está disponível no conjunto de dados.'); return; }
  guardaGeocode.novo();
  region.name = cidade.nome;
  region.uf = cidade.uf;
  region.ibge = String(cidade.ibge);
  region.lat = Number(cidade.lat);
  region.lon = Number(cidade.lon);
  region.resolving = false;
  closePicker();
  render();
  carregarDadosDoMunicipio();
  carregarClima();
  salvarRegiao();
  anunciar(`Região selecionada: ${cidade.nome}, ${cidade.uf}.`);
}
document.addEventListener('click', e => {
  const pickerBtn = e.target.closest('[data-open-location]');
  if (pickerBtn) { showPicker(pickerBtn); return; }
  const item = e.target.closest('[data-rp-value]');
  if (item) { selectCity(item.dataset.rpValue, item.dataset.rpIbge || null); return; }
  if (e.target.closest('[data-retry-index]')) { indiceStatus='carregando'; drawPicker(); carregarMunicipiosDisponiveis(); return; }
  if (pick.open && !e.target.closest('#regionPicker')) closePicker();
});
$('#regionSearch').addEventListener('input', drawPicker);
// O índice só contém municípios de SP, portanto não existe etapa de estado.
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
carregarMunicipiosDisponiveis();
carregarDadosDoMunicipio();
carregarClima();
resolverRegiaoInicial();
