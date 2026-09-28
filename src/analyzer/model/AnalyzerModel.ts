/**
 * AnalyzerModel.ts
 *
 * Model for the Analyzer screen — the capstone that ties the workflow together.
 *
 * The student clicks a "variable" star and a "comparison" star in the field.
 * For every observation the screen measures the differential instrumental
 * magnitude between them (aperture photometry, sky-subtracted) to build a raw
 * light curve. A Phase Dispersion Minimization (PDM) scan over trial periods
 * reveals the true period as the trial period that minimises θ; the curve can
 * then be phase-folded for inspection.
 *
 * Supported variable types (from NAAP settings.xml):
 *   - Pulsating stars   (Cepheid del Cep; RR Lyrae MT Tel, PZ Aql, RR Leo)
 *   - Eclipsing binary  (TW Cas)
 */
import type { TReadOnlyProperty } from "scenerystack/axon";
import { DerivedProperty, NumberProperty, Property, StringUnionProperty } from "scenerystack/axon";
import { Range, type Vector2 } from "scenerystack/dot";
import type { TModel } from "scenerystack/joist";
import type { Tandem } from "scenerystack/tandem";
import { differentialMagnitude, measureAperture } from "../../common/model/AperturePhotometry.js";
import { PDM_M, type PdmPoint, pdmScan } from "../../common/model/PDMCalculator.js";
import { OBSERVATIONS } from "../../common/model/StarFieldData.js";
import variableStarPhotometryQueryParameters from "../../preferences/variableStarPhotometryQueryParameters.js";
import VariableStarPhotometryConstants from "../../VariableStarPhotometryConstants.js";
import VariableStarPhotometryNamespace from "../../VariableStarPhotometryNamespace.js";

export const PERIOD_RANGE = new Range(0.1, 100);
export const PHASE_OFFSET_RANGE = new Range(
  0,
  Math.ceil((OBSERVATIONS[OBSERVATIONS.length - 1] as { epoch: number }).epoch),
);

/** Light-curve x-axis mode. */
export type LightCurveMode = "time" | "phase";

/** One differential-magnitude measurement at a Julian date. */
export type DiffMag = { epoch: number; magnitude: number };

/** Fixed aperture geometry used for the automated per-observation photometry. */
const ANALYZER_APERTURE_RADIUS = VariableStarPhotometryConstants.APERTURE.DEFAULT_DIAMETER / 2;
const ANALYZER_SKY_INNER = VariableStarPhotometryConstants.APERTURE.DEFAULT_ANNULUS_INNER;
const ANALYZER_SKY_OUTER = VariableStarPhotometryConstants.APERTURE.DEFAULT_ANNULUS_OUTER;

/** Initial (full) PDM period-scan window, in days. */
const FULL_PDM_RANGE = new Range(0.2, 10);

/** Narrowest PDM window — below this, bamboo tick spacing underflows. */
const MIN_PDM_SPAN = 0.05;

const clampPdmRange = (min: number, max: number): Range | null => {
  const lo = Math.max(PERIOD_RANGE.min, Math.min(min, max));
  const hi = Math.min(PERIOD_RANGE.max, Math.max(min, max));
  if (hi - lo < MIN_PDM_SPAN) {
    return null;
  }
  return new Range(lo, hi);
};

/** Number of trial periods evaluated per scan (resolution adapts to zoom). */
const PDM_SCAN_STEPS = VariableStarPhotometryConstants.PDM.SCAN_STEPS;

export class AnalyzerModel implements TModel {
  /** Trial period for phase-folding and the PDM marker, in days. */
  public readonly trialPeriodProperty: NumberProperty;

  /** Zero-phase Julian epoch offset (days). */
  public readonly phaseOffsetProperty: NumberProperty;

  /** Light-curve x-axis: raw Julian date ("time") or folded ("phase"). */
  public readonly lightCurveModeProperty: StringUnionProperty<LightCurveMode>;

  /** Selected star positions in field-pixel coordinates (null = not chosen). */
  public readonly variableStarPositionProperty: Property<Vector2 | null>;
  public readonly comparisonStarPositionProperty: Property<Vector2 | null>;

  /** Differential-magnitude light curve (empty until both stars are chosen). */
  public readonly measurementsProperty: TReadOnlyProperty<readonly DiffMag[]>;

  /** Current PDM plot period window (days). */
  public readonly pdmZoomRangeProperty: Property<Range>;

  /** PDM θ-vs-period scan over the current window. */
  public readonly pdmScanResultsProperty: TReadOnlyProperty<readonly PdmPoint[]>;

  /** Zoom-window history for "undo last zoom". */
  private readonly pdmZoomHistory: Range[] = [];

