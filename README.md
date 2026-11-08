# Pulso Urbano

Observatório web de sinistros de trânsito para Araçatuba e municípios da região — construído para o Ideathon Fatec 2026.

**Link público:** https://<usuario>.github.io/<repositorio>/
*(troque `<usuario>` e `<repositorio>` pelo seu usuário e nome do repositório no GitHub — veja a seção "Publicação" abaixo)*

## Problema e solução

Sinistros de trânsito com vítimas são um problema real de mobilidade urbana e segurança viária, mas os dados abertos sobre o tema costumam ficar em planilhas brutas, difíceis de interpretar para quem não é especialista. O Pulso Urbano pega o extrato público do Infosiga-SP e transforma em um painel visual simples: para qualquer município da região de Araçatuba, mostra onde, quando e com que intensidade os sinistros acontecem, junto com o clima do dia — sem cobrar nada, sem login e sem chave de API privada, pra ser algo que uma prefeitura, uma ONG ou um cidadão curioso possa abrir e entender em poucos segundos.

## Funcionalidades

- Seletor de estado e município (lista oficial do IBGE, com busca).
- Mapa interativo (Leaflet/OpenStreetMap) com os pontos de sinistro agrupados por proximidade, coloridos e dimensionados por intensidade, com legenda.
- Indicadores do período: total de sinistros, horário de pico, vias mais afetadas.
- Ranking das vias com mais sinistros (via, não bairro — a fonte não tem essa coluna) — só aparece com pelo menos 20 sinistros no histórico; abaixo disso, mostra "dados insuficientes" em vez de um ranking pouco confiável.
- Gráfico de intensidade por horário (9 faixas de 2h, das 06h às 24h) e de variação semana a semana.
- Resumo em texto ("Visão geral") gerado por regras fixas a partir dos números — não é um resumo livre de IA.
- Previsão do tempo para a região (Open-Meteo).
- Modal "Fontes e metodologia" com a origem dos dados, as regras de cálculo e as bibliotecas usadas.
- Tema claro/escuro (segue a preferência do sistema no primeiro acesso, depois guarda a escolha).
- Acessível por teclado, com leitor de tela e em telas pequenas (375px+); estados de carregando/erro/sem dados sempre visíveis, nunca uma tela em branco.

**Limitação importante:** por enquanto, só a região de Araçatuba (43 municípios) tem dados reais gerados. Qualquer outro município do Brasil aparece no seletor (lista do IBGE), mas mostra "ainda não temos dados para este município" — isso é esperado, não é um erro.

## Dados

