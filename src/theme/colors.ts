// src/theme/colors.ts
// WHOOP-inspired color palette

export const colors = {
  // Backgrounds
  bg: '#000000',
  bgCard: 'rgba(255,255,255,0.035)',
  bgCardHover: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.055)',

  // Text
  text: '#FFFFFF',
  text2: 'rgba(255,255,255,0.55)',
  text3: 'rgba(255,255,255,0.28)',
  text4: 'rgba(255,255,255,0.38)',

  // Brand
  green: '#00E676',
  greenDim: 'rgba(0,230,118,0.12)',
  blue: '#448AFF',
  blueDim: 'rgba(68,138,255,0.12)',
  cyan: '#18FFFF',
  yellow: '#FFEA00',
  orange: '#FF6D00',
  red: '#FF1744',
  redDim: 'rgba(255,23,68,0.12)',
  purple: '#B388FF',
  purpleDim: 'rgba(179,136,255,0.12)',
  indigo: '#536DFE',

  // Recovery colors
  recoveryGreen: '#00E676',
  recoveryYellow: '#FFEA00',
  recoveryRed: '#FF1744',

  // Zone colors
  zone1: '#448AFF', // Rest
  zone2: '#18FFFF', // Light
  zone3: '#00E676', // Moderate
  zone4: '#FFEA00', // Hard
  zone5: '#FF6D00', // Very Hard
  zone6: '#FF1744', // Max
};

export function getRecoveryColor(score: number): string {
  if (score >= 67) return colors.recoveryGreen;
  if (score >= 34) return colors.recoveryYellow;
  return colors.recoveryRed;
}

export function getRecoveryLabel(score: number): string {
  if (score >= 67) return 'Green';
  if (score >= 34) return 'Yellow';
  return 'Red';
}

export function getZoneColor(hr: number, maxHR = 200): string {
  const pct = (hr / maxHR) * 100;
  if (pct < 50) return colors.zone1;
  if (pct < 60) return colors.zone2;
  if (pct < 70) return colors.zone3;
  if (pct < 80) return colors.zone4;
  if (pct < 90) return colors.zone5;
  return colors.zone6;
}

export function getZoneName(hr: number, maxHR = 200): string {
  const pct = (hr / maxHR) * 100;
  if (pct < 50) return 'Rest';
  if (pct < 60) return 'Light';
  if (pct < 70) return 'Moderate';
  if (pct < 80) return 'Hard';
  if (pct < 90) return 'Very Hard';
  return 'Max';
}

export function getZoneIndex(hr: number, maxHR = 200): number {
  const pct = (hr / maxHR) * 100;
  if (pct < 50) return 0;
  if (pct < 60) return 1;
  if (pct < 70) return 2;
  if (pct < 80) return 3;
  if (pct < 90) return 4;
  return 5;
}
