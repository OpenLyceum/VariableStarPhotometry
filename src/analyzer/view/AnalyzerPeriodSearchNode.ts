/**
 * AnalyzerPeriodSearchNode.ts
 *
 * PDM curve, trial-period marker, rubber-band zoom, and period/zoom controls.
 */
import { DerivedProperty } from "scenerystack/axon";
import { ChartRectangle, ChartTransform, GridLineSet, LinePlot, TickLabelSet, TickMarkSet } from "scenerystack/bamboo";
import { Dimension2, Range, toFixed, Vector2 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Orientation } from "scenerystack/phet-core";
import { StringUtils } from "scenerystack/phetcommon";
import { DragListener, HBox, Line, Node, Rectangle, type SceneryEvent, Text, VBox } from "scenerystack/scenery";
import { NumberControl } from "scenerystack/scenery-phet";
import { TextPushButton } from "scenerystack/sun";
import { bestPeriod } from "../../common/model/PDMCalculator.js";
import { FLAT_RECTANGULAR_BUTTON_OPTIONS } from "../../common/VariableStarPhotometryButtonOptions.js";
import { StringManager } from "../../i18n/StringManager.js";
import VariableStarPhotometryColors from "../../VariableStarPhotometryColors.js";
import VariableStarPhotometryConstants from "../../VariableStarPhotometryConstants.js";
import { type AnalyzerModel, PERIOD_RANGE } from "../model/AnalyzerModel.js";
import { HEADER_FONT, LABEL_FONT, SMALL_FONT, singleRowNumberControlLayout, TICK_FONT } from "./analyzerViewOptions.js";
import { applyChartRescale, decimalsFor, tickSpacingForSpan } from "./chartRescale.js";

