// Pulso Urbano — clima.js
// Previsão via Open-Meteo (gratuito, não-comercial, CC-BY 4.0 — ver docs/notas.md).
// Sempre com timeout e fallback "clima indisponível"; nunca lança.

const TIMEOUT_MS = 8000;
const TIMEZONE = 'America/Sao_Paulo';
const FONTE = 'Open-Meteo (CC-BY 4.0)';

const cache = new Map(); // chave "lat,lon" arredondado -> previsão

// Códigos WMO usados pelo Open-Meteo (tabela oficial em open-meteo.com/en/docs).
const WEATHER_CODES = {
  0: { icone: 'sun', texto: 'Céu limpo' },
  1: { icone: 'sun', texto: 'Predominantemente limpo' },
  2: { icone: 'cloud-sun', texto: 'Parcialmente nublado' },
  3: { icone: 'cloud', texto: 'Nublado' },
  45: { icone: 'cloud-fog', texto: 'Neblina' },
  48: { icone: 'cloud-fog', texto: 'Neblina com geada' },
  51: { icone: 'cloud-drizzle', texto: 'Garoa leve' },
  53: { icone: 'cloud-drizzle', texto: 'Garoa moderada' },
  55: { icone: 'cloud-drizzle', texto: 'Garoa forte' },
  56: { icone: 'cloud-drizzle', texto: 'Garoa congelante leve' },
  57: { icone: 'cloud-drizzle', texto: 'Garoa congelante forte' },
  61: { icone: 'cloud-rain', texto: 'Chuva leve' },
  63: { icone: 'cloud-rain', texto: 'Chuva moderada' },
  65: { icone: 'cloud-rain', texto: 'Chuva forte' },
  66: { icone: 'cloud-rain', texto: 'Chuva congelante leve' },
  67: { icone: 'cloud-rain', texto: 'Chuva congelante forte' },
  71: { icone: 'cloud-snow', texto: 'Neve leve' },
  73: { icone: 'cloud-snow', texto: 'Neve moderada' },
  75: { icone: 'cloud-snow', texto: 'Neve forte' },
  77: { icone: 'cloud-snow', texto: 'Granulação de neve' },
  80: { icone: 'cloud-rain-wind', texto: 'Aguaceiro leve' },
  81: { icone: 'cloud-rain-wind', texto: 'Aguaceiro moderado' },
  82: { icone: 'cloud-rain-wind', texto: 'Aguaceiro violento' },
  85: { icone: 'cloud-snow', texto: 'Nevasca leve' },
  86: { icone: 'cloud-snow', texto: 'Nevasca forte' },
  95: { icone: 'cloud-lightning', texto: 'Trovoada' },
  96: { icone: 'cloud-lightning', texto: 'Trovoada com granizo leve' },
  97: { icone: 'cloud-lightning', texto: 'Trovoada forte' },
  99: { icone: 'cloud-lightning', texto: 'Trovoada com granizo forte' },
};

export function weathercodeParaIcone(codigo) {
  return WEATHER_CODES[codigo]?.icone ?? 'cloud-off';
}

export function weathercodeParaTexto(codigo) {
  return WEATHER_CODES[codigo]?.texto ?? 'Condição desconhecida';
}

function chaveCache(lat, lon) {
  return `${lat.toFixed(2)},${lon.toFixed(2)}`;
}

// Retorna { ok:true, dados:{ atual:{temperatura,codigo}, dias:[{data,max,min,codigo}], fonte } }
// ou { ok:false, motivo }. `dias` inclui hoje; os widgets usam os próximos 4.
export async function buscarClima(lat, lon) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return { ok: false, motivo: 'sem-coordenadas' };
  const chave = chaveCache(lat, lon);
  if (cache.has(chave)) return cache.get(chave);

  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: 'temperature_2m,weather_code',
    daily: 'temperature_2m_max,temperature_2m_min,weather_code',
    timezone: TIMEZONE,
    forecast_days: '5',
  });

  let resultado;
  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) return { ok: false, motivo: 'indisponivel' };
    const body = await res.json();
    if (!body?.current || !body?.daily?.time) return { ok: false, motivo: 'invalido' };
    const dias = body.daily.time.map((data, i) => ({
      data,
      max: body.daily.temperature_2m_max?.[i],
      min: body.daily.temperature_2m_min?.[i],
      codigo: body.daily.weather_code?.[i],
    }));
    resultado = {
      ok: true,
      dados: {
        atual: { temperatura: body.current.temperature_2m, codigo: body.current.weather_code },
        dias,
        fonte: FONTE,
      },
    };
  } catch (erro) {
    return { ok: false, motivo: erro?.name === 'TimeoutError' || erro?.name === 'AbortError' ? 'timeout' : 'rede' };
  }

  cache.set(chave, resultado);
  return resultado;
}
