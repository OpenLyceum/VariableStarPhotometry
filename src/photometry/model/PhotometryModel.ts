/**
 * PhotometryModel.ts
 *
 * Model for the Photometry screen.
 *
 * Students place two circular apertures over stars in a CCD image and measure
 * their instrumental magnitudes. A sky-annulus surrounding each aperture
 * estimates the local background level, which is subtracted before the
 * brightness is converted to a differential instrumental magnitude via:
 *
 *   m₁ − m₂ = −2.5 × log₁₀( f₁ / f₂ )
 *
 * where fₙ is the background-subtracted net flux of aperture n.
 */
import type { TReadOnlyProperty } from "scenerystack/axon";
import { BooleanProperty, DerivedProperty, NumberProperty } from "scenerystack/axon";
import { Range, Vector2, Vector2Property } from "scenerystack/dot";
import type { TModel } from "scenerystack/joist";
import type { Tandem } from "scenerystack/tandem";
import {
  differentialMagnitude,
  measureAperture,
  type PhotometryResult,
} from "../../common/model/AperturePhotometry.js";
import { OBSERVATIONS } from "../../common/model/StarFieldData.js";
import variableStarPhotometryQueryParameters from "../../preferences/variableStarPhotometryQueryParameters.js";
import VariableStarPhotometryConstants from "../../VariableStarPhotometryConstants.js";
import VariableStarPhotometryNamespace from "../../VariableStarPhotometryNamespace.js";

export const APERTURE_DIAMETER_RANGE = new Range(6, 30);
export const ANNULUS_INNER_RANGE = new Range(8, 25);
export const ANNULUS_OUTER_RANGE = new Range(12, 40);

/** Index of the epoch (observation) being measured. */
export const EPOCH_INDEX_RANGE = new Range(0, OBSERVATIONS.length - 1);

/** Default aperture placements: a pulsating variable and a steady comparison. */
const DEFAULT_APERTURE_1 = new Vector2(308, 175); // del Cep (variable)
const DEFAULT_APERTURE_2 = new Vector2(111, 54); // bright constant star

export class PhotometryModel implements TModel {
  /** Aperture diameter for stellar flux integration, in field pixels. */
  public readonly apertureDiameterProperty: NumberProperty;

  /** Inner radius of the sky-background annulus, in field pixels. */
  public readonly annulusInnerRadiusProperty: NumberProperty;

  /** Outer radius of the sky-background annulus, in field pixels. */
  public readonly annulusOuterRadiusProperty: NumberProperty;

  /** Currently selected epoch (observation) index. */
  public readonly epochIndexProperty: NumberProperty;

  /** Centre of aperture 1, in field-pixel coordinates. */
  public readonly aperture1CenterProperty: Vector2Property;

  /** Centre of aperture 2, in field-pixel coordinates. */
  public readonly aperture2CenterProperty: Vector2Property;

  /** Whether the numeric "1"/"2" labels are drawn on the apertures. */
  public readonly labelAperturesProperty: BooleanProperty;

  /** Derived photometry (disc + sky + net flux) for each aperture. */
  public readonly aperture1PhotometryProperty: TReadOnlyProperty<PhotometryResult>;
  public readonly aperture2PhotometryProperty: TReadOnlyProperty<PhotometryResult>;

  /** Differential magnitude m₁ − m₂, or null when a flux is non-positive. */
  public readonly magnitudeDifferenceProperty: TReadOnlyProperty<number | null>;

  public constructor(_tandem?: Tandem) {
    this.apertureDiameterProperty = new NumberProperty(
      variableStarPhotometryQueryParameters.apertureDiameter ??
        VariableStarPhotometryConstants.APERTURE.DEFAULT_DIAMETER,
      { range: APERTURE_DIAMETER_RANGE },
    );

    this.annulusInnerRadiusProperty = new NumberProperty(
      VariableStarPhotometryConstants.APERTURE.DEFAULT_ANNULUS_INNER,
      {
        range: ANNULUS_INNER_RANGE,
      },
    );

    this.annulusOuterRadiusProperty = new NumberProperty(
      VariableStarPhotometryConstants.APERTURE.DEFAULT_ANNULUS_OUTER,
      {
        range: ANNULUS_OUTER_RANGE,
      },
    );

    this.epochIndexProperty = new NumberProperty(0, {
      numberType: "Integer",
      range: EPOCH_INDEX_RANGE,
    });

    this.aperture1CenterProperty = new Vector2Property(DEFAULT_APERTURE_1.copy());
    this.aperture2CenterProperty = new Vector2Property(DEFAULT_APERTURE_2.copy());

    this.labelAperturesProperty = new BooleanProperty(true);

    const makePhotometryProperty = (centerProperty: Vector2Property): TReadOnlyProperty<PhotometryResult> =>
      new DerivedProperty(
        [
          this.epochIndexProperty,
          centerProperty,
          this.apertureDiameterProperty,
          this.annulusInnerRadiusProperty,
          this.annulusOuterRadiusProperty,
        ],
        (epochIndex, center, diameter, skyInner, skyOuter) =>
          measureAperture(epochIndex, center, diameter / 2, skyInner, skyOuter),
      );

    this.aperture1PhotometryProperty = makePhotometryProperty(this.aperture1CenterProperty);
    this.aperture2PhotometryProperty = makePhotometryProperty(this.aperture2CenterProperty);

    this.magnitudeDifferenceProperty = new DerivedProperty(
      [this.aperture1PhotometryProperty, this.aperture2PhotometryProperty],
      (p1, p2) => differentialMagnitude(p1.netFlux, p2.netFlux),
    );
  }

  public step(_dt: number): void {
    // No continuous animation — photometry state changes only on user interaction.
  }

  public reset(): void {
    this.apertureDiameterProperty.reset();
    this.annulusInnerRadiusProperty.reset();
    this.annulusOuterRadiusProperty.reset();
    this.epochIndexProperty.reset();
    this.aperture1CenterProperty.reset();
    this.aperture2CenterProperty.reset();
    this.labelAperturesProperty.reset();
  }
}

VariableStarPhotometryNamespace.register("PhotometryModel", PhotometryModel);
