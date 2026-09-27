/**
 * RegistrationScreenView.ts
 *
 * View for the Registration screen.
 *
 * Students overlay three CCD star-field images taken at different epochs
 * and use the X/Y offset controls (or arrow keys) to align them.
 *
 * Layout
 * ┌─────────────────────┬──────────────────────────────┐
 * │  Work Area          │  Starfield Controls          │
 * │  (380 × 290)        │  sf1: shown    –    –    –   │
 * │  [overlaid fields]  │  sf2: shown  on-top  x    y  │
 * │                     │  sf3: shown  on-top  x    y  │
 * │                     │  ─────────────────────────── │
 * │                     │  Appearance Options          │
 * │                     │  [x] make top transparent    │
 * │                     │  [ ] invert colors           │
 * │                     │  [Switch on top field / J]   │
 * └─────────────────────┴──────────────────────────────┘
 *                                            [Reset All]
 */
import {
  type BooleanProperty,
  Multilink,
  type NumberProperty,
  PatternStringProperty,
  type TReadOnlyProperty,
} from "scenerystack/axon";
import { Shape } from "scenerystack/kite";
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import type { SceneryEvent, TColor } from "scenerystack/scenery";
import { KeyboardListener, Node, Rectangle, RichDragListener, RichText, Text, VBox } from "scenerystack/scenery";
import { PhetFont, ResetAllButton } from "scenerystack/scenery-phet";
import { ScreenView, type ScreenViewOptions } from "scenerystack/sim";
import { AquaRadioButton, Checkbox, NumberPicker, Panel, TextPushButton } from "scenerystack/sun";
import { Tandem } from "scenerystack/tandem";
import {
  FLAT_RECTANGULAR_BUTTON_OPTIONS,
  FLAT_RESET_ALL_BUTTON_OPTIONS,
} from "../../common/VariableStarPhotometryButtonOptions.js";
import { FieldGridNode } from "../../common/view/FieldGridNode.js";
import { StarFieldNode } from "../../common/view/StarFieldNode.js";
import { StringManager } from "../../i18n/StringManager.js";
import VariableStarPhotometryColors from "../../VariableStarPhotometryColors.js";
import VariableStarPhotometryConstants from "../../VariableStarPhotometryConstants.js";
import { REG_POINTING_ERRORS, type RegistrationModel } from "../model/RegistrationModel.js";

const FIELD_W = VariableStarPhotometryConstants.FIELD.WIDTH;
const FIELD_H = VariableStarPhotometryConstants.FIELD.HEIGHT;

const LABEL_FONT = new PhetFont(VariableStarPhotometryConstants.FONT_SIZE.LABEL);
const SMALL_FONT = new PhetFont(VariableStarPhotometryConstants.FONT_SIZE.SMALL);
const HEADER_FONT = new PhetFont({ size: VariableStarPhotometryConstants.FONT_SIZE.HEADER, weight: "bold" });

/** Field-pixel nudge per arrow-key press in the work area; Shift is the fine step. */
const NUDGE_STEP_PX = 1;
const NUDGE_FINE_STEP_PX = 0.25;

const WORK_PANEL_MARGIN = 12;
const WORK_PANEL_TITLE_HEIGHT = 26;
const CONTROL_TABLE_W = 286;
// Tall enough for a NumberPicker (value with arrows above and below).
const CONTROL_ROW_H = 54;
const CONTROL_HEADER_H = 24;

export type RegistrationScreenViewOptions = ScreenViewOptions;

