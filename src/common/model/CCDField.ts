/**
 * CCDField.ts
 *
 * Synthetic CCD star-field renderer.  Exact TypeScript port of:
 *   AiryDisc.as  — Airy-disk PSF
 *   StarField.as — noise generation, chunk-shuffle, star rendering
 *   GammaTransferFunction.as — gamma = 1.8 display mapping
 *
 * Usage:
 *   const field = CCDField.getInstance();
 *   const imageData = field.render( epochIndex );          // greyscale RGBA
 *   const imageData = field.render( epochIndex, true );    // inverted
 *   const { disc, sky, netFlux } = field.getPhotometry( epochIndex, cx, cy, rAp, rSkyIn, rSkyOut );
 */

import { roundSymmetric } from "scenerystack/dot";
import { getEclipsingMagnitude, getPulsatingMagnitude } from "./LightCurveLibrary.js";
import { FIELD_PARAMS, OBSERVATIONS, STARS } from "./StarFieldData.js";

const W = 380; // field width  (pixels)
const H = 290; // field height (pixels)

// Cap on cached rendered frames. Each ImageData is W×H×4 ≈ 441 KB; with 109
// epochs × 2 invert states an unbounded cache could pin ~96 MB for the page
// lifetime. 48 covers every screen's working set (blink queue, 3 registration
// epochs, single-epoch photometry/analyzer display) while bounding growth.
const MAX_CACHED_RENDERS = 48;
const { noiseMean, noiseSigma, saturationMagnitude, psfRadius, peakValue } = FIELD_PARAMS;

/** Summed raw-count statistics over a circular disc or annular region. */
export type RegionStats = { totalCounts: number; totalPixels: number; average: number };

// ---------------------------------------------------------------------------
// J1 Bessel function — Numerical Recipes polynomial (AiryDisc.as getJ1)
// ---------------------------------------------------------------------------
function besselJ1(x: number): number {
  const ax = Math.abs(x);
  let ans: number;
  if (ax < 8.0) {
    const y = x * x;
    const ans1 =
      x *
      (72362614232.0 +
        y * (-7895059235.0 + y * (242396853.1 + y * (-2972611.439 + y * (15704.4826 + y * -30.16036606)))));
    const ans2 =
      144725228442.0 + y * (2300535178.0 + y * (18583304.74 + y * (99447.43394 + y * (376.9991397 + y * 1.0))));
    ans = ans1 / ans2;
  } else {
    const z = 8.0 / ax;
    const y = z * z;
    const xx = ax - 2.356194491;
    const a1 = 1.0 + y * (0.183105e-2 + y * (-0.3516396496e-4 + y * (0.2457520174e-5 + y * -0.240337019e-6)));
    const a2 =
      0.04687499995 + y * (-0.2002690873e-3 + y * (0.8449199096e-5 + y * (-0.88228987e-6 + y * 0.105787412e-6)));
    ans = Math.sqrt(0.636619772 / ax) * (Math.cos(xx) * a1 - z * Math.sin(xx) * a2);
    if (x < 0.0) {
      ans = -ans;
    }
  }
  return ans;
}

// ---------------------------------------------------------------------------
// AiryDisc PSF — size (2r-1)×(2r-1), column-major data[col][row]
// ---------------------------------------------------------------------------
function buildAiryDisc(radius: number): Float64Array[] {
  const size = 2 * radius - 1;
  const center = radius - 1;
  const scale = 3.831705970256774 / radius;

  // Initialise column arrays
  const data: Float64Array[] = Array.from({ length: size }, () => new Float64Array(size));

  for (let i = 0; i < radius; i++) {
    const x = scale * i;
    for (let j = 0; j <= i; j++) {
      const y = scale * j;
      const r2 = x * x + y * y;
      let a: number;
      if (r2 >= 14.681970642501405) {
        a = 0;
      } else {
        const r = Math.sqrt(r2);
        const j1r = besselJ1(r);
        // r2=0 case (i=j=0): J1(0)/0 → NaN, overridden below with centre=1
        a = r2 === 0 ? 0 : (4 * j1r * j1r) / r2;
      }
      // Mirror into 8-fold symmetric positions (ActionScript: data[col][row])
      // Non-null assertions: indices are always in bounds for the allocated arrays.
      (data[center + i] as Float64Array)[center - j] = a;
      (data[center + j] as Float64Array)[center - i] = a;
      (data[center - j] as Float64Array)[center - i] = a;
      (data[center - i] as Float64Array)[center - j] = a;
      (data[center - i] as Float64Array)[center + j] = a;
      (data[center - j] as Float64Array)[center + i] = a;
      (data[center + j] as Float64Array)[center + i] = a;
      (data[center + i] as Float64Array)[center + j] = a;
    }
  }
  (data[center] as Float64Array)[center] = 1; // DC peak
  return data;
}

