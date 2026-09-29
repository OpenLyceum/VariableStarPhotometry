/**
 * AnalyzerObservationsNode.ts
 *
 * Light-curve scatter plot, adaptive axes, period guides, and phase/difference controls.
 */
import { BooleanProperty, DerivedProperty, Multilink } from "scenerystack/axon";
import {
  ChartRectangle,
  ChartTransform,
  GridLineSet,
  ScatterPlot,
  TickLabelSet,
  TickMarkSet,
} from "scenerystack/bamboo";
import { Dimension2, Range, toFixed, Vector2 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Orientation } from "scenerystack/phet-core";
import { HBox, Line, Node, Text, VBox } from "scenerystack/scenery";
import { NumberControl } from "scenerystack/scenery-phet";
import { AquaRadioButtonGroup, Checkbox } from "scenerystack/sun";
import { StringManager } from "../../i18n/StringManager.js";
import VariableStarPhotometryColors from "../../VariableStarPhotometryColors.js";
import VariableStarPhotometryConstants from "../../VariableStarPhotometryConstants.js";
import { type AnalyzerModel, type LightCurveMode, PHASE_OFFSET_RANGE } from "../model/AnalyzerModel.js";
import { AnalyzerDifferenceToolNode } from "./AnalyzerDifferenceToolNode.js";
import { HEADER_FONT, LABEL_FONT, SMALL_FONT, singleRowNumberControlLayout, TICK_FONT } from "./analyzerViewOptions.js";
import { applyChartRescale, decimalsFor, tickSpacingForSpan } from "./chartRescale.js";

export class AnalyzerObservationsNode extends VBox {
  /** View-owned difference-tool visibility. */
  private readonly showDifferenceToolProperty: BooleanProperty;

