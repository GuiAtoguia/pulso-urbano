# Notas: Open-Meteo (clima)

Consultado em 2026-11-07 em open-meteo.com/en/docs e open-meteo.com/en/terms.

## Uso gratuito: vale para este projeto?

Sim. O uso gratuito e sem chave de API é restrito a fins **não comerciais**: sites
pessoais sem assinatura/anúncios, automação pessoal, pesquisa pública e conteúdo
educacional, exatamente o caso do Pulso Urbano (projeto de ideathon, sem cobrança,
sem anúncios, sem login). Não precisa de chave de API, o que respeita a regra do
regulamento de não ter chave privada no código.

## Limites de uso

- Até 10.000 chamadas/dia, 5.000/hora e 600/minuto por IP/aplicação.
- Acima disso a Open-Meteo pode bloquear o IP/aplicação sem aviso prévio.
- Uso comercial ou volume maior exige plano pago (URL com prefixo `customer-`).

## Licença dos dados e atribuição

- Dados sob licença **CC BY 4.0** (exige atribuição ao criador: Open-Meteo).
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

# Notas: Infosiga-SP (sinistros) e scripts/gerar-dados.js

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
  municípios: diverge em Magda e Monções, que o Infosiga classifica em
  "SÃO JOSÉ DO RIO PRETO"). Cada linha já carrega seu `cod_ibge`.
- **Tipo**: só `tipo_registro` em `SINISTRO NAO FATAL` ou `SINISTRO FATAL` (exclui
  `NOTIFICACAO`, ~36% das linhas da região, quase sempre sem nenhuma contagem de
  gravidade preenchida: não é "sinistro com vítima/óbito" no sentido do CLAUDE.md).
  Confirmado em 2026-11-08 batendo o total estadual por ano do CSV bruto contra o
  gráfico oficial do painel Infosiga-SP: somando só `SINISTRO FATAL` +
  `SINISTRO NAO FATAL`, os totais coincidem exatamente (2022=130.684, 2023=140.502,
  2024=135.583, 2025=102.093, 2026=77.609, ver `scripts/verificar-totais.js`).
  Incluir `NOTIFICACAO` deixa o total 47-86% acima do oficial.
- **Janela temporal**: `ranking`, `pontos`, `porHora` e `totalPeriodoCompleto`
  usam todo o histórico filtrado (evita "sem dados" artificial em municípios
  pequenos); só `totalUltimas2Semanas`, `porDia` e `variacaoSemanaPct` usam as
  últimas 2 semanas completas do extrato (20 a 26/09/2026 vs. 13 a 19/09/2026,
  calculado dinamicamente a partir da maior data encontrada no CSV, não
  hardcoded).
- **Madrugada (00h às 06h)**: fora do `porHora` (~7,8% das linhas da região), mesma
  convenção de 9 faixas de 2h (`06h`...`22h`) já usada em `gerar-simulado.js`.
- **Nome do município**: nome oficial do IBGE (`localidades/municipios/<ibge>`),
  não o texto do CSV (que vem em caixa alta sem acento, ex. `"ARACATUBA"`).
- **Coordenadas de `data/indice.json`**: Nominatim, 1 requisição/segundo, rodado uma
  vez e commitado (mesma fonte dos tiles do Leaflet).

## Achado após gerar os dados reais

Com arredondamento de 3 casas decimais (contrato do CLAUDE.md) sobre todo o
histórico, cidades maiores acumulam muitos pontos: Araçatuba ficou com 1.795
(metade com `n=1`), Birigui 1.095. Decisão (confirmada): manter como está, seguindo
o contrato à risca (o Leaflet já integrado renderiza isso sem travar, testado).
Se algum dia isso virar problema de performance/privacidade de verdade, as opções
discutidas foram: limitar a top-N pontos por município, ou re-agrupar só os pontos
com `n=1` numa grade mais larga.

## Correção de coerência (P13a, 2026-11-08)

Dois bugs de coerência encontrados ao revisar o que cada número da tela
realmente mostrava:

1. **`total` só tinha a semana mais recente, não as "2 últimas semanas".**
   O código somava só `totalSemanaAtual` em `total`, mas o texto da fonte e a
   metodologia diziam "últimas 2 semanas completas". Pra Araçatuba: semana
   atual = 18, anterior = 16, soma real = 34. Corrigido renomeando o campo
   pra `totalUltimas2Semanas` e somando as duas semanas de verdade.
2. **O mínimo de 20 sinistros pro ranking de vias comparava com a janela
   errada.** `fraseVia` e o cartão "Vias em destaque" comparavam o total de
   *2 semanas* com 20, quando o ranking em si é calculado sobre o *histórico
   completo*: em município pequeno isso escondia um ranking perfeitamente
   confiável. Corrigido com o novo campo `totalPeriodoCompleto`
   (`registros.length`, mesmo universo do ranking/pontos/porHora), que agora
   é a base de comparação certa.

Nova regra, decidida junto com a correção: `variacaoSemanaPct` só é calculada
se as 2 últimas semanas somarem pelo menos 30 sinistros (`TOTAL_MINIMO_VARIACAO`
em `js/insights.js`, mesmo padrão de `TOTAL_MINIMO_RANKING`); abaixo disso, o
novo campo `amostraSemanalPequena` fica `true`, `variacaoSemanaPct` vai `null`,
e a tela mostra "amostra pequena" em vez de uma variação sem base estatística.

## Correções de UI (P13b, 2026-11-08)

- **Mapa (densidade visual)**: Araçatuba chega a 1.795 pontos, com um ponto
  isolado em `n=228` (o resto majoritariamente `n=1`). Decisão (confirmada
  com o usuário): resolver só com raio menor (`raioPonto`: min/max 6/22 →
  4/14) e opacidade menor (`fillOpacity`: 0.85 → 0.55), sem adicionar
  biblioteca de clustering (o Leaflet já renderiza esse volume sem travar,
  ver achado anterior): o problema era densidade visual, não performance.
- **Aviso "Tiles indisponíveis"**: antes virava permanente no primeiro
  `tileerror` isolado. Agora usa contadores cumulativos de `tileload`/
  `tileerror`; só aparece com uma amostra mínima (6 tiles) e maioria de erro
  (>50%), e some de novo se a taxa cair. Reseta ao trocar de município.
- **Rodapé**: os 4 links (Dados abertos, Metodologia, Acessibilidade, Sobre
  o projeto) viraram botões que abrem o modal "Fontes e metodologia". Dois
  deles (Acessibilidade, Sobre o projeto) não tinham seção correspondente
  antes; em vez de removê-los, foi acrescentado um item real de
  acessibilidade na Metodologia (`js/fontes.js`), descrevendo comportamento
  que já existe no código (skip-link, `aria-live`, tabelas ocultas, tema
  claro/escuro, unidades relativas): nada inventado. Remoção de "Interface
  demonstrativa" e "Pesquisa territorial" do rodapé (texto de protótipo sem
  função).
- **Insights sem amostra suficiente**: `frasePico` não tinha limiar nenhum
  (só validava o formato de `pico`): ganhou o mesmo limiar de `fraseVia`
  (`TOTAL_MINIMO_RANKING` sobre `totalPeriodoCompleto`, mesmo universo de
  `porHora`).
