/**
 * AnalyzerDifferenceToolNode.ts
 *
 * Magnitude-difference overlay with two pointer/keyboard draggable bars.
 * The observations section refreshes it after rescaling the chart.
 */
import { DerivedProperty, NumberProperty, PatternStringProperty, type TReadOnlyProperty } from "scenerystack/axon";
import type { ChartTransform } from "scenerystack/bamboo";
import { toFixed } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Line, Node, Rectangle, RichDragListener, type SceneryEvent, Text } from "scenerystack/scenery";
import { StringManager } from "../../i18n/StringManager.js";
import VariableStarPhotometryColors from "../../VariableStarPhotometryColors.js";
import VariableStarPhotometryConstants from "../../VariableStarPhotometryConstants.js";
import type { DiffMag } from "../model/AnalyzerModel.js";
import { SMALL_FONT } from "./analyzerViewOptions.js";

const OBS_W = VariableStarPhotometryConstants.ANALYZER.OBSERVATIONS_WIDTH;
const OBS_H = VariableStarPhotometryConstants.ANALYZER.OBSERVATIONS_HEIGHT;

export class AnalyzerDifferenceToolNode extends Node {
  /** Refresh callback for chart-coordinate changes and bar movement. */
  private readonly updateOverlay: () => void;

  public constructor(
    obsTransform: ChartTransform,
    measurementsProperty: TReadOnlyProperty<readonly DiffMag[]>,
    showDifferenceToolProperty: TReadOnlyProperty<boolean>,
  ) {
    // These components share the non-disposable ScreenView lifetime.
    super({ isDisposable: false });
    const unitStrings = StringManager.getInstance().getUnitStrings();
    const a11yControls = StringManager.getInstance().getAnalyzerA11yStrings().controls;
    // Flash DeltaMagOverlay equivalent: two draggable horizontal bars whose
    // separation reports a magnitude difference in the current plot scale.
    let deltaBar1Y = OBS_H * 0.35;
    let deltaBar2Y = OBS_H * 0.65;
    const deltaBar1 = new Line(0, deltaBar1Y, OBS_W, deltaBar1Y, {
      stroke: VariableStarPhotometryColors.deltaBarColorProperty,
      lineWidth: 1,
    });
    const deltaBar2 = new Line(0, deltaBar2Y, OBS_W, deltaBar2Y, {
      stroke: VariableStarPhotometryColors.deltaBarColorProperty,
      lineWidth: 1,
    });
    const deltaFill = new Rectangle(0, 0, OBS_W, 0, {
      fill: VariableStarPhotometryColors.deltaFillColorProperty,
      pickable: false,
    });

    // Magnitude separation reported by the difference tool (bound to its label).
    const deltaMagProperty = new NumberProperty(0);
    const deltaText = new Text(
      new PatternStringProperty(unitStrings.magPatternStringProperty, {
        value: new DerivedProperty([deltaMagProperty], (v) => toFixed(v, 2)),
      }),
      {
        font: SMALL_FONT,
        fill: VariableStarPhotometryColors.panelTextColorProperty,
        pickable: false,
      },
    );

    const updateDeltaOverlay = () => {
      const hasMeasurements = measurementsProperty.value.length > 0;
      const showOverlay = hasMeasurements && showDifferenceToolProperty.value;
      deltaBar1.visible = showOverlay;
      deltaBar2.visible = showOverlay;
      deltaFill.visible = showOverlay;
      deltaText.visible = showOverlay;
      deltaBar1Hit.visible = showOverlay;
      deltaBar2Hit.visible = showOverlay;
      if (!showOverlay) {
        return;
      }

      const y1 = Math.max(0, Math.min(OBS_H, deltaBar1Y));
      const y2 = Math.max(0, Math.min(OBS_H, deltaBar2Y));
      deltaBar1.setLine(0, y1, OBS_W, y1);
      deltaBar2.setLine(0, y2, OBS_W, y2);

      const top = Math.min(y1, y2);
      const bottom = Math.max(y1, y2);
      deltaFill.setRect(0, top, OBS_W, bottom - top);

      const mag1 = obsTransform.viewToModelY(y1);
      const mag2 = obsTransform.viewToModelY(y2);
      deltaMagProperty.value = Math.abs(mag2 - mag1);
      deltaText.centerX = OBS_W / 2;
      deltaText.bottom = Math.max(14, top - 4);
    };

    const makeDeltaBarHitTarget = (which: 1 | 2): Rectangle => {
      const hit = new Rectangle(0, 0, OBS_W, 12, {
        fill: "transparent",
        cursor: "ns-resize",
        tagName: "div",
        focusable: true,
        accessibleName: new PatternStringProperty(a11yControls.deltaBarPatternStringProperty, { number: which }),
      });
      const setBarFromEvent = (event: SceneryEvent) => {
        const local = hit.globalToLocalPoint(event.pointer.point);
        const y = Math.max(0, Math.min(OBS_H, hit.y + local.y));
        if (which === 1) {
          deltaBar1Y = y;
        } else {
          deltaBar2Y = y;
        }
        updateDeltaOverlayAndHits();
      };
      hit.addInputListener(
        new RichDragListener({
          dragListenerOptions: {
            start: (event) => setBarFromEvent(event),
            drag: (event) => setBarFromEvent(event),
          },
          keyboardDragListenerOptions: {
            keyboardDragDirection: "upDown",
            dragSpeed: 80,
            shiftDragSpeed: 30,
            drag: (_event, listener) => {
              const y =
                which === 1
                  ? Math.max(0, Math.min(OBS_H, deltaBar1Y + listener.modelDelta.y))
                  : Math.max(0, Math.min(OBS_H, deltaBar2Y + listener.modelDelta.y));
              if (which === 1) {
                deltaBar1Y = y;
              } else {
                deltaBar2Y = y;
              }
              updateDeltaOverlayAndHits();
            },
          },
        }),
      );
      return hit;
    };

    const deltaBar1Hit = makeDeltaBarHitTarget(1);
    const deltaBar2Hit = makeDeltaBarHitTarget(2);
    const updateDeltaHitTargets = () => {
      deltaBar1Hit.top = deltaBar1Y - 6;
      deltaBar2Hit.top = deltaBar2Y - 6;
    };
    this.mutate({
      clipArea: Shape.rectangle(0, 0, OBS_W, OBS_H),
      children: [deltaFill, deltaBar1, deltaBar2, deltaText, deltaBar1Hit, deltaBar2Hit],
    });
    const updateDeltaOverlayAndHits = () => {
      updateDeltaOverlay();
      updateDeltaHitTargets();
    };

    this.updateOverlay = updateDeltaOverlayAndHits;
    this.pdomOrder = [deltaBar1Hit, deltaBar2Hit];
    this.update();
  }

  /** Reposition the bars and refresh their magnitude difference. */
  public update(): void {
    this.updateOverlay();
  }
}
