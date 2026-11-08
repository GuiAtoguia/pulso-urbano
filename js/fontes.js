// Pulso Urbano — fontes.js
// Monta o conteúdo (HTML) do modal "Fontes e metodologia". Função pura, sem DOM:
// recebe o JSON do município (ou null/undefined quando não há arquivo) e devolve
// uma string HTML segura — todo valor vindo do JSON passa por escapeHTML.
// A metodologia (seção 2) descreve exatamente as regras de scripts/gerar-dados.js
// e js/insights.js; mudou uma, muda aqui também.

const escapeHTML = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const LINK_ATTRS = 'target="_blank" rel="noopener noreferrer"';

function secaoDados(dados) {
  if (!dados) {
    return `<section class="fontes-secao" aria-labelledby="fontesSecaoDados">
      <h3 id="fontesSecaoDados">Dados de sinistros</h3>
      <p>Os sinistros vêm do <strong>Infosiga-SP / Detran-SP</strong>, sob licença
      <strong>CC BY 4.0</strong> (<a href="https://infosiga.detran.sp.gov.br" ${LINK_ATTRS}>infosiga.detran.sp.gov.br</a>).</p>
      <p>Nenhum dado está carregado para o município atual no momento: período e
      fonte aparecem aqui assim que os dados forem carregados.</p>
    </section>`;
  }

  const periodo = dados.periodo ? escapeHTML(dados.periodo) : '—';
  const fonte = dados.fonte ? escapeHTML(dados.fonte) : '—';
  const avisoSimulado = dados.simulado === true
    ? `<p class="fontes-aviso-simulado" role="note"><strong>Dados simulados</strong>: estes números são apenas para demonstração, enquanto não há extrato real disponível para este município.</p>`
    : '';

  return `<section class="fontes-secao" aria-labelledby="fontesSecaoDados">
    <h3 id="fontesSecaoDados">Dados de sinistros</h3>
    <p>Os sinistros vêm do <strong>Infosiga-SP / Detran-SP</strong>, sob licença
    <strong>CC BY 4.0</strong> (<a href="https://infosiga.detran.sp.gov.br" ${LINK_ATTRS}>infosiga.detran.sp.gov.br</a>).</p>
    <dl class="fontes-lista-definicao">
      <dt>Período mostrado</dt><dd>${periodo}</dd>
      <dt>Fonte</dt><dd>${fonte}</dd>
    </dl>
    ${avisoSimulado}
  </section>`;
}

function secaoMetodologia() {
  return `<section class="fontes-secao" aria-labelledby="fontesSecaoMetodologia">
    <h3 id="fontesSecaoMetodologia">Critérios de leitura</h3>
    <ul class="fontes-lista">
      <li><strong>Ranking por via, não por bairro</strong>: a base do Infosiga-SP
      não traz coluna de bairro, só o logradouro (rua/avenida) onde o sinistro
      aconteceu.</li>
      <li><strong>Mínimo de 20 sinistros no período completo</strong> (2022 até
      a última data do extrato) para mostrar o ranking de vias; abaixo disso,
      exibimos "dados insuficientes" em vez de um ranking pouco confiável.</li>
      <li><strong>Intensidade por horário</strong> cobre das 06h às 23h, em 9
      faixas de 2 horas. Sinistros de madrugada (00h às 05h) não entram nesse
      gráfico (mas continuam contando no total e no ranking).</li>
      <li><strong>Variação semanal</strong> compara o total de sinistros da
      última semana completa (domingo a sábado) disponível no extrato com o
      total da semana imediatamente anterior, em porcentagem. Só é calculada
      quando as duas semanas somam pelo menos 30 sinistros; abaixo disso,
      mostramos "amostra pequena" em vez de uma variação pouco confiável.
      Quando a semana anterior não teve nenhum sinistro (mas a amostra é
      suficiente), não dá pra calcular uma porcentagem (mostramos 0% se a
      semana atual também estiver zerada, ou "—" caso contrário).</li>
      <li><strong>Pontos no mapa</strong> usam só os registros que têm
      coordenada, arredondada a 3 casas decimais e agrupada com outros
      sinistros próximos, para não expor a localização exata de uma ocorrência
      isolada. Parte dos registros mais recentes (2025 a 2026) ainda não tem
      coordenada no extrato do Detran-SP.</li>
      <li><strong>O que é contado</strong>: sinistros classificados como fatais
      ou não fatais pelo Infosiga-SP. Notificações preliminares, sem gravidade
      ainda classificada, não entram na contagem.</li>
      <li><strong>Acessibilidade</strong>: link "Pular para o conteúdo" no
      topo da página, foco de teclado visível em todos os controles,
      mudanças de dados anunciadas a leitores de tela (regiões
      <code>aria-live</code>), os valores exatos de todo gráfico disponíveis
      também em tabela (lida por leitor de tela, mesmo onde o gráfico é só
      visual), tema claro/escuro e textos em unidades relativas (redimensionam
      com o zoom do navegador).</li>
    </ul>
  </section>`;
}

