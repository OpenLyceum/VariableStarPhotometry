/**
 * AnalyzerScreenView.ts
 *
 * Composes the screen-lifetime star-selection, observations, and PDM sections.
 * Layout containers keep the PDM section below both top sections as localized
 * labels and readouts change size. Scientific state remains in AnalyzerModel.
 */
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import { HBox, Node, VBox } from "scenerystack/scenery";
import { ResetAllButton } from "scenerystack/scenery-phet";
import { ScreenView, type ScreenViewOptions } from "scenerystack/sim";
import { Tandem } from "scenerystack/tandem";
import { FLAT_RESET_ALL_BUTTON_OPTIONS } from "../../common/VariableStarPhotometryButtonOptions.js";
import type { VariableStarPhotometryPreferencesModel } from "../../preferences/VariableStarPhotometryPreferencesModel.js";
import VariableStarPhotometryConstants from "../../VariableStarPhotometryConstants.js";
import type { AnalyzerModel } from "../model/AnalyzerModel.js";
import { AnalyzerObservationsNode } from "./AnalyzerObservationsNode.js";
import { AnalyzerPeriodSearchNode } from "./AnalyzerPeriodSearchNode.js";
import { AnalyzerStarSelectionNode } from "./AnalyzerStarSelectionNode.js";

export type AnalyzerScreenViewOptions = ScreenViewOptions;

export class AnalyzerScreenView extends ScreenView {
  public constructor(
    model: AnalyzerModel,
    preferences: VariableStarPhotometryPreferencesModel,
    providedOptions?: AnalyzerScreenViewOptions,
  ) {
    const options = optionize<AnalyzerScreenViewOptions, EmptySelfOptions, ScreenViewOptions>()({}, providedOptions);
    super(options);

    const tandem = options.tandem instanceof Tandem ? options.tandem : Tandem.OPT_OUT;
    const starSelectionNode = new AnalyzerStarSelectionNode(model, preferences);
    const observationsNode = new AnalyzerObservationsNode(model);
    const periodSearchNode = new AnalyzerPeriodSearchNode(model);
    const topRow = new HBox({
      spacing: VariableStarPhotometryConstants.ANALYZER.COLUMN_SPACING,
      align: "top",
      children: [starSelectionNode, observationsNode],
    });
    this.addChild(
      new VBox({
        spacing: VariableStarPhotometryConstants.ANALYZER.SECTION_SPACING,
        align: "center",
        children: [topRow, periodSearchNode],
        left: this.layoutBounds.minX + VariableStarPhotometryConstants.LAYOUT.SCREEN_MARGIN,
        top: this.layoutBounds.minY + VariableStarPhotometryConstants.LAYOUT.SCREEN_MARGIN,
      }),
    );

    const resetAllButton = new ResetAllButton({
      listener: () => {
        model.reset();
        starSelectionNode.reset();
        observationsNode.reset();
      },
      right: this.layoutBounds.maxX - VariableStarPhotometryConstants.LAYOUT.RESET_BUTTON_MARGIN,
      bottom: this.layoutBounds.maxY - VariableStarPhotometryConstants.LAYOUT.RESET_BUTTON_MARGIN,
      tandem: tandem.createTandem("resetAllButton"),
      ...FLAT_RESET_ALL_BUTTON_OPTIONS,
    });
    this.addChild(resetAllButton);

    // Each section owns its control order; Reset All remains last on the screen.
    this.addChild(new Node({ pdomOrder: [starSelectionNode, observationsNode, periodSearchNode, resetAllButton] }));
  }
}
