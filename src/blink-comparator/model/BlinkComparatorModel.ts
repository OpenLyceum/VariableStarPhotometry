/**
 * BlinkComparatorModel.ts
 *
 * Model for the Blink Comparator screen.
 *
 * The student builds a "blink queue" of observations (by epoch) and the screen
 * flips through the queued CCD images at a configurable rate.  Stars whose
 * brightness changes between frames appear to flicker — these are the
 * variable-star candidates.
 */

import type { ObservableArray, TReadOnlyProperty } from "scenerystack/axon";
import { BooleanProperty, createObservableArray, DerivedProperty, NumberProperty } from "scenerystack/axon";
import { Range } from "scenerystack/dot";
import type { TModel } from "scenerystack/joist";
import type { Tandem } from "scenerystack/tandem";
import { OBSERVATIONS } from "../../common/model/StarFieldData.js";
import variableStarPhotometryQueryParameters from "../../preferences/variableStarPhotometryQueryParameters.js";
import VariableStarPhotometryConstants from "../../VariableStarPhotometryConstants.js";
import VariableStarPhotometryNamespace from "../../VariableStarPhotometryNamespace.js";

/** Allowed range for blink interval in milliseconds. */
export const BLINK_INTERVAL_RANGE = new Range(200, 2000);

/** Range of selectable observation indices (0 … 108). */
export const OBS_INDEX_RANGE = new Range(0, OBSERVATIONS.length - 1);

/**
 * Default queue: an early and a late epoch so the field visibly blinks out of
 * the box (variable stars differ in brightness between these two epochs).
 */
export const DEFAULT_QUEUE_INDICES: readonly number[] = [0, 36];

export class BlinkComparatorModel implements TModel {
  /** Observation indices the comparator blinks through, in order. */
  public readonly blinkQueue: ObservableArray<number>;

  /** Index into {@link blinkQueue} of the frame currently shown while blinking. */
  public readonly queuePositionProperty: NumberProperty;

  /** Observation index the student is currently browsing (candidate to add). */
  public readonly selectedObsIndexProperty: NumberProperty;

  /** Blink interval in milliseconds. */
  public readonly blinkIntervalMsProperty: NumberProperty;

  /** Whether automatic blinking is active. */
  public readonly isBlinkingProperty: BooleanProperty;

  /** Whether the mouse-following crosshair is visible. */
  public readonly showCrosshairProperty: BooleanProperty;

  /**
   * Observation index actually displayed in the star field: the current queue
   * frame while a queue exists, otherwise the browsed observation (preview).
   */
  public readonly displayedObsIndexProperty: TReadOnlyProperty<number>;

  /** Accumulated time since the last frame flip, in seconds. */
  private blinkAccumulatorS = 0;

  public constructor(_tandem?: Tandem) {
    this.blinkQueue = createObservableArray<number>({ elements: [...DEFAULT_QUEUE_INDICES] });

    this.queuePositionProperty = new NumberProperty(0, { numberType: "Integer" });

    this.selectedObsIndexProperty = new NumberProperty(0, {
      numberType: "Integer",
      range: OBS_INDEX_RANGE,
    });

    this.blinkIntervalMsProperty = new NumberProperty(
      variableStarPhotometryQueryParameters.blinkIntervalMs ??
        VariableStarPhotometryConstants.TIME.DEFAULT_BLINK_INTERVAL_MS,
      { range: BLINK_INTERVAL_RANGE },
    );

    this.isBlinkingProperty = new BooleanProperty(true);

    this.showCrosshairProperty = new BooleanProperty(variableStarPhotometryQueryParameters.showCrosshair);

    this.displayedObsIndexProperty = new DerivedProperty(
      [this.blinkQueue.lengthProperty, this.queuePositionProperty, this.selectedObsIndexProperty],
      (length, position, selected) => {
        if (length === 0) {
          return selected;
        }
        const clamped = Math.max(0, Math.min(length - 1, position));
        return this.blinkQueue[clamped] as number;
      },
    );

    // Keep the queue position valid as the queue shrinks/grows.
    this.blinkQueue.lengthProperty.link((length) => {
      if (length === 0) {
        this.queuePositionProperty.value = 0;
      } else if (this.queuePositionProperty.value > length - 1) {
        this.queuePositionProperty.value = length - 1;
      }
    });
  }

  /** Add the currently-browsed observation to the queue (no duplicates). */
  public addSelectedToQueue(): void {
    const index = this.selectedObsIndexProperty.value;
    if (!this.blinkQueue.includes(index)) {
      this.blinkQueue.push(index);
    }
  }

  /** Remove a specific observation index from the queue. */
  public removeFromQueue(obsIndex: number): void {
    if (this.blinkQueue.includes(obsIndex)) {
      this.blinkQueue.remove(obsIndex);
    }
  }

  /** Empty the blink queue. */
  public clearQueue(): void {
    this.blinkQueue.clear();
  }

  public step(dt: number): void {
    // Need at least two frames to have something to blink between.
    if (!this.isBlinkingProperty.value || this.blinkQueue.length < 2) {
      return;
    }
    this.blinkAccumulatorS += dt;
    const intervalS = this.blinkIntervalMsProperty.value / 1000;
    // Loop so that a large dt (e.g. after the tab is backgrounded) advances the
    // correct number of frames rather than always advancing by exactly one.
    while (this.blinkAccumulatorS >= intervalS) {
      this.blinkAccumulatorS -= intervalS;
      this.queuePositionProperty.value = (this.queuePositionProperty.value + 1) % this.blinkQueue.length;
    }
  }

  public reset(): void {
    this.blinkQueue.clear();
    for (const index of DEFAULT_QUEUE_INDICES) {
      this.blinkQueue.push(index);
    }
    this.queuePositionProperty.reset();
    this.selectedObsIndexProperty.reset();
    this.blinkIntervalMsProperty.reset();
    this.isBlinkingProperty.reset();
    this.showCrosshairProperty.reset();
    this.blinkAccumulatorS = 0;
  }
}

VariableStarPhotometryNamespace.register("BlinkComparatorModel", BlinkComparatorModel);