// ---------------------------------------------------------------------------
// Park-Miller LCG (seed in [1, 2^31-2])
// ---------------------------------------------------------------------------
function pmNext(seed: number): number {
  return (seed * 16807) % 2147483647;
}

// ---------------------------------------------------------------------------
// Noise array — generated once with fixed seed=1 (StarField.as generateNoise)
// ---------------------------------------------------------------------------
function buildNoiseData(numChunks: number, chunkSize: number): Float64Array {
  const n = numChunks * chunkSize;
  const data = new Float64Array(n);
  let seed = 1;
  for (let i = 0; i < n; i++) {
    // Box-Muller: draw two independent Gaussians per iteration
    let x1: number, x2: number, fv: number;
    do {
      x1 = 2 * (seed / 2147483647) - 1;
      seed = pmNext(seed);
      x2 = 2 * (seed / 2147483647) - 1;
      seed = pmNext(seed);
      fv = x1 * x1 + x2 * x2;
      // Reject fv === 0 as well as fv >= 1: fv = 0 would give log(0) → NaN.
    } while (fv >= 1 || fv === 0);
    fv = Math.sqrt((-2 * Math.log(fv)) / fv);
    data[i] = noiseMean + noiseSigma * x1 * fv;
    data[++i] = noiseMean + noiseSigma * x2 * fv;
  }
  return data;
}

// ---------------------------------------------------------------------------
// Gamma transfer function — lookup table for all counts in [0, peakValue]
// ---------------------------------------------------------------------------
function buildGammaLUT(invert: boolean): Uint8Array {
  const lut = new Uint8Array(peakValue + 1);
  const inv = 1 / 1.8;
  for (let v = 0; v <= peakValue; v++) {
    let g = roundSymmetric(255 * (v / peakValue) ** inv);
    if (g < 0) {
      g = 0;
    }
    if (g > 255) {
      g = 255;
    }
    lut[v] = invert ? 255 - g : g;
  }
  return lut;
}

// ---------------------------------------------------------------------------
// CCDField singleton
// ---------------------------------------------------------------------------
export class CCDField {
  private static _instance: CCDField | null = null;

  private readonly numChunks: number;
  private readonly chunkSize: number;
  private readonly noiseData: Float64Array;
  private readonly psf: Float64Array[];
  private readonly psfCenter: number;
  private readonly psfSize: number;
  private readonly gammaLUT: Uint8Array; // normal
  private readonly gammaLUTi: Uint8Array; // inverted
  // key = obsIndex (positive = normal, ~obsIndex = inverted). LRU-bounded to
  // MAX_CACHED_RENDERS entries; insertion order is used as recency (see render).
  private readonly renderCache = new Map<number, ImageData>();

  // Last-used cache for the raw field data. Avoids rebuilding the same observation's
  // float array when multiple apertures are measured in sequence (e.g., AnalyzerModel
  // measures the variable then comparison star for every epoch in one loop).
  private lastFieldBuildIndex = -1;
  private lastFieldBuildResult: { fieldData: Float64Array; chunkTable: Int32Array } | null = null;

  private constructor() {
    this.numChunks = Math.floor(0.7 * W);
    this.chunkSize = Math.ceil((W * H) / this.numChunks);
    if (this.chunkSize % 2 === 1) {
      this.chunkSize += 1;
    }

    this.noiseData = buildNoiseData(this.numChunks, this.chunkSize);
    this.psf = buildAiryDisc(psfRadius);
    this.psfCenter = psfRadius - 1;
    this.psfSize = 2 * psfRadius - 1;
    this.gammaLUT = buildGammaLUT(false);
    this.gammaLUTi = buildGammaLUT(true);
  }

  public static getInstance(): CCDField {
    if (!CCDField._instance) {
      CCDField._instance = new CCDField();
    }
    return CCDField._instance;
  }

