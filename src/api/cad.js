const CACHE_KEY = 'neo_cad_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function fetchCAD() {
  const cached = getCache(CACHE_KEY);
  if (cached) return cached;

  // Route through /api/cad proxy (Vite dev proxy or Vercel serverless fn)
  // This avoids CORS — ssd-api.jpl.nasa.gov does not send Access-Control-Allow-Origin
  const params = new URLSearchParams({
    'dist-max': '0.05',
    'date-min': 'now',
    'date-max': '+60',
    sort: 'dist',
    limit: '50',
    fullname: 'true',
  });

  const url = `/api/cad?${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CAD API error: ${res.status}`);

  const json = await res.json();
  const parsed = parseCAD(json);
  setCache(CACHE_KEY, parsed);
  return parsed;
}

function parseCAD(json) {
  const fields = json.fields;
  return (json.data || []).map((row) => {
    const obj = {};
    fields.forEach((f, i) => (obj[f] = row[i]));
    // Strip parentheses from fullname: "       (2013 GM3)" → "2013 GM3"
    const rawName = obj.fullname?.trim().replace(/^\(|\)$/g, '').trim() || null;
    const des = obj.des?.trim();
    const name = rawName && rawName !== des ? rawName : null;
    return {
      des,
      name,
      cd: obj.cd,
      dist: parseFloat(obj.dist),
      dist_min: parseFloat(obj.dist_min),
      dist_max: parseFloat(obj.dist_max),
      v_rel: parseFloat(obj.v_rel),
      v_inf: parseFloat(obj.v_inf),
      h: obj.h != null && obj.h !== '' ? parseFloat(obj.h) : null,
    };
  });
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