  public constructor(model: AnalyzerModel) {
    // These components share the non-disposable ScreenView lifetime.
    super({ isDisposable: false });
    const strings = StringManager.getInstance().getAnalyzerViewStrings();
    const a11yControls = StringManager.getInstance().getAnalyzerA11yStrings().controls;
    const showDifferenceToolProperty = new BooleanProperty(false);
    const OBS_W = VariableStarPhotometryConstants.ANALYZER.OBSERVATIONS_WIDTH;
    const OBS_H = VariableStarPhotometryConstants.ANALYZER.OBSERVATIONS_HEIGHT;
    const OBS_TIME_RANGE = new Range(1, 22);
    const obsTransform = new ChartTransform({
      viewWidth: OBS_W,
      viewHeight: OBS_H,
      modelXRange: OBS_TIME_RANGE.copy(),
      modelYRange: new Range(0, 1),
      modelYRangeInverted: true, // brighter (smaller magnitude) at the top
    });

    const obsBackground = new ChartRectangle(obsTransform, {
      fill: VariableStarPhotometryColors.chartBackgroundColorProperty,
      stroke: VariableStarPhotometryColors.chartStrokeColorProperty,
    });
    const obsGridX = new GridLineSet(obsTransform, Orientation.HORIZONTAL, 5, {
      stroke: VariableStarPhotometryColors.chartGridColorProperty,
    });
    const obsGridY = new GridLineSet(obsTransform, Orientation.VERTICAL, 0.2, {
      stroke: VariableStarPhotometryColors.chartGridColorProperty,
    });
    const obsTickX = new TickMarkSet(obsTransform, Orientation.HORIZONTAL, 5, { edge: "min" });
    const obsTickY = new TickMarkSet(obsTransform, Orientation.VERTICAL, 0.2, { edge: "min" });
    // Tick labels are positioned just outside the chart rectangle (bamboo's
    // TickLabelSet convention for edge="min"), so they render on the dark screen
    // background rather than the chart's white fill — use textColorProperty.
    const obsLabelX = new TickLabelSet(obsTransform, Orientation.HORIZONTAL, 5, {
      edge: "min",
      createLabel: (v: number) =>
        new Text(toFixed(v, 0), { font: TICK_FONT, fill: VariableStarPhotometryColors.textColorProperty }),
    });
    const obsLabelY = new TickLabelSet(obsTransform, Orientation.VERTICAL, 0.2, {
      edge: "min",
      createLabel: (v: number) =>
        new Text(toFixed(v, 2), { font: TICK_FONT, fill: VariableStarPhotometryColors.textColorProperty }),
    });

    const scatter = new ScatterPlot(obsTransform, [], {
      radius: 2.5,
      fill: VariableStarPhotometryColors.scatterPointColorProperty,
    });
    const periodMultipleLayer = new Node({ pickable: false });
    const obsPlotLayer = new Node({
      clipArea: Shape.rectangle(0, 0, OBS_W, OBS_H),
      children: [periodMultipleLayer, scatter],
    });

    const deltaOverlay = new AnalyzerDifferenceToolNode(
      obsTransform,
      model.measurementsProperty,
      showDifferenceToolProperty,
    );

    const obsEmptyMsg = new Text(strings.selectBothStarsStringProperty, {
      font: SMALL_FONT,
      fill: VariableStarPhotometryColors.mutedTextColorProperty,
      center: new Vector2(OBS_W / 2, OBS_H / 2),
    });

    const updatePeriodMultipleMarkers = () => {
      const measurements = model.measurementsProperty.value;
      const period = model.trialPeriodProperty.value;
      const offset = model.phaseOffsetProperty.value;
      const mode = model.lightCurveModeProperty.value;

      if (measurements.length === 0 || mode !== "time" || !Number.isFinite(period) || period <= 0) {
        const previous = periodMultipleLayer.getChildren();
        periodMultipleLayer.children = [];
        for (const child of previous) {
          if (!child.isDisposed) {
            child.dispose();
          }
        }
        return;
      }

      const lines: Line[] = [];
      const firstMultiple = Math.ceil((OBS_TIME_RANGE.min - offset) / period);
      const lastMultiple = Math.floor((OBS_TIME_RANGE.max - offset) / period);
      const multipleCount = lastMultiple - firstMultiple + 1;
      const step = multipleCount > 40 ? Math.ceil(multipleCount / 40) : 1;
      for (let multiple = firstMultiple; multiple <= lastMultiple; multiple += step) {
        const epoch = offset + multiple * period;
        const x = obsTransform.modelToViewX(epoch);
        lines.push(
          new Line(x, 0, x, OBS_H, { stroke: VariableStarPhotometryColors.periodMultipleColorProperty, lineWidth: 1 }),
        );
      }
      const previous = periodMultipleLayer.getChildren();
      periodMultipleLayer.children = lines;
      for (const child of previous) {
        if (!child.isDisposed) {
          child.dispose();
        }
      }
    };

    const obsChart = new Node({
      children: [
        obsBackground,
        obsGridX,
        obsGridY,
        obsPlotLayer,
        deltaOverlay,
        obsTickX,
        obsTickY,
        obsLabelX,
        obsLabelY,
        obsEmptyMsg,
      ],
    });

    const updateObservations = () => {
      const measurements = model.measurementsProperty.value;
      obsEmptyMsg.visible = measurements.length === 0;
      if (measurements.length === 0) {
        scatter.setDataSet([]);
        updatePeriodMultipleMarkers();
        deltaOverlay.update();
        return;
      }
      const mode = model.lightCurveModeProperty.value;
      const data = measurements.map(
        (m) => new Vector2(mode === "time" ? m.epoch : model.getPhase(m.epoch), m.magnitude),
      );

      // Magnitude (y) range from the data, with padding.
      let yMin = Infinity;
      let yMax = -Infinity;
      for (const m of measurements) {
        yMin = Math.min(yMin, m.magnitude);
        yMax = Math.max(yMax, m.magnitude);
      }
      const pad = Math.max(0.05, (yMax - yMin) * 0.1);
      const newYRange = new Range(yMin - pad, yMax + pad);
      const ySpacing = tickSpacingForSpan(newYRange.getLength());
      const yd = decimalsFor(ySpacing);
      applyChartRescale(
        obsTransform.modelYRange.getLength(),
        newYRange.getLength(),
        () => obsTransform.setModelYRange(newYRange),
        () => {
          obsGridY.setSpacing(ySpacing);
          obsTickY.setSpacing(ySpacing);
          obsLabelY.setSpacing(ySpacing);
        },
      );
      obsLabelY.setCreateLabel(
        (v: number) =>
          new Text(toFixed(v, yd), { font: TICK_FONT, fill: VariableStarPhotometryColors.textColorProperty }),
      );

      if (mode === "time") {
        applyChartRescale(
          obsTransform.modelXRange.getLength(),
          OBS_TIME_RANGE.getLength(),
          () => obsTransform.setModelXRange(OBS_TIME_RANGE.copy()),
          () => {
            obsGridX.setSpacing(5);
            obsTickX.setSpacing(5);
            obsLabelX.setSpacing(5);
          },
        );
        obsLabelX.setCreateLabel(
          (v: number) =>
            new Text(toFixed(v, 0), { font: TICK_FONT, fill: VariableStarPhotometryColors.textColorProperty }),
        );
      } else {
        applyChartRescale(
          obsTransform.modelXRange.getLength(),
          1,
          () => obsTransform.setModelXRange(new Range(0, 1)),
          () => {
            obsGridX.setSpacing(0.25);
            obsTickX.setSpacing(0.25);
            obsLabelX.setSpacing(0.25);
          },
        );
        obsLabelX.setCreateLabel(
          (v: number) =>
            new Text(toFixed(v, 2), { font: TICK_FONT, fill: VariableStarPhotometryColors.textColorProperty }),
        );
      }

      updatePeriodMultipleMarkers();
      scatter.setDataSet(data);
      deltaOverlay.update();
    };
    Multilink.multilink(
      [
        model.measurementsProperty,
        model.lightCurveModeProperty,
        model.trialPeriodProperty,
        model.phaseOffsetProperty,
        showDifferenceToolProperty,
      ],
      () => updateObservations(),
    );

    const obsTitle = new Text(strings.observationsStringProperty, {
      font: HEADER_FONT,
      fill: VariableStarPhotometryColors.textColorProperty,
    });
    const obsYLabel = new Text(strings.differentialMagnitudeStringProperty, {
      font: SMALL_FONT,
      rotation: -Math.PI / 2,
      fill: VariableStarPhotometryColors.textColorProperty,
    });
    const obsXLabel = new Text(
      new DerivedProperty(
        [model.lightCurveModeProperty, strings.julianDateStringProperty, strings.phaseStringProperty],
        (mode, julianDate, phase) => (mode === "time" ? julianDate : phase),
      ),
      { font: SMALL_FONT, fill: VariableStarPhotometryColors.textColorProperty },
    );

    const modeRadioGroup = new AquaRadioButtonGroup<LightCurveMode>(
      model.lightCurveModeProperty,
      [
        {
          value: "time",
          createNode: () =>
            new Text(strings.timeStringProperty, {
              font: LABEL_FONT,
              fill: VariableStarPhotometryColors.textColorProperty,
            }),
          options: { accessibleName: strings.timeStringProperty },
        },
        {
          value: "phase",
          createNode: () =>
            new Text(strings.phaseStringProperty, {
              font: LABEL_FONT,
              fill: VariableStarPhotometryColors.textColorProperty,
            }),
          options: { accessibleName: strings.phaseStringProperty },
        },
      ],
      {
        orientation: "horizontal",
        spacing: 16,
        radioButtonOptions: { radius: 7 },
        accessibleName: a11yControls.lightCurveModeStringProperty,
      },
    );

    const phaseOffsetControl = new NumberControl(
      strings.phaseOffsetStringProperty,
      model.phaseOffsetProperty,
      PHASE_OFFSET_RANGE,
      {
        // titleNodeOptions has no background (unlike numberDisplayOptions, which draws
        // its own white box) and this control sits directly on the dark screen
        // background, so its title needs the light textColorProperty fill.
        titleNodeOptions: { font: SMALL_FONT, fill: VariableStarPhotometryColors.textColorProperty },
        numberDisplayOptions: { textOptions: { font: SMALL_FONT } },
        sliderOptions: { trackSize: new Dimension2(120, 3) },
        layoutFunction: singleRowNumberControlLayout,
        accessibleName: strings.phaseOffsetStringProperty,
      },
    );
    const differenceToolCheckbox = new Checkbox(
      showDifferenceToolProperty,
      new Text(strings.showDifferenceToolStringProperty, {
        font: LABEL_FONT,
        fill: VariableStarPhotometryColors.textColorProperty,
      }),
      {
        boxWidth: 16,
        accessibleName: strings.showDifferenceToolStringProperty,
        checkboxColor: VariableStarPhotometryColors.textColorProperty,
        checkboxColorBackground: VariableStarPhotometryColors.backgroundColorProperty,
      },
    );

    // Assemble observations panel (title, [y-label | chart], x-label, radios).
    const obsChartRow = new HBox({ spacing: 4, align: "center", children: [obsYLabel, obsChart] });
    const obsModeRow = new HBox({
      spacing: 8,
      align: "center",
      children: [
        new Text(strings.lightCurveStringProperty, {
          font: LABEL_FONT,
          fill: VariableStarPhotometryColors.textColorProperty,
        }),
        modeRadioGroup,
      ],
    });
    const obsToolRow = new HBox({
      spacing: 16,
      align: "center",
      children: [phaseOffsetControl, differenceToolCheckbox],
    });
    this.mutate({
      spacing: 6,
      align: "center",
      children: [obsTitle, obsChartRow, obsXLabel, obsModeRow, obsToolRow],
    });
    this.pdomOrder = [modeRadioGroup, phaseOffsetControl, differenceToolCheckbox, deltaOverlay];
    this.showDifferenceToolProperty = showDifferenceToolProperty;
  }

  /** Restore the difference-tool display toggle when Reset All is pressed. */
  public reset(): void {
    this.showDifferenceToolProperty.reset();
  }
}
