// biome-ignore-all lint/style/useNamingConvention: Flash prototype keys and Fourier coefficient names mirror the source assets.
/**
 * StarFieldData.ts
 *
 * All static data ported from NAAP settings.xml and the edu.unl.astro.starField package.
 * This is the single source of truth for star positions, magnitudes, and observation epochs.
 */

export type ConstantStarDef = {
  type: "constant";
  magnitude: number;
  x: number;
  y: number;
};

export type FourierTerm = { A: number; phi: number };

export type PulsatingStarDef = {
  type: "pulsating";
  centerMagnitude: number;
  prototypeName: string;
  x: number;
  y: number;
};

export type EclipsingBinaryDef = {
  type: "eclipsing";
  peakMagnitude: number;
  prototypeName: string;
  x: number;
  y: number;
};

export type StarDef = ConstantStarDef | PulsatingStarDef | EclipsingBinaryDef;

export type Observation = {
  epoch: number;
  noiseSeed: number;
};

// Field rendering parameters from settings.xml <fieldParameters>
export const FIELD_PARAMS = {
  noiseMean: 2300,
  noiseSigma: 330,
  saturationMagnitude: 3,
  psfRadius: 5,
  bitDepth: 16,
  peakValue: 65535,
} as const;

// All 26 stars from settings.xml <starsList> in source order
export const STARS: readonly StarDef[] = [
  { type: "constant", magnitude: 3.95, x: 29, y: 42 },
  { type: "eclipsing", peakMagnitude: 3.2, prototypeName: "TW_Cas", x: 331, y: 22 },
  { type: "pulsating", centerMagnitude: 4.2, prototypeName: "MT_Tel", x: 64, y: 113 },
  { type: "pulsating", centerMagnitude: 4.5, prototypeName: "del_Cep", x: 308, y: 175 },
  { type: "pulsating", centerMagnitude: 4.0, prototypeName: "PZ_Aql", x: 124, y: 259 },
  { type: "constant", magnitude: 4.46, x: 43, y: 26 },
  { type: "constant", magnitude: 4.23, x: 29, y: 157 },
  { type: "constant", magnitude: 4.73, x: 129, y: 105 },
  { type: "constant", magnitude: 3.2, x: 111, y: 54 },
  { type: "constant", magnitude: 4.26, x: 213, y: 220 },
  { type: "constant", magnitude: 4.89, x: 57, y: 192 },
  { type: "constant", magnitude: 4.78, x: 239, y: 252 },
  { type: "constant", magnitude: 5.1, x: 323, y: 84 },
  { type: "constant", magnitude: 3.77, x: 296, y: 243 },
  { type: "constant", magnitude: 4.85, x: 246, y: 82 },
  { type: "constant", magnitude: 4.02, x: 121, y: 26 },
  { type: "constant", magnitude: 4.89, x: 62, y: 255 },
  { type: "constant", magnitude: 4.15, x: 169, y: 204 },
  { type: "constant", magnitude: 5.87, x: 259, y: 147 },
  { type: "constant", magnitude: 4.57, x: 287, y: 41 },
  { type: "constant", magnitude: 3.89, x: 359, y: 129 },
  { type: "constant", magnitude: 3.42, x: 113, y: 186 },
  { type: "constant", magnitude: 5.02, x: 343, y: 272 },
  { type: "constant", magnitude: 6.2, x: 341, y: 215 },
  { type: "constant", magnitude: 3.89, x: 169, y: 52 },
  { type: "pulsating", centerMagnitude: 3.7, prototypeName: "RR_Leo", x: 131, y: 201 },
] as const;