- **Origem:** [Infosiga-SP / Detran-SP](https://infosiga.detran.sp.gov.br) (sinistros com vítimas — fatais e não fatais), licença **CC BY 4.0**.
- **Cobertura:** 43 municípios da região administrativa de Araçatuba (SP).
- **Período:** o extrato bruto cobre 01/01/2022 a 30/09/2026. O painel mostra o total e a variação das **últimas 2 semanas completas disponíveis no extrato** (ex.: 20–26/09/2026 para Araçatuba); o ranking de vias e os pontos do mapa usam o histórico completo, pra não ficarem vazios em cidades pequenas.
- **Limitações conhecidas:**
  - A fonte não tem coluna de bairro — o ranking é por via (logradouro).
  - Parte dos registros de 2025–2026 ainda não tem coordenada no extrato do Detran-SP; esses sinistros contam no total, mas não aparecem no mapa.
  - Sinistros de madrugada (00h–06h) não entram no gráfico de intensidade por horário (continuam contando no total e no ranking).
  - Notificações preliminares sem gravidade classificada não entram na contagem — só sinistros fatais e não fatais.
- Os pontos do mapa são coordenadas arredondadas a 3 casas decimais e agrupadas, pra não expor a localização exata de uma ocorrência isolada.

## Tecnologias e bibliotecas

HTML, CSS e JavaScript puro (módulos ES nativos) — sem framework, sem etapa de build.

| Biblioteca/serviço | Versão | Uso |
|---|---|---|
| [Leaflet](https://leafletjs.com) | 1.9.4 | Mapa interativo |
| [OpenStreetMap](https://www.openstreetmap.org/copyright) | — | Tiles do mapa, © colaboradores do OpenStreetMap, licença ODbL |
| [Lucide](https://lucide.dev) | 1.70.0 | Ícones |
| [Montserrat](https://fonts.google.com/specimen/Montserrat) | — | Fonte, via Google Fonts |
| [Open-Meteo](https://open-meteo.com) | API v1 | Previsão do tempo, licença CC BY 4.0, uso gratuito não comercial |
| [API de localidades do IBGE](https://servicodados.ibge.gov.br/api/docs/localidades) | v1 | Lista de estados e municípios |
| [Nominatim](https://nominatim.org) (OpenStreetMap) | — | Coordenadas da cidade escolhida, só quando ainda não as temos |
| [Vitest](https://vitest.dev) | 5.1.0 | Testes automatizados (só desenvolvimento — não roda no site publicado) |

Nenhum serviço pago, nenhuma chave de API no código.

## Uso de IA

O código deste projeto foi desenvolvido com apoio do **Claude Code** (Anthropic). Os números exibidos no site vêm das fontes oficiais listadas acima — não são gerados nem alterados por IA. Os textos da seção "Visão geral" (pico, via, variação) são montados por regras fixas de comparação de números, escolhidas de forma determinística por município; não há IA generativa rodando em tempo real para interpretar dados.

## Conformidade com o regulamento

- Nenhum serviço pago, nenhuma chave de API privada no código.
- Sem login obrigatório.
- Dados reais, com fonte, período e licença declarados na tela (modal "Fontes e metodologia") e flag `simulado` no JSON — hoje nenhum município usa dado simulado.
- Acessibilidade mínima: contraste calculado (WCAG AA), texto redimensionável (unidades `rem`), navegável por teclado, landmarks e leitor de tela, informação nunca só por cor.
- Bibliotecas e uso de IA declarados nesta página e no modal "Fontes e metodologia".

## Como rodar localmente

```bash
npm install
npx serve .
npm test
```

Abra o endereço que o `serve` mostrar no terminal (geralmente `http://localhost:3000`).

## Como regenerar os dados

Os CSVs brutos do Infosiga-SP não ficam no repositório (são grandes e não são código). Pra gerar os JSON de novo:

1. Baixe os CSVs de sinistros em [infosiga.detran.sp.gov.br](https://infosiga.detran.sp.gov.br), aba **Dados Abertos** → **Documentos**.
2. Coloque os arquivos `.csv` dentro de `data-raw/` (a pasta já está no `.gitignore`, não vai pro Git).
3. Rode:
   ```bash
   npm run gerar-dados
   ```

O script espera o formato original do Infosiga-SP: separador `;`, codificação **ISO-8859-1 (Latin-1)**, quebra de linha **CRLF**, números decimais com **vírgula** (ex.: `-21,2076`). Se o formato do CSV mudar, o script precisa ser ajustado — ver `scripts/gerar-dados.js` e `docs/notas.md`.

## Estrutura de pastas

```
.
├── index.html
├── css/style.css
├── js/              # módulos ES: app.js (UI), data.js, clima.js, calc.js,
│                     # insights.js, fontes.js, mensagens.js, preferencias.js,
│                     # sequencia.js — e um *.test.js por módulo
├── data/            # indice.json + municipios/<ibge>.json (gerados, versionados)
├── data-raw/        # CSVs brutos do Infosiga-SP (fora do Git)
├── scripts/         # gerar-dados.js e gerar-simulado.js
├── docs/            # notas.md (decisões de fonte de dados) e front-original.html
└── CLAUDE.md        # contrato de dados e convenções do projeto
```

## Equipe

- **Guilherme** — dados e back-end
- *(nome)* — *(função)*
- *(nome)* — *(função)*

## Licença

*A definir.* Sugestão: [MIT](https://opensource.org/license/mit/) para o código deste repositório (os dados seguem a licença própria de cada fonte — CC BY 4.0 para Infosiga-SP e Open-Meteo, ODbL para OpenStreetMap). Nenhum arquivo `LICENSE` foi criado ainda.
