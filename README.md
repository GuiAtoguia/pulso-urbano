# Pulso Urbano

Observatório web de sinistros de trânsito para Araçatuba e municípios da região, construído para o Ideathon Fatec 2026.

**Interface Material You v16**: Mapa, Painel e Fontes, temas claro/escuro, paletas incluindo monocromático/policromático, controles responsivos e gráficos consultáveis. Veja [REDESIGN_V16.md](REDESIGN_V16.md). Os 43 JSONs originais de sinistros foram preservados.

**Repositório:** https://github.com/GuiAtoguia/pulso-urbano

A publicação no GitHub Pages depende da configuração de Pages no repositório.

**Atualização v16:** segure **Ctrl** sobre o mapa e mova a roda do mouse para aplicar zoom sob o cursor. Os marcadores, legendas e tooltips acompanham a paleta ativa. O seletor agora abre diretamente os 43 municípios de SP publicados no projeto (sem etapa de estado). No Painel, os recortes são **Histórico**, **14 dias** e **7 dias**: o total semanal é calculado somando `porDia[7]`, o quinzenal vem de `totalUltimas2Semanas` e o acumulado vem de `totalPeriodoCompleto`. Cada recorte mostra as datas do extrato — **nunca dias futuros**. Os gráficos de horário e vias continuam históricos porque o arquivo não publica versões semanais; o clima segue sendo uma previsão atual. A metodologia está organizada em painéis expansíveis em Fontes. Para validar: `node scripts/verificar-redesign-v16.mjs`.

## Problema e solução

Sinistros de trânsito com vítimas são um problema real de mobilidade urbana e segurança viária, mas os dados abertos sobre o tema costumam ficar em planilhas brutas, difíceis de interpretar para quem não é especialista. O Pulso Urbano pega o extrato público do Infosiga-SP e transforma em um painel visual simples: para qualquer município da região de Araçatuba, mostra onde, quando e com que intensidade os sinistros acontecem, junto com o clima do dia, sem cobrar nada, sem login e sem chave de API privada, pra ser algo que uma prefeitura, uma ONG ou um cidadão curioso possa abrir e entender em poucos segundos.

## Funcionalidades

- Seletor Estado → Município **restrito às 43 cidades com dados publicados** em `data/indice.json`, com pesquisa e sem consultas externas ao IBGE para montar a lista.
- Mapa interativo Leaflet com **tiles oficiais padrão do OpenStreetMap** (sem CARTO nem chave de API). O conjunto de pontos georreferenciados é agrupado *visualmente* conforme o zoom para evitar sobreposição, mantendo os valores dos JSONs originais; legenda dinâmica, popup de contagem e fallback explícito se tiles ou biblioteca falharem.
- Indicadores: total de sinistros desde 2022 e nas últimas 2 semanas, horário de pico, vias mais afetadas.
- Ranking das vias com mais sinistros (via, não bairro: a fonte não tem essa coluna). Só aparece com pelo menos 20 sinistros no período completo (2022 até a última data do extrato); abaixo disso, mostra "dados insuficientes" em vez de um ranking pouco confiável.
- Gráfico de intensidade por horário (9 faixas de 2h, das 06h às 24h) e de sinistros por dia da semana, com variação em relação à semana anterior (quando a amostra das 2 últimas semanas é pequena, mostra "amostra pequena" em vez de uma variação sem base estatística).
- Gráficos e cartões com detalhes por mouse, toque ou teclado: totais, histórico, última semana, faixas horárias e previsão meteorológica. O filtro **Histórico / 14 dias / 7 dias** modifica os totais compatíveis; os outros gráficos exibem seus períodos originais, sem simular séries inexistentes.
- Previsão do tempo para a região (Open-Meteo).
- Página **Fontes** com links originais e toda a metodologia/limitações **na própria página**, sem modal e sem a antiga síntese automática.
- Tema claro/escuro com escolha salva; primeira visita em claro/amarelo, além de paletas e policromático.
- Acessível por teclado, com leitor de tela e em telas pequenas (375px+); estados de carregando/erro/sem dados sempre visíveis, nunca uma tela em branco.

**Limitação importante:** apenas os 43 municípios com arquivos em `data/municipios/` estão disponíveis no seletor. Novos municípios precisam ser adicionados ao índice e ter JSON validado; cidades sem dados não são oferecidas.

## Dados