  // -------------------------------------------------------------------------
  // Fisher-Yates chunk shuffle seeded by noiseSeed (StarField.as shuffleNoise)
  // Returns Int32Array chunkTable of length numChunks
  // -------------------------------------------------------------------------
  private buildChunkTable(noiseSeed: number): Int32Array {
    const tbl = new Int32Array(this.numChunks);
    for (let i = 0; i < this.numChunks; i++) {
      tbl[i] = i;
    }
    let seed = noiseSeed;
    for (let i = 0; i < this.numChunks - 1; i++) {
      const j = i + Math.floor((this.numChunks - i) * (seed / 2147483647));
      seed = pmNext(seed);
      const tmp = tbl[j] as number;
      tbl[j] = tbl[i] as number;
      tbl[i] = tmp;
    }
    return tbl;
  }

  // -------------------------------------------------------------------------
  // Get raw field value (counts, clamped to [0, peakValue]) for pixel at m
  // -------------------------------------------------------------------------
  private getFieldValue(m: number, chunkTable: Int32Array, fieldData: Float64Array): number {
    const p = Math.floor(m / this.chunkSize);
    const q = m - p * this.chunkSize;
    let v = fieldData[q + this.chunkSize * (chunkTable[p] as number)] as number;
    if (v < 0) {
      v = 0;
    }
    if (v > peakValue) {
      v = peakValue;
    }
    return v;
  }

  // -------------------------------------------------------------------------
  // Compute magnitude for a star at a given epoch
  // -------------------------------------------------------------------------
  private starMagnitude(starIndex: number, epoch: number): number {
    const s = STARS[starIndex] as import("./StarFieldData.js").StarDef;
    switch (s.type) {
      case "constant":
        return s.magnitude;
      case "pulsating":
        return getPulsatingMagnitude(s.prototypeName, s.centerMagnitude, epoch);
      case "eclipsing":
        return getEclipsingMagnitude(s.prototypeName, s.peakMagnitude, epoch);
    }
  }

  // -------------------------------------------------------------------------
  // Build the full field data array for an observation
  // This is the heavy render step: noise shuffle + all star PSF contributions.
  // -------------------------------------------------------------------------
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Kept close to Flash StarField.as for parity.
  private buildFieldData(obsIndex: number): { fieldData: Float64Array; chunkTable: Int32Array } {
    if (this.lastFieldBuildIndex === obsIndex && this.lastFieldBuildResult !== null) {
      return this.lastFieldBuildResult;
    }

    const obs = OBSERVATIONS[obsIndex] as import("./StarFieldData.js").Observation;
    const chunkTable = this.buildChunkTable(obs.noiseSeed);

    // Copy noise values into fieldData (flat copy — order is by linear pixel index)
    const n = this.numChunks * this.chunkSize;
    const fieldData = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      fieldData[i] = this.noiseData[i] as number;
    }

    // Add each star's PSF contribution
    for (let si = 0; si < STARS.length; si++) {
      const star = STARS[si] as import("./StarFieldData.js").StarDef;
      const mag = this.starMagnitude(si, obs.epoch);
      const f = peakValue * 10 ** ((saturationMagnitude - mag) / 2.5);
      const left = star.x - this.psfCenter;
      const top = star.y - this.psfCenter;

      for (let j = 0; j < this.psfSize; j++) {
        const px = left + j;
        if (px < 0) {
          continue;
        }
        if (px >= W) {
          break;
        }
        const psfCol = this.psf[j] as Float64Array;
        for (let k = 0; k < this.psfSize; k++) {
          const u = psfCol[k] as number;
          if (u <= 0) {
            continue;
          }
          const py = top + k;
          if (py < 0) {
            continue;
          }
          if (py >= H) {
            break;
          }
          const m = px + py * W;
          const p = Math.floor(m / this.chunkSize);
          const q = m - p * this.chunkSize;
          const idx = q + this.chunkSize * (chunkTable[p] as number);
          let v = (fieldData[idx] as number) + f * u;
          if (v < 0) {
            v = 0;
          }
          if (v > peakValue) {
            v = peakValue;
          }
          fieldData[idx] = v;
        }
      }
    }