function secaoClima() {
  return `<section class="fontes-secao" aria-labelledby="fontesSecaoClima">
    <h3 id="fontesSecaoClima">Clima</h3>
    <p>A previsão vem da <strong>Open-Meteo</strong>
    (<a href="https://open-meteo.com" ${LINK_ATTRS}>open-meteo.com</a>), sob licença
    <strong>CC BY 4.0</strong>, de uso gratuito para fins não comerciais (o caso
    deste projeto).</p>
  </section>`;
}

function secaoBibliotecas() {
  return `<section class="fontes-secao" aria-labelledby="fontesSecaoBibliotecas">
    <h3 id="fontesSecaoBibliotecas">Bibliotecas e serviços</h3>
    <ul class="fontes-lista">
      <li><a href="https://leafletjs.com" ${LINK_ATTRS}>Leaflet 1.9.4</a>: biblioteca de mapas.</li>
      <li><a href="https://www.openstreetmap.org/copyright" ${LINK_ATTRS}>OpenStreetMap</a>: mapa-base e créditos dos colaboradores, conforme ODbL e política de tiles. A cartografia é carregada sob demanda.</li>
      <li><a href="https://lucide.dev" ${LINK_ATTRS}>Lucide</a>: ícones.</li>
      <li><a href="https://fonts.google.com/specimen/Montserrat" ${LINK_ATTRS}>Montserrat</a>: fonte, via Google Fonts.</li>
      <li><a href="https://servicodados.ibge.gov.br/api/docs/localidades" ${LINK_ATTRS}>IBGE</a>: códigos oficiais dos municípios exibidos no índice estático do projeto.</li>
      <li><a href="https://vitest.dev" ${LINK_ATTRS}>Vitest</a>: testes automatizados (roda só em desenvolvimento, não faz parte do site publicado).</li>
    </ul>
  </section>`;
}

function secaoIA() {
  return `<section class="fontes-secao" aria-labelledby="fontesSecaoIA">
    <h3 id="fontesSecaoIA">Sobre o desenvolvimento</h3>
    <p>O código deste projeto foi desenvolvido com apoio do
    <strong>Claude Code</strong> (Anthropic). Os números mostrados no site vêm dos
    dados oficiais listados acima. Não são gerados nem alterados por IA.</p>
  </section>`;
}

// dados: o JSON do município selecionado (ver data/municipios/<ibge>.json), ou
// null/undefined quando o município não tem arquivo. Nunca lança.
// As informações técnicas continuam acessíveis diretamente na página Fontes,
// mas ficam em cartões Material You expansíveis para preservar a leitura compacta.
// Somente a base do município inicia expandida; todos os demais detalhes podem
// ser abertos por mouse, toque ou teclado usando <details>/<summary> nativos.
export function montarConteudoFontes(dados) {
  const blocos = [
    [secaoDados(dados), 'database', 'Dados de sinistros e período'],
    [secaoMetodologia(), 'list-checks', 'Critérios de cálculo'],
    [secaoClima(), 'cloud-sun', 'Previsão meteorológica'],
    [secaoBibliotecas(), 'layers-3', 'Serviços e licenças'],
    [secaoIA(), 'code-2', 'Sobre o desenvolvimento'],
  ];
  return blocos.map(([html, icone, titulo], indice) => {
    const fimCabecalho = html.indexOf('</h3>');
    const conteudo = html.slice(fimCabecalho + 5).replace(/<\/section>\s*$/, '');
    return `<details class="fontes-secao pu-method-detail" ${indice === 0 ? 'open' : ''}>
      <summary class="pu-method-summary"><span class="pu-method-summary-icon"><i data-lucide="${icone}"></i></span><span><strong>${titulo}</strong><small>${['Base e janela do extrato selecionado','Como são calculados os indicadores','Diferença entre previsão e registros históricos','Créditos e direitos de uso','Como o projeto foi construído'][indice]}</small></span><i data-lucide="chevron-down" class="pu-method-chevron"></i></summary>
      <div class="pu-method-content">${conteudo}</div>
    </details>`;
  }).join('\n');
}
