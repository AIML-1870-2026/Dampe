const CACHE_KEY = 'neo_sentry_cache';
const CACHE_TTL = 5 * 60 * 1000;

const NASA_SENTRY = 'https://ssd-api.jpl.nasa.gov/sentry.api';
const CORS_PROXY = 'https://corsproxy.io/?url=';

export async function fetchSentry() {
  const cached = getCache(CACHE_KEY);
  if (cached) return cached;

  const url = import.meta.env.DEV
    ? `/api/sentry`
    : `${CORS_PROXY}${encodeURIComponent(NASA_SENTRY)}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sentry API error: ${res.status}`);

  const json = await res.json();
  const parsed = parseSentry(json);
  setCache(CACHE_KEY, parsed);
  return parsed;
}

function parseSentry(json) {
  const map = {};
  (json.data || []).forEach((item) => {
    const des = item.des?.trim();
    if (des) {
      map[des] = {
        des,
        ip: item.ip != null ? parseFloat(item.ip) : null,
        ps: item.ps_cum != null ? parseFloat(item.ps_cum) : null,
        ts: item.ts_max != null ? parseInt(item.ts_max) : null,
        last_obs: item.last_obs || null,
        n_imp: item.n_imp != null ? parseInt(item.n_imp) : null,
      };
    }
  });
  return map;
}

function getCache(key) {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) return null;
    return data;
  } catch {
    return null;
  }
}

function setCache(key, data) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
  } catch {}
}
