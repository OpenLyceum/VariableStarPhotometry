/**
 * AperturePhotometry.ts
 *
 * Pure aperture-photometry helpers used by the Photometry and Analyzer screens.
 *
 * These operate on the *raw* CCD counts produced by {@link CCDField} (before the
 * gamma display transfer function), which is the only physically meaningful
 * domain for flux measurement — the gamma-compressed RGBA image used for
 * on-screen display must NOT be summed for photometry.
 *
 * Each measurement uses the same model as the Flash reference:
 *   - an inner disc of radius `apertureRadius` integrates star + sky flux,
 *   - an annulus between `skyInnerRadius` and `skyOuterRadius` estimates the
 *     local sky background per pixel,
 *   - net stellar flux = disc.totalCounts − disc.totalPixels × sky.average.
 *
 * The differential (instrumental) magnitude between two stars is
 *   Δm = m₁ − m₂ = −2.5 · log₁₀( f₁ / f₂ ).
 */

import type { Vector2 } from "scenerystack/dot";
import type { RegionStats } from "./CCDField.js";
import { CCDField } from "./CCDField.js";

const FIELD = CCDField.getInstance();

export type PhotometryResult = {
  /** Inner disc (star + sky). */
  disc: RegionStats;
  /** Sky-background annulus. */
  sky: RegionStats;
  /** Background-subtracted stellar flux (raw counts). May be ≤ 0 in noise. */
  netFlux: number;
};

/**
 * Measures aperture photometry for a star centred at `center` (field-pixel
 * coordinates) in the given observation.
 */
export function measureAperture(
  obsIndex: number,
  center: Vector2,
  apertureRadius: number,
  skyInnerRadius: number,
  skyOuterRadius: number,
): PhotometryResult {
  return FIELD.getPhotometry(
    obsIndex,
    Math.round(center.x),
    Math.round(center.y),
    apertureRadius,
    skyInnerRadius,
    skyOuterRadius,
  );
}

/**
 * Differential instrumental magnitude m₁ − m₂ = −2.5·log₁₀(f₁/f₂).
 * Returns null when either flux is non-positive (cannot take the logarithm).
 */
export function differentialMagnitude(f1: number, f2: number): number | null {
  if (f1 <= 0 || f2 <= 0) {
    return null;
  }
  return -2.5 * Math.log10(f1 / f2);
}
