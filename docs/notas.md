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
