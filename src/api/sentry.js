const CACHE_KEY = 'neo_sentry_cache';
const CACHE_TTL = 5 * 60 * 1000;

export async function fetchSentry() {
  const cached = getCache(CACHE_KEY);
  if (cached) return cached;

  // Route through /api/sentry proxy (Vite dev proxy or Vercel serverless fn)
  const url = `/api/sentry`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sentry API error: ${res.status}`);

  const json = await res.json();
  const parsed = parseSentry(json);
  setCache(CACHE_KEY, parsed);
  return parsed;
}

function parseSentry(json) {
  // Sentry API returns data as array of objects (not array of arrays)
  // Fields: des, ip, ps_cum, ts_max, last_obs, n_imp
  const map = {};
  (json.data || []).forEach((item) => {
    const des = item.des?.trim();
    if (des) {
      map[des] = {
        des,
        ip: item.ip != null ? parseFloat(item.ip) : null,
        ps: item.ps_cum != null ? parseFloat(item.ps_cum) : null,  // ps_cum in API
        ts: item.ts_max != null ? parseInt(item.ts_max) : null,    // ts_max in API
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
