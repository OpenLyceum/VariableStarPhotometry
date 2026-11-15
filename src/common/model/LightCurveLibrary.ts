// biome-ignore-all lint/style/useNamingConvention: Constants mirror the Flash EclipsingBinary.as formulas.
/**
 * LightCurveLibrary.ts
 *
 * Computes the instantaneous magnitude of variable stars for a given epoch (days).
 * Ported exactly from PulsatingStar.as and EclipsingBinary.as.
 */

import type { EclipsingBinaryPreset } from "./StarFieldData.js";
import { ECLIPSING_BINARY_PRESETS, PULSATING_PRESETS } from "./StarFieldData.js";

const SOLAR_MASS = 1.98892e30; // kg
const SOLAR_RADIUS = 6.955e8; // m
const G = 6.673e-11; // N m² kg⁻²

// Bolometric correction polynomial from EclipsingBinary.as
function getBolometricCorrection(temperature: number): number {
  const logTeff = Math.log10(temperature);
  let a: number, b: number, c: number, d: number, e: number, f: number;
  if (logTeff > 3.9) {
    [a, b, c, d, e, f] = [-100139.4991, 116264.1842, -53931.97541, 12495.04227, -1445.868048, 66.84924471];
  } else if (logTeff < 3.7) {
    [a, b, c, d, e, f] = [-13884.14899, 8595.127427, -488.3425525, -627.0092238, 137.4608131, -7.549572042];
  } else {
    [a, b, c, d, e, f] = [1439.981506, -151.9002581, -995.1089203, 582.5176671, -123.3293641, 9.160761128];
  }
  return a + logTeff * (b + logTeff * (c + logTeff * (d + logTeff * (e + f * logTeff))));
}

// Pre-computed constants for each eclipsing binary preset
type EclipsingConstants = {
  C1: number;
  J1: number;
  J2: number;
  J3: number;
  J4: number;
  R12: number;
  R22: number;
  Z0: number;
  Z1: number;
  Z2: number;
  Z3: number;
  H1: number;
  H2: number;
  maxVisFlux: number;
  minVisMag: number;
  period: number; // days
  distanceModulus: number;
  eccentricity: number;
  argument: number; // radians
  peakMagnitude: number;
  phaseOffset: number;
};

function buildEclipsingConstants(prototypeName: string, peakMagnitude: number): EclipsingConstants {
  const p = ECLIPSING_BINARY_PRESETS[prototypeName] as EclipsingBinaryPreset;

  const argRad = p.argument * (Math.PI / 180);
  const incRad = p.inclination * (Math.PI / 180);
  const e = p.eccentricity;
  const a = p.separation * SOLAR_RADIUS;
  const m1 = p.mass1 * SOLAR_MASS;
  const m2 = p.mass2 * SOLAR_MASS;
  const r1 = p.radius1 * SOLAR_RADIUS;
  const r2 = p.radius2 * SOLAR_RADIUS;

  const C1 = Math.sqrt((1 + e) / (1 - e));
  const cosInc = Math.cos(incRad);
  const J0 = a * (1 - e * e);
  const J1 = J0 * J0 * (1 - cosInc * cosInc);
  const J2 = J0 * J0 * cosInc * cosInc;
  const J3 = 2 * e;
  const J4 = e * e;

  const R12 = r1 * r1;
  const R22 = r2 * r2;
  const Z0 = 1 / (2 * r2);
  const Z1 = (R22 - R12) * Z0;
  const Z2 = 1 / (2 * r1);
  const Z3 = (R12 - R22) * Z2;

  const BC1 = getBolometricCorrection(p.temperature1 as number);
  const BC2 = getBolometricCorrection(p.temperature2 as number);
  const H1 = 1.89553328524593e-43 * p.temperature1 ** 4 * 10 ** (BC1 / 2.5);
  const H2 = 1.89553328524593e-43 * p.temperature2 ** 4 * 10 ** (BC2 / 2.5);

  const maxVisFlux = (R12 * H1 + R22 * H2) * Math.PI;
  const minVisMag = -18.9669559998301 - (2.5 / Math.LN10) * Math.log(maxVisFlux);
  const period = Math.sqrt((4 * Math.PI * Math.PI * a * a * a) / (G * (m1 + m2))) / (24 * 60 * 60);

  return {
    C1,
    J1,
    J2,
    J3,
    J4,
    R12,
    R22,
    Z0,
    Z1,
    Z2,
    Z3,
    H1,
    H2,
    maxVisFlux,
    minVisMag,
    period,
    distanceModulus: peakMagnitude - minVisMag,
    eccentricity: e,
    argument: argRad,
    peakMagnitude,
    phaseOffset: 0,
  };
}