// 113 observations from settings.xml <observationsList>
export const OBSERVATIONS: readonly Observation[] = [
  { epoch: 1.7215, noiseSeed: 1256978718 },
  { epoch: 1.7422, noiseSeed: 1785390230 },
  { epoch: 1.7691, noiseSeed: 1382680561 },
  { epoch: 1.8123, noiseSeed: 1742185764 },
  { epoch: 1.8526, noiseSeed: 710265087 },
  { epoch: 1.9156, noiseSeed: 1066486183 },
  { epoch: 1.9812, noiseSeed: 1058998707 },
  { epoch: 2.7147, noiseSeed: 51459824 },
  { epoch: 2.768, noiseSeed: 1972335412 },
  { epoch: 2.8578, noiseSeed: 1343915649 },
  { epoch: 2.9237, noiseSeed: 439876688 },
  { epoch: 3.7344, noiseSeed: 782899726 },
  { epoch: 3.7833, noiseSeed: 1806118830 },
  { epoch: 3.8127, noiseSeed: 863406004 },
  { epoch: 3.8765, noiseSeed: 1134287060 },
  { epoch: 3.9185, noiseSeed: 2014380068 },
  { epoch: 3.9687, noiseSeed: 260793590 },
  { epoch: 3.9901, noiseSeed: 560787509 },
  { epoch: 4.701, noiseSeed: 2039223079 },
  { epoch: 4.712, noiseSeed: 1383056705 },
  { epoch: 4.758, noiseSeed: 334011648 },
  { epoch: 4.8253, noiseSeed: 650444998 },
  { epoch: 4.8678, noiseSeed: 1533482619 },
  { epoch: 4.9125, noiseSeed: 947130937 },
  { epoch: 4.9758, noiseSeed: 466707171 },
  { epoch: 5.7012, noiseSeed: 1102868459 },
  { epoch: 5.768, noiseSeed: 1700291428 },
  { epoch: 5.8125, noiseSeed: 1225051256 },
  { epoch: 5.8735, noiseSeed: 422685015 },
  // NB: 5.9858 precedes 5.9564 — epochs are NOT strictly monotonic here. This
  // mirrors settings.xml verbatim; PDM is order-independent so results are
  // unaffected. Do not "sort" this list — keep source parity.
  { epoch: 5.9858, noiseSeed: 947825811 },
  { epoch: 5.9564, noiseSeed: 1130423571 },
  { epoch: 7.7788, noiseSeed: 378344826 },
  { epoch: 7.826, noiseSeed: 334337871 },
  { epoch: 7.9145, noiseSeed: 97763772 },
  { epoch: 7.9845, noiseSeed: 2019259761 },
  { epoch: 8.7025, noiseSeed: 563134417 },
  { epoch: 8.7525, noiseSeed: 1058706842 },
  { epoch: 8.7845, noiseSeed: 1861643419 },
  { epoch: 8.8125, noiseSeed: 1959485046 },
  { epoch: 8.8226, noiseSeed: 2128826760 },
  { epoch: 8.8514, noiseSeed: 338299181 },
  { epoch: 8.8847, noiseSeed: 391630794 },
  { epoch: 8.9051, noiseSeed: 478658298 },
  { epoch: 8.92456, noiseSeed: 974094161 },
  { epoch: 8.946, noiseSeed: 1518012349 },
  { epoch: 8.987, noiseSeed: 977973922 },
  { epoch: 8.992, noiseSeed: 1345149825 },
  { epoch: 9.8453, noiseSeed: 1226434322 },
  { epoch: 9.9458, noiseSeed: 699621619 },
  { epoch: 10.8245, noiseSeed: 461278720 },
  { epoch: 10.8874, noiseSeed: 298765266 },
  { epoch: 10.9256, noiseSeed: 1772726031 },
  { epoch: 10.9785, noiseSeed: 160593917 },
  { epoch: 11.73, noiseSeed: 1691674262 },
  { epoch: 11.7468, noiseSeed: 44305564 },
  { epoch: 11.7746, noiseSeed: 1893314026 },
  { epoch: 11.7945, noiseSeed: 139024690 },
  { epoch: 11.8246, noiseSeed: 218340389 },
  { epoch: 11.869, noiseSeed: 1456980283 },
  { epoch: 11.9145, noiseSeed: 169069842 },
  { epoch: 11.9877, noiseSeed: 1299197317 },
  { epoch: 12.856, noiseSeed: 626914566 },
  { epoch: 12.9147, noiseSeed: 813106012 },
  { epoch: 12.9682, noiseSeed: 1735412833 },
  { epoch: 14.87, noiseSeed: 342551949 },
  { epoch: 14.95, noiseSeed: 406023499 },
  { epoch: 15.7234, noiseSeed: 2045040691 },
  { epoch: 15.7481, noiseSeed: 1006521879 },
  { epoch: 15.7896, noiseSeed: 790956861 },
  { epoch: 15.8465, noiseSeed: 179188123 },
  { epoch: 15.8879, noiseSeed: 1829230385 },
  { epoch: 15.9236, noiseSeed: 968013572 },
  { epoch: 15.9478, noiseSeed: 1252509015 },
  { epoch: 15.9689, noiseSeed: 537516409 },
  { epoch: 15.9868, noiseSeed: 1373484650 },
  { epoch: 15.9978, noiseSeed: 1552091327 },
  { epoch: 16.7246, noiseSeed: 1979619431 },
  { epoch: 16.7896, noiseSeed: 233906902 },
  { epoch: 16.8355, noiseSeed: 144395622 },
  { epoch: 16.8798, noiseSeed: 1432660673 },
  { epoch: 16.9024, noiseSeed: 774857072 },
  { epoch: 16.9387, noiseSeed: 1340574206 },
  { epoch: 16.9789, noiseSeed: 8901314 },
  { epoch: 17.7365, noiseSeed: 1556295523 },
  { epoch: 17.8135, noiseSeed: 594204072 },
  { epoch: 17.9022, noiseSeed: 1579063958 },
  { epoch: 17.9847, noiseSeed: 1226140192 },
  { epoch: 18.7149, noiseSeed: 699600884 },
  { epoch: 18.7458, noiseSeed: 207512030 },
  { epoch: 18.8125, noiseSeed: 274329189 },
  { epoch: 18.8566, noiseSeed: 150394260 },
  { epoch: 18.885, noiseSeed: 952547410 },
  { epoch: 18.9021, noiseSeed: 761675836 },
  { epoch: 18.9285, noiseSeed: 1383633344 },
  { epoch: 18.9624, noiseSeed: 604471612 },
  { epoch: 19.812, noiseSeed: 1552913782 },
  { epoch: 19.874, noiseSeed: 927649061 },
  { epoch: 19.9452, noiseSeed: 142240048 },
  { epoch: 19.9987, noiseSeed: 781575733 },
  { epoch: 20.7124, noiseSeed: 236368276 },
  { epoch: 20.7587, noiseSeed: 243326267 },
  { epoch: 20.8435, noiseSeed: 83280748 },
  { epoch: 20.9025, noiseSeed: 354767634 },
  { epoch: 20.9902, noiseSeed: 528950464 },
  { epoch: 21.732, noiseSeed: 1790701462 },
  { epoch: 21.7546, noiseSeed: 2131261980 },
  { epoch: 21.7896, noiseSeed: 1385672575 },
  { epoch: 21.8125, noiseSeed: 924250012 },
  { epoch: 21.827, noiseSeed: 1080889661 },
  { epoch: 21.8799, noiseSeed: 1736180932 },
  { epoch: 21.9125, noiseSeed: 1964361350 },
  { epoch: 21.9364, noiseSeed: 1554201757 },
  { epoch: 21.9987, noiseSeed: 815966561 },
] as const;

