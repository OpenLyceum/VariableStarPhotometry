/**
 * VariableStarPhotometryConstants.ts
 *
 * Named numeric constants for the Variable Star Photometry simulation, grouped
 * into frozen `as const` objects by concern. Magic numbers are never inlined in
 * a model or view — they are named and documented here and changed in one place.
 *
 * Units: star-field geometry in model pixels (px); detector signal in analog-to-
 * digital units (ADU); brightness in astronomical magnitudes (mag); epochs in
 * days (d); blink interval in milliseconds (ms); layout/font values in view
 * pixels (px). Each value carries a unit comment.
 */
import VariableStarPhotometryNamespace from "./VariableStarPhotometryNamespace.js";

/** Synthetic CCD star-field geometry and detector model (mirrors NAAP settings.xml). */
const FIELD = {
  WIDTH: 380, // width of the star field (px)
  HEIGHT: 290, // height of the star field (px)
  PSF_RADIUS: 5, // point-spread-function radius for rendered stars (px)
  NOISE_MEAN: 2300, // CCD sky-background mean (ADU)
  NOISE_SIGMA: 330, // CCD read/shot noise standard deviation (ADU)
  SATURATION_MAGNITUDE: 3, // magnitude at which a star saturates the detector (mag)
} as const;

/** Default photometry aperture and sky-annulus radii. */
const APERTURE = {
  DEFAULT_DIAMETER: 14, // flux-integration disc diameter (px)
  DEFAULT_ANNULUS_INNER: 10, // sky-annulus inner radius from star centre (px)
  DEFAULT_ANNULUS_OUTER: 16, // sky-annulus outer radius from star centre (px)
} as const;

/** Time-domain constants for the observation sequence and blink comparator. */
const TIME = {
  REFERENCE_EPOCH: 1.7215, // Julian epoch of the first observation (d)
  DEFAULT_BLINK_INTERVAL_MS: 600, // default interval between blinked frames (ms)
} as const;

/** View layout constants (px). */
const LAYOUT = {
  SCREEN_MARGIN: 20, // inset of top-level content from the screen edge (px)
  RESET_BUTTON_MARGIN: 10, // inset of the Reset All button from the screen edge (px)
  PANEL_X_MARGIN: 10, // horizontal padding inside a control panel (px)
  PANEL_Y_MARGIN: 8, // vertical padding inside a control panel (px)
  PANEL_CORNER_RADIUS: 2, // corner radius of control panels (px)
  PANEL_SPACING: 8, // spacing between stacked panels/controls (px)
  FRAME_LINE_WIDTH: 1, // stroke width of star-field/chart frames (px)
  GRID_SPACING: 38, // spacing of the optional star-field overlay grid (px)
} as const;

/** Font sizes used across the views (pt). */
const FONT_SIZE = {
  HEADER: 14, // panel/section headers (pt)
  LABEL: 13, // standard control labels (pt)
  SMALL: 11, // captions, hints, legends (pt)
  TICK: 10, // chart tick labels (pt)
} as const;

/** Analyzer chart sizes and section spacing (view px). */
const ANALYZER = {
  OBSERVATIONS_WIDTH: 470, // light-curve plot width (px)
  OBSERVATIONS_HEIGHT: 200, // light-curve plot height (px)
  PDM_WIDTH: 850, // period-search plot width (px)
  PDM_HEIGHT: 98, // period-search plot height (px)
  DRAG_ZOOM_THRESHOLD: 6, // distinguish a period click from rubber-band zoom (px)
  COLUMN_SPACING: 30, // space between the field and observations (px)
  SECTION_SPACING: 10, // space above the period-search section (px)
} as const;

/** Analysis constants for the PDM period finder. */
const PDM = {
  SCAN_STEPS: 400, // number of trial periods evaluated per scan pass
} as const;

const VariableStarPhotometryConstants = {
  FIELD,
  APERTURE,
  TIME,
  LAYOUT,
  FONT_SIZE,
  PDM,
  ANALYZER,
} as const;

VariableStarPhotometryNamespace.register("VariableStarPhotometryConstants", VariableStarPhotometryConstants);

export default VariableStarPhotometryConstants;