- **Origem:** [Infosiga-SP / Detran-SP](https://infosiga.detran.sp.gov.br) (sinistros com vítimas: fatais e não fatais), licença **CC BY 4.0**.
- **Cobertura:** 43 municípios da região administrativa de Araçatuba (SP).
- **Período:** o extrato bruto cobre 01/01/2022 a 30/09/2026. O painel permite consultar três totais compatíveis com o JSON: o do período completo (2022 até a última data do extrato) e o das **últimas 2 semanas completas disponíveis**, além dos **7 dias da última semana completa** (ex.: 20 a 26/09/2026 para Araçatuba); a variação semanal e o gráfico por dia usam só a janela de 2 semanas, enquanto o ranking de vias e os pontos do mapa usam o histórico completo, pra não ficarem vazios em cidades pequenas.
- **Limitações conhecidas:**
  - A fonte não tem coluna de bairro: o ranking é por via (logradouro).
  - Parte dos registros de 2025 a 2026 ainda não tem coordenada no extrato do Detran-SP; esses sinistros contam no total, mas não aparecem no mapa.
  - Sinistros de madrugada (00h às 06h) não entram no gráfico de intensidade por horário (continuam contando no total e no ranking).
  - Notificações preliminares sem gravidade classificada não entram na contagem: só sinistros fatais e não fatais, os mesmos do painel oficial do Infosiga-SP.
- Os pontos do mapa são coordenadas arredondadas a 3 casas decimais e agrupadas, pra não expor a localização exata de uma ocorrência isolada.

## Tecnologias e bibliotecas

HTML, CSS e JavaScript puro (módulos ES nativos), sem framework, sem etapa de build.

| Biblioteca/serviço | Versão | Uso |
|---|---|---|
| [Leaflet](https://leafletjs.com) | 1.9.4 | Mapa interativo |
| [OpenStreetMap](https://www.openstreetmap.org/copyright) | — | Dados cartográficos, © colaboradores do OpenStreetMap, licença ODbL |
| [Tiles padrão OpenStreetMap](https://operations.osmfoundation.org/policies/tiles/) | — | Cartografia oficial; exige Referer, atribuição, cache e uso responsável; sem pré-download |
| [Lucide](https://lucide.dev) | 1.70.0 | Ícones |
| [Montserrat](https://fonts.google.com/specimen/Montserrat) | — | Fonte, via Google Fonts |
| [Open-Meteo](https://open-meteo.com) | API v1 | Previsão do tempo, licença CC BY 4.0, uso gratuito não comercial |
| [IBGE — Localidades](https://servicodados.ibge.gov.br/api/docs/localidades) | — | Códigos oficiais embutidos no índice estático `data/indice.json` |

| [Vitest](https://vitest.dev) | 5.1.0 | Testes automatizados (só desenvolvimento: não roda no site publicado) |
| [Playwright](https://playwright.dev) + [@axe-core/playwright](https://github.com/dequelabs/axe-core-npm) | ^1.65 / ^4.14 | Auditoria de acessibilidade e varredura dos municípios (só desenvolvimento) |
| [@vitest/coverage-v8](https://vitest.dev/guide/coverage) | ^5.1 | Relatório de cobertura dos testes (só desenvolvimento) |

Nenhum serviço pago, nenhuma chave de API no código.

## Uso de IA

O código deste projeto foi desenvolvido com apoio do **Claude Code** (Anthropic). Os números exibidos no site vêm das fontes oficiais listadas acima. Não são gerados nem alterados por IA. O painel apresenta somente métricas calculadas no processamento estático dos dados. Não há IA generativa em tempo real, nem cartão de "Visão geral".

## Conformidade com o regulamento

- Nenhum serviço pago, nenhuma chave de API privada no código.
- Sem login obrigatório.
- Dados reais, com fonte, período e licença declarados na página **Fontes** e flag `simulado` no JSON (hoje nenhum município usa dado simulado).
- Acessibilidade mínima: contraste calculado (WCAG AA), texto redimensionável (unidades `rem`), navegável por teclado, landmarks e leitor de tela, informação nunca só por cor.
- Bibliotecas, metodologias e papel da IA no desenvolvimento declarados nesta página e na tela **Fontes**.

## Como rodar localmente

```bash
node server.mjs
# em outro terminal (testes opcionais):
npm install
npm test
```

No Windows, execute `INICIAR_WINDOWS.bat` (Node.js LTS instalado).

Abra o endereço que `server.mjs` mostrar no terminal (normalmente `http://127.0.0.1:4173`). **Não** execute diretamente por `file://`, pois o carregamento dos JSONs exige um servidor HTTP.

## Como regenerar os dados

Os CSVs brutos do Infosiga-SP não ficam no repositório (são grandes e não são código). Pra gerar os JSON de novo:

1. Baixe os CSVs de sinistros em [infosiga.detran.sp.gov.br](https://infosiga.detran.sp.gov.br), aba **Dados Abertos** → **Documentos**.
2. Coloque os arquivos `.csv` dentro de `data-raw/` (a pasta já está no `.gitignore`, não vai pro Git).
3. Rode:
   ```bash
   npm run gerar-dados
   ```

O script espera o formato original do Infosiga-SP: separador `;`, codificação **ISO-8859-1 (Latin-1)**, quebra de linha **CRLF**, números decimais com **vírgula** (ex.: `-21,2076`). Se o formato do CSV mudar, o script precisa ser ajustado (ver `scripts/gerar-dados.js` e `docs/notas.md`).

## Estrutura de pastas

```
.
├── index.html
├── css/style.css
├── css/material-you-v16.css # camada de identidade Material You e refinamentos atuais
├── js/              # módulos ES: app.js (UI), data.js, clima.js, calc.js,
│                     # insights.js (histórico legado/testes), fontes.js, mensagens.js, preferencias.js,
│                     # sequencia.js (cada um com um *.test.js)
├── data/            # indice.json + municipios/<ibge>.json (gerados, versionados)
├── data-raw/        # CSVs brutos do Infosiga-SP (fora do Git)
├── scripts/         # gerar-dados.js (+ teste), gerar-simulado.js e verificar-totais.js
├── docs/            # notas.md (decisões de fonte de dados) e front-original.html
├── REDESIGN_V15.md  # alterações e limites de validação da nova versão
└── CLAUDE.md        # contrato de dados e convenções do projeto
```

## Equipe

- **Guilherme**: dados e back-end
- *(nome)*: *(função)*
- *(nome)*: *(função)*

## Licença

*A definir.* Sugestão: [MIT](https://opensource.org/license/mit/) para o código deste repositório (os dados seguem a licença própria de cada fonte: CC BY 4.0 para Infosiga-SP e Open-Meteo, ODbL para OpenStreetMap). Nenhum arquivo `LICENSE` foi criado ainda.
