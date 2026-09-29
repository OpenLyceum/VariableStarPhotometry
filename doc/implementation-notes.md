# Implementation Notes - Variable Star Photometry

Developer-facing notes on the architecture. Educator-facing workflow and physics are in
[model.md](./model.md).

## Architecture Overview

Four independent screens; no `VSPSimulationContext` or cross-screen state.

```
src/main.ts                          Sim, 4 screens, VariableStarPhotometryPreferencesModel
src/init.ts                          locales en/es/fr, colorProfiles, no sound
src/VariableStarPhotometryConstants.ts                  FIELD, APERTURE, TIME, LAYOUT, FONT_SIZE, PDM, ANALYZER
src/VariableStarPhotometryColors.ts, VariableStarPhotometryNamespace.ts, brand/splash/assert

src/common/model/
  StarFieldData.ts                   26 stars, 113 obs, pulsating/eclipsing presets
  LightCurveLibrary.ts               getPulsatingMagnitude, getEclipsingMagnitude
  CCDField.ts                        singleton render + getPhotometry + cache
  AperturePhotometry.ts              measureAperture, differentialMagnitude
  PDMCalculator.ts                   NAAP interleaved PDM (PDM_NB=5, PDM_NC=2, PDM_M=10)

src/common/view/
  StarFieldNode.ts                   CanvasNode + offscreen buffer
  ApertureNode.ts                    DragListener + KeyboardDragListener + identity MVT
  FieldGridNode.ts                   optional grid overlay
  VariableStarPhotometryKeyboardHelpContent.ts

src/{registration,blink-comparator,photometry,analyzer}/
  model/*Model.ts
  view/*ScreenView.ts, *ScreenSummaryContent.ts
  *Screen.ts

src/preferences/
  VariableStarPhotometryPreferencesModel.ts             showGrid, invertImages
  VariableStarPhotometryPreferencesNode.ts
  variableStarPhotometryQueryParameters.ts              showGrid, invertImages, blinkIntervalMs, showCrosshair,
                                     apertureDiameter, trialPeriod, lightCurveMode
```

Data flows Model → View via AXON `Property` / `DerivedProperty` / `Multilink`.

## Key design decisions

1. **Identity `ModelViewTransform2`** — `ModelViewTransform2.createIdentity()` in `PhotometryScreenView`,
   `AnalyzerStarSelectionNode`, and `ApertureNode`; model coords are pixel space. Blink view uses
   `FIELD_SCALE = 1.25` on the view container only.
2. **CCDField singleton** — caches `ImageData` per `(obsIndex, invert)` and `buildFieldData` for photometry
   loops. Photometry uses **raw counts**, not gamma-mapped display pixels.
3. **Airy disc PSF + chunked noise shuffle** — not Gaussian PSF or per-render random noise.
4. **Blink via `step(dt)`** — accumulates time; may advance multiple frames after long pauses; requires
   queue length ≥ 2.
5. **PDM synchronous on main thread** — ~113 × 400 evaluations; acceptable cost.
6. **Registration preference sync** — bidirectional links on invert/grid with `VariableStarPhotometryPreferencesModel`.
7. **Query params seed screen models** — preferences hold grid/invert only; other params initialize models
   at construction.

## Screen models

### RegistrationModel(preferences)

Fixed `obsIndex1/2/3`; offsets ±100; `nudgeOnTopField(dx, dy)`; preference sync for invert/grid.

### BlinkComparatorModel

Queue ops: `addSelectedToQueue`, `removeFromQueue`, `clearQueue`. `displayedObsIndexProperty` derived
from queue vs selection.

### PhotometryModel

Slider-backed aperture geometry; `epochIndexProperty`; two `Vector2Property` centres.

### AnalyzerModel

`selectStarAt`, `clearSelections`, zoom/undo methods, `getPhase`. `FULL_PDM_RANGE = [0.2, 10]`.
`measurementsProperty` derived from both star positions; filters null Δm.

## Analyzer view composition

`AnalyzerScreenView` composes four screen-lifetime components:

- `AnalyzerStarSelectionNode` owns the CCD field, selection markers, crosshair,
  legend, and clear/crosshair controls. Fixed field bounds prevent marker and
  crosshair movement from shifting the selection surface.
- `AnalyzerObservationsNode` owns the light-curve scatter plot, adaptive axes,
  period guides, and time/phase/offset controls.
- `AnalyzerDifferenceToolNode` owns the magnitude-difference overlay and its
  pointer/keyboard bar dragging; the observations component refreshes it after
  axis changes.
- `AnalyzerPeriodSearchNode` owns the PDM curve, period marker, pointer selection,
  rubber-band zoom, best-period readout, and zoom controls.

An `HBox` aligns the field and observations at the top; a `VBox` places PDM below
both and relayouts when strings or readouts resize. The best-period readout groups
with the PDM heading, and the selection hint wraps at the CCD field width.
`ANALYZER` in the root constants file owns chart sizes and section spacing.
Each section defines its own `pdomOrder`, including both difference-tool bars;
Reset All remains last. Reset All resets scientific state in the model and the
crosshair/difference-tool toggles in their owning components.

## Common components

- `VariableStarPhotometryPreferencesModel`, `VariableStarPhotometryPreferencesNode`.
- `ApertureNode` — radii bound via `.link()` on `NumberProperty` from model sliders.

## Disposal

Screen-lifetime architecture. The analyzer components use `isDisposable: false`,
matching their owning `ScreenView`; model/preference subscriptions and view-only
Properties remain alive for that screen. Dynamically replaced period-guide lines
are still disposed when removed.

## Testing

```
npm test
```

| File | Covers |
|---|---|
| `AperturePhotometry.test.ts` | Net flux, differential magnitude |
| `PDMCalculator.test.ts` | NAAP θ scan, best period |
| `memory-leak.test.ts` | Dispose regression |

Not tested: view nodes, full screen integration, CCDField render parity with Flash.

## Multi-screen

Four NAAP labs as separate simulators sharing `src/common/` only. No shared root model.
