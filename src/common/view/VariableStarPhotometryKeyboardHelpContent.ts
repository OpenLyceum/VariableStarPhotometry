/**
 * VariableStarPhotometryKeyboardHelpContent.ts
 *
 * Per-screen keyboard-help content. The Analyzer's difference tool has two delta
 * bars (AnalyzerDifferenceToolNode), each a focusable "upDown" RichDragListener
 * with dragSpeed/shiftDragSpeed. MoveDraggableItemsKeyboardHelpSection would also
 * list left/right, so those rows use the key strings KeyboardDragListener
 * registers for "upDown"; no second listener is added.
 */

import { HotkeyData } from "scenerystack/scenery";
import {
  BasicActionsKeyboardHelpSection,
  KeyboardHelpSection,
  KeyboardHelpSectionRow,
  MoveDraggableItemsKeyboardHelpSection,
  SliderControlsKeyboardHelpSection,
  TextKeyNode,
  TimeControlsKeyboardHelpSection,
  TwoColumnKeyboardHelpContent,
} from "scenerystack/scenery-phet";
import { StringManager } from "../../i18n/StringManager.js";

export type VariableStarPhotometryKeyboardHelpScreen = "registration" | "blink" | "photometry" | "analyzer";

const createDifferenceToolSection = (): KeyboardHelpSection => {
  const analyzerStrings = StringManager.getInstance().getAnalyzerViewStrings();
  // KeyboardDragListener's "upDown" key strings (shift is an ignored modifier).
  const moveHotkeyData = new HotkeyData({
    keys: ["shift?+arrowUp", "shift?+arrowDown", "shift?+w", "shift?+s"],
    repoName: "variable-star-photometry",
    keyboardHelpDialogLabelStringProperty: analyzerStrings.moveDeltaBarStringProperty,
    keyboardHelpDialogPDOMLabelStringProperty: analyzerStrings.moveDeltaBarDescriptionStringProperty,
  });
  // Shift selects the listener's slower shiftDragSpeed; this row only documents it.
  const moveSlowerHotkeyData = new HotkeyData({
    keys: ["shift+arrowUp", "shift+arrowDown", "shift+w", "shift+s"],
    repoName: "variable-star-photometry",
    keyboardHelpDialogLabelStringProperty: analyzerStrings.moveDeltaBarSlowerStringProperty,
    keyboardHelpDialogPDOMLabelStringProperty: analyzerStrings.moveDeltaBarSlowerDescriptionStringProperty,
  });
  return new KeyboardHelpSection(analyzerStrings.differenceToolControlsStringProperty, [
    KeyboardHelpSectionRow.fromHotkeyData(moveHotkeyData),
    KeyboardHelpSectionRow.fromHotkeyData(moveSlowerHotkeyData),
  ]);
};

const createLeftSections = (screen: VariableStarPhotometryKeyboardHelpScreen) => {
  switch (screen) {
    case "registration":
    case "photometry":
      return [new MoveDraggableItemsKeyboardHelpSection()];
    case "blink":
      return [new TimeControlsKeyboardHelpSection()];
    case "analyzer":
      return [new SliderControlsKeyboardHelpSection(), createDifferenceToolSection()];
  }
};

const createRightSections = (screen: VariableStarPhotometryKeyboardHelpScreen) => {
  switch (screen) {
    case "photometry":
      return [new SliderControlsKeyboardHelpSection()];
    case "registration": {
      const registrationStrings = StringManager.getInstance().getRegistrationViewStrings();
      const registrationActionsSection = new KeyboardHelpSection(registrationStrings.starfieldControlsStringProperty, [
        KeyboardHelpSectionRow.labelWithIcon(registrationStrings.switchOnTopStringProperty, new TextKeyNode("J"), {
          labelInnerContent: registrationStrings.switchOnTopStringProperty,
        }),
      ]);
      return [registrationActionsSection, new BasicActionsKeyboardHelpSection()];
    }
    case "blink":
    case "analyzer":
      return [new BasicActionsKeyboardHelpSection()];
  }
};

export class VariableStarPhotometryKeyboardHelpContent extends TwoColumnKeyboardHelpContent {
  public constructor(screen: VariableStarPhotometryKeyboardHelpScreen) {
    super(createLeftSections(screen), createRightSections(screen));
  }
}
