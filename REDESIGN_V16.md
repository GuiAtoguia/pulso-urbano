# Pulso Urbano · Material You v16

Redesign incremental sobre a v15, mantendo os dados abertos, os 43 arquivos de municípios e a arquitetura HTML/CSS/JavaScript sem backend ou dependências novas.

## Mapa

- Mapas-base oficiais **OpenStreetMap** via Leaflet (servidor de tiles público; consulte sua política de uso).
- **Ctrl + roda do mouse sobre o mapa**: zoom orientado ao cursor. A roda sem Ctrl continua rolando a página. Botões `+` e `−` e zoom por toque continuam disponíveis. O navegador precisa suportar o evento `wheel` com `preventDefault`.
- Pontos com tamanho proporcional a uma contagem agregada e três faixas de intensidade: cores calculadas a partir da paleta ativa, contorno tonal, realce discreto em hover, tooltip personalizado e popup com proveniência do histórico.
- Legenda acompanha a cor selecionada. O agrupamento por proximidade ainda é apenas visual; os JSONs são imutáveis.
- A visualização dos tiles externos exige internet. O teste de Ctrl + rolagem e do mapa foi feito também com uma instância simulada da biblioteca; o tráfego real até o servidor público de tiles não foi verificado neste ambiente.

## Painel e períodos disponíveis

O arquivo publicado por município oferece **exatamente**:

| Recorte | Campo JSON usado | Araçatuba (exemplo) | Datas exibidas |
|---|---|---:|---|
| Histórico | `totalPeriodoCompleto` | 5.283 | Desde 2022 até 26 set 2026 |
| 14 dias | `totalUltimas2Semanas` | 34 | 13–26 set 2026 |
| 7 dias | soma de `porDia` (7 valores) | 18 | 20–26 set 2026 |

Os períodos são extraídos do campo `periodo` do JSON municipal, sem datas gravadas na interface. A etiqueta no topo e os totais mudam em cada seleção. O histórico de vias (`ranking`) e a distribuição por horário (`porHora`) **não** são filtrados por 7 ou 14 dias porque a fonte não contém essas séries históricas desagregadas. Essa limitação é informada nos próprios indicadores e no ícone de ajuda. A previsão da Open-Meteo sempre representa a consulta atual, não o clima no dia do sinistro.

A curva diária usa **sete botões HTML posicionados sobre o SVG**, preservando círculos perfeitamente redondos em qualquer proporção de tela, com foco por teclado, área de toque maior e tooltips de valores exatos.

## Localidades

O seletor não pede mais um estado: o índice contém apenas os **43 municípios de São Paulo** com arquivos JSON. O cabeçalho é “Escolher município”, com pesquisa direta, cidade atual destacada, contador e abertura ancorada, com altura limitada no mobile.

## Fontes

- O link “Código e arquivos do projeto” usa o ícone `git-branch` do Lucide.
- A seção “Metodologia e limitações” foi reorganizada em cinco cartões expansíveis nativos (dados e período, critérios de cálculo, previsão, serviços/licenças e desenvolvimento), com acesso por teclado.
- A primeira seção fica expandida por padrão; as demais informações estão acessíveis sem abrir modal.

## Como executar

No Windows, extrair o ZIP e clicar em `INICIAR_WINDOWS.bat` (requer Node.js). Alternativamente:

```bash
node server.mjs
```

Abrir `http://127.0.0.1:4173` no navegador. Os módulos e JSONs não devem ser abertos como `file://` por causa de restrições de `fetch` e de módulos ES.

## Verificações

```bash
node --check js/app.js
node --check js/recortes.js
node --check js/fontes.js
node scripts/verificar-redesign-v15.mjs
node scripts/verificar-redesign-v16.mjs
```

O verificador v16 valida os 43 arquivos, totais dos três recortes, limites temporais, seletor simplificado e estrutura da metodologia. Foram realizados testes de interface com os módulos e arquivos JSON inseridos em uma página isolada, sem falhas de JavaScript observadas; em simulação do Leaflet, Ctrl + roda acionou `setZoomAround` e alterou o nível de zoom. O carregamento externo efetivo dos tiles e do clima depende do navegador e da rede.