// Cache so we only compute once per prototype
const eclipsingConstantsCache = new Map<string, EclipsingConstants>();

function getEclipsingConstants(prototypeName: string, peakMagnitude: number): EclipsingConstants {
  const key = `${prototypeName}:${peakMagnitude}`;
  let constants = eclipsingConstantsCache.get(key);
  if (constants === undefined) {
    constants = buildEclipsingConstants(prototypeName, peakMagnitude);
    eclipsingConstantsCache.set(key, constants);
  }
  return constants;
}

/**
 * Returns the magnitude of a pulsating star at the given epoch (days).
 * Exact port of PulsatingStar.as magnitude getter.
 */
export function getPulsatingMagnitude(
  prototypeName: string,
  centerMagnitude: number,
  epoch: number,
  phaseOffset = 0,
): number {
  const preset = PULSATING_PRESETS[prototypeName];
  if (!preset) {
    return centerMagnitude;
  }
  const t = (2 * Math.PI * (epoch - phaseOffset)) / preset.period;
  let mag = centerMagnitude;
  for (let i = 0; i < preset.fourierTerms.length; i++) {
    const term = preset.fourierTerms[i];
    if (!term) {
      continue;
    }
    const { A, phi } = term;
    mag += A * Math.cos((i + 1) * t + phi);
  }
  return mag;
}

/**
 * Returns the magnitude of an eclipsing binary at the given epoch (days).
 * Exact port of EclipsingBinary.as magnitude getter (Kepler orbit + limb overlap).
 */
export function getEclipsingMagnitude(prototypeName: string, peakMagnitude: number, epoch: number): number {
  const k = getEclipsingConstants(prototypeName, peakMagnitude);
  const e = k.eccentricity;

  // Mean anomaly
  const ma = (2 * Math.PI * (epoch - k.phaseOffset)) / k.period;

  // Eccentric anomaly via Newton–Raphson (Kepler's equation)
  let ea0 = 0;
  let ea1 = ma;
  let counter = 0;
  do {
    ea0 = ea1;
    ea1 = ea0 + (ma + e * Math.sin(ea0) - ea0) / (1 - e * Math.cos(ea0));
    counter++;
  } while (Math.abs(ea1 - ea0) > 0.001 && counter < 100);

  // True anomaly
  const ta = 2 * Math.atan(k.C1 * Math.tan(ea1 / 2));
  const cosTa = Math.cos(ta);
  const cosTaArg = Math.cos(ta + k.argument);

  // Projected separation of star centres
  const denom = 1 + k.J3 * cosTa + k.J4 * cosTa * cosTa;
  let d = Math.sqrt((k.J1 * cosTaArg * cosTaArg + k.J2) / denom);
  if (d === 0) {
    d = 1e-8;
  }

  // Overlap arc parameters
  let ca = k.Z0 * d + k.Z1 / d;
  let cb = k.Z2 * d + k.Z3 / d;
  if (ca < -1) {
    ca = -1;
  } else if (ca > 1) {
    ca = 1;
  }
  if (cb < -1) {
    cb = -1;
  } else if (cb > 1) {
    cb = 1;
  }
  const alpha = Math.acos(ca);
  const beta = Math.acos(cb);

  // Overlap area (lens intersection of two circles)
  const overlap = k.R22 * (alpha - ca * Math.sin(alpha)) + k.R12 * (beta - cb * Math.sin(beta));

  // Which star is in front?
  const star2InFront = (((ta + k.argument) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) < Math.PI;
  const visFlux = star2InFront ? k.maxVisFlux - k.H1 * overlap : k.maxVisFlux - k.H2 * overlap;

  const visMag = -18.9669559998301 - (2.5 / Math.LN10) * Math.log(visFlux);
  return k.distanceModulus + visMag;
}