export class AnalyzerPeriodSearchNode extends VBox {
  public constructor(model: AnalyzerModel) {
    // These components share the non-disposable ScreenView lifetime.
    super({ isDisposable: false });
    const strings = StringManager.getInstance().getAnalyzerViewStrings();
    const PDM_W = VariableStarPhotometryConstants.ANALYZER.PDM_WIDTH;
    const PDM_H = VariableStarPhotometryConstants.ANALYZER.PDM_HEIGHT;
    const pdmTransform = new ChartTransform({
      viewWidth: PDM_W,
      viewHeight: PDM_H,
      modelXRange: model.pdmZoomRangeProperty.value.copy(),
      modelYRange: new Range(0, 1.2),
    });

    const pdmBackground = new ChartRectangle(pdmTransform, {
      fill: VariableStarPhotometryColors.chartBackgroundColorProperty,
      stroke: VariableStarPhotometryColors.chartStrokeColorProperty,
    });
    const pdmGridX = new GridLineSet(pdmTransform, Orientation.HORIZONTAL, 1, {
      stroke: VariableStarPhotometryColors.chartGridColorProperty,
    });
    const pdmGridY = new GridLineSet(pdmTransform, Orientation.VERTICAL, 0.2, {
      stroke: VariableStarPhotometryColors.chartGridColorProperty,
    });
    const pdmTickX = new TickMarkSet(pdmTransform, Orientation.HORIZONTAL, 1, { edge: "min" });
    const pdmTickY = new TickMarkSet(pdmTransform, Orientation.VERTICAL, 0.2, { edge: "min" });
    const pdmLabelX = new TickLabelSet(pdmTransform, Orientation.HORIZONTAL, 1, {
      edge: "min",
      createLabel: (v: number) =>
        new Text(toFixed(v, 1), { font: TICK_FONT, fill: VariableStarPhotometryColors.textColorProperty }),
    });
    const pdmLabelY = new TickLabelSet(pdmTransform, Orientation.VERTICAL, 0.2, {
      edge: "min",
      createLabel: (v: number) =>
        new Text(toFixed(v, 1), { font: TICK_FONT, fill: VariableStarPhotometryColors.textColorProperty }),
    });

    const pdmLine = new LinePlot(pdmTransform, [], {
      stroke: VariableStarPhotometryColors.lightCurveColorProperty,
      lineWidth: 1.5,
    });
    const periodMarker = new Line(0, 0, 0, PDM_H, {
      stroke: VariableStarPhotometryColors.pdmMarkerColorProperty,
      lineWidth: 2,
    });
    const pdmZoomSelection = new Rectangle(0, 0, 0, PDM_H, {
      fill: VariableStarPhotometryColors.pdmZoomSelectionFillProperty,
      stroke: VariableStarPhotometryColors.pdmMarkerColorProperty,
      lineWidth: 1,
      visible: false,
      pickable: false,
    });
    const pdmPlotLayer = new Node({
      clipArea: Shape.rectangle(0, 0, PDM_W, PDM_H),
      children: [pdmLine, pdmZoomSelection, periodMarker],
    });

    const pdmEmptyMsg = new Text(strings.noLightCurveStringProperty, {
      font: SMALL_FONT,
      fill: VariableStarPhotometryColors.mutedTextColorProperty,
      center: new Vector2(PDM_W / 2, PDM_H / 2),
    });

    // Click selects a trial period; drag creates the Flash-style rubber-band zoom window.
    const pdmHit = new Rectangle(0, 0, PDM_W, PDM_H, { fill: "transparent", cursor: "ew-resize" });
    const PDM_DRAG_ZOOM_THRESHOLD = VariableStarPhotometryConstants.ANALYZER.DRAG_ZOOM_THRESHOLD;
    let pdmDragStartX = 0;
    let pdmDragCurrentX = 0;
    const clampPdmViewX = (x: number) => Math.max(0, Math.min(PDM_W, x));
    const setPeriodFromViewX = (viewX: number) => {
      const zoom = model.pdmZoomRangeProperty.value;
      const period = pdmTransform.viewToModelX(viewX);
      model.trialPeriodProperty.value = PERIOD_RANGE.constrainValue(Math.max(zoom.min, Math.min(zoom.max, period)));
    };
    const updatePdmZoomSelection = () => {
      const left = Math.min(pdmDragStartX, pdmDragCurrentX);
      const width = Math.abs(pdmDragCurrentX - pdmDragStartX);
      pdmZoomSelection.setRect(left, 0, width, PDM_H);
      pdmZoomSelection.visible = width >= PDM_DRAG_ZOOM_THRESHOLD;
    };
    const pdmViewXFromEvent = (event: SceneryEvent) => {
      const local = pdmHit.globalToLocalPoint(event.pointer.point);
      return clampPdmViewX(local.x);
    };
    // Pointer rubber-band zoom / click-to-set period. Keyboard period control is
    // via the period NumberPicker elsewhere; a RichDragListener would not map
    // sensibly onto drag-to-zoom-range selection.
    pdmHit.addInputListener(
      new DragListener({
        start: (event) => {
          pdmDragStartX = pdmViewXFromEvent(event);
          pdmDragCurrentX = pdmDragStartX;
          pdmZoomSelection.visible = false;
        },
        drag: (event) => {
          pdmDragCurrentX = pdmViewXFromEvent(event);
          updatePdmZoomSelection();
        },
        end: () => {
          const width = Math.abs(pdmDragCurrentX - pdmDragStartX);
          pdmZoomSelection.visible = false;
          if (width >= PDM_DRAG_ZOOM_THRESHOLD) {
            model.zoomToPeriodRange(
              pdmTransform.viewToModelX(pdmDragStartX),
              pdmTransform.viewToModelX(pdmDragCurrentX),
            );
          } else {
            setPeriodFromViewX(pdmDragStartX);
          }
        },
      }),
    );

    const pdmChart = new Node({
      children: [
        pdmBackground,
        pdmGridX,
        pdmGridY,
        pdmPlotLayer,
        pdmTickX,
        pdmTickY,
        pdmLabelX,
        pdmLabelY,
        pdmHit,
        pdmEmptyMsg,
      ],
    });

    const updatePdmAxes = () => {
      const zoom = model.pdmZoomRangeProperty.value;
      const newSpan = zoom.getLength();
      const spacing = tickSpacingForSpan(newSpan);
      const xd = decimalsFor(spacing);
      applyChartRescale(
        pdmTransform.modelXRange.getLength(),
        newSpan,
        () => pdmTransform.setModelXRange(zoom.copy()),
        () => {
          pdmGridX.setSpacing(spacing);
          pdmTickX.setSpacing(spacing);
          pdmLabelX.setSpacing(spacing);
        },
      );
      pdmLabelX.setCreateLabel(
        (v: number) =>
          new Text(toFixed(v, xd), { font: TICK_FONT, fill: VariableStarPhotometryColors.textColorProperty }),
      );
    };

    const updatePdmData = () => {
      const scan = model.pdmScanResultsProperty.value;
      pdmEmptyMsg.visible = scan.length === 0;
      pdmLine.setDataSet(scan.map((p) => new Vector2(p.period, Math.min(1.2, p.theta))));
    };

    const updateMarker = () => {
      const x = pdmTransform.modelToViewX(model.trialPeriodProperty.value);
      periodMarker.setLine(x, 0, x, PDM_H);
      periodMarker.visible = x >= 0 && x <= PDM_W;
    };

    model.pdmZoomRangeProperty.link(() => {
      updatePdmAxes();
      updatePdmData();
      updateMarker();
    });
    model.pdmScanResultsProperty.link(() => updatePdmData());
    model.trialPeriodProperty.link(() => updateMarker());

    // PDM controls: period input + zoom buttons.
    // Title is the plain axis label: the value is already in the number display and
    // the minimum-θ period has its own readout. (The Flash-style "{{period}} … {{best}}"
    // pattern was passed here unfilled, so the placeholders showed on screen.)
    const periodControl = new NumberControl(
      strings.trialPeriodAxisStringProperty,
      model.trialPeriodProperty,
      PERIOD_RANGE,
      {
        titleNodeOptions: { font: LABEL_FONT, fill: VariableStarPhotometryColors.textColorProperty },
        numberDisplayOptions: {
          textOptions: { font: LABEL_FONT },
          decimalPlaces: 4,
        },
        sliderOptions: { trackSize: new Dimension2(120, 3) },
        layoutFunction: singleRowNumberControlLayout,
        accessibleName: strings.trialPeriodAxisStringProperty,
      },
    );

    // This readout sits directly on the dark screen background (this section is not
    // wrapped in a panel), so it uses textColorProperty rather than
    // mutedTextColorProperty (designed for light panel surfaces).
    const bestPeriodReadout = new Text(
      new DerivedProperty([model.pdmScanResultsProperty, strings.bestPeriodPatternStringProperty], (scan, pattern) => {
        const best = bestPeriod(scan);
        return best === null ? "" : StringUtils.fillIn(pattern, { value: toFixed(best, 4) });
      }),
      { font: SMALL_FONT, fill: VariableStarPhotometryColors.textColorProperty },
    );

    const zoomInButton = new TextPushButton(strings.zoomInAroundPeriodStringProperty, {
      font: SMALL_FONT,
      baseColor: VariableStarPhotometryColors.buttonActiveColorProperty,
      listener: () => model.zoomInAroundPeriod(),
      accessibleName: strings.zoomInAroundPeriodStringProperty,
      ...FLAT_RECTANGULAR_BUTTON_OPTIONS,
    });
    const zoomOutButton = new TextPushButton(strings.zoomOutAroundPeriodStringProperty, {
      font: SMALL_FONT,
      baseColor: VariableStarPhotometryColors.buttonActiveColorProperty,
      listener: () => model.zoomOutAroundPeriod(),
      accessibleName: strings.zoomOutAroundPeriodStringProperty,
      ...FLAT_RECTANGULAR_BUTTON_OPTIONS,
    });
    const fullButton = new TextPushButton(strings.zoomToFullStringProperty, {
      font: SMALL_FONT,
      baseColor: VariableStarPhotometryColors.buttonColorProperty,
      listener: () => model.zoomToFull(),
      accessibleName: strings.zoomToFullStringProperty,
      ...FLAT_RECTANGULAR_BUTTON_OPTIONS,
    });
    const undoButton = new TextPushButton(strings.undoLastZoomStringProperty, {
      font: SMALL_FONT,
      baseColor: VariableStarPhotometryColors.buttonColorProperty,
      listener: () => model.undoLastZoom(),
      accessibleName: strings.undoLastZoomStringProperty,
      ...FLAT_RECTANGULAR_BUTTON_OPTIONS,
    });
    const snapButton = new TextPushButton(strings.snapToMinStringProperty, {
      font: SMALL_FONT,
      baseColor: VariableStarPhotometryColors.buttonSnapColorProperty,
      accessibleName: strings.snapToMinStringProperty,
      ...FLAT_RECTANGULAR_BUTTON_OPTIONS,
      listener: () => {
        const best = bestPeriod(model.pdmScanResultsProperty.value);
        if (best !== null) {
          model.trialPeriodProperty.value = best;
        }
      },
    });

    const pdmButtonRow = new HBox({
      spacing: 8,
      children: [zoomInButton, zoomOutButton, fullButton, undoButton, snapButton],
    });
    const pdmYLabel = new Text(strings.thetaAxisStringProperty, {
      font: SMALL_FONT,
      rotation: -Math.PI / 2,
      fill: VariableStarPhotometryColors.textColorProperty,
    });
    const pdmXLabel = new Text(strings.trialPeriodAxisStringProperty, {
      font: SMALL_FONT,
      fill: VariableStarPhotometryColors.textColorProperty,
    });

    this.mutate({
      spacing: 6,
      align: "left",
      children: [
        new HBox({
          spacing: 20,
          align: "center",
          children: [
            new VBox({
              spacing: VariableStarPhotometryConstants.LAYOUT.PANEL_SPACING,
              align: "left",
              children: [
                new Text(strings.pdmTitleStringProperty, {
                  font: HEADER_FONT,
                  fill: VariableStarPhotometryColors.textColorProperty,
                }),
                bestPeriodReadout,
              ],
            }),
            periodControl,
          ],
        }),
        pdmButtonRow,
        new HBox({ spacing: 4, align: "center", children: [pdmYLabel, pdmChart] }),
        pdmXLabel,
      ],
    });
    this.pdomOrder = [periodControl, zoomInButton, zoomOutButton, fullButton, undoButton, snapButton];
  }
}
