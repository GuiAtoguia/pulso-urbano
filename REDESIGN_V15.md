# Pulso Urbano — Material You v15

Esta versão parte do ZIP da v14 e preserva os dados e o formato JSON original de 43 municípios. Projeto estático sem login, backend de dados ou chave privada.

## Alterações

- **Mapa:** substituição das URLs CARTO por `https://tile.openstreetmap.org/{z}/{x}/{y}.png` usando Leaflet. Tiles solicitados apenas no viewport, sem prefetch. Atribuição © OpenStreetMap contributors visível. Sem mudança de URL de tiles ao alternar tema. Em falha predominante, tiles de erro são ocultados e aparece aviso claro com link OSM; pontos locais seguem desenhados. Se Leaflet/CDN estiver indisponível, há iframe OSM de fallback, mas nesse caso não há sobreposição dos dados históricos.
- **Pontos:** a visualização agrega pontos de `dados.pontos` em células de pixels conforme o zoom (até 15); em zoom ≥16 mostra coordenadas originais arredondadas do extrato. Cada popup mostra quantos sinistros foram agregados. Os dados de origem são preservados sem alteração. Em desktop, a roda do mouse rola a página, e o zoom usa +/- ou gestos.
- **Painel:** os totais exibem o período correto (`Histórico` ou `2 semanas`) e mostram como cada valor é calculado. O ranking de vias e o gráfico de horários continuam históricos; a curva usa a última semana completa do extrato. Não são inventadas séries novas. Pontos da curva, faixas horárias, vias, indicadores e dias do clima têm descrições interativas por mouse/toque/teclado.
- **Localidades:** o dropdown Estado → Cidade usa apenas `data/indice.json`, com 43 cidades de SP; não chama Nominatim nem o catálogo completo do IBGE. Coordenadas são as publicadas no índice. Se a leitura do índice falhar, mostra estado de erro e opção de tentar novamente.
- **Clima:** a previsão Open-Meteo é buscada por município, com cache de até 15 minutos na sessão e detalhes de máximas/mínimas consultáveis por dia.
- **Fontes:** metodologia completa movida do modal para a tela Fontes, incluindo cobertura, recortes, madrugada, limitações dos pontos, atualizações de clima e ferramentas utilizadas.
- **Footer:** somente “Ideathon Fatec 2026” e link “Projeto no GitHub” com ícone `git-branch`.
- **UI:** remove a “Visão geral” e a faixa explicativa extensa dos filtros. Preserva as paletas claro/escuro, policromática e monocromática da v14.

## Execução

No Windows, execute `INICIAR_WINDOWS.bat` com Node LTS instalado. Em outros sistemas: `node server.mjs`. Acesse `http://127.0.0.1:4173` (ou porta exibida). Não é necessário `npm install` para servir o site, somente para rodar testes Vitest/Playwright.

## Política dos tiles OpenStreetMap

O projeto respeita a [política de uso dos tiles OSM](https://operations.osmfoundation.org/policies/tiles/): URL oficial, atribuição, Referer do navegador e cache HTTP padrão, sem baixar toda uma região, sem varrer zooms por automação e sem contornar bloqueios. A infraestrutura pública não garante disponibilidade; para produção com tráfego alto, use hospedagem de tiles adequada ou provedor autorizado.

## Restrições da fonte

- Registros do Infosiga-SP cobrem o extrato consolidado fornecido no ZIP, não o presente em tempo real.
- O mapa utiliza registros com coordenadas disponíveis; alguns registros contam no total, mas não podem aparecer no mapa.
- O ranking é por via, não bairro; porcentagens vêm da fonte já arredondadas.
- Gráfico por horário: faixas de 06h a 24h; madrugada excluída somente desse gráfico.
- A Open-Meteo retorna previsão/condição **atuais**, não as condições históricas dos sinistros.

## Verificações

O contrato de dados e os nomes dos 43 arquivos são verificados por `node scripts/verificar-redesign-v15.mjs`. A interface foi exercitada em navegador isolado com fixtures JSON reais, sem erros de JavaScript nas seções Mapa/Painel/Fontes, cidade Araçatuba/Birigui e dois períodos. Carregamento da cartografia externa não pôde ser confirmado no navegador automatizado da sessão devido à restrição de rede; deve ser validado em um navegador com conexão real.
