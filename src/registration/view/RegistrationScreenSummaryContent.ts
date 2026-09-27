/**
 * RegistrationScreenSummaryContent.ts
 *
 * The accessible screen summary read by screen readers (SceneryStack's
 * Interactive Description). `currentDetailsContent` is a LIVE `DerivedProperty`
 * over the model — which star field is on top and its current X/Y offset — so a
 * non-visual user can re-read the alignment state at any time.
 */
import { DerivedProperty } from "scenerystack/axon";
import { StringUtils } from "scenerystack/phetcommon";
import { ScreenSummaryContent } from "scenerystack/sim";
import { StringManager } from "../../i18n/StringManager.js";
import type { RegistrationModel } from "../model/RegistrationModel.js";

export class RegistrationScreenSummaryContent extends ScreenSummaryContent {
  public constructor(model: RegistrationModel) {
    const a11y = StringManager.getInstance().getRegistrationA11yStrings();

    const currentDetails = new DerivedProperty(
      [
        model.onTopIndexProperty,
        model.xOffset2Property,
        model.yOffset2Property,
        model.xOffset3Property,
        model.yOffset3Property,
        a11y.currentDetailsPatternStringProperty,
      ],
      (onTop, x2, y2, x3, y3, pattern) => {
        const x = onTop === 2 ? x2 : x3;
        const y = onTop === 2 ? y2 : y3;
        return StringUtils.fillIn(pattern, {
          number: String(onTop),
          x: String(Math.round(x)),
          y: String(Math.round(y)),
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
