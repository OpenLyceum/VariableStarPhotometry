/**
 * PhotometryScreenSummaryContent.ts
 *
 * The accessible screen summary read by screen readers (SceneryStack's
 * Interactive Description). `currentDetailsContent` is a LIVE `DerivedProperty`
 * over the model — the displayed observation epoch and the measured magnitude
 * difference — so a non-visual user can re-read the state at any time.
 */
import { DerivedProperty } from "scenerystack/axon";
import { toFixed } from "scenerystack/dot";
import { StringUtils } from "scenerystack/phetcommon";
import { ScreenSummaryContent } from "scenerystack/sim";
import { OBSERVATIONS } from "../../common/model/StarFieldData.js";
import { StringManager } from "../../i18n/StringManager.js";
import type { PhotometryModel } from "../model/PhotometryModel.js";

export class PhotometryScreenSummaryContent extends ScreenSummaryContent {
  public constructor(model: PhotometryModel) {
    const a11y = StringManager.getInstance().getPhotometryA11yStrings();

    const currentDetails = new DerivedProperty(
      [
        model.epochIndexProperty,
        model.magnitudeDifferenceProperty,
        a11y.currentDetailsMeasuredPatternStringProperty,
        a11y.currentDetailsNoMeasurementPatternStringProperty,
      ],
      (epochIndex, deltaM, measuredPattern, noMeasurementPattern) => {
        const pattern = deltaM === null ? noMeasurementPattern : measuredPattern;
        return StringUtils.fillIn(pattern, {
          epoch: String(epochIndex + 1),
          total: String(OBSERVATIONS.length),
          delta: deltaM === null ? "" : toFixed(deltaM, 3),
        });
      },
    );

    super({
      playAreaContent: a11y.screenSummary.playAreaStringProperty,
      controlAreaContent: a11y.screenSummary.controlAreaStringProperty,
      currentDetailsContent: currentDetails,
      interactionHintContent: a11y.screenSummary.interactionHintStringProperty,
    });
  }
}
