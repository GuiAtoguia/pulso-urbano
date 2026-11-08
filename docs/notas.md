# Notas — Open-Meteo (clima)

Consultado em 2026-11-07 em open-meteo.com/en/docs e open-meteo.com/en/terms.

## Uso gratuito: vale para este projeto?

Sim. O uso gratuito e sem chave de API é restrito a fins **não comerciais**: sites
pessoais sem assinatura/anúncios, automação pessoal, pesquisa pública e conteúdo
educacional — exatamente o caso do Pulso Urbano (projeto de ideathon, sem cobrança,
sem anúncios, sem login). Não precisa de chave de API, o que respeita a regra do
regulamento de não ter chave privada no código.

## Limites de uso

- Até 10.000 chamadas/dia, 5.000/hora e 600/minuto por IP/aplicação.
- Acima disso a Open-Meteo pode bloquear o IP/aplicação sem aviso prévio.
- Uso comercial ou volume maior exige plano pago (URL com prefixo `customer-`).

## Licença dos dados e atribuição

- Dados sob licença **CC BY 4.0** — exige atribuição ao criador (Open-Meteo).
- Por isso o widget de clima mostra "Fonte: Open-Meteo (CC-BY 4.0)" no rodapé.

## Endpoint e parâmetros usados

`https://api.open-meteo.com/v1/forecast`

- `latitude`, `longitude`: coordenadas WGS84 do município.
- `current=temperature_2m,weather_code`: temperatura e código de tempo atuais.
- `daily=temperature_2m_max,temperature_2m_min,weather_code`: máx/mín e código por dia.
- `timezone=America/Sao_Paulo`: fixo, pois o escopo é Araçatuba e região.
- `forecast_days=5`: hoje + 4 dias seguintes (usados nos cartões do widget).

Os `weather_code` seguem a tabela oficial WMO documentada na própria página de docs
da Open-Meteo (mapeada em `js/clima.js`).

# Notas — Infosiga-SP (sinistros) e scripts/gerar-dados.js

Inspecionado em 2026-11-08, a partir de `data-raw/sinistros_2022-2024.csv` e
`data-raw/sinistros_2025-2026.csv` (fora do Git). Plano completo discutido antes de
escrever o código: `scripts/gerar-dados.js` lê os dois CSVs em streaming e gera
`data/indice.json` + `data/municipios/<ibge>.json`.

## Formato dos CSVs

Separador `;`, codificação **ISO-8859-1/Latin-1**, quebra de linha CRLF, decimal com
vírgula em `latitude`/`longitude`. Datas em `data_sinistro` como `dd/mm/aaaa`; hora
em `hora_sinistro` como `HH:MM` (24h). 50 colunas, mesmo cabeçalho nos dois arquivos.
Período coberto: 01/01/2022 a 30/09/2026.

## Decisões de escopo (confirmadas com o usuário)

- **Região**: linhas com `regiao_administrativa == 'ARAÇATUBA'` (43 municípios),
  não a Região Geográfica Imediata do IBGE (`regiao-imediata/350022`, só 14
  municípios — diverge em Magda e Monções, que o Infosiga classifica em
  "SÃO JOSÉ DO RIO PRETO"). Cada linha já carrega seu `cod_ibge`.
- **Tipo**: só `tipo_registro` em `SINISTRO NAO FATAL` ou `SINISTRO FATAL` (exclui
  `NOTIFICACAO`, ~36% das linhas da região, quase sempre sem nenhuma contagem de
  gravidade preenchida — não é "sinistro com vítima/óbito" no sentido do CLAUDE.md).
- **Janela temporal**: `ranking`, `pontos` e `porHora` usam todo o histórico
  filtrado (evita "sem dados" artificial em municípios pequenos); só `total`,
  `porDia` e `variacaoSemanaPct` usam as últimas 2 semanas completas do extrato
  (20–26/09/2026 vs. 13–19/09/2026 — calculado dinamicamente a partir da maior data
  encontrada no CSV, não hardcoded).
- **Madrugada (00h–06h)**: fora do `porHora` (~7,8% das linhas da região) — mesma
  convenção de 9 faixas de 2h (`06h`...`22h`) já usada em `gerar-simulado.js`.
- **Nome do município**: nome oficial do IBGE (`localidades/municipios/<ibge>`),
  não o texto do CSV (que vem em caixa alta sem acento, ex. `"ARACATUBA"`).
- **Coordenadas de `data/indice.json`**: Nominatim, 1 requisição/segundo, rodado uma
  vez e commitado (mesma fonte dos tiles do Leaflet).

## Achado após gerar os dados reais

Com arredondamento de 3 casas decimais (contrato do CLAUDE.md) sobre todo o
histórico, cidades maiores acumulam muitos pontos: Araçatuba ficou com 1.795
(metade com `n=1`), Birigui 1.095. Decisão (confirmada): manter como está, seguindo
o contrato à risca — o Leaflet já integrado renderiza isso sem travar (testado).
Se algum dia isso virar problema de performance/privacidade de verdade, as opções
discutidas foram: limitar a top-N pontos por município, ou re-agrupar só os pontos
com `n=1` numa grade mais larga.
