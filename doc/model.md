# Model - Variable Star Photometry

This document describes the model (the underlying physics, math, and behavior) for the simulation,
in terms appropriate for an educator. It is the companion to
[implementation-notes.md](./implementation-notes.md), which targets developers.

## Overview

The simulation models a CCD aperture photometry workflow for determining the period of a pulsating
variable star (based on **δ Cephei**). Students work through four screens — Registration, Blink
Comparator, Photometry, and Analyzer — to produce a phase-folded light curve and confirm the period
using Phase Dispersion Minimization (PDM).

**Important:** screens do **not** share state. Registration offsets, blink queue choices, photometry
aperture positions, and analyzer star selections reset independently on each screen (matching NAAP
standalone Flash labs, not one persistent lab session).

## Synthetic CCD star field

### Catalogue and epochs

`StarFieldData.ts` defines **26 stars** in a **380 × 290 px** field:

- **21 constant** stars
- **4 pulsating** variables (`MT_Tel`, `del_Cep`, `PZ_Aql`, `RR_Leo`) with Fourier light-curve templates
- **1 eclipsing binary** (`TW_Cas`)

There are **113 observation epochs** (indices 0–112), each with `{ epoch, noiseSeed }`. Reference epoch
**1.7215 days**; dataset spans roughly **1.72–21.99 days**. Target variable **δ Cep** sits at pixel
(308, 175).

Instantaneous magnitudes come from `LightCurveLibrary.ts` (Fourier templates and eclipse geometry), not
simple fixed amplitudes in the catalogue.

### Rendering

`CCDField` (singleton) builds pixel-level **raw 16-bit counts**, then applies a **γ = 1.8** lookup for
8-bit greyscale display (optional invert for projector mode). For each star at each epoch:

1. Compute instantaneous magnitude from the light-curve library.
2. Convert magnitude to peak ADU (mag 3 → 65535); clamp at saturation.
3. Stamp an **Airy disc** PSF (Bessel J₁, radius 5 px) — not a Gaussian.
4. Add sky noise from a pre-generated **Box–Muller pool** (mean 2300 ADU, σ 330), **chunk-shuffled per
   observation** via `noiseSeed` for reproducibility.

Rendered `ImageData` is cached per `(obsIndex, invert)`. **Aperture photometry sums raw counts before
display gamma**, matching instrumental measurement.

## Registration

Three **fixed** epoch indices (not user-selectable):

| Field | Index | Epoch (days) |
|---|---|---|
| Reference (1) | 0 | 1.7215 |
| Working (2) | 36 | 8.7525 |
| Working (3) | 63 | 12.9682 |

Each working field carries a fixed **telescope pointing error** — field 2 (+14, −9) px, field 3
(−11, +17) px — and is drawn at *pointing error + offset*. It registers on field 1 when its offset is
the negative of that error: field 2 (−14, +9), field 3 (+11, −17), the answers to the student guide's
Question 6. (Without the error the frames started perfectly aligned and there was nothing to register.)

Working fields 2 and 3 have XY offsets (±**100 px** per axis), show/hide toggles, and "on top" selection
(2 or 3). The on-top field can render at **40% opacity** when transparency is enabled. Arrow keys nudge
the active field 1 px per press. Invert colors and show grid sync with global preferences.

## Blink Comparator

- `selectedObsIndexProperty` — epoch highlighted in the observation list
- `blinkQueue` — ordered observation **indices** to cycle
- `displayedObsIndexProperty` — queue frame if queue non-empty, else selected index
- `isBlinkingProperty` — default **true**; needs **≥ 2** queue entries to advance
- `blinkIntervalMsProperty` — 200–2000 ms (default 600)
- Default queue: indices **`[0, 36]`**

Blinking advances via `step(dt)` (Joist frame loop), not `setInterval`.

## Aperture photometry (Photometry screen)

Two apertures share one instrument setting per epoch:

| Setting | Default | Slider range |
|---|---|---|
| Aperture diameter | 14 px (radius 7) | 6–30 px |
| Annulus inner radius | 10 px | 8–25 px |
| Annulus outer radius | 16 px | 12–40 px |

Default placements: aperture 1 on **δ Cep (308, 175)**; aperture 2 on bright constant **(111, 54)**.

For centre (cx, cy):

```
disc_counts   = Σ pixel in disc (r ≤ r_aperture)
sky_mean      = mean pixel in annulus (r_inner < r ≤ r_outer)
net_flux      = disc_counts − sky_mean × |disc_pixels|
Δm            = −2.5 log₁₀(f₁ / f₂)    (null if either net_flux ≤ 0)
```

## Analyzer

### Star selection

Click 1 → variable star (green); click 2 → comparison (blue square); third click restarts selection.
Fixed default aperture geometry matches Photometry defaults.

### Measurements

Once both stars are chosen, the model measures Δm at **every epoch** with the same integral. Epochs with
null Δm (bad flux, saturation, poor placement) are **omitted** from `measurementsProperty`.

### Light curve modes

| Mode | x-axis | Notes |
|---|---|---|
| `"time"` | Julian epoch (days) | Vertical markers at multiples of `trialPeriod` offset by `phaseOffset` |
| `"phase"` | φ ∈ [0, 1) | φ = ((epoch − phaseOffset) / trialPeriod) mod 1 |

`trialPeriodProperty` is student-adjustable (0.1–100 d, default 1.0). `phaseOffsetProperty` sets zero
phase for folding **and** PDM reference *t*₀.

### Phase Dispersion Minimization

The sim implements the **NAAP Flash interleaved PDM** (5 phase bins × 2 offsets = 10 bins), not the
simple textbook σ²_bins / σ²_total ratio. Scan uses **400 steps** over `pdmZoomRangeProperty` (initial
window **0.2–10 days**). Requires **≥ 6** measurements or scan returns empty. Minimum θ indicates the
best-fit period; δ Cep's true period ≈ **5.37 d** when variable and comparison are chosen correctly.

Students can zoom in/out around a period, undo zoom history, and fold the curve at the trial period.

## Simplifications and assumptions

- Synthetic NAAP-era dataset; instrumental magnitudes, not a full reduction pipeline.
- No cosmic rays, flat fields, or bias frames beyond embedded noise model.
- Screens independent — students repeat setup on each screen.
- Planet-like constant comparison star is pedagogical, not a specific catalog match.

## References

- NAAP *Variable Star Photometry* lab under `../Baseline/Astronomy/astroUNL/naap/`.
- Stellingwerf (1978) — PDM concept (implementation follows NAAP Flash interleaved variant).
- Original Flash simulators ported in this repository.
