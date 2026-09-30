/**
 * BlinkComparatorScreenView.ts
 *
 * View for the Blink Comparator screen.
 *
 * Layout
 * ┌────────────────────────────────┬────────────────────────────┐
 * │  Blink Comparator              │  Blinking Queue Controls   │
 * │  ┌──────────────────────────┐  │  observations list: queue  │
 * │  │ star field + crosshairs  │  │  [epoch table] → [queue]   │
 * │  └──────────────────────────┘  │        add/remove          │
 * │  epoch of field above: N.NNNN  │      <  blink  >   rate    │
 * └────────────────────────────────┴────────────────────────────┘
 *                                                    [Reset All]
 */
import {
  DerivedProperty,
  Multilink,
  PatternStringProperty,
  type ReadOnlyProperty,
  type TReadOnlyProperty,
} from "scenerystack/axon";
import { toFixed } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import type { SceneryEvent } from "scenerystack/scenery";
import { Circle, HBox, KeyboardListener, Line, Node, Rectangle, Text, VBox } from "scenerystack/scenery";
import { PhetFont, ResetAllButton } from "scenerystack/scenery-phet";
import { ScreenView, type ScreenViewOptions } from "scenerystack/sim";
import { Checkbox, HSlider, Panel, RectangularPushButton, TextPushButton } from "scenerystack/sun";
import { Tandem } from "scenerystack/tandem";
import { OBSERVATIONS } from "../../common/model/StarFieldData.js";
import {
  FLAT_RECTANGULAR_BUTTON_OPTIONS,
  FLAT_RESET_ALL_BUTTON_OPTIONS,
} from "../../common/VariableStarPhotometryButtonOptions.js";
import { FieldGridNode } from "../../common/view/FieldGridNode.js";
import { StarFieldNode } from "../../common/view/StarFieldNode.js";
import { StringManager } from "../../i18n/StringManager.js";
import type { VariableStarPhotometryPreferencesModel } from "../../preferences/VariableStarPhotometryPreferencesModel.js";
import VariableStarPhotometryColors from "../../VariableStarPhotometryColors.js";
import VariableStarPhotometryConstants from "../../VariableStarPhotometryConstants.js";
import { BLINK_INTERVAL_RANGE, type BlinkComparatorModel } from "../model/BlinkComparatorModel.js";

const FIELD_W = VariableStarPhotometryConstants.FIELD.WIDTH;
const FIELD_H = VariableStarPhotometryConstants.FIELD.HEIGHT;
const FIELD_SCALE = 1.25;
const OBS_LIST_VISIBLE_ROWS = 13;
const QUEUE_LIST_VISIBLE_ROWS = 10;
const TABLE_ROW_HEIGHT = 22;
const TABLE_WIDTH = 118;

const LABEL_FONT = new PhetFont(VariableStarPhotometryConstants.FONT_SIZE.LABEL);
const HEADER_FONT = new PhetFont({ size: VariableStarPhotometryConstants.FONT_SIZE.HEADER, weight: "bold" });
const SMALL_FONT = new PhetFont(VariableStarPhotometryConstants.FONT_SIZE.SMALL);

function makeTableHeader(width: number, epochLabelProperty: TReadOnlyProperty<string>): Node {
  return new Node({
    children: [
      new Rectangle(0, 0, width, TABLE_ROW_HEIGHT, {
        fill: VariableStarPhotometryColors.tableHeaderFillProperty,
        stroke: VariableStarPhotometryColors.controlPanelStrokeProperty,
        lineWidth: 1,
      }),
      new Text(epochLabelProperty, { font: LABEL_FONT, left: 8, centerY: TABLE_ROW_HEIGHT / 2 }),
    ],
  });
}

export type BlinkComparatorScreenViewOptions = ScreenViewOptions;

export class BlinkComparatorScreenView extends ScreenView {
  private readonly model: BlinkComparatorModel;

