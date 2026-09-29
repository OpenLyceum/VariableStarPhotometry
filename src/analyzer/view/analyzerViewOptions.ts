/** Shared typography and compact control layout for the analyzer sections. */
import { HBox, Node } from "scenerystack/scenery";
import { type NumberControlOptions, PhetFont } from "scenerystack/scenery-phet";
import VariableStarPhotometryConstants from "../../VariableStarPhotometryConstants.js";

/**
 * NumberControl layout on one row (title, ◀, slider, ▶, value). The default
 * two-row layout made the Analyzer's controls too tall for the 618 px layout.
 */
export const singleRowNumberControlLayout: NonNullable<NumberControlOptions["layoutFunction"]> = (
  titleNode,
  numberDisplay,
  slider,
  decrementButton,
  incrementButton,
) =>
  new HBox({
    spacing: 6,
    align: "center",
    children: [titleNode, decrementButton ?? new Node(), slider, incrementButton ?? new Node(), numberDisplay],
  });

export const LABEL_FONT = new PhetFont(VariableStarPhotometryConstants.FONT_SIZE.LABEL);
export const HEADER_FONT = new PhetFont({ size: VariableStarPhotometryConstants.FONT_SIZE.HEADER, weight: "bold" });
export const TICK_FONT = new PhetFont(VariableStarPhotometryConstants.FONT_SIZE.TICK);
export const SMALL_FONT = new PhetFont(VariableStarPhotometryConstants.FONT_SIZE.SMALL);
