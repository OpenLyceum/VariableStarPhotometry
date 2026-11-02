/**
 * VariableStarPhotometryButtonOptions.ts
 *
 * Shared flat button appearance for the sim. Rectangular push buttons and
 * ResetAllButton default to SceneryStack's 3-D/beveled appearance; spread these
 * options into a button's constructor options for a flat look everywhere. This
 * does not set `baseColor` — call sites keep their existing semantic colors
 * from VariableStarPhotometryColors (buttonColorProperty, buttonAddColorProperty, etc.) and just
 * layer the flat appearance strategy on top.
 *
 * Template-owned toolkit: each sim uses only some of these, so every export is tagged
 * `@public` to tell dead-code checkers (knip) that an unused one is not dead code.
 */

import { ButtonNode } from "scenerystack/sun";

/** @public */
export const FLAT_BUTTON_APPEARANCE_OPTIONS = {
  buttonAppearanceStrategy: ButtonNode.FlatAppearanceStrategy,
} as const;

/** Options for RectangularPushButton / TextPushButton. @public */
export const FLAT_RECTANGULAR_BUTTON_OPTIONS = { ...FLAT_BUTTON_APPEARANCE_OPTIONS } as const;

/** Options for ResetAllButton (extends RoundPushButton). @public */
export const FLAT_RESET_ALL_BUTTON_OPTIONS = { ...FLAT_BUTTON_APPEARANCE_OPTIONS } as const;