    this.lastFieldBuildIndex = obsIndex;
    this.lastFieldBuildResult = { fieldData, chunkTable };
    return this.lastFieldBuildResult;
  }

  // -------------------------------------------------------------------------
  // Public: render an observation to an RGBA ImageData
  // -------------------------------------------------------------------------
  public render(obsIndex: number, invert = false): ImageData {
    const cacheKey = invert ? ~obsIndex : obsIndex; // ~x = -(x+1), unique negative
    const cachedImageData = this.renderCache.get(cacheKey);
    if (cachedImageData !== undefined) {
      // Refresh LRU recency: re-insertion moves the key to the newest position.
      this.renderCache.delete(cacheKey);
      this.renderCache.set(cacheKey, cachedImageData);
      return cachedImageData;
    }

    const { fieldData, chunkTable } = this.buildFieldData(obsIndex);
    const lut = invert ? this.gammaLUTi : this.gammaLUT;
    const buf = new Uint8ClampedArray(W * H * 4);

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const m = x + y * W;
        const v = roundSymmetric(this.getFieldValue(m, chunkTable, fieldData));
        const g = lut[v] as number;
        const i = m * 4;
        buf[i] = g;
        buf[i + 1] = g;
        buf[i + 2] = g;
        buf[i + 3] = 255;
      }
    }

    const imageData = new ImageData(buf, W, H);
    this.renderCache.set(cacheKey, imageData);
    // Evict the least-recently-used entry (Map preserves insertion order, so the
    // first key is the oldest) once the cache exceeds its cap.
    if (this.renderCache.size > MAX_CACHED_RENDERS) {
      const oldestKey = this.renderCache.keys().next().value;
      if (oldestKey !== undefined) {
        this.renderCache.delete(oldestKey);
      }
    }
    return imageData;
  }

  // -------------------------------------------------------------------------
  // Sum raw counts (before gamma) within the annular ring rInner ≤ d ≤ rOuter,
  // centred on (cx, cy), of a pre-built field.  rInner = 0 yields a filled disc.
  // -------------------------------------------------------------------------
  private measureRegion(
    fieldData: Float64Array,
    chunkTable: Int32Array,
    cx: number,
    cy: number,
    rInner: number,
    rOuter: number,
  ): RegionStats {
    const r2Inner = rInner * rInner;
    const r2Outer = rOuter * rOuter;
    let totalCounts = 0;
    let totalPixels = 0;

    for (let j = -rOuter; j <= rOuter; j++) {
      for (let k = -rOuter; k <= rOuter; k++) {
        const d2 = j * j + k * k;
        if (d2 < r2Inner || d2 > r2Outer) {
          continue;
        }
        const px = cx + j;
        const py = cy + k;
        if (px < 0 || px >= W || py < 0 || py >= H) {
          continue;
        }
        const m = px + py * W;
        // Flash StarField.as summed uint(v), so truncate the clamped raw count
        // for bit-level parity with legacy aperture statistics.
        totalCounts += Math.trunc(this.getFieldValue(m, chunkTable, fieldData));
        totalPixels++;
      }
    }

    return { totalCounts, totalPixels, average: totalPixels > 0 ? totalCounts / totalPixels : 0 };
  }

  // -------------------------------------------------------------------------
  // Public: full aperture photometry for one star position in one render pass.
  // Builds the field once, then measures the inner disc (flux + star) and the
  // surrounding sky annulus.  netFlux subtracts the scaled sky background:
  //   netFlux = disc.totalCounts − disc.totalPixels × sky.average
  // -------------------------------------------------------------------------
  public getPhotometry(
    obsIndex: number,
    cx: number,
    cy: number,
    apertureRadius: number,
    skyInnerRadius: number,
    skyOuterRadius: number,
  ): { disc: RegionStats; sky: RegionStats; netFlux: number } {
    const { fieldData, chunkTable } = this.buildFieldData(obsIndex);
    const disc = this.measureRegion(fieldData, chunkTable, cx, cy, 0, apertureRadius);
    const sky = this.measureRegion(fieldData, chunkTable, cx, cy, skyInnerRadius, skyOuterRadius);
    const netFlux = disc.totalCounts - disc.totalPixels * sky.average;
    return { disc, sky, netFlux };
  }

  // -------------------------------------------------------------------------
  // Public: raw pixel value at (x, y) for a given observation.
  // Used by the zoom-window hover tooltip to show X, Y, and counts.
  // -------------------------------------------------------------------------
  public getPixelValue(obsIndex: number, x: number, y: number): number {
    if (x < 0 || x >= W || y < 0 || y >= H) {
      return 0;
    }
    const { fieldData, chunkTable } = this.buildFieldData(obsIndex);
    const m = roundSymmetric(x) + roundSymmetric(y) * W;
    return this.getFieldValue(m, chunkTable, fieldData);
  }

  /** Field width in pixels (constant). */
  public get width(): number {
    return W;
  }
  /** Field height in pixels (constant). */
  public get height(): number {
    return H;
  }
}
