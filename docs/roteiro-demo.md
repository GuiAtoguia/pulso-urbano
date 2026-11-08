# Roteiro de demonstração (3 minutos)

Testado com os dados reais congelados em `data/` (Infosiga-SP, sinistros fatais
e não fatais, 2022 até 30/09/2026). Município padrão ao abrir: **Araçatuba**.

## Sequência de cliques (~3 min)

1. **Abertura (Araçatuba já carregado, ~30s).** A página abre direto na Grade
   de observação de Araçatuba. Aponte, sem clicar em nada ainda:
   - o selo "Dados até 26 set 2026" no topo (data real do extrato, não fixa);
   - o KPI **Total**: número grande (histórico completo) + linha pequena
     "últimas 2 semanas: N";
   - o mapa com os pontos coloridos por intensidade e a legenda.
2. **Intensidade por horário (~20s).** Passe o mouse sobre 2 a 3 faixas do
   gráfico "Intensidade por horário": mostre o tooltip com valor e % do
   total, e a faixa de pico destacada com um anel.
3. **Vias em destaque (~20s).** Mostre o cartão "Vias em destaque" e o
   texto da "Visão geral" citando a via líder e o percentual.
4. **Clima (~10s).** Aponte o widget de clima: dado real da Open-Meteo,
   com a fonte e licença creditadas no rodapé do próprio cartão.
5. **Troca de município: Birigui (~40s).** Clique no seletor de cidade
   (ícone de localização no topo) → São Paulo já vem selecionado → busque e
   selecione **Birigui**. Deixe a tela recarregar. Mostre:
   - o KPI Total muda para os números de Birigui;
   - o cartão "Sinistros por dia da semana" mostra **"Amostra pequena"** em
     vez de uma variação inventada. Birigui tem só 15 sinistros nas 2
     últimas semanas, abaixo do mínimo de 30. **Use isso a seu favor**: é a
     prova de que o sistema se recusa a afirmar tendência sem base
     estatística, mesmo na segunda maior cidade da região.
6. **Modal "Fontes e metodologia" (~30s).** Clique em "Fontes" no cabeçalho
   (ou qualquer um dos 4 links do rodapé, todos abrem o mesmo modal).
   Role rapidamente até a seção 2 (Metodologia) e aponte 2 regras: o mínimo
   de 20 sinistros pro ranking e o mínimo de 30 pra variação semanal.
7. **Tema escuro (~10s, opcional, se houver tempo).** Clique no ícone de
   lua/sol no cabeçalho pra mostrar o tema escuro e voltar.

## Três números-chave pra citar

- **5.283 sinistros fatais e não fatais em Araçatuba desde 2022** até a
  última data do extrato (30/09/2026): mesma contagem usada pelo painel
  oficial do Infosiga-SP (fatal + não fatal, sem contar notificações).
- **43 municípios da região administrativa de Araçatuba** com dados reais
  publicados, somando **15.637 sinistros** (fatais e não fatais) desde 2022
  na região inteira.
- **Mínimo de 20 sinistros** pro ranking de vias e **30** pra variação
  semanal: os dois limiares que fazem o site nunca "inventar" uma
  tendência ou um ranking sem base estatística.

## Limitações a admitir proativamente (antes que perguntem)

- O ranking é **por via (logradouro), não por bairro**: a base do
  Infosiga-SP não tem coluna de bairro.
- Sinistros de **madrugada (00h às 06h) não entram no gráfico de intensidade
  por horário** (ficam fora de ~8% das linhas da região), mas continuam
  contando no total e no ranking.
- Parte dos registros de **2025 a 2026 ainda não tem coordenada** no extrato
  do Detran-SP. Esses sinistros contam no total, mas não aparecem no mapa.
- **Notificações preliminares** (sem gravidade classificada ainda) **não
  entram na contagem**: só sinistros fatais e não fatais, pra bater com o
  total oficial do painel do Infosiga-SP (incluir notificações deixaria o
  total 47% a 86% acima do oficial, já testamos as duas formas).

## 5 perguntas prováveis da banca (respostas curtas)

1. **De onde vêm os dados?**
   Infosiga-SP / Detran-SP, extrato público em CSV (licença CC BY 4.0),
   filtrado para a região administrativa de Araçatuba e só sinistros fatais
   e não fatais: bate com o total oficial do painel deles, ano a ano.
2. **Por que via e não bairro?**
   A base pública do Infosiga-SP não tem coluna de bairro: só logradouro
   (rua/avenida). Ranking por bairro exigiria geocodificação própria, que
   não fizemos por falta de tempo e porque introduziria erro de atribuição.
3. **Como garantem privacidade?**
   Nenhum dado é exibido por sinistro individual. O mapa mostra pontos
   agrupados (coordenada arredondada a 3 casas decimais, ~111m) com a
   contagem de sinistros daquele ponto, nunca um registro isolado.
4. **O que é IA e o que é regra fixa?**
   O código foi escrito com apoio do Claude Code (declarado no README e no
   modal Fontes). Os números na tela vêm só dos dados oficiais. As frases da
   "Visão geral" (pico, via, variação) são geradas por regras fixas de
   comparação de números, escolhidas de forma determinística por município.
   Não há IA generativa interpretando dados em tempo real.
5. **Como escala pra outras regiões?**
   O script (`scripts/gerar-dados.js`) já lê o CSV completo do estado.
   Hoje só filtramos pela região de Araçatuba. Pra outra região, é só
   trocar o filtro de `regiao_administrativa` e rodar `npm run gerar-dados`
   de novo; o contrato de dados e a interface não mudam.

## Plano B: internet cai no local

1. Tenha o projeto já clonado/baixado no notebook (não depende de deploy).
2. Suba o site local: `npx http-server .` na raiz do projeto, e abra a URL
   que ele imprime (ex.: `http://localhost:8080`).
3. **O que continua funcionando sem internet** (tudo vem de arquivo local):
   KPIs, ranking de vias, gráficos de horário e de dia da semana, textos da
   "Visão geral", modal "Fontes e metodologia", troca de município (o
   seletor usa a lista de municípios já embutida/local quando a API do IBGE
   não responde).
4. **O que degrada, mas sem travar a tela**: os tiles do mapa (mostra aviso
   "Tiles indisponíveis" em vez de tile em branco, mas os pontos e a
   legenda continuam aparecendo sobre o fundo cinza), os ícones Lucide (viram
   espaço vazio, mas o texto ao lado continua legível), a fonte Montserrat
   (cai pra fonte padrão do sistema) e o widget de clima (mostra "Clima
   indisponível no momento").
5. Se der tempo antes da apresentação: abra o site uma vez com internet boa
   pra deixar Leaflet/Lucide/fontes em cache do navegador. Se a conexão só
   cair *durante* a demo (não antes), o cache evita o degradê acima.
