/**
 * PDMCalculator.ts
 *
 * Phase Dispersion Minimization (Stellingwerf 1978) — a period-finding
 * statistic that works on unevenly-sampled, non-sinusoidal light curves
 * (ideal for the RR Lyrae / Cepheid / eclipsing-binary curves in this sim).
 *
 * This implementation uses the interleaved-bin strategy from the original
 * NAAP Flash simulator (Nb bins × Nc phase offsets = M total bins):
 *
 *   φ_i  = ((t_i − t₀) / P) mod 1                       (phase of point i)
 *   For each cover k in 0..Nc−1:
 *     j = k·Nb + floor(Nb × ((φ + k/M) mod 1))          (interleaved bin index)
 *     sum[j] += Δm_i,  count[j] += 1
 *
 * The Nc covers each hold Nb bins of width 1/Nb, their phase grids shifted by
 * k/M, and occupy disjoint blocks [k·Nb, (k+1)·Nb) of the M-length accumulators
 * so every point contributes to exactly Nc distinct bins (matching the N·Nc − M
 * degrees-of-freedom term below).
 *   θ = c2 − c1 × Σ_j sum[j]² / count[j]
 *
 * where c1 = (N−1) / ((ΣΔm² − (ΣΔm)²/N) × (N×Nc − M))
 *       c2 = c1 × Nc × ΣΔm²
 *
 * θ → 0 when the trial period coherently folds the data (small scatter within
 * bins); θ ≈ 1 for an incorrect period. The best period minimises θ.
 */

export type PdmPoint = { period: number; theta: number };

/** Default interleaved-bin parameters matching the NAAP Flash simulator. */
const PDM_NB = 5; // number of phase bins
const PDM_NC = 2; // number of interleaved phase offsets
export const PDM_M = PDM_NB * PDM_NC; // total bins = 10

/**
 * Computes the PDM θ statistic for a single trial period using
 * the Flash interleaved-bin strategy.
 *
 * @param epochs  Julian dates (days)
 * @param mags    corresponding magnitudes
 * @param period  trial period (days)
 * @param t0      zero-phase reference epoch (default 0)
 * @returns θ ≥ 0 (small → good period); returns 1 when undefined (too few data).
 */
export function pdmTheta(epochs: readonly number[], mags: readonly number[], period: number, t0 = 0): number {
  const N = mags.length;
  const Nc = PDM_NC;
  const M = PDM_M;
  if (N < M + 1 || period <= 0) {
    return 1;
  }

  // Overall statistics for the normalisation constants c1, c2.
  let deltaSum = 0;
  let deltaSumSq = 0;
  for (let i = 0; i < N; i++) {
    const d = mags[i] as number;
    deltaSum += d;
    deltaSumSq += d * d;
  }

  // Denominator of c1: (ΣΔm² − (ΣΔm)²/N) × (N×Nc − M)
  const ssd = deltaSumSq - (deltaSum * deltaSum) / N;
  const denom = ssd * (N * Nc - M);
  if (denom === 0) {
    return 1;
  }
  const c1 = (N - 1) / denom;
  const c2 = c1 * Nc * deltaSumSq;

  // Accumulate per-bin sums for the interleaved binning.
  const binSum = new Float64Array(M);
  const binCount = new Float64Array(M);

  for (let i = 0; i < N; i++) {
    const epoch = epochs[i] as number;
    let phase = ((epoch - t0) / period) % 1;
    if (phase < 0) {
      phase += 1;
    }

    // Each data point contributes to Nc interleaved covers. Cover k holds Nb
    // bins of width 1/Nb, its phase grid shifted by k/M, and occupies the block
    // [k·Nb, (k+1)·Nb) of the accumulators — so the two covers never collide.
    for (let k = 0; k < Nc; k++) {
      let local = Math.floor(PDM_NB * ((phase + k * (1 / M)) % 1));
      // Guard against floating-point edge cases (phase → 1⁻).
      if (local < 0) {
        local = 0;
      } else if (local >= PDM_NB) {
        local = PDM_NB - 1;
      }
      const binIndex = k * PDM_NB + local;
      binSum[binIndex] = (binSum[binIndex] as number) + (mags[i] as number);
      binCount[binIndex] = (binCount[binIndex] as number) + 1;
    }
  }

  // θ = c2 − c1 × Σ_j sum[j]² / count[j]
  let sumTerm = 0;
  for (let j = 0; j < M; j++) {
    const bc = binCount[j] as number;
    if (bc > 0) {
      const bs = binSum[j] as number;
      sumTerm += (bs * bs) / bc;
    }
  }

  return c2 - c1 * sumTerm;
}

/**
 * Scans trial periods across [periodMin, periodMax] in `nSteps` equal steps.
 */
export function pdmScan(
  epochs: readonly number[],
  mags: readonly number[],
  periodMin: number,
  periodMax: number,
  nSteps: number,
  t0 = 0,
): PdmPoint[] {
  const results: PdmPoint[] = [];
  if (nSteps < 2 || periodMax <= periodMin) {
    return results;
  }
  const dp = (periodMax - periodMin) / (nSteps - 1);
  for (let i = 0; i < nSteps; i++) {
    const period = periodMin + i * dp;
    results.push({ period, theta: pdmTheta(epochs, mags, period, t0) });
  }
  return results;
}

/** Returns the period with the smallest θ in a scan, or null if empty. */
export function bestPeriod(scan: readonly PdmPoint[]): number | null {
  let best: PdmPoint | null = null;
  for (const point of scan) {
    if (best === null || point.theta < best.theta) {
      best = point;
    }
  }
  return best ? best.period : null;
}