export class RegistrationScreenView extends ScreenView {
  public constructor(model: RegistrationModel, providedOptions?: RegistrationScreenViewOptions) {
    const options = optionize<RegistrationScreenViewOptions, EmptySelfOptions, ScreenViewOptions>()(
      {},
      providedOptions,
    );
    super(options);

    const tandem = options?.tandem instanceof Tandem ? options.tandem : Tandem.OPT_OUT;
    const strings = StringManager.getInstance().getRegistrationViewStrings();
    const a11yControls = StringManager.getInstance().getRegistrationA11yStrings().controls;

    // -----------------------------------------------------------------------
    // Work Area — three overlaid star fields
    // -----------------------------------------------------------------------
    const field1Node = new StarFieldNode(model.obsIndex1);
    const field2Node = new StarFieldNode(model.obsIndex2);
    const field3Node = new StarFieldNode(model.obsIndex3);

    // Each field group: star image + coloured border
    function makeBorderRect(): Rectangle {
      return new Rectangle(0, 0, FIELD_W, FIELD_H, {
        stroke: VariableStarPhotometryColors.fieldBorderColorProperty,
        lineWidth: 2,
        fill: null,
        pickable: false,
      });
    }

    const border1 = makeBorderRect();
    const border2 = makeBorderRect();
    const border3 = makeBorderRect();

    const group1 = new Node({ children: [field1Node, border1] });
    const group2 = new Node({ children: [field2Node, border2] });
    const group3 = new Node({ children: [field3Node, border3] });

    // workLayer holds the three groups; clipped to field bounds
    const workLayer = new Node({
      clipArea: Shape.rectangle(0, 0, FIELD_W, FIELD_H),
      children: [group1, group2, group3],
    });

    // Outer frame for the movable star fields.
    const workFrame = new Rectangle(0, 0, FIELD_W, FIELD_H, {
      stroke: VariableStarPhotometryColors.mutedTextColorProperty,
      lineWidth: 1,
      fill: null,
    });

    // Transparent interaction layer for dragging the selected on-top star field.
    const dragHitArea = new Rectangle(0, 0, FIELD_W, FIELD_H, {
      fill: "transparent",
      cursor: "move",
    });

    const workPanelW = FIELD_W + 2 * WORK_PANEL_MARGIN;
    const workPanelH = FIELD_H + WORK_PANEL_TITLE_HEIGHT + WORK_PANEL_MARGIN;
    const workPanelFrame = new Rectangle(0, 0, workPanelW, workPanelH, {
      fill: VariableStarPhotometryColors.controlPanelFillProperty,
      stroke: VariableStarPhotometryColors.controlPanelStrokeProperty,
      lineWidth: 1,
    });
    const workTitle = new Text(strings.workAreaStringProperty, {
      font: HEADER_FONT,
      fill: VariableStarPhotometryColors.panelTextColorProperty,
      left: WORK_PANEL_MARGIN,
      centerY: WORK_PANEL_TITLE_HEIGHT / 2,
    });
    const grid = new FieldGridNode(FIELD_W, FIELD_H, model.showGridProperty);

    const fieldContainer = new Node({
      children: [workLayer, grid, workFrame, dragHitArea],
      left: WORK_PANEL_MARGIN,
      top: WORK_PANEL_TITLE_HEIGHT,
    });

    const workArea = new Node({
      children: [workPanelFrame, workTitle, fieldContainer],
      left: VariableStarPhotometryConstants.LAYOUT.SCREEN_MARGIN,
      top: this.layoutBounds.centerY - workPanelH / 2,
    });
    this.addChild(workArea);

    // -----------------------------------------------------------------------
    // Link work-area properties
    // -----------------------------------------------------------------------

    // Positions: each working frame is drawn at its pointing error plus the
    // student's offset, so it lines up with field 1 when offset = −error.
    model.xOffset2Property.link((dx) => {
      group2.x = REG_POINTING_ERRORS[2].x + dx;
    });
    model.yOffset2Property.link((dy) => {
      group2.y = REG_POINTING_ERRORS[2].y + dy;
    });
    model.xOffset3Property.link((dx) => {
      group3.x = REG_POINTING_ERRORS[3].x + dx;
    });
    model.yOffset3Property.link((dy) => {
      group3.y = REG_POINTING_ERRORS[3].y + dy;
    });

    // Visibility
    model.shown2Property.link((v) => {
      group2.visible = v;
    });
    model.shown3Property.link((v) => {
      group3.visible = v;
    });

    // "On top" → border colour + z-order
    model.onTopIndexProperty.link((idx) => {
      border2.stroke =
        idx === 2
          ? VariableStarPhotometryColors.fieldBorderHighlightColorProperty
          : VariableStarPhotometryColors.fieldBorderColorProperty;
      border2.lineWidth = idx === 2 ? 3 : 2;
      border3.stroke =
        idx === 3
          ? VariableStarPhotometryColors.fieldBorderHighlightColorProperty
          : VariableStarPhotometryColors.fieldBorderColorProperty;
      border3.lineWidth = idx === 3 ? 3 : 2;

      // Bring the on-top group to the front
      if (idx === 2) {
        workLayer.removeChild(group2);
        workLayer.addChild(group2);
      } else {
        workLayer.removeChild(group3);
        workLayer.addChild(group3);
      }
    });

    // Transparency
    Multilink.multilink([model.onTopIndexProperty, model.topFieldTransparentProperty], (idx, transparent) => {
      field2Node.opacity = idx === 2 && transparent ? 0.4 : 1;
      field3Node.opacity = idx === 3 && transparent ? 0.4 : 1;
    });

    // Inverted colours — re-render all three fields
    model.invertColorsProperty.link((invert) => {
      field1Node.setObservation(model.obsIndex1, invert);
      field2Node.setObservation(model.obsIndex2, invert);
      field3Node.setObservation(model.obsIndex3, invert);
    });

    // Dragging adjusts the same offsets as the number pickers and arrow keys.
    let draggedFieldIndex: 2 | 3 | null = null;
    let dragStartPointerX = 0;
    let dragStartPointerY = 0;
    let dragStartOffsetX = 0;
    let dragStartOffsetY = 0;

    const startDrag = (event: SceneryEvent) => {
      draggedFieldIndex = model.onTopIndexProperty.value === 2 ? 2 : 3;

      const pointerPoint = workLayer.globalToLocalPoint(event.pointer.point);
      dragStartPointerX = pointerPoint.x;
      dragStartPointerY = pointerPoint.y;

      if (draggedFieldIndex === 2) {
        dragStartOffsetX = model.xOffset2Property.value;
        dragStartOffsetY = model.yOffset2Property.value;
      } else {
        dragStartOffsetX = model.xOffset3Property.value;
        dragStartOffsetY = model.yOffset3Property.value;
      }
    };

    const dragField = (event: SceneryEvent) => {
      if (draggedFieldIndex === null) {
        return;
      }

      const pointerPoint = workLayer.globalToLocalPoint(event.pointer.point);
      model.setFieldOffset(
        draggedFieldIndex,
        dragStartOffsetX + pointerPoint.x - dragStartPointerX,
        dragStartOffsetY + pointerPoint.y - dragStartPointerY,
      );
    };

    dragHitArea.focusable = true;
    dragHitArea.tagName = "div";
    dragHitArea.accessibleName = a11yControls.workAreaStringProperty;
    dragHitArea.addInputListener(
      new RichDragListener({
        dragListenerOptions: {
          start: startDrag,
          drag: dragField,
          end: () => {
            draggedFieldIndex = null;
          },
        },
        keyboardDragListenerOptions: {
          dragDelta: NUDGE_STEP_PX,
          shiftDragDelta: NUDGE_FINE_STEP_PX,
          // Route through the model so which-field-is-on-top stays model logic.
          drag: (_event, listener) => {
            model.nudgeOnTopField(listener.modelDelta.x, listener.modelDelta.y);
          },
        },
      }),
    );

    // -----------------------------------------------------------------------
    // J switches the top field. The arrow-key nudge is scoped to the focused
    // work area above rather than bound globally, so arrows still reach the
    // sliders and other controls when they have focus.
    // -----------------------------------------------------------------------
    KeyboardListener.createGlobal(this, {
      keys: ["j"] as const,
      fire: () => {
        model.switchOnTopField();
      },
    });

    // -----------------------------------------------------------------------
    // Control Panel
    // -----------------------------------------------------------------------

    const makeColumnHeader = (label: TReadOnlyProperty<string>, centerX: number) =>
      new Text(label, {
        font: SMALL_FONT,
        fill: VariableStarPhotometryColors.mutedTextColorProperty,
        centerX,
        centerY: CONTROL_HEADER_H / 2,
      });

    const makePlaceholder = (label: TReadOnlyProperty<string>, centerX: number) =>
      new Text(label, {
        font: LABEL_FONT,
        fill: VariableStarPhotometryColors.mutedTextColorProperty,
        centerX,
        centerY: CONTROL_ROW_H / 2,
      });

    const makeTableControlNode = (node: Node, centerX: number): Node => {
      node.centerX = centerX;
      node.centerY = CONTROL_ROW_H / 2;
      return node;
    };

    const createDivider = (x: number) =>
      new Rectangle(x, 0, 1, CONTROL_HEADER_H + 3 * CONTROL_ROW_H, {
        fill: VariableStarPhotometryColors.dividerColorProperty,
      });

    const shownColumnX = 96;
    const onTopColumnX = 144;
    const xOffsetColumnX = 204;
    const yOffsetColumnX = 258;

    const tableHeader = new Node({
      children: [
        new Rectangle(0, 0, CONTROL_TABLE_W, CONTROL_HEADER_H, {
          fill: VariableStarPhotometryColors.tableHeaderFillProperty,
        }),
        makeColumnHeader(strings.shownStringProperty, shownColumnX),
        makeColumnHeader(strings.onTopStringProperty, onTopColumnX),
        makeColumnHeader(strings.xOffsetStringProperty, xOffsetColumnX),
        makeColumnHeader(strings.yOffsetStringProperty, yOffsetColumnX),
      ],
    });

    // Helper: one row of the starfield table. `number` feeds the accessible names
    // of the row's controls ("Show star field 2", …).
    function makeStarfieldRow(
      number: number,
      label: TReadOnlyProperty<string>,
      shownProp: BooleanProperty | null,
      onTopValue: number | null,
      xProp: NumberProperty | null,
      yProp: NumberProperty | null,
      fill: TColor,
    ): Node {
      const controlName = (pattern: TReadOnlyProperty<string>) => new PatternStringProperty(pattern, { number });
      const labelNode = new Text(label, {
        font: LABEL_FONT,
        fill: VariableStarPhotometryColors.panelTextColorProperty,
        maxWidth: 82,
        left: 6,
        centerY: CONTROL_ROW_H / 2,
      });

      const shownBox = shownProp
        ? makeTableControlNode(
            new Checkbox(shownProp, new Text("", { font: LABEL_FONT }), {
              boxWidth: 16,
              checkboxColor: VariableStarPhotometryColors.panelTextColorProperty,
              checkboxColorBackground: VariableStarPhotometryColors.controlSurfaceColorProperty,
              accessibleName: controlName(a11yControls.shownPatternStringProperty),
            }),
            shownColumnX,
          )
        : makePlaceholder(strings.fixedStringProperty, shownColumnX);

      const onTopButton =
        onTopValue !== null
          ? makeTableControlNode(
              new AquaRadioButton<number>(model.onTopIndexProperty, onTopValue, new Text("", { font: LABEL_FONT }), {
                radius: 7,
                accessibleName: controlName(a11yControls.onTopPatternStringProperty),
              }),
              onTopColumnX,
            )
          : makePlaceholder(strings.noneStringProperty, onTopColumnX);

      const xPicker =
        xProp !== null
          ? makeTableControlNode(
              new NumberPicker(xProp, xProp.rangeProperty, {
                font: LABEL_FONT,
                color: VariableStarPhotometryColors.panelTextColorProperty,
                incrementFunction: (v) => v + 1,
                decrementFunction: (v) => v - 1,
                accessibleName: controlName(a11yControls.xOffsetPatternStringProperty),
              }),
              xOffsetColumnX,
            )
          : makePlaceholder(strings.noneStringProperty, xOffsetColumnX);

      const yPicker =
        yProp !== null
          ? makeTableControlNode(
              new NumberPicker(yProp, yProp.rangeProperty, {
                font: LABEL_FONT,
                color: VariableStarPhotometryColors.panelTextColorProperty,
                incrementFunction: (v) => v + 1,
                decrementFunction: (v) => v - 1,
                accessibleName: controlName(a11yControls.yOffsetPatternStringProperty),
              }),
              yOffsetColumnX,
            )
          : makePlaceholder(strings.noneStringProperty, yOffsetColumnX);

      return new Node({
        children: [
          new Rectangle(0, 0, CONTROL_TABLE_W, CONTROL_ROW_H, { fill }),
          labelNode,
          shownBox,
          onTopButton,
          xPicker,
          yPicker,
        ],
      });
    }

    const starfieldLabel = (number: number) =>
      new PatternStringProperty(strings.starfieldNumberStringProperty, { number });

    const row1 = makeStarfieldRow(
      1,
      starfieldLabel(1),
      null,
      null,
      null,
      null,
      VariableStarPhotometryColors.tableRowFillProperty,
    );
    const row2 = makeStarfieldRow(
      2,
      starfieldLabel(2),
      model.shown2Property,
      2,
      model.xOffset2Property,
      model.yOffset2Property,
      VariableStarPhotometryColors.tableRowAltFillProperty,
    );
    const row3 = makeStarfieldRow(
      3,
      starfieldLabel(3),
      model.shown3Property,
      3,
      model.xOffset3Property,
      model.yOffset3Property,
      VariableStarPhotometryColors.tableRowFillProperty,
    );

    row1.top = CONTROL_HEADER_H;
    row2.top = row1.bottom;
    row3.top = row2.bottom;

    const tableFrame = new Rectangle(0, 0, CONTROL_TABLE_W, CONTROL_HEADER_H + 3 * CONTROL_ROW_H, {
      fill: null,
      stroke: VariableStarPhotometryColors.tableStrokeProperty,
      lineWidth: 1,
    });
    const starfieldTable = new Node({
      children: [
        tableHeader,
        row1,
        row2,
        row3,
        createDivider(82),
        createDivider(120),
        createDivider(170),
        createDivider(232),
        tableFrame,
      ],
    });

    const selectedFieldText = new Text(
      new PatternStringProperty(strings.moveHintStringProperty, { number: model.onTopIndexProperty }),
      {
        font: SMALL_FONT,
        fill: VariableStarPhotometryColors.mutedTextColorProperty,
        maxWidth: CONTROL_TABLE_W,
      },
    );

    const switchButton = new TextPushButton(strings.switchOnTopStringProperty, {
      font: LABEL_FONT,
      listener: () => model.switchOnTopField(),
      baseColor: VariableStarPhotometryColors.buttonColorProperty,
      minWidth: 170,
      accessibleName: strings.switchOnTopStringProperty,
      ...FLAT_RECTANGULAR_BUTTON_OPTIONS,
    });

    const starfieldControlsContent = new VBox({
      spacing: 9,
      align: "center",
      children: [
        new Text(strings.starfieldControlsStringProperty, {
          font: HEADER_FONT,
          fill: VariableStarPhotometryColors.panelTextColorProperty,
        }),
        starfieldTable,
        selectedFieldText,
        switchButton,
      ],
    });

    const starfieldControlsPanel = new Panel(starfieldControlsContent, {
      fill: VariableStarPhotometryColors.controlPanelFillProperty,
      stroke: VariableStarPhotometryColors.controlPanelStrokeProperty,
      cornerRadius: 0,
      xMargin: 10,
      yMargin: 10,
    });

    // Appearance Options
    const transparentCheckbox = new Checkbox(
      model.topFieldTransparentProperty,
      new Text(strings.makeTopTransparentStringProperty, {
        font: LABEL_FONT,
        fill: VariableStarPhotometryColors.panelTextColorProperty,
      }),
      {
        boxWidth: 16,
        accessibleName: strings.makeTopTransparentStringProperty,
        checkboxColor: VariableStarPhotometryColors.panelTextColorProperty,
        checkboxColorBackground: VariableStarPhotometryColors.controlSurfaceColorProperty,
      },
    );

    const invertCheckbox = new Checkbox(
      model.invertColorsProperty,
      new Text(strings.invertColorsStringProperty, {
        font: LABEL_FONT,
        fill: VariableStarPhotometryColors.panelTextColorProperty,
      }),
      {
        boxWidth: 16,
        accessibleName: strings.invertColorsStringProperty,
        checkboxColor: VariableStarPhotometryColors.panelTextColorProperty,
        checkboxColorBackground: VariableStarPhotometryColors.controlSurfaceColorProperty,
      },
    );

    // Hint text
    // Wrapped, not maxWidth-scaled: the one-line sentence shrank to ~5 px text.
    const hintText = new RichText(strings.tipStringProperty, {
      font: SMALL_FONT,
      fill: VariableStarPhotometryColors.mutedTextColorProperty,
      lineWrap: CONTROL_TABLE_W,
    });

    const appearanceContent = new VBox({
      spacing: 9,
      align: "left",
      children: [
        new Text(strings.appearanceOptionsStringProperty, {
          font: HEADER_FONT,
          fill: VariableStarPhotometryColors.panelTextColorProperty,
        }),
        transparentCheckbox,
        invertCheckbox,
        hintText,
      ],
    });

    const appearancePanel = new Panel(appearanceContent, {
      fill: VariableStarPhotometryColors.controlPanelFillProperty,
      stroke: VariableStarPhotometryColors.controlPanelStrokeProperty,
      cornerRadius: 0,
      xMargin: 10,
      yMargin: 10,
    });

    const controlColumn = new VBox({
      spacing: 8,
      align: "left",
      children: [starfieldControlsPanel, appearancePanel],
    });

    controlColumn.left = workArea.right + 12;
    controlColumn.top = workArea.top;
    this.addChild(controlColumn);

    // -----------------------------------------------------------------------
    // Reset All button
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
    // nodes — table controls first, then the appearance options, Reset All last.
    // -----------------------------------------------------------------------
    this.addChild(
      new Node({
        pdomOrder: [starfieldTable, switchButton, transparentCheckbox, invertCheckbox, resetAllButton],
      }),
    );
  }
}
