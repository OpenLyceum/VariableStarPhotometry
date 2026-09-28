/**
 * VariableStarPhotometryPreferencesModel.ts
 *
 * Model for the simulation-specific preferences shown in Preferences →
 * Simulation. Each preference Property takes its initial value from the
 * corresponding query parameter in variableStarPhotometryQueryParameters.
 */

import { BooleanProperty } from "scenerystack/axon";
import type { Tandem } from "scenerystack/tandem";
import VariableStarPhotometryNamespace from "../VariableStarPhotometryNamespace.js";
import variableStarPhotometryQueryParameters from "./variableStarPhotometryQueryParameters.js";

export class VariableStarPhotometryPreferencesModel {
  public readonly showGridProperty: BooleanProperty;
  public readonly invertImagesProperty: BooleanProperty;

  public constructor(tandem?: Tandem) {
    this.showGridProperty = new BooleanProperty(
      variableStarPhotometryQueryParameters.showGrid,
      tandem ? { tandem: tandem.createTandem("showGridProperty") } : undefined,
    );

    this.invertImagesProperty = new BooleanProperty(
      variableStarPhotometryQueryParameters.invertImages,
      tandem ? { tandem: tandem.createTandem("invertImagesProperty") } : undefined,
    );
  }

  public reset(): void {
    this.showGridProperty.reset();
    this.invertImagesProperty.reset();
  }
}

VariableStarPhotometryNamespace.register(
  "VariableStarPhotometryPreferencesModel",
  VariableStarPhotometryPreferencesModel,
);
