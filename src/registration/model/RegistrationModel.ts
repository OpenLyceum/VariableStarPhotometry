/**
 * RegistrationModel.ts
 *
 * Model for the Registration screen.
 *
 * Students align a series of CCD images (taken at different epochs) to a
 * reference image by shifting the "working" images in X/Y.
 */
import { BooleanProperty, NumberProperty } from "scenerystack/axon";
import { Range } from "scenerystack/dot";
import type { TModel } from "scenerystack/joist";
import type { Tandem } from "scenerystack/tandem";
import type { VariableStarPhotometryPreferencesModel } from "../../preferences/VariableStarPhotometryPreferencesModel.js";
import VariableStarPhotometryNamespace from "../../VariableStarPhotometryNamespace.js";

// Fixed observation indices chosen to sample early, mid, and late epochs.
// index 0  → epoch  1.7215 d  (reference)
// index 36 → epoch  8.7525 d  (working A)
// index 63 → epoch 12.9682 d  (working B)
export const REG_OBS_INDICES = [0, 36, 63] as const;

/**
 * Telescope pointing error baked into each working frame (px), as in the NAAP
 * lab: "the center of each frame is not exactly in the same location … due to
 * minor errors in pointing and the telescope clock drive". Frames are drawn at
 * pointing error + user offset, so they register when offset = −error — the
 * values students report in the student guide's Question 6.
 */
export const REG_POINTING_ERRORS = {
  2: { x: 14, y: -9 },
  3: { x: -11, y: 17 },
} as const;

const OFFSET_RANGE = new Range(-100, 100);
const clampOffset = (value: number) => Math.round(Math.max(OFFSET_RANGE.min, Math.min(OFFSET_RANGE.max, value)));

export class RegistrationModel implements TModel {
  public readonly obsIndex1 = REG_OBS_INDICES[0];
  public readonly obsIndex2 = REG_OBS_INDICES[1];
  public readonly obsIndex3 = REG_OBS_INDICES[2];

  public readonly shown2Property: BooleanProperty;
  public readonly shown3Property: BooleanProperty;

  /**
   * Which working field is rendered on top (2 or 3).
   * Starfield 1 (reference) is always at the bottom.
   */
  public readonly onTopIndexProperty: NumberProperty;

  public readonly xOffset2Property: NumberProperty;
  public readonly yOffset2Property: NumberProperty;
  public readonly xOffset3Property: NumberProperty;
  public readonly yOffset3Property: NumberProperty;

  public readonly topFieldTransparentProperty: BooleanProperty;
  public readonly invertColorsProperty: BooleanProperty;
  public readonly showGridProperty: BooleanProperty;

  public constructor(preferences: VariableStarPhotometryPreferencesModel, tandem?: Tandem) {
    const t = (name: string) => (tandem ? { tandem: tandem.createTandem(name) } : {});

    this.shown2Property = new BooleanProperty(true, t("shown2Property"));
    this.shown3Property = new BooleanProperty(false, t("shown3Property"));

    this.onTopIndexProperty = new NumberProperty(2, {
      numberType: "Integer",
      validValues: [2, 3],
      ...t("onTopIndexProperty"),
    });

    this.xOffset2Property = new NumberProperty(0, {
      numberType: "Integer",
      range: OFFSET_RANGE,
      ...t("xOffset2Property"),
    });
    this.yOffset2Property = new NumberProperty(0, {
      numberType: "Integer",
      range: OFFSET_RANGE,
      ...t("yOffset2Property"),
    });
    this.xOffset3Property = new NumberProperty(0, {
      numberType: "Integer",
      range: OFFSET_RANGE,
      ...t("xOffset3Property"),
    });
    this.yOffset3Property = new NumberProperty(0, {
      numberType: "Integer",
      range: OFFSET_RANGE,
      ...t("yOffset3Property"),
    });

    this.topFieldTransparentProperty = new BooleanProperty(false, t("topFieldTransparentProperty"));

    // invertColors and showGrid stay in sync with global preferences in both
    // directions so this screen's checkboxes update Blink / Photometry / Analyzer.
    this.invertColorsProperty = new BooleanProperty(preferences.invertImagesProperty.value, t("invertColorsProperty"));
    preferences.invertImagesProperty.link((invert) => {
      if (this.invertColorsProperty.value !== invert) {
        this.invertColorsProperty.value = invert;
      }
    });
    this.invertColorsProperty.link((invert) => {
      if (preferences.invertImagesProperty.value !== invert) {
        preferences.invertImagesProperty.value = invert;
      }
    });

    this.showGridProperty = new BooleanProperty(preferences.showGridProperty.value, t("showGridProperty"));
    preferences.showGridProperty.link((show) => {
      if (this.showGridProperty.value !== show) {
        this.showGridProperty.value = show;
      }
    });
    this.showGridProperty.link((show) => {
      if (preferences.showGridProperty.value !== show) {
        preferences.showGridProperty.value = show;
      }
    });
  }

  public setFieldOffset(fieldIndex: 2 | 3, xOffset: number, yOffset: number): void {
    if (fieldIndex === 2) {
      this.xOffset2Property.value = clampOffset(xOffset);
      this.yOffset2Property.value = clampOffset(yOffset);
    } else {
      this.xOffset3Property.value = clampOffset(xOffset);
      this.yOffset3Property.value = clampOffset(yOffset);
    }
  }

  /** Whether a working field is registered on the reference field. */
  public isFieldAligned(fieldIndex: 2 | 3): boolean {
    const error = REG_POINTING_ERRORS[fieldIndex];
    const [xOffset, yOffset] =
      fieldIndex === 2
        ? [this.xOffset2Property.value, this.yOffset2Property.value]
        : [this.xOffset3Property.value, this.yOffset3Property.value];
    return xOffset === -error.x && yOffset === -error.y;
  }

  /** Move the currently-on-top working field by (dx, dy) pixels (arrow keys). */
  public nudgeOnTopField(dx: number, dy: number): void {
    if (this.onTopIndexProperty.value === 2) {
      this.setFieldOffset(2, this.xOffset2Property.value + dx, this.yOffset2Property.value + dy);
    } else {
      this.setFieldOffset(3, this.xOffset3Property.value + dx, this.yOffset3Property.value + dy);
    }
  }

  public switchOnTopField(): void {
    this.onTopIndexProperty.value = this.onTopIndexProperty.value === 2 ? 3 : 2;
  }

  public step(_dt: number): void {
    /* no time-dependent state */
  }

  public reset(): void {
    this.shown2Property.reset();
    this.shown3Property.reset();
    this.onTopIndexProperty.reset();
    this.xOffset2Property.reset();
    this.yOffset2Property.reset();
    this.xOffset3Property.reset();
    this.yOffset3Property.reset();
    this.topFieldTransparentProperty.reset();
    this.invertColorsProperty.reset();
  }
}

VariableStarPhotometryNamespace.register("RegistrationModel", RegistrationModel);
