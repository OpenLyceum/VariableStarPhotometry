/**
 * BlinkComparatorScreenSummaryContent.ts
 *
 * The accessible screen summary read by screen readers (SceneryStack's
 * Interactive Description). `currentDetailsContent` is a LIVE `DerivedProperty`
 * over the model — how many observations are queued and whether blinking is
 * running — so a non-visual user can re-read the state at any time.
 */
import { DerivedProperty } from "scenerystack/axon";
import { StringUtils } from "scenerystack/phetcommon";
import { ScreenSummaryContent } from "scenerystack/sim";
import { StringManager } from "../../i18n/StringManager.js";
import type { BlinkComparatorModel } from "../model/BlinkComparatorModel.js";

export class BlinkComparatorScreenSummaryContent extends ScreenSummaryContent {
  public constructor(model: BlinkComparatorModel) {
    const a11y = StringManager.getInstance().getBlinkComparatorA11yStrings();

    const currentDetails = new DerivedProperty(
      [
        model.blinkQueue.lengthProperty,
        model.isBlinkingProperty,
        a11y.currentDetailsBlinkingPatternStringProperty,
        a11y.currentDetailsPausedPatternStringProperty,
      ],
      (count, isBlinking, blinkingPattern, pausedPattern) =>
        StringUtils.fillIn(isBlinking ? blinkingPattern : pausedPattern, { count: String(count) }),
    );

    super({
      playAreaContent: a11y.screenSummary.playAreaStringProperty,
      controlAreaContent: a11y.screenSummary.controlAreaStringProperty,
      currentDetailsContent: currentDetails,
      interactionHintContent: a11y.screenSummary.interactionHintStringProperty,
    });
  }
}