// Pulsating star Fourier presets from PulsatingStar.as
export type PulsatingStarPreset = {
  period: number;
  actualCenterMagnitude: number;
  fourierTerms: readonly FourierTerm[];
};

export const PULSATING_PRESETS: Readonly<Record<string, PulsatingStarPreset>> = {
  del_Cep: {
    period: 5.366341,
    actualCenterMagnitude: 3.988,
    fourierTerms: [
      { A: 3.496e-1, phi: 2.491 },
      { A: 1.385e-1, phi: 3.084 },
      { A: 5.499e-2, phi: 3.811 },
      { A: 2.277e-2, phi: 4.083 },
      { A: 9.765e-3, phi: 4.709 },
    ],
  },
  RT_Mus: {
    period: 3.08617,
    actualCenterMagnitude: 9.03,
    fourierTerms: [
      { A: 0.331, phi: 0.0277 },
      { A: 0.131, phi: 4.13 },
      { A: 0.0503, phi: 2.24 },
      { A: 0.0416, phi: 6.16 },
    ],
  },
  AS_Per: {
    period: 4.972516,
    actualCenterMagnitude: 9.76,
    fourierTerms: [
      { A: 3.583e-1, phi: 2.468 },
      { A: 1.443e-1, phi: 3.084 },
      { A: 5.731e-2, phi: 3.65 },
      { A: 2.603e-2, phi: 3.695 },
      { A: 2.11e-2, phi: 4.625 },
    ],
  },
  S_Nor: {
    period: 9.75411,
    actualCenterMagnitude: 6.4354,
    fourierTerms: [
      { A: 0.2874, phi: 3.1842 },
      { A: 0.0191, phi: 4.6142 },
      { A: 0.0296, phi: 2.7042 },
      { A: 0.0144, phi: 3.3482 },
      { A: 0.018, phi: 3.0182 },
      { A: 0.0159, phi: 3.4322 },
    ],
  },
  PZ_Aql: {
    period: 8.7513,
    actualCenterMagnitude: 11.7,
    fourierTerms: [
      { A: 0.365, phi: 4.66 },
      { A: 0.0459, phi: 1.75 },
      { A: 0.0208, phi: 2.76 },
      { A: 0.0188, phi: 5.98 },
    ],
  },
  MT_Tel: {
    period: 0.316897,
    actualCenterMagnitude: 9.01,
    fourierTerms: [
      { A: 2.6e-1, phi: 1.93 },
      { A: 7.35e-2, phi: 1.89 },
      { A: 1.66e-2, phi: 1.85 },
      { A: 1.0e-2, phi: 1.95 },
      { A: 5.6e-3, phi: 1.35 },
      { A: 4.89e-3, phi: 1.48 },
      { A: 4.53e-3, phi: 1.62 },
      { A: 1.51e-3, phi: 1.11 },
    ],
  },
  RR_Leo: {
    period: 0.4523933,
    actualCenterMagnitude: 10.83,
    fourierTerms: [
      { A: 4.55e-1, phi: 6.91e-1 },
      { A: 2.28e-1, phi: 5.16 },
      { A: 1.61e-1, phi: 3.69 },
      { A: 9.91e-2, phi: 2.33 },
      { A: 7.79e-2, phi: 1.02 },
      { A: 4.91e-2, phi: 5.81 },
      { A: 3.27e-2, phi: 4.45 },
      { A: 3.14e-2, phi: 2.97 },
    ],
  },
  VX_Her: {
    period: 0.45537282,
    actualCenterMagnitude: 10.78,
    fourierTerms: [
      { A: 4.58e-1, phi: 4.51 },
      { A: 2.12e-1, phi: 2.61e-1 },
      { A: 1.64e-1, phi: 2.56 },
      { A: 1.06e-1, phi: 4.96 },
      { A: 7.33e-2, phi: 1.07 },
      { A: 5.92e-2, phi: 3.57 },
      { A: 3.62e-2, phi: 6.07 },
      { A: 2.7e-2, phi: 2.2 },
    ],
  },
};

