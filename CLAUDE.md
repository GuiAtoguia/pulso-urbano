# Pulso Urbano — Ideathon Fatec 2026

Observatório web de sinistros de trânsito. Site estático em HTML + CSS + JS puro (módulos ES),
sem servidor, sem login e sem chave de API privada. Escopo: Araçatuba e municípios da região.

## Regras do regulamento (não quebrar)
- Nada pago, nenhuma chave de API no código, sem login.
- Dado real ou simulado, sempre declarado na tela (flag `simulado` no JSON).
- Acessibilidade mínima: contraste, texto redimensionável, informação nunca só por cor.
- Declarar bibliotecas e uso de IA no README.

## Stack
- HTML/CSS/JS puro. Sem framework e sem etapa de build no site.
- Leaflet 1.9.4 via CDN (versão fixa) com tiles do OpenStreetMap e atribuição visível.
- Lucide (versão fixa, nunca @latest) e Montserrat.
- Clima: Open-Meteo, direto do navegador, com fallback "clima indisponível".
- Scripts de dados em Node (`scripts/`). Testes com Vitest (só devDependency).

## Dados
- Fonte: Infosiga-SP (sinistros com vítimas / óbitos). NÃO existe coluna de bairro:
  ranking por via (logradouro), com nomes padronizados.
- CSV bruto fica em `data-raw/` (fora do Git). Só os JSON gerados vão para `data/`.
- Nunca inventar dado. Se faltar informação, perguntar.
- Contrato por município em `data/municipios/<codigoIBGE>.json`:
  { ibge, nome, uf, fonte, periodo, simulado, totalPeriodoCompleto,
    totalUltimas2Semanas, amostraSemanalPequena, porHora[9], porDia[7],
    variacaoSemanaPct, pico, ranking:{tipo:"via", itens:[{nome,pct}]},
    pontos:[{lat,lon,n}] }
  `totalPeriodoCompleto` é 2022 até a última data do extrato (mesmo universo de
  `porHora`/`ranking`/`pontos`); `totalUltimas2Semanas` é a soma das 2 últimas
  semanas completas do extrato (nunca só a mais recente). `amostraSemanalPequena`
  é `true` quando `totalUltimas2Semanas` < 30 — nesse caso `variacaoSemanaPct` é
  `null` e a tela nunca fala em aumento/queda. O mínimo de 20 para mostrar o
  ranking de vias é sobre `totalPeriodoCompleto`, nunca sobre a janela de 2 semanas.
- `data/indice.json` lista os municípios com dados: [{ibge,nome,uf,lat,lon}].
- `pontos` são coordenadas arredondadas (3 casas) e agrupadas, para não expor cada ocorrência.
- Município sem arquivo: mostrar "sem dados para este município", nunca números fixos.

## Convenções
- Commits convencionais: feat:, fix:, docs:, chore:, test:. Um commit por tarefa concluída.
- Funções puras e pequenas; comentários só quando o motivo não for óbvio.
- Tratamento de erro em todo fetch (timeout, resposta inválida, JSON ausente).
- Teste para qualquer função que calcule número exibido na tela.
- Não alterar o visual aprovado sem pedir.