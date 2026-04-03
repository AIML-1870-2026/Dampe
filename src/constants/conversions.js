export const AU_TO_KM = 149597870.7;
export const LD_TO_KM = 384400;
export const AU_TO_LD = AU_TO_KM / LD_TO_KM; // ~389.17

export function auToKm(au) {
  return parseFloat(au) * AU_TO_KM;
}

export function auToLd(au) {
  return parseFloat(au) * AU_TO_LD;
}

export function kmToLd(km) {
  return km / LD_TO_KM;
}

export function formatLd(ld) {
  if (ld < 10) return ld.toFixed(2);
  return ld.toFixed(1);
}

export function formatKm(km) {
  return km.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export function formatNumber(n, decimals = 2) {
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