// Eclipsing binary presets from EclipsingBinary.as
export type EclipsingBinaryPreset = {
  argument: number; // degrees
  inclination: number; // degrees
  eccentricity: number;
  separation: number; // solar radii
  mass1: number; // solar masses
  radius1: number; // solar radii
  temperature1: number; // Kelvin
  mass2: number;
  radius2: number;
  temperature2: number;
};

export const ECLIPSING_BINARY_PRESETS: Readonly<Record<string, EclipsingBinaryPreset>> = {
  TW_Cas: {
    argument: 0,
    inclination: 74.7,
    eccentricity: 0,
    separation: 8.17,
    mass1: 2.5,
    radius1: 2.0,
    temperature1: 10500,
    mass2: 1.1,
    radius2: 2.6,
    temperature2: 5400,
  },
  AG_Phi: {
    argument: 0,
    inclination: 87.624,
    eccentricity: 0,
    separation: 4.22,
    mass1: 1.53,
    radius1: 1.7,
    temperature1: 7500,
    mass2: 0.24,
    radius2: 1.0,
    temperature2: 5400,
  },
  V477_Cyg: {
    argument: 162.8,
    inclination: 85.66,
    eccentricity: 0.33,
    separation: 10.87,
    mass1: 1.9,
    radius1: 1.7,
    temperature1: 8730,
    mass2: 1.4,
    radius2: 1.5,
    temperature2: 6530,
  },
  CW_CMa: {
    argument: 0,
    inclination: 83.3,
    eccentricity: 0,
    separation: 11.92,
    mass1: 2.6,
    radius1: 2.1,
    temperature1: 10800,
    mass2: 2.5,
    radius2: 1.9,
    temperature2: 10300,
  },
  EK_Cep: {
    argument: 49.8,
    inclination: 89.16,
    eccentricity: 0.11,
    separation: 16.58,
    mass1: 2.0,
    radius1: 1.6,
    temperature1: 9000,
    mass2: 1.1,
    radius2: 1.3,
    temperature2: 5690,
  },
  V526_Sgr: {
    argument: 254.8,
    inclination: 87.3,
    eccentricity: 0.22,
    separation: 10.43,
    mass1: 2.4,
    radius1: 1.9,
    temperature1: 10100,
    mass2: 1.8,
    radius2: 1.6,
    temperature2: 8450,
  },
  T_LMi: {
    argument: 0,
    inclination: 86.3,
    eccentricity: 0,
    separation: 11.97,
    mass1: 2.3,
    radius1: 1.9,
    temperature1: 9860,
    mass2: 0.23,
    radius2: 2.4,
    temperature2: 5060,
  },
};
