// Recortes verificáveis do extrato estático Infosiga-SP.
// Não inventa série diária histórica: o JSON publica apenas sete dias individuais,
// um total de 14 dias e o total acumulado desde 2022.

export const PERIODOS_DISPONIVEIS = Object.freeze([
  { id: 'historico', titulo: 'Histórico', ajuda: 'Acumulado desde 2022 até a última data do extrato.' },
  { id: 'quinzena', titulo: '14 dias', ajuda: 'Soma das duas últimas semanas completas do extrato.' },
  { id: 'semana', titulo: '7 dias', ajuda: 'Soma dos sete dias discriminados no extrato (semana completa mais recente).' },
]);

const meses = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

export function dataFinalExtrato(periodo) {
  if (typeof periodo !== 'string') return null;
  const captura = periodo.match(/(?:^|\s)(\d{1,2})\s+(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\s+(\d{4})\s*$/i);
  if (!captura) return null;
  const [, dia, mes, ano] = captura;
  const data = new Date(Date.UTC(Number(ano), meses.indexOf(mes.toLowerCase()), Number(dia)));
  if (data.getUTCDate() !== Number(dia) || data.getUTCFullYear() !== Number(ano)) return null;
  return data;
}

function menosDias(data, n) {
  const copia = new Date(data.getTime());
  copia.setUTCDate(copia.getUTCDate() - n);
  return copia;
}
function formatoDia(data) { return `${String(data.getUTCDate()).padStart(2,'0')} ${meses[data.getUTCMonth()]} ${data.getUTCFullYear()}`; }
function formatoIntervalo(inicio, fim) {
  if (inicio.getUTCFullYear() === fim.getUTCFullYear() && inicio.getUTCMonth() === fim.getUTCMonth())
    return `${String(inicio.getUTCDate()).padStart(2,'0')}–${formatoDia(fim)}`;
  return `${formatoDia(inicio)} – ${formatoDia(fim)}`;
}

export function obterRecorte(dados, periodo = 'historico') {
  if (!dados) return { nome:'Sem dados', total:null, selo:'Período indisponível', periodoLabel:'—', descricao:'Nenhum arquivo municipal carregado.' };
  const data = dataFinalExtrato(dados.periodo);
  const fim = data ? formatoDia(data) : 'data não disponível';
  if (periodo === 'semana') {
    const total = Array.isArray(dados.porDia) && dados.porDia.length === 7 && dados.porDia.every(Number.isFinite)
      ? dados.porDia.reduce((acc, value) => acc + value, 0) : null;
    const faixa = data ? formatoIntervalo(menosDias(data, 6), data) : (dados.periodo || 'semana de referência');
    return { nome: 'Últimos 7 dias do extrato', total, periodoLabel: faixa, selo: `7 dias · ${faixa}`, descricao: 'soma dos sete dias discriminados na última semana completa do arquivo municipal' };
  }
  if (periodo === 'quinzena') {
    const faixa = data ? formatoIntervalo(menosDias(data, 13), data) : 'últimas 2 semanas completas';
    return { nome: 'Últimos 14 dias do extrato', total: dados.totalUltimas2Semanas, periodoLabel: faixa, selo: `14 dias · ${faixa}`, descricao: 'total publicado para as duas semanas completas mais recentes' };
  }
  return { nome:'Total histórico', total:dados.totalPeriodoCompleto, periodoLabel: `desde 2022 · até ${fim}`, selo:`Histórico · até ${fim}`, descricao:'total consolidado desde 2022 até o último dia do extrato' };
}
