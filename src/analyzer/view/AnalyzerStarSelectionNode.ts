/**
 * AnalyzerStarSelectionNode.ts
 *
 * CCD field, star-selection markers, pointer crosshair, and selection controls.
 */
import { BooleanProperty } from "scenerystack/axon";
import { Bounds2, Vector2 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { ModelViewTransform2 } from "scenerystack/phetcommon";
import { Circle, HBox, Line, Node, Rectangle, RichText, type SceneryEvent, Text, VBox } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { Checkbox, TextPushButton } from "scenerystack/sun";
import { FLAT_RECTANGULAR_BUTTON_OPTIONS } from "../../common/VariableStarPhotometryButtonOptions.js";
import { FieldGridNode } from "../../common/view/FieldGridNode.js";
import { StarFieldNode } from "../../common/view/StarFieldNode.js";
import { StringManager } from "../../i18n/StringManager.js";
import type { VariableStarPhotometryPreferencesModel } from "../../preferences/VariableStarPhotometryPreferencesModel.js";
import VariableStarPhotometryColors from "../../VariableStarPhotometryColors.js";
import VariableStarPhotometryConstants from "../../VariableStarPhotometryConstants.js";
import type { AnalyzerModel } from "../model/AnalyzerModel.js";
import { SMALL_FONT } from "./analyzerViewOptions.js";

const FIELD_W = VariableStarPhotometryConstants.FIELD.WIDTH;
const FIELD_H = VariableStarPhotometryConstants.FIELD.HEIGHT;

export class AnalyzerStarSelectionNode extends VBox {
  /** View-owned crosshair visibility, independent of the scientific model. */
  private readonly showCrosshairProperty: BooleanProperty;

  public constructor(model: AnalyzerModel, preferences: VariableStarPhotometryPreferencesModel) {
    // These components share the non-disposable ScreenView lifetime.
    super({ isDisposable: false });
    const strings = StringManager.getInstance().getAnalyzerViewStrings();
    const showCrosshairProperty = new BooleanProperty(true);
    // Transform from model (CCD pixel) space to field-container view space.
    // The field is rendered at 1:1 scale so the transform is identity.
    // Used to convert pointer clicks from view coordinates back to model
    // coordinates when the student selects variable/comparison stars.
    const fieldMVT = ModelViewTransform2.createIdentity();

    const starField = new StarFieldNode(0, preferences.invertImagesProperty.value);
    preferences.invertImagesProperty.link((invert) => starField.setObservation(0, invert));
    const fieldClip = new Node({
      clipArea: Shape.rectangle(0, 0, FIELD_W, FIELD_H),
      children: [starField],
    });
    const grid = new FieldGridNode(FIELD_W, FIELD_H, preferences.showGridProperty);
    const frame = new Rectangle(0, 0, FIELD_W, FIELD_H, {
      stroke: VariableStarPhotometryColors.controlPanelStrokeProperty,
      lineWidth: 1,
    });

    // Selection markers.
    const variableMarker = new Circle(8, {
      stroke: VariableStarPhotometryColors.variableStarColorProperty,
      lineWidth: 2,
      visible: false,
    });
    const comparisonMarker = new Rectangle(-7, -7, 14, 14, {
      stroke: VariableStarPhotometryColors.comparisonStarColorProperty,
      lineWidth: 2,
      visible: false,
    });
    model.variableStarPositionProperty.link((p) => {
      variableMarker.visible = p !== null;
      if (p) {
        variableMarker.translation = fieldMVT.modelToViewPosition(p);
      }
    });
    model.comparisonStarPositionProperty.link((p) => {
      comparisonMarker.visible = p !== null;
      if (p) {
        comparisonMarker.translation = fieldMVT.modelToViewPosition(p);
      }
    });

    // Crosshair following the pointer.
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

    const hitArea = new Rectangle(0, 0, FIELD_W, FIELD_H, { fill: "transparent", cursor: "crosshair" });
    let pointerInside = false;
    const updateCrosshairVisible = () => {
      const visible = showCrosshairProperty.value && pointerInside;
      crosshair.visible = visible;
      crosshairCoords.visible = visible;
    };
    showCrosshairProperty.link(updateCrosshairVisible);
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
        const viewPoint = hitArea.globalToLocalPoint(event.pointer.point);
        crosshairH.y = viewPoint.y;
        crosshairV.x = viewPoint.x;

        // Update coordinate readout (clamped to field bounds like Flash).
        const px = Math.max(0, Math.min(FIELD_W - 1, Math.round(viewPoint.x)));
        const py = Math.max(0, Math.min(FIELD_H - 1, Math.round(viewPoint.y)));
        crosshairCoordText.string = `${px}, ${py}`;
        crosshairCoordBg.setRect(0, 0, crosshairCoordText.width + 6, crosshairCoordText.height + 4);
        crosshairCoordText.x = 3;
        crosshairCoordText.y = 2;
        // Position to the right of the cursor, or left if too close to the edge.
        if (viewPoint.x + 15 + crosshairCoordBg.width < FIELD_W) {
          crosshairCoords.x = viewPoint.x + 15;
        } else {
          crosshairCoords.x = viewPoint.x - 15 - crosshairCoordBg.width;
        }
        crosshairCoords.y = Math.max(
          0,
          Math.min(FIELD_H - crosshairCoordBg.height, viewPoint.y - crosshairCoordBg.height / 2),
        );
      },
      down: (event: SceneryEvent) => {
        // Convert the pointer position from field-container view space to model
        // (CCD pixel) space before passing to the model.
        const viewPoint = hitArea.globalToLocalPoint(event.pointer.point);
        const modelPoint = fieldMVT.viewToModelPosition(viewPoint);
        model.selectStarAt(new Vector2(Math.round(modelPoint.x), Math.round(modelPoint.y)));
      },
    });

    // Markers and the crosshair must not resize the fixed CCD field during selection.
    const fieldContainer = new Node({
      localBounds: new Bounds2(0, 0, FIELD_W, FIELD_H),
      children: [fieldClip, grid, frame, variableMarker, comparisonMarker, crosshair, crosshairCoords, hitArea],
    });

    // Legend + controls beneath the field.
    const legend = new HBox({
      spacing: 16,
      children: [
        new HBox({
          spacing: 5,
          children: [
            new Circle(6, { stroke: VariableStarPhotometryColors.variableStarColorProperty, lineWidth: 2 }),
            new Text(strings.variableStringProperty, {
              font: SMALL_FONT,
              fill: VariableStarPhotometryColors.textColorProperty,
            }),
          ],
        }),
        new HBox({
          spacing: 5,
          children: [
            new Rectangle(-5, -5, 10, 10, {
              stroke: VariableStarPhotometryColors.comparisonStarColorProperty,
              lineWidth: 2,
            }),
            new Text(strings.comparisonStringProperty, {
              font: SMALL_FONT,
              fill: VariableStarPhotometryColors.textColorProperty,
            }),
          ],
        }),
      ],
    });

    // NOTE: this Text sits directly on the dark screen background (this section is
    // not wrapped in a panel), so it uses textColorProperty (light-on-dark) rather
    // than mutedTextColorProperty (which is designed for light panel surfaces).
    const instructions = new RichText(strings.selectHintStringProperty, {
      lineWrap: FIELD_W,
      font: SMALL_FONT,
      fill: VariableStarPhotometryColors.textColorProperty,
    });
    const clearButton = new TextPushButton(strings.clearSelectionStringProperty, {
      font: SMALL_FONT,
      baseColor: VariableStarPhotometryColors.buttonColorProperty,
      listener: () => model.clearSelections(),
      accessibleName: strings.clearSelectionStringProperty,
      ...FLAT_RECTANGULAR_BUTTON_OPTIONS,
    });
    const crosshairCheckbox = new Checkbox(
      showCrosshairProperty,
      new Text(strings.showCrosshairsStringProperty, {
        font: SMALL_FONT,
        fill: VariableStarPhotometryColors.textColorProperty,
      }),
      {
        boxWidth: 14,
        accessibleName: strings.showCrosshairsStringProperty,
        checkboxColor: VariableStarPhotometryColors.textColorProperty,
        checkboxColorBackground: VariableStarPhotometryColors.backgroundColorProperty,
      },
    );

    this.mutate({
      spacing: 8,
      align: "left",
      children: [
        fieldContainer,
        legend,
        instructions,
        new HBox({ spacing: 12, children: [clearButton, crosshairCheckbox] }),
      ],
    });
    this.pdomOrder = [clearButton, crosshairCheckbox];
    this.showCrosshairProperty = showCrosshairProperty;
  }

  /** Restore the field display toggle when Reset All is pressed. */
  public reset(): void {
    this.showCrosshairProperty.reset();
  }
}
