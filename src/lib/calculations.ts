// src/lib/calculations.ts
// Health metric calculations for WHOOP clone

// ============================================================
// Strain Calculation
// ============================================================
// Strain is a 0-21 scale based on cardiovascular load
// Higher HR relative to max = more strain accumulated

export function calculateStrain(
  hrReadings: number[],
  maxHR: number = 200
): number {
  if (hrReadings.length === 0) return 0;

  let strain = 0;
  for (const hr of hrReadings) {
    const intensity = Math.max(0, (hr - 80) / (maxHR - 80));
    strain += intensity * 0.015;
  }

  return Math.min(21, Math.round(strain * 100) / 10);
}

// Incremental strain update (call with each new reading)
export function addStrainReading(
  currentStrain: number,
  hr: number,
  maxHR: number = 200
): number {
  const intensity = Math.max(0, (hr - 80) / (maxHR - 80));
  const newStrain = currentStrain + intensity * 0.015;
  return Math.min(21, Math.round(newStrain * 1000) / 1000);
}

// ============================================================
// HRV Calculation (RMSSD method)
// ============================================================
// RMSSD = Root Mean Square of Successive Differences
// Standard clinical method for short-term HRV

export function calculateHRV(rrIntervalsMs: number[]): number | null {
  if (rrIntervalsMs.length < 2) return null;

  // Filter out unrealistic RR intervals (< 300ms or > 2000ms)
  const filtered = rrIntervalsMs.filter((rr) => rr >= 300 && rr <= 2000);
  if (filtered.length < 2) return null;

  let sumSquaredDiffs = 0;
  for (let i = 1; i < filtered.length; i++) {
    const diff = filtered[i] - filtered[i - 1];
    sumSquaredDiffs += diff * diff;
  }

  const rmssd = Math.sqrt(sumSquaredDiffs / (filtered.length - 1));
  return Math.round(rmssd * 10) / 10;
}

// ============================================================
// Recovery Score Calculation
// ============================================================
// Recovery is 0-100 based on HRV, RHR, and sleep quality
// Higher HRV + Lower RHR + Better sleep = Higher recovery

export function calculateRecovery(params: {
  hrv: number | null;
  restingHR: number | null;
  sleepDurationHours?: number;
  sleepEfficiency?: number;
  hrvBaseline?: number;
  rhrBaseline?: number;
}): number | null {
  const {
    hrv,
    restingHR,
    sleepDurationHours = 7,
    sleepEfficiency = 85,
    hrvBaseline = 50,
    rhrBaseline = 60,
  } = params;

  if (hrv === null || restingHR === null) return null;

  // HRV component (40% weight)
  // Higher HRV relative to baseline = better
  const hrvScore = Math.min(100, Math.max(0, (hrv / hrvBaseline) * 50));

  // RHR component (30% weight)
  // Lower RHR relative to baseline = better
  const rhrScore = Math.min(
    100,
    Math.max(0, 100 - (restingHR - rhrBaseline + 10) * 3)
  );

  // Sleep component (30% weight)
  const sleepScore =
    Math.min(100, (sleepDurationHours / 8) * 50) +
    Math.min(50, (sleepEfficiency / 100) * 50);

  const recovery = hrvScore * 0.4 + rhrScore * 0.3 + sleepScore * 0.3;
  return Math.round(Math.min(100, Math.max(0, recovery)));
}

// ============================================================
// Resting Heart Rate Detection
// ============================================================
// Find the lowest stable HR over a window (usually during sleep)

export function calculateRestingHR(
  hrReadings: number[],
  windowSize: number = 30 // 30 readings = 30 seconds
): number | null {
  if (hrReadings.length < windowSize) return null;

  let minAvg = Infinity;

  for (let i = 0; i <= hrReadings.length - windowSize; i++) {
    const window = hrReadings.slice(i, i + windowSize);
    const avg = window.reduce((a, b) => a + b, 0) / window.length;

    // Check stability (std dev < 5)
    const variance =
      window.reduce((sum, val) => sum + (val - avg) ** 2, 0) / window.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev < 5 && avg < minAvg) {
      minAvg = avg;
    }
  }

  return minAvg === Infinity ? null : Math.round(minAvg);
}

// ============================================================
// Calorie Estimation
// ============================================================
// Based on HR and body metrics (simplified Keytel formula)

export function estimateCalories(
  avgHR: number,
  durationMinutes: number,
  weightKg: number = 75,
  isMale: boolean = true
): { active: number; total: number } {
  let activePerMinute: number;

  if (isMale) {
    activePerMinute =
      (-55.0969 + 0.6309 * avgHR + 0.1988 * weightKg + 0.2017 * 27) /
      4.184;
  } else {
    activePerMinute =
      (-20.4022 + 0.4472 * avgHR - 0.1263 * weightKg + 0.074 * 27) / 4.184;
  }

  const active = Math.round(Math.max(0, activePerMinute * durationMinutes));
  // BMR roughly 1800 cal/day for average male
  const bmrPerMinute = 1800 / 1440;
  const total = active + Math.round(bmrPerMinute * durationMinutes);

  return { active, total };
}

// ============================================================
// Zone Duration Tracking
// ============================================================

export interface ZoneDurations {
  rest: number; // seconds in each zone
  light: number;
  moderate: number;
  hard: number;
  veryHard: number;
  max: number;
}

export function getZoneDurations(
  hrReadings: number[],
  maxHR: number = 200
): ZoneDurations {
  const zones: ZoneDurations = {
    rest: 0,
    light: 0,
    moderate: 0,
    hard: 0,
    veryHard: 0,
    max: 0,
  };

  for (const hr of hrReadings) {
    const pct = (hr / maxHR) * 100;
    if (pct < 50) zones.rest++;
    else if (pct < 60) zones.light++;
    else if (pct < 70) zones.moderate++;
    else if (pct < 80) zones.hard++;
    else if (pct < 90) zones.veryHard++;
    else zones.max++;
  }

  return zones;
}

// ============================================================
// Sleep Detection (simplified)
// ============================================================
// Detect sleep based on sustained low HR + low movement

export function detectSleepWindow(
  hrReadings: { hr: number; timestamp: Date }[],
  threshold: number = 65
): { start: Date; end: Date; duration: number } | null {
  if (hrReadings.length < 60) return null;

  let sleepStart: Date | null = null;
  let sleepEnd: Date | null = null;
  let lowHRCount = 0;

  for (const reading of hrReadings) {
    if (reading.hr <= threshold) {
      lowHRCount++;
      if (lowHRCount >= 30 && !sleepStart) {
        // 30 consecutive low HR readings = sleep start
        sleepStart = reading.timestamp;
      }
    } else {
      if (sleepStart && lowHRCount > 0) {
        lowHRCount--;
        if (lowHRCount <= 0) {
          sleepEnd = reading.timestamp;
          break;
        }
      } else {
        lowHRCount = 0;
      }
    }
  }

  if (!sleepStart) return null;
  sleepEnd = sleepEnd || hrReadings[hrReadings.length - 1].timestamp;

  const duration = (sleepEnd.getTime() - sleepStart.getTime()) / 1000;
  return { start: sleepStart, end: sleepEnd, duration };
}
