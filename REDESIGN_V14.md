# Pulso Urbano — redesign Material You v14

Este arquivo explica **o que mudou no frontend**. O conjunto de dados, os scripts de geração, os cálculos e os testes anteriores foram preservados.

## Páginas

- **Mapa:** mapa Leaflet real com pontos agregados do Infosiga-SP, três indicadores, série semanal, intensidade horária, ranking de **vias** (não de bairros), previsão meteorológica e Visão geral.
- **Painel:** destaque com dois recortes que a base realmente fornece (histórico desde 2022 e últimas duas semanas completas), indicadores, gráficos, ranking de vias, clima e Visão geral. Alternar o destaque **não inventa um novo período de agregação para os demais gráficos**; cada gráfico conserva o seu período documentado.
- **Fontes:** links originais, explicação do uso dos dados, orientações de conferência, limitações e um botão de metodologia detalhada. O resumo é produzido por regras e **não** por Gemini ou outra IA em tempo real.

## Interface

- Material You **flat** sem efeitos de vidro, componentes tonais e responsividade desktop/tablet/celular.
- Tema claro/escuro e dez paletas: roxo, azul, ciano, verde, amarelo, laranja, vermelho, rosa, monocromático e policromático. Inicial: **claro + amarelo** (as escolhas são mantidas no `localStorage`).
- Navegação Mapa/Painel/Fontes no mesmo cabeçalho; região por popover Estado → Município; ícones Lucide.
- `css/material-you-v14.css` contém a camada de redesign sobre `css/style.css` (que permanece como base do projeto). Não altere dados JSON para modificar cores ou layout.

## Cartografia

O Leaflet permanece porque desenha os pontos reais de sinistros agregados e preserva as interações. O mapa base utiliza **CARTO Positron/Dark Matter** conforme o tema, com dados cartográficos do OpenStreetMap e atribuição visível de ambos. Requer internet. Limites e condições aplicáveis: [CARTO Basemaps](https://www.carto.com/legal/basemap-terms/index.html) e [OpenStreetMap](https://www.openstreetmap.org/copyright).

## Como abrir

**Windows:** dê dois cliques em `INICIAR_WINDOWS.bat` (precisa do Node.js instalado). O navegador abre `http://127.0.0.1:4173`.

**Outros sistemas:** no terminal, na pasta do projeto: `node server.mjs`. Acesse `http://127.0.0.1:4173`.

**GitHub Pages:** os arquivos são estáticos. Publique a raiz do repositório. Não é necessário servidor com banco nem compilar o frontend.

> Abrir `index.html` diretamente via `file://` pode impedir a leitura dos JSONs via `fetch`. Use o servidor local ou GitHub Pages.

## Fonte e interpretação

- Base local: 43 JSONs municipais originados do Infosiga-SP, incluídos no ZIP recebido.
- Previsão: Open-Meteo, consultada quando há conexão; não é dado histórico de sinistros.
- Dado ausente: município não incluído nos 43 JSONs mostra estado de ausência, sem números de exemplo.
- Ranking de **vias** só quando há amostra suficiente; o JSON não tem coluna de bairros.
- O período da série semanal e o período histórico dos pontos do mapa **não são idênticos**.

## Testes

Scripts de teste originais permanecem disponíveis: `npm ci`, `npm test` e `npm run test:e2e` (Playwright requer navegador e ambiente compatível). A interface também inclui `server.mjs`, que não tem dependências externas de Node.
