// Vercel serverless function — proxies NASA JPL Sentry API (no CORS headers on origin)
export default async function handler(req, res) {
  const url = `https://ssd-api.jpl.nasa.gov/sentry.api`;

  try {
    const upstream = await fetch(url);
    const data = await upstream.json();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=300');
    res.status(upstream.status).json(data);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
}