  public constructor(
    model: BlinkComparatorModel,
    preferences: VariableStarPhotometryPreferencesModel,
    providedOptions?: BlinkComparatorScreenViewOptions,
  ) {
    const options = optionize<BlinkComparatorScreenViewOptions, EmptySelfOptions, ScreenViewOptions>()(
      {},
      providedOptions,
    );
    super(options);

    this.model = model;

    const tandem = options?.tandem instanceof Tandem ? options.tandem : Tandem.OPT_OUT;
    const strings = StringManager.getInstance().getBlinkViewStrings();
    const unitStrings = StringManager.getInstance().getUnitStrings();
    const a11yControls = StringManager.getInstance().getBlinkComparatorA11yStrings().controls;

    // Localized "{{value}} days" label for a given observation index.
    const makeEpochDaysProperty = (obsIndex: number): ReadOnlyProperty<string> => {
      const obs = OBSERVATIONS[obsIndex];
      return obs
        ? new PatternStringProperty(unitStrings.daysPatternStringProperty, { value: toFixed(obs.epoch, 4) })
        : strings.noEpochStringProperty;
    };

    // -----------------------------------------------------------------------
    // Star field + crosshair overlay
    // -----------------------------------------------------------------------
    const starField = new StarFieldNode(model.displayedObsIndexProperty.value, preferences.invertImagesProperty.value);
    Multilink.multilink([model.displayedObsIndexProperty, preferences.invertImagesProperty], (index, invert) =>
      starField.setObservation(index, invert),
    );

    const fieldClip = new Node({
      clipArea: Shape.rectangle(0, 0, FIELD_W, FIELD_H),
      children: [starField],
    });

    const grid = new FieldGridNode(FIELD_W, FIELD_H, preferences.showGridProperty);

    const frame = new Rectangle(0, 0, FIELD_W, FIELD_H, {
      stroke: VariableStarPhotometryColors.controlPanelStrokeProperty,
      lineWidth: 1,
    });

    const crosshairH = new Line(0, 0, FIELD_W, 0, {
      stroke: VariableStarPhotometryColors.crosshairColorProperty,
      lineWidth: 1,
    });
    const crosshairV = new Line(0, 0, 0, FIELD_H, {
      stroke: VariableStarPhotometryColors.crosshairColorProperty,
      lineWidth: 1,
    });
    const crosshair = new Node({ children: [crosshairH, crosshairV], pickable: false, visible: false });

    // Coordinate readout near the crosshair (matching Flash's xField/yField).
    const crosshairCoordText = new Text("", {
      font: new PhetFont({ size: 10, family: "monospace" }),
      fill: VariableStarPhotometryColors.crosshairColorProperty,
      pickable: false,
    });
    const crosshairCoordBg = new Rectangle(0, 0, 1, 1, {
      fill: VariableStarPhotometryColors.controlPanelFillProperty,
      stroke: VariableStarPhotometryColors.crosshairColorProperty,
      lineWidth: 0.5,
      cornerRadius: 2,
      pickable: false,
    });
    const crosshairCoords = new Node({
      children: [crosshairCoordBg, crosshairCoordText],
      pickable: false,
      visible: false,
    });

    // Transparent hit target on top of the field that reports mouse position.
    const hitArea = new Rectangle(0, 0, FIELD_W, FIELD_H, { fill: "transparent" });

    let pointerInside = false;
    const updateCrosshairVisible = () => {
      const visible = model.showCrosshairProperty.value && pointerInside;
      crosshair.visible = visible;
      crosshairCoords.visible = visible;
    };
    model.showCrosshairProperty.link(updateCrosshairVisible);

    hitArea.addInputListener({
      enter: () => {
        pointerInside = true;
        updateCrosshairVisible();
      },
      exit: () => {
        pointerInside = false;
        updateCrosshairVisible();
      },
      move: (event: SceneryEvent) => {
        const point = hitArea.globalToLocalPoint(event.pointer.point);
        crosshairH.y = point.y;
        crosshairV.x = point.x;

        // Update coordinate readout (clamped to field bounds like Flash).
        const px = Math.max(0, Math.min(FIELD_W - 1, Math.round(point.x)));
        const py = Math.max(0, Math.min(FIELD_H - 1, Math.round(point.y)));
        crosshairCoordText.string = `${px}, ${py}`;
        crosshairCoordBg.setRect(0, 0, crosshairCoordText.width + 6, crosshairCoordText.height + 4);
        crosshairCoordText.x = 3;
        crosshairCoordText.y = 2;
        // Position to the right of the cursor, or left if too close to the edge.
        if (point.x + 15 + crosshairCoordBg.width < FIELD_W) {
          crosshairCoords.x = point.x + 15;
        } else {
          crosshairCoords.x = point.x - 15 - crosshairCoordBg.width;
        }
        crosshairCoords.y = Math.max(
          0,
          Math.min(FIELD_H - crosshairCoordBg.height, point.y - crosshairCoordBg.height / 2),
        );
      },
    });

    const fieldContainer = new Node({ children: [fieldClip, grid, frame, crosshair, crosshairCoords, hitArea] });

    fieldContainer.scale(FIELD_SCALE);

    // Epoch readout below the field, matching the Flash reference. The displayed
    // epoch value (numeric, localized "days") is folded into the readout pattern.
    const displayedEpochDaysProperty = new PatternStringProperty(unitStrings.daysPatternStringProperty, {
      value: new DerivedProperty([model.displayedObsIndexProperty], (index) => {
        const obs = OBSERVATIONS[index];
        return obs ? toFixed(obs.epoch, 4) : "";
      }),
    });
    const epochReadout = new Text(
      new PatternStringProperty(strings.epochOfFieldAboveStringProperty, { value: displayedEpochDaysProperty }),
      { font: LABEL_FONT },
    );

    const crosshairCheckbox = new Checkbox(
      model.showCrosshairProperty,
      new Text(strings.showCrosshairsStringProperty, {
        font: LABEL_FONT,
        fill: VariableStarPhotometryColors.panelTextColorProperty,
      }),
      {
        boxWidth: 16,
        accessibleName: strings.showCrosshairsStringProperty,
        checkboxColor: VariableStarPhotometryColors.panelTextColorProperty,
        checkboxColorBackground: VariableStarPhotometryColors.controlSurfaceColorProperty,
      },
    );

    const fieldFooter = new HBox({
      spacing: 120,
      align: "center",
      children: [epochReadout, crosshairCheckbox],
    });

    const leftColumn = new VBox({
      spacing: 8,
      align: "left",
      children: [new Text(strings.titleStringProperty, { font: HEADER_FONT }), fieldContainer, fieldFooter],
    });

    const leftPanel = new Panel(leftColumn, {
      fill: VariableStarPhotometryColors.controlPanelFillProperty,
      stroke: VariableStarPhotometryColors.controlPanelStrokeProperty,
      cornerRadius: VariableStarPhotometryConstants.LAYOUT.PANEL_CORNER_RADIUS,
      xMargin: VariableStarPhotometryConstants.LAYOUT.PANEL_X_MARGIN,
      yMargin: VariableStarPhotometryConstants.LAYOUT.PANEL_Y_MARGIN,
    });
    leftPanel.left = VariableStarPhotometryConstants.LAYOUT.SCREEN_MARGIN;
    leftPanel.centerY = this.layoutBounds.centerY;
    this.addChild(leftPanel);

    // -----------------------------------------------------------------------
    // Blinking queue controls
    // -----------------------------------------------------------------------
    const observationRows = new VBox({ spacing: 0, align: "left" });
    let observationFirstIndex = 0;

    // Per-row epoch labels are disposed and rebuilt with their rows.
    const observationRowProps: ReadOnlyProperty<string>[] = [];
    const queueRowProps: ReadOnlyProperty<string>[] = [];

    const addButton = new TextPushButton(strings.addToQueueStringProperty, {
      font: LABEL_FONT,
      baseColor: VariableStarPhotometryColors.buttonAddColorProperty,
      accessibleName: strings.addToQueueStringProperty,
      ...FLAT_RECTANGULAR_BUTTON_OPTIONS,
      listener: () => {
        const selected = model.selectedObsIndexProperty.value;
        model.addSelectedToQueue();
        const queueIndex = model.blinkQueue.indexOf(selected);
        if (queueIndex >= 0) {
          model.queuePositionProperty.value = queueIndex;
        }
      },
    });

    const removeButton = new TextPushButton(strings.removeFromQueueStringProperty, {
      font: LABEL_FONT,
      baseColor: VariableStarPhotometryColors.buttonNeutralColorProperty,
      accessibleName: strings.removeFromQueueStringProperty,
      ...FLAT_RECTANGULAR_BUTTON_OPTIONS,
      listener: () => {
        if (model.blinkQueue.length > 0) {
          const obsIndex =
            model.blinkQueue[Math.max(0, Math.min(model.queuePositionProperty.value, model.blinkQueue.length - 1))];
          if (obsIndex !== undefined) {
            model.removeFromQueue(obsIndex);
          }
        }
      },
    });

    const makeObservationRow = (obsIndex: number, isSelected: boolean): Node => {
      const isInQueue = model.blinkQueue.includes(obsIndex);
      const rowBackground = new Rectangle(0, 0, TABLE_WIDTH, TABLE_ROW_HEIGHT, {
        fill: isSelected
          ? VariableStarPhotometryColors.selectionFillProperty
          : VariableStarPhotometryColors.tableRowFillProperty,
        stroke: VariableStarPhotometryColors.tableStrokeProperty,
        lineWidth: 1,
      });
      const epochProp = makeEpochDaysProperty(obsIndex);
      observationRowProps.push(epochProp);
      const rowChildren: Node[] = [rowBackground];
      // Show a checkmark indicator for observations already in the queue.
      if (isInQueue) {
        rowChildren.push(
          new Text(strings.inQueueMarkerStringProperty, {
            font: LABEL_FONT,
            fill: VariableStarPhotometryColors.queueMarkerColorProperty,
            left: 2,
            centerY: TABLE_ROW_HEIGHT / 2,
          }),
        );
      }
      rowChildren.push(
        new Text(epochProp, {
          font: LABEL_FONT,
          fill: isSelected
            ? VariableStarPhotometryColors.panelTextColorProperty
            : VariableStarPhotometryColors.mutedTextColorProperty,
          left: isInQueue ? 16 : 8,
          centerY: TABLE_ROW_HEIGHT / 2,
        }),
      );
      const rowName = new PatternStringProperty(a11yControls.observationPatternStringProperty, {
        epoch: OBSERVATIONS[obsIndex] !== undefined ? toFixed(OBSERVATIONS[obsIndex].epoch, 4) : "",
      });
      observationRowProps.push(rowName);
      const row = new Node({
        cursor: "pointer",
        children: rowChildren,
        tagName: "button",
        accessibleName: rowName,
      });
      const selectRow = () => {
        model.selectedObsIndexProperty.value = obsIndex;
      };
      row.addInputListener({ down: selectRow, click: selectRow });
      return row;
    };

    const rebuildObservationList = () => {
      for (const child of observationRows.children.slice()) {
        child.dispose();
      }
      for (const prop of observationRowProps) {
        prop.dispose();
      }
      observationRowProps.length = 0;
      const selected = model.selectedObsIndexProperty.value;
      const maxFirst = Math.max(0, OBSERVATIONS.length - OBS_LIST_VISIBLE_ROWS);
      observationFirstIndex = Math.max(0, Math.min(maxFirst, observationFirstIndex));
      if (selected < observationFirstIndex) {
        observationFirstIndex = selected;
      } else if (selected >= observationFirstIndex + OBS_LIST_VISIBLE_ROWS) {
        observationFirstIndex = selected - OBS_LIST_VISIBLE_ROWS + 1;
      }

      const rows: Node[] = [];
      for (let i = 0; i < OBS_LIST_VISIBLE_ROWS; i++) {
        const obsIndex = observationFirstIndex + i;
        if (obsIndex >= OBSERVATIONS.length) {
          break;
        }
        rows.push(makeObservationRow(obsIndex, obsIndex === selected));
      }
      observationRows.children = rows;
    };

    const scrollObservationList = (delta: number) => {
      const maxFirst = Math.max(0, OBSERVATIONS.length - OBS_LIST_VISIBLE_ROWS);
      observationFirstIndex = Math.max(0, Math.min(maxFirst, observationFirstIndex + delta));
      rebuildObservationList();
    };

    const obsScrollUpButton = new RectangularPushButton({
      content: new Text(strings.scrollUpStringProperty, { font: SMALL_FONT }),
      baseColor: VariableStarPhotometryColors.tableHeaderFillProperty,
      xMargin: 3,
      yMargin: 2,
      listener: () => scrollObservationList(-1),
      accessibleName: a11yControls.scrollUpStringProperty,
      ...FLAT_RECTANGULAR_BUTTON_OPTIONS,
    });
    const obsScrollDownButton = new RectangularPushButton({
      content: new Text(strings.scrollDownStringProperty, { font: SMALL_FONT }),
      baseColor: VariableStarPhotometryColors.tableHeaderFillProperty,
      xMargin: 3,
      yMargin: 2,
      listener: () => scrollObservationList(1),
      accessibleName: a11yControls.scrollDownStringProperty,
      ...FLAT_RECTANGULAR_BUTTON_OPTIONS,
    });

    const observationTable = new HBox({
      spacing: 2,
      align: "top",
      children: [
        new VBox({
          spacing: 0,
          align: "left",
          children: [makeTableHeader(TABLE_WIDTH, strings.epochStringProperty), observationRows],
        }),
        new VBox({ spacing: 4, align: "center", children: [obsScrollUpButton, obsScrollDownButton] }),
      ],
    });

    const queueRows = new VBox({ spacing: 0, align: "left" });

    const makeQueueRow = (queueIndex: number): Node => {
      const obsIndex = model.blinkQueue[queueIndex];
      const isSelected = queueIndex === model.queuePositionProperty.value && obsIndex !== undefined;
      const rowBackground = new Rectangle(0, 0, TABLE_WIDTH, TABLE_ROW_HEIGHT, {
        fill: isSelected
          ? VariableStarPhotometryColors.selectionFillProperty
          : VariableStarPhotometryColors.tableRowFillProperty,
        stroke: VariableStarPhotometryColors.dividerColorProperty,
        lineWidth: 1,
      });
      const children: Node[] = [rowBackground];
      if (obsIndex !== undefined) {
        const epochProp = makeEpochDaysProperty(obsIndex);
        queueRowProps.push(epochProp);
        children.push(
          new Circle(4, {
            fill: isSelected ? VariableStarPhotometryColors.queueMarkerColorProperty : null,
            left: 12,
            centerY: TABLE_ROW_HEIGHT / 2,
          }),
          new Text(epochProp, {
            font: LABEL_FONT,
            left: 28,
            centerY: TABLE_ROW_HEIGHT / 2,
          }),
        );
      }

      const row = new Node({ cursor: obsIndex === undefined ? "default" : "pointer", children });
      if (obsIndex !== undefined) {
        const observation = OBSERVATIONS[obsIndex];
        const rowName = new PatternStringProperty(a11yControls.queuedObservationPatternStringProperty, {
          epoch: observation !== undefined ? toFixed(observation.epoch, 4) : "",
        });
        queueRowProps.push(rowName);
        row.tagName = "button";
        row.accessibleName = rowName;
        const selectQueueRow = () => {
          model.queuePositionProperty.value = queueIndex;
        };
        row.addInputListener({ down: selectQueueRow, click: selectQueueRow });
      }
      return row;
    };

    const rebuildQueueList = () => {
      for (const child of queueRows.children.slice()) {
        child.dispose();
      }
      for (const prop of queueRowProps) {
        prop.dispose();
      }
      queueRowProps.length = 0;
      const rows: Node[] = [];
      for (let i = 0; i < QUEUE_LIST_VISIBLE_ROWS; i++) {
        rows.push(makeQueueRow(i));
      }
      queueRows.children = rows;
    };

    const queueTable = new VBox({
      spacing: 0,
      align: "left",
      children: [makeTableHeader(TABLE_WIDTH, strings.epochStringProperty), queueRows],
    });

    const previousButton = new TextPushButton("<", {
      font: LABEL_FONT,
      baseColor: VariableStarPhotometryColors.buttonNeutralColorProperty,
      accessibleName: a11yControls.previousStringProperty,
      ...FLAT_RECTANGULAR_BUTTON_OPTIONS,
      listener: () => {
        if (model.blinkQueue.length > 0) {
          model.queuePositionProperty.value =
            (model.queuePositionProperty.value + model.blinkQueue.length - 1) % model.blinkQueue.length;
        }
      },
    });
    const blinkButton = new TextPushButton(strings.blinkStringProperty, {
      font: LABEL_FONT,
      baseColor: VariableStarPhotometryColors.buttonNeutralColorProperty,
      accessibleName: strings.blinkStringProperty,
      ...FLAT_RECTANGULAR_BUTTON_OPTIONS,
      listener: () => {
        model.isBlinkingProperty.value = !model.isBlinkingProperty.value;
      },
    });
    model.isBlinkingProperty.link((isBlinking) => {
      blinkButton.baseColor = isBlinking
        ? VariableStarPhotometryColors.buttonActiveColorProperty
        : VariableStarPhotometryColors.buttonNeutralColorProperty;
    });
    const nextButton = new TextPushButton(">", {
      font: LABEL_FONT,
      baseColor: VariableStarPhotometryColors.buttonNeutralColorProperty,
      accessibleName: a11yControls.nextStringProperty,
      ...FLAT_RECTANGULAR_BUTTON_OPTIONS,
      listener: () => {
        if (model.blinkQueue.length > 0) {
          model.queuePositionProperty.value = (model.queuePositionProperty.value + 1) % model.blinkQueue.length;
        }
      },
    });

    const blinkSpeedSlider = new HSlider(model.blinkIntervalMsProperty, BLINK_INTERVAL_RANGE, {
      tandem: tandem.createTandem("blinkSpeedSlider"),
      accessibleName: a11yControls.blinkSpeedStringProperty,
    });
    blinkSpeedSlider.addMajorTick(BLINK_INTERVAL_RANGE.min, new Text(strings.fastStringProperty, { font: SMALL_FONT }));
    blinkSpeedSlider.addMajorTick(BLINK_INTERVAL_RANGE.max, new Text(strings.slowStringProperty, { font: SMALL_FONT }));

    const transferControls = new VBox({
      spacing: 20,
      align: "center",
      children: [
        new Text(strings.addToQueueArrowStringProperty, {
          font: new PhetFont(38),
          fill: VariableStarPhotometryColors.transferArrowColorProperty,
        }),
        addButton,
        removeButton,
        new Text(strings.removeFromQueueArrowStringProperty, {
          font: new PhetFont(34),
          fill: VariableStarPhotometryColors.transferArrowColorProperty,
        }),
      ],
    });

    const listRow = new HBox({
      spacing: 22,
      align: "top",
      children: [
        new VBox({
          spacing: 6,
          align: "left",
          children: [new Text(strings.observationsListStringProperty, { font: LABEL_FONT }), observationTable],
        }),
        transferControls,
        new VBox({
          spacing: 6,
          align: "left",
          children: [new Text(strings.blinkingQueueStringProperty, { font: LABEL_FONT }), queueTable],
        }),
      ],
    });

    const navigationRow = new HBox({
      spacing: 12,
      align: "center",
      children: [previousButton, blinkButton, nextButton],
    });

    const rateRow = new HBox({
      spacing: 8,
      align: "center",
      children: [new Text(strings.rateStringProperty, { font: LABEL_FONT }), blinkSpeedSlider],
    });

    const controlContent = new VBox({
      spacing: 14,
      align: "left",
      children: [
        new Text(strings.queueControlsStringProperty, { font: HEADER_FONT }),
        listRow,
        new HBox({ spacing: 38, align: "center", children: [new Node({ maxWidth: 150 }), navigationRow] }),
        new HBox({ spacing: 42, align: "center", children: [new Node({ maxWidth: 150 }), rateRow] }),
      ],
    });

    const controlPanel = new Panel(controlContent, {
      fill: VariableStarPhotometryColors.controlPanelFillProperty,
      stroke: VariableStarPhotometryColors.controlPanelStrokeProperty,
      cornerRadius: VariableStarPhotometryConstants.LAYOUT.PANEL_CORNER_RADIUS,
      xMargin: VariableStarPhotometryConstants.LAYOUT.PANEL_X_MARGIN,
      yMargin: VariableStarPhotometryConstants.LAYOUT.PANEL_Y_MARGIN,
    });
    controlPanel.left = leftPanel.right + 8;
    controlPanel.top = leftPanel.top;
    this.addChild(controlPanel);

    model.selectedObsIndexProperty.link(() => rebuildObservationList());
    model.blinkQueue.lengthProperty.link(() => {
      rebuildObservationList();
      rebuildQueueList();
    });
    model.queuePositionProperty.link(rebuildQueueList);

    // -----------------------------------------------------------------------
    // Keyboard: space toggles blinking
    // -----------------------------------------------------------------------
    KeyboardListener.createGlobal(this, {
      keys: ["space"] as const,
      fire: () => {
        model.isBlinkingProperty.value = !model.isBlinkingProperty.value;
      },
    });

    // -----------------------------------------------------------------------
    // Reset All
    // -----------------------------------------------------------------------
    const resetAllButton = new ResetAllButton({
      listener: () => model.reset(),
      right: this.layoutBounds.maxX - VariableStarPhotometryConstants.LAYOUT.RESET_BUTTON_MARGIN,
      bottom: this.layoutBounds.maxY - VariableStarPhotometryConstants.LAYOUT.RESET_BUTTON_MARGIN,
      tandem: tandem.createTandem("resetAllButton"),
      ...FLAT_RESET_ALL_BUTTON_OPTIONS,
    });
    this.addChild(resetAllButton);

    // -----------------------------------------------------------------------
    // Accessibility: keyboard / reading traversal order. ScreenView throws if
    // pdomOrder is set on itself, so a wrapper Node "borrows" the interactive
    // nodes — list/table controls first, then playback, Reset All last.
    // -----------------------------------------------------------------------
    this.addChild(
      new Node({
        pdomOrder: [
          observationTable,
          addButton,
          removeButton,
          queueTable,
          previousButton,
          blinkButton,
          nextButton,
          blinkSpeedSlider,
          crosshairCheckbox,
          resetAllButton,
        ],
      }),
    );
  }

  public override step(dt: number): void {
    super.step(dt);
    this.model.step(dt);
  }
}
