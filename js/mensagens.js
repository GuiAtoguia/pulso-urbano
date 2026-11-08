// Pulso Urbano — mensagens.js
// Único lugar com os textos que o usuário vê em estados de carregando/vazio/erro,
// pra manter o tom consistente (português simples, sem jargão técnico).
// Puro — sem DOM, sem fetch.

export const MSG = {
  carregandoMunicipio: nome => `Carregando dados de ${nome}...`,
  carregandoCidade: nome => `Localizando ${nome}...`,
  carregandoGenerico: 'Carregando dados…',

  semDadosMunicipio: 'Ainda não temos dados para este município.',
  semDadosMunicipioDetalhe: 'Os dados do Infosiga-SP ainda não cobrem esta cidade.',

  dadosInvalidos: 'Não foi possível carregar os dados deste município.',
  dadosInvalidosDetalhe: 'O arquivo de dados veio num formato inesperado.',

  erroCarregarMunicipio: nome => `Não foi possível carregar os dados de ${nome} agora.`,
  erroCarregarMunicipioDetalhe: 'Verifique sua conexão e tente novamente.',

  rankingInsuficiente: 'dados insuficientes para ranking',
  amostraSemanalPequena: 'Amostra pequena',
  amostraSemanalPequenaDetalhe: 'menos de 30 sinistros nas 2 últimas semanas somadas',

  climaIndisponivel: 'Clima indisponível no momento.',

  tilesIndisponiveis: 'Tiles do mapa indisponíveis no momento',
  mapaIndisponivel: 'O mapa não pôde ser carregado agora.',
  mapaIndisponivelDetalhe: 'A biblioteca de mapas não respondeu. Tente recarregar a página.',
  mapaSemCoordenadas: nome => `Não foi possível encontrar as coordenadas de ${nome}.`,
  mapaSemCoordenadasDetalhe: 'Selecione outra cidade ou tente novamente.',
  localizandoCidade: nome => `Localizando ${nome}...`,
  localizandoCidadeDetalhe: 'Consultando coordenadas do município.',

  listaMunicipiosReduzida: 'Não foi possível atualizar a lista completa de municípios agora, mostrando uma lista reduzida.',

  semConexao: 'Sem conexão com a internet.',
  semConexaoDetalhe: 'Verifique sua rede e tente novamente.',
  conexaoRestabelecida: 'Conexão restabelecida.',

  tentarNovamente: 'Tentar novamente',
  escolherOutroMunicipio: 'Escolher outro município',

  regiaoSalvaInvalida: 'A região salva não foi reconhecida, voltando para Araçatuba.',
};
