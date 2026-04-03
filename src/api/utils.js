const DEFAULT_ALBEDO = 0.154;
const DEFAULT_DENSITY = 1500; // kg/m³

export function estimateDiameterKm(h, albedo = DEFAULT_ALBEDO) {
  if (h == null || isNaN(h)) return null;
  return (1329 / Math.sqrt(albedo)) * Math.pow(10, -h / 5);
}

export function estimateDiameterM(h, albedo = DEFAULT_ALBEDO) {
  const km = estimateDiameterKm(h, albedo);
  return km != null ? km * 1000 : null;
}

export function estimateMassKg(diameterM, density = DEFAULT_DENSITY) {
  if (diameterM == null) return null;
  const radius = diameterM / 2;
  return (4 / 3) * Math.PI * Math.pow(radius, 3) * density;
}

export function formatMassScientific(massKg) {
  if (massKg == null) return null;
  const exp = Math.floor(Math.log10(massKg));
  const coeff = massKg / Math.pow(10, exp);
  return { coeff: coeff.toFixed(2), exp };
}

export function velocityToBullets(vKmS) {
  // A bullet travels ~1 km/s on average; 1 km/s ≈ 3x bullet speed
  return Math.round(vKmS * 3);
}

export function formatCountdown(dateStr) {
  const target = new Date(dateStr);
  const now = new Date();
  const diffMs = target - now;
  if (diffMs < 0) return null;
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
}
