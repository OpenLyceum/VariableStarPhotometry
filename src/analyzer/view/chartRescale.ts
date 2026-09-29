/**
 * chartRescale.ts
 *
 * Bamboo's TickLabelSet.update runs on every range or spacing change.
 * Expanding an axis first (PDM zoom-out, light-curve y auto-scale) while a
 * leftover tiny spacing is still in force generates tens of thousands of
 * labels and crashes the renderer.
 */

/** Pick a round axis spacing that yields roughly `target` ticks across `span`. */
export function niceSpacing(span: number, target = 5): number {
  if (!(span > 0 && Number.isFinite(span))) {
    return 1;
  }
  const raw = span / target;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const nice = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10;
  return nice * mag;
}

/**
 * Tick spacing that never asks bamboo to paint more than ~40 ticks across `span`.
 */
export function tickSpacingForSpan(span: number): number {
  const safeSpan = span > 0 && Number.isFinite(span) ? span : 1;
  return Math.max(niceSpacing(safeSpan), safeSpan / 40);
}

export function applyChartRescale(
  oldSpan: number,
  newSpan: number,
  setRange: () => void,
  setSpacing: () => void,
): void {
  if (newSpan >= oldSpan) {
    setSpacing();
    setRange();
  } else {
    setRange();
    setSpacing();
  }
}

/** Number of decimals to display for an axis tick spacing. */
export function decimalsFor(spacing: number): number {
  return spacing >= 1 ? 0 : Math.ceil(-Math.log10(spacing));
}
