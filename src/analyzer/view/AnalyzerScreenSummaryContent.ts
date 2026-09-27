/**
 * AnalyzerScreenSummaryContent.ts
 *
 * The accessible screen summary read by screen readers (SceneryStack's
 * Interactive Description). `currentDetailsContent` is a LIVE `DerivedProperty`
 * over the model — the number of light-curve measurements and the current trial
 * period — so a non-visual user can re-read the state at any time.
 */
import { DerivedProperty } from "scenerystack/axon";
import { toFixed } from "scenerystack/dot";
import { StringUtils } from "scenerystack/phetcommon";
import { ScreenSummaryContent } from "scenerystack/sim";
import { StringManager } from "../../i18n/StringManager.js";
import type { AnalyzerModel } from "../model/AnalyzerModel.js";

export class AnalyzerScreenSummaryContent extends ScreenSummaryContent {
  public constructor(model: AnalyzerModel) {
    const a11y = StringManager.getInstance().getAnalyzerA11yStrings();

    const currentDetails = new DerivedProperty(
      [
        model.measurementsProperty,
        model.trialPeriodProperty,
        a11y.currentDetailsWithDataPatternStringProperty,
        a11y.currentDetailsNoDataPatternStringProperty,
      ],
      (measurements, trialPeriod, withDataPattern, noDataPattern) =>
        measurements.length === 0
          ? noDataPattern
          : StringUtils.fillIn(withDataPattern, {
              count: String(measurements.length),
              period: toFixed(trialPeriod, 4),
            }),
    );

    super({
      playAreaContent: a11y.screenSummary.playAreaStringProperty,
      controlAreaContent: a11y.screenSummary.controlAreaStringProperty,
      currentDetailsContent: currentDetails,
      interactionHintContent: a11y.screenSummary.interactionHintStringProperty,
    });
  }
}