  public constructor(_tandem?: Tandem) {
    this.trialPeriodProperty = new NumberProperty(variableStarPhotometryQueryParameters.trialPeriod ?? 1.0, {
      range: PERIOD_RANGE,
    });

    this.phaseOffsetProperty = new NumberProperty(0.0, { range: PHASE_OFFSET_RANGE });

    this.lightCurveModeProperty = new StringUnionProperty<LightCurveMode>(
      variableStarPhotometryQueryParameters.lightCurveMode as LightCurveMode,
      { validValues: ["time", "phase"] },
    );

    this.variableStarPositionProperty = new Property<Vector2 | null>(null);
    this.comparisonStarPositionProperty = new Property<Vector2 | null>(null);

    // Light curve: differential magnitude of variable vs comparison for every
    // observation. Computed only once both stars are selected (otherwise empty).
    this.measurementsProperty = new DerivedProperty(
      [this.variableStarPositionProperty, this.comparisonStarPositionProperty],
      (variablePos, comparisonPos) => {
        if (!(variablePos && comparisonPos)) {
          return [];
        }
        const measurements: DiffMag[] = [];
        for (let i = 0; i < OBSERVATIONS.length; i++) {
          const varFlux = measureAperture(
            i,
            variablePos,
            ANALYZER_APERTURE_RADIUS,
            ANALYZER_SKY_INNER,
            ANALYZER_SKY_OUTER,
          ).netFlux;
          const compFlux = measureAperture(
            i,
            comparisonPos,
            ANALYZER_APERTURE_RADIUS,
            ANALYZER_SKY_INNER,
            ANALYZER_SKY_OUTER,
          ).netFlux;
          const delta = differentialMagnitude(varFlux, compFlux);
          if (delta !== null) {
            measurements.push({ epoch: (OBSERVATIONS[i] as { epoch: number }).epoch, magnitude: delta });
          }
        }
        return measurements;
      },
    );

    this.pdmZoomRangeProperty = new Property<Range>(FULL_PDM_RANGE.copy());

    this.pdmScanResultsProperty = new DerivedProperty(
      [this.measurementsProperty, this.pdmZoomRangeProperty, this.phaseOffsetProperty],
      (measurements, zoom, t0) => {
        // pdmTheta needs at least M+1 points to be defined (it returns the
        // sentinel 1 otherwise); below that a scan would be uniformly flat.
        if (measurements.length < PDM_M + 1) {
          return [];
        }
        const epochs = measurements.map((m) => m.epoch);
        const mags = measurements.map((m) => m.magnitude);
        return pdmScan(epochs, mags, zoom.min, zoom.max, PDM_SCAN_STEPS, t0);
      },
    );
  }

  /**
   * Returns the phase of a given Julian date under the current trial period.
   * Result is in [0, 1).
   */
  public getPhase(julianDate: number): number {
    const phase = ((julianDate - this.phaseOffsetProperty.value) / this.trialPeriodProperty.value) % 1;
    return phase < 0 ? phase + 1 : phase;
  }

  /** Record a click on the field: first selects the variable, then comparison. */
  public selectStarAt(position: Vector2): void {
    if (this.variableStarPositionProperty.value === null) {
      this.variableStarPositionProperty.value = position;
    } else if (this.comparisonStarPositionProperty.value === null) {
      this.comparisonStarPositionProperty.value = position;
    } else {
      // Both already chosen — start over with a new variable star.
      this.variableStarPositionProperty.value = position;
      this.comparisonStarPositionProperty.value = null;
    }
  }

  /** Clear both star selections (and therefore the light curve). */
  public clearSelections(): void {
    this.variableStarPositionProperty.value = null;
    this.comparisonStarPositionProperty.value = null;
  }

  /** Push the current window and zoom in to ±25 % around the trial period. */
  public zoomInAroundPeriod(): void {
    const current = this.pdmZoomRangeProperty.value;
    const half = (current.max - current.min) / 4;
    const center = this.trialPeriodProperty.value;
    const next = clampPdmRange(center - half, center + half);
    if (next) {
      this.pdmZoomHistory.push(current);
      this.pdmZoomRangeProperty.value = next;
    }
  }

  /** Push the current window and widen it ×2 around the trial period. */
  public zoomOutAroundPeriod(): void {
    const current = this.pdmZoomRangeProperty.value;
    const half = current.max - current.min;
    const center = this.trialPeriodProperty.value;
    const next = clampPdmRange(center - half, center + half) ?? FULL_PDM_RANGE.copy();
    this.pdmZoomHistory.push(current);
    this.pdmZoomRangeProperty.value = next;
  }

  /** Push the current window and zoom to an explicitly selected period range. */
  public zoomToPeriodRange(minPeriod: number, maxPeriod: number): void {
    const next = clampPdmRange(minPeriod, maxPeriod);
    if (next) {
      this.pdmZoomHistory.push(this.pdmZoomRangeProperty.value);
      this.pdmZoomRangeProperty.value = next;
    }
  }

  /** Reset the PDM window to the full scan range. */
  public zoomToFull(): void {
    if (!this.pdmZoomRangeProperty.value.equals(FULL_PDM_RANGE)) {
      this.pdmZoomHistory.push(this.pdmZoomRangeProperty.value);
      this.pdmZoomRangeProperty.value = FULL_PDM_RANGE.copy();
    }
  }

  /** Restore the previous PDM window. */
  public undoLastZoom(): void {
    const previous = this.pdmZoomHistory.pop();
    if (previous) {
      this.pdmZoomRangeProperty.value = previous;
    }
  }

  public step(_dt: number): void {
    // No time-dependent state — analysis is driven by user input, not a sim clock.
  }

  public reset(): void {
    this.trialPeriodProperty.reset();
    this.phaseOffsetProperty.reset();
    this.lightCurveModeProperty.reset();
    this.variableStarPositionProperty.reset();
    this.comparisonStarPositionProperty.reset();
    this.pdmZoomHistory.length = 0;
    this.pdmZoomRangeProperty.value = FULL_PDM_RANGE.copy();
  }
}

VariableStarPhotometryNamespace.register("AnalyzerModel", AnalyzerModel);
