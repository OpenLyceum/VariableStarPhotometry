/**
 * PhotometryScreenView.ts
 *
 * View for the Photometry screen.
 *
 * Layout
 * ┌────────────────────────────────┬──────────────────────────────┐
 * │  Star field (380 × 290)        │  Aperture 1 Info             │
 * │  [aperture 1 + 2 overlays]     │  Aperture 2 Info             │
 * │  observation: [picker] epoch   │  ──────────────────────────  │
 * │  aperture / annulus sliders    │  Magnitude Difference        │
 * │  [x] label the apertures       │  m₁ − m₂ = −2.5 log₁₀(f₁/f₂) │
 * └────────────────────────────────┴──────────────────────────────┘
 *                                                       [Reset All]
 */
import { DerivedProperty, Multilink, PatternStringProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { Bounds2, Dimension2, toFixed, type Vector2 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import { ModelViewTransform2 } from "scenerystack/phetcommon";
import type { SceneryEvent } from "scenerystack/scenery";
import { CanvasNode, Circle, HBox, Node, Rectangle, RichText, type TColor, Text, VBox } from "scenerystack/scenery";
import { NumberControl, PhetFont, ResetAllButton } from "scenerystack/scenery-phet";
import { ScreenView, type ScreenViewOptions } from "scenerystack/sim";
import { Checkbox, NumberPicker, Panel } from "scenerystack/sun";
import { Tandem } from "scenerystack/tandem";
import { CCDField } from "../../common/model/CCDField.js";
import { OBSERVATIONS } from "../../common/model/StarFieldData.js";
import { FLAT_RESET_ALL_BUTTON_OPTIONS } from "../../common/VariableStarPhotometryButtonOptions.js";
import { ApertureNode } from "../../common/view/ApertureNode.js";
import { FieldGridNode } from "../../common/view/FieldGridNode.js";
import { StarFieldNode } from "../../common/view/StarFieldNode.js";
import { StringManager } from "../../i18n/StringManager.js";
import type { VariableStarPhotometryPreferencesModel } from "../../preferences/VariableStarPhotometryPreferencesModel.js";
import VariableStarPhotometryColors from "../../VariableStarPhotometryColors.js";
import VariableStarPhotometryConstants from "../../VariableStarPhotometryConstants.js";
import {
  ANNULUS_INNER_RANGE,
  ANNULUS_OUTER_RANGE,
  APERTURE_DIAMETER_RANGE,
  type PhotometryModel,
} from "../model/PhotometryModel.js";

const FIELD_W = VariableStarPhotometryConstants.FIELD.WIDTH;
const FIELD_H = VariableStarPhotometryConstants.FIELD.HEIGHT;
const APERTURE_PREVIEW_SIZE = 170;
const APERTURE_PREVIEW_FIELD_SIZE = 90;
const APERTURE_PREVIEW_SCALE = APERTURE_PREVIEW_SIZE / APERTURE_PREVIEW_FIELD_SIZE;

const LABEL_FONT = new PhetFont(VariableStarPhotometryConstants.FONT_SIZE.LABEL);
const HEADER_FONT = new PhetFont({ size: VariableStarPhotometryConstants.FONT_SIZE.HEADER, weight: "bold" });
const MONO_FONT = new PhetFont(VariableStarPhotometryConstants.FONT_SIZE.LABEL);

const FIELD = CCDField.getInstance();

/**
 * Zoomed view around an aperture centre. The image comes from the display render,
 * while the numbers continue to use raw CCD counts from the model.
 */
class AperturePreviewNode extends CanvasNode {
  private readonly buffer: HTMLCanvasElement;
  private readonly bufferContext: CanvasRenderingContext2D;

  private obsIndex: number;
  private invert: boolean;
  private apertureCenter: Vector2;

  public constructor(
    epochIndexProperty: TReadOnlyProperty<number>,
    centerProperty: TReadOnlyProperty<Vector2>,
    invertProperty: TReadOnlyProperty<boolean>,
  ) {
    super({
      canvasBounds: new Bounds2(0, 0, APERTURE_PREVIEW_SIZE, APERTURE_PREVIEW_SIZE),
    });

    this.obsIndex = epochIndexProperty.value;
    this.invert = invertProperty.value;
    this.apertureCenter = centerProperty.value;

    this.buffer = document.createElement("canvas");
    this.buffer.width = FIELD_W;
    this.buffer.height = FIELD_H;
    const context = this.buffer.getContext("2d");
    if (!context) {
      throw new Error("AperturePreviewNode: unable to obtain a 2D canvas context");
    }
    this.bufferContext = context;
    this.updateBuffer();

    epochIndexProperty.link((index) => {
      this.obsIndex = index;
      this.updateBuffer();
      this.invalidatePaint();
    });
    invertProperty.link((invert) => {
      this.invert = invert;
      this.updateBuffer();
      this.invalidatePaint();
    });
    centerProperty.link((center) => {
      this.apertureCenter = center;
      this.invalidatePaint();
    });

    // Repaint when the projector/default profile changes the preview background.
    VariableStarPhotometryColors.aperturePreviewBackgroundColorProperty.lazyLink(() => this.invalidatePaint());
  }

  private updateBuffer(): void {
    this.bufferContext.putImageData(FIELD.render(this.obsIndex, this.invert), 0, 0);
  }

  public override paintCanvas(context: CanvasRenderingContext2D): void {
    context.fillStyle = VariableStarPhotometryColors.aperturePreviewBackgroundColorProperty.value.toCSS();
    context.fillRect(0, 0, APERTURE_PREVIEW_SIZE, APERTURE_PREVIEW_SIZE);

    const half = APERTURE_PREVIEW_FIELD_SIZE / 2;
    const cropLeft = Math.round(this.apertureCenter.x - half);
    const cropTop = Math.round(this.apertureCenter.y - half);
    const sx = Math.max(0, cropLeft);
    const sy = Math.max(0, cropTop);
    const sx2 = Math.min(FIELD_W, cropLeft + APERTURE_PREVIEW_FIELD_SIZE);
    const sy2 = Math.min(FIELD_H, cropTop + APERTURE_PREVIEW_FIELD_SIZE);
    const sourceWidth = sx2 - sx;
    const sourceHeight = sy2 - sy;

    if (sourceWidth <= 0 || sourceHeight <= 0) {
      return;
    }

    context.imageSmoothingEnabled = false;
    context.drawImage(
      this.buffer,
      sx,
      sy,
      sourceWidth,
      sourceHeight,
      (sx - cropLeft) * APERTURE_PREVIEW_SCALE,
      (sy - cropTop) * APERTURE_PREVIEW_SCALE,
      sourceWidth * APERTURE_PREVIEW_SCALE,
      sourceHeight * APERTURE_PREVIEW_SCALE,
    );
  }
}

export type PhotometryScreenViewOptions = ScreenViewOptions;

export class PhotometryScreenView extends ScreenView {
  public constructor(
    model: PhotometryModel,
    preferences: VariableStarPhotometryPreferencesModel,
    providedOptions?: PhotometryScreenViewOptions,
  ) {
    const options = optionize<PhotometryScreenViewOptions, EmptySelfOptions, ScreenViewOptions>()({}, providedOptions);
    super(options);

    const tandem = options.tandem instanceof Tandem ? options.tandem : Tandem.OPT_OUT;
    const strings = StringManager.getInstance().getPhotometryViewStrings();
    const unitStrings = StringManager.getInstance().getUnitStrings();
    const a11yControls = StringManager.getInstance().getPhotometryA11yStrings().controls;

    // -----------------------------------------------------------------------
    // Star field + aperture overlays
    // -----------------------------------------------------------------------
    const starField = new StarFieldNode(model.epochIndexProperty.value, preferences.invertImagesProperty.value);
    Multilink.multilink([model.epochIndexProperty, preferences.invertImagesProperty], (index, invert) =>
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

    // Transform from model (CCD pixel) space to field-container view space.
    // VSP renders the star field at 1:1 pixel scale, so this is an identity
    // transform. It makes the model–view coordinate relationship explicit and
    // allows future scale changes without hunting through event handlers.
    const fieldMVT = ModelViewTransform2.createIdentity();

    // Aperture radius = half the diameter; annulus properties are already radii.
    const apertureRadiusProperty = new DerivedProperty([model.apertureDiameterProperty], (d) => d / 2);
    const dragBounds = new Bounds2(0, 0, FIELD_W, FIELD_H);

    const aperture1 = new ApertureNode(
      model.aperture1CenterProperty,
      apertureRadiusProperty,
      model.annulusInnerRadiusProperty,
      model.annulusOuterRadiusProperty,
      {
        dragBounds,
        color: VariableStarPhotometryColors.aperturePrimaryColorProperty,
        label: "1",
        labelVisibleProperty: model.labelAperturesProperty,
        modelViewTransform: fieldMVT,
        accessibleName: a11yControls.aperture1StringProperty,
      },
    );
    const aperture2 = new ApertureNode(
      model.aperture2CenterProperty,
      apertureRadiusProperty,
      model.annulusInnerRadiusProperty,
      model.annulusOuterRadiusProperty,
      {
        dragBounds,
        color: VariableStarPhotometryColors.apertureSecondaryColorProperty,
        label: "2",
        labelVisibleProperty: model.labelAperturesProperty,
        modelViewTransform: fieldMVT,
        accessibleName: a11yControls.aperture2StringProperty,
      },
    );

    const fieldContainer = new Node({ children: [fieldClip, grid, frame, aperture1, aperture2] });

    // -----------------------------------------------------------------------
    // Field controls: epoch picker, aperture/annulus sizes, label toggle
    // -----------------------------------------------------------------------
    const epochPicker = new NumberPicker(model.epochIndexProperty, model.epochIndexProperty.rangeProperty, {
      font: LABEL_FONT,
      color: VariableStarPhotometryColors.panelTextColorProperty,
      incrementFunction: (v) => v + 1,
      decrementFunction: (v) => v - 1,
      accessibleName: a11yControls.epochPickerStringProperty,
    });

    const epochDaysProperty = new PatternStringProperty(unitStrings.daysPatternStringProperty, {
      value: new DerivedProperty([model.epochIndexProperty], (index) => {
        const obs = OBSERVATIONS[index];
        return obs ? toFixed(obs.epoch, 4) : "";
      }),
    });
    // This readout, and the other plain Text/NumberControl-title nodes in this
    // leftColumn, sit directly on the dark screen background (leftColumn is not
    // wrapped in a panel), so they use textColorProperty (light-on-dark) rather
    // than the default black or panelTextColorProperty (designed for light panels).
    const epochReadout = new Text(
      new PatternStringProperty(strings.epochValueStringProperty, { value: epochDaysProperty }),
      { font: LABEL_FONT, fill: VariableStarPhotometryColors.textColorProperty },
    );

    const epochRow = new HBox({
      spacing: 8,
      align: "center",
      children: [
        new Text(strings.observationStringProperty, {
          font: LABEL_FONT,
          fill: VariableStarPhotometryColors.textColorProperty,
        }),
        epochPicker,
        epochReadout,
      ],
    });

    const numberControlOptions = {
      titleNodeOptions: { font: LABEL_FONT, fill: VariableStarPhotometryColors.textColorProperty },
      numberDisplayOptions: { textOptions: { font: LABEL_FONT } },
      sliderOptions: { trackSize: new Dimension2(120, 3) },
      layoutFunction: NumberControl.createLayoutFunction1(),
    };

    const apertureControl = new NumberControl(
      strings.apertureDiameterStringProperty,
      model.apertureDiameterProperty,
      APERTURE_DIAMETER_RANGE,
      { ...numberControlOptions, accessibleName: strings.apertureDiameterStringProperty },
    );
    const skyInnerControl = new NumberControl(
      strings.skyInnerRadiusStringProperty,
      model.annulusInnerRadiusProperty,
      ANNULUS_INNER_RANGE,
      { ...numberControlOptions, accessibleName: strings.skyInnerRadiusStringProperty },
    );
    const skyOuterControl = new NumberControl(
      strings.skyOuterRadiusStringProperty,
      model.annulusOuterRadiusProperty,
      ANNULUS_OUTER_RANGE,
      { ...numberControlOptions, accessibleName: strings.skyOuterRadiusStringProperty },
    );

    const labelCheckbox = new Checkbox(
      model.labelAperturesProperty,
      new Text(strings.labelAperturesStringProperty, {
        font: LABEL_FONT,
        fill: VariableStarPhotometryColors.textColorProperty,
      }),
      {
        boxWidth: 16,
        accessibleName: strings.labelAperturesStringProperty,
        checkboxColor: VariableStarPhotometryColors.textColorProperty,
        checkboxColorBackground: VariableStarPhotometryColors.backgroundColorProperty,
      },
    );

    const fieldControls = new VBox({
      spacing: 8,
      align: "left",
      children: [epochRow, apertureControl, skyInnerControl, skyOuterControl, labelCheckbox],
    });

    const leftColumn = new VBox({
      spacing: 12,
      align: "left",
      children: [fieldContainer, fieldControls],
    });
    leftColumn.left = VariableStarPhotometryConstants.LAYOUT.SCREEN_MARGIN;
    leftColumn.top = VariableStarPhotometryConstants.LAYOUT.SCREEN_MARGIN;
    this.addChild(leftColumn);

    // -----------------------------------------------------------------------
    // Right column: per-aperture info + magnitude-difference formula
    // -----------------------------------------------------------------------
    const makeApertureInfoPanel = (
      title: TReadOnlyProperty<string>,
      color: TColor,
      centerProperty: typeof model.aperture1CenterProperty,
      photometryProperty: typeof model.aperture1PhotometryProperty,
    ): Node => {
      const previewImage = new AperturePreviewNode(
        model.epochIndexProperty,
        centerProperty,
        preferences.invertImagesProperty,
      );
      const previewFrame = new Rectangle(0, 0, APERTURE_PREVIEW_SIZE, APERTURE_PREVIEW_SIZE, {
        stroke: VariableStarPhotometryColors.controlPanelStrokeProperty,
        lineWidth: 1,
      });
      const previewClip = new Node({
        clipArea: Shape.rectangle(0, 0, APERTURE_PREVIEW_SIZE, APERTURE_PREVIEW_SIZE),
        children: [previewImage],
      });

      const previewApertureRadiusProperty = new DerivedProperty(
        [apertureRadiusProperty],
        (radius) => radius * APERTURE_PREVIEW_SCALE,
      );
      const previewAnnulusInnerRadiusProperty = new DerivedProperty(
        [model.annulusInnerRadiusProperty],
        (radius) => radius * APERTURE_PREVIEW_SCALE,
      );
      const previewAnnulusOuterRadiusProperty = new DerivedProperty(
        [model.annulusOuterRadiusProperty],
        (radius) => radius * APERTURE_PREVIEW_SCALE,
      );

      const apertureRing = new Circle(previewApertureRadiusProperty.value, {
        centerX: APERTURE_PREVIEW_SIZE / 2,
        centerY: APERTURE_PREVIEW_SIZE / 2,
        stroke: color,
        lineWidth: 1.5,
        fill: null,
      });
      const annulusInnerRing = new Circle(previewAnnulusInnerRadiusProperty.value, {
        centerX: APERTURE_PREVIEW_SIZE / 2,
        centerY: APERTURE_PREVIEW_SIZE / 2,
        stroke: color,
        lineWidth: 1,
        fill: null,
      });
      const annulusOuterRing = new Circle(previewAnnulusOuterRadiusProperty.value, {
        centerX: APERTURE_PREVIEW_SIZE / 2,
        centerY: APERTURE_PREVIEW_SIZE / 2,
        stroke: color,
        lineWidth: 1,
        fill: null,
      });
      previewApertureRadiusProperty.link((radius) => {
        apertureRing.radius = radius;
      });
      previewAnnulusInnerRadiusProperty.link((radius) => {
        annulusInnerRing.radius = radius;
      });
      previewAnnulusOuterRadiusProperty.link((radius) => {
        annulusOuterRing.radius = radius;
      });

      const preview = new Node({
        children: [previewClip, previewFrame, annulusOuterRing, annulusInnerRing, apertureRing],
      });

      // Pixel hover tooltip (matching Flash's PixelInfo overlay).
      const hoverTooltipText = new Text("", {
        font: new PhetFont({ size: 10, family: "monospace" }),
        fill: VariableStarPhotometryColors.panelTextColorProperty,
        pickable: false,
      });
      const hoverTooltipBg = new Rectangle(0, 0, 1, 1, {
        fill: VariableStarPhotometryColors.controlPanelFillProperty,
        stroke: VariableStarPhotometryColors.controlPanelStrokeProperty,
        lineWidth: 0.5,
        cornerRadius: 2,
        pickable: false,
      });
      const hoverTooltip = new Node({
        children: [hoverTooltipBg, hoverTooltipText],
        pickable: false,
        visible: false,
      });

      // Transparent hit area for hover detection.
      const previewHitArea = new Rectangle(0, 0, APERTURE_PREVIEW_SIZE, APERTURE_PREVIEW_SIZE, {
        fill: "transparent",
        cursor: "default",
      });

      previewHitArea.addInputListener({
        enter: () => {
          hoverTooltip.visible = true;
        },
        exit: () => {
          hoverTooltip.visible = false;
        },
        move: (event: SceneryEvent) => {
          const local = previewHitArea.globalToLocalPoint(event.pointer.point);
          // Convert preview coordinates back to field coordinates.
          const fieldX = Math.round(
            local.x / APERTURE_PREVIEW_SCALE + centerProperty.value.x - APERTURE_PREVIEW_FIELD_SIZE / 2,
          );
          const fieldY = Math.round(
            local.y / APERTURE_PREVIEW_SCALE + centerProperty.value.y - APERTURE_PREVIEW_FIELD_SIZE / 2,
          );

          if (fieldX >= 0 && fieldX < FIELD_W && fieldY >= 0 && fieldY < FIELD_H) {
            const counts = FIELD.getPixelValue(model.epochIndexProperty.value, fieldX, fieldY);
            hoverTooltipText.string = `(${fieldX}, ${fieldY})  ${toFixed(counts, 0)}`;
            hoverTooltipBg.setRect(0, 0, hoverTooltipText.width + 6, hoverTooltipText.height + 4);
            hoverTooltipText.x = 3;
            hoverTooltipText.y = 2;
            // Position above the cursor, or below if too close to the top.
            const tooltipY =
              local.y - hoverTooltipBg.height - 4 >= 0 ? local.y - hoverTooltipBg.height - 4 : local.y + 4;
            hoverTooltip.x = Math.min(APERTURE_PREVIEW_SIZE - hoverTooltipBg.width, local.x + 8);
            hoverTooltip.y = tooltipY;
          }
        },
      });

      const previewWithHover = new Node({
        children: [preview, previewHitArea, hoverTooltip],
      });

      const pattern = (
        patternProperty: TReadOnlyProperty<string>,
        valueProperty: TReadOnlyProperty<string>,
      ): TReadOnlyProperty<string> => new PatternStringProperty(patternProperty, { value: valueProperty });

      const centerXText = new Text(
        pattern(
          strings.centerXStringProperty,
          new DerivedProperty([centerProperty], (center) => String(Math.round(center.x))),
        ),
        { font: LABEL_FONT },
      );
      const centerYText = new Text(
        pattern(
          strings.centerYStringProperty,
          new DerivedProperty([centerProperty], (center) => String(Math.round(center.y))),
        ),
        { font: LABEL_FONT },
      );

      const previewColumn = new VBox({
        spacing: 4,
        align: "center",
        children: [previewWithHover, centerXText, centerYText],
      });

      const discPixels = new Text(
        pattern(
          strings.numPixelsStringProperty,
          new DerivedProperty([photometryProperty], (r) => String(r.disc.totalPixels)),
        ),
        { font: LABEL_FONT },
      );
      const discCounts = new Text(
        pattern(
          strings.countsValueStringProperty,
          new DerivedProperty([photometryProperty], (r) => toFixed(r.disc.totalCounts, 0)),
        ),
        { font: LABEL_FONT },
      );
      const discAverage = new Text(
        pattern(
          strings.averageValueStringProperty,
          new DerivedProperty([photometryProperty], (r) => toFixed(r.disc.average, 2)),
        ),
        { font: LABEL_FONT },
      );
      const skyPixels = new Text(
        pattern(
          strings.numPixelsStringProperty,
          new DerivedProperty([photometryProperty], (r) => String(r.sky.totalPixels)),
        ),
        { font: LABEL_FONT },
      );
      const skyCounts = new Text(
        pattern(
          strings.countsValueStringProperty,
          new DerivedProperty([photometryProperty], (r) => toFixed(r.sky.totalCounts, 0)),
        ),
        { font: LABEL_FONT },
      );
      const skyAverage = new Text(
        pattern(
          strings.averageValueStringProperty,
          new DerivedProperty([photometryProperty], (r) => toFixed(r.sky.average, 2)),
        ),
        { font: LABEL_FONT },
      );

      const statsColumn = new VBox({
        spacing: 8,
        align: "left",
        children: [
          new Text(strings.innerDiscStringProperty, { font: HEADER_FONT }),
          new VBox({ spacing: 3, align: "right", children: [discPixels, discCounts, discAverage] }),
          new Rectangle(0, 0, 1, 16),
          new Text(strings.outerRingStringProperty, { font: HEADER_FONT }),
          new VBox({ spacing: 3, align: "right", children: [skyPixels, skyCounts, skyAverage] }),
        ],
      });

      const panelContent = new VBox({
        spacing: 8,
        align: "left",
        children: [
          new Text(title, { font: HEADER_FONT }),
          new HBox({ spacing: 24, align: "top", children: [previewColumn, statsColumn] }),
        ],
      });

      return new Panel(panelContent, {
        fill: VariableStarPhotometryColors.controlPanelFillProperty,
        stroke: VariableStarPhotometryColors.controlPanelStrokeProperty,
        cornerRadius: VariableStarPhotometryConstants.LAYOUT.PANEL_CORNER_RADIUS,
        xMargin: VariableStarPhotometryConstants.LAYOUT.PANEL_X_MARGIN,
        yMargin: VariableStarPhotometryConstants.LAYOUT.PANEL_Y_MARGIN,
      });
    };

    const aperture1Info = makeApertureInfoPanel(
      new PatternStringProperty(strings.apertureInfoStringProperty, { number: 1 }),
      VariableStarPhotometryColors.aperturePrimaryColorProperty,
      model.aperture1CenterProperty,
      model.aperture1PhotometryProperty,
    );
    const aperture2Info = makeApertureInfoPanel(
      new PatternStringProperty(strings.apertureInfoStringProperty, { number: 2 }),
      VariableStarPhotometryColors.apertureSecondaryColorProperty,
      model.aperture2CenterProperty,
      model.aperture2PhotometryProperty,
    );

    const magnitudeText = new RichText("", { font: MONO_FONT, lineWrap: 240 });
    Multilink.multilink(
      [
        model.aperture1PhotometryProperty,
        model.aperture2PhotometryProperty,
        model.magnitudeDifferenceProperty,
        unitStrings.countsStringProperty,
        unitStrings.magnitudesStringProperty,
        strings.netFluxNonPositiveStringProperty,
      ],
      (p1, p2, deltaMag, countsWord, magWord, netFluxNonPositive) => {
        const lines = [
          `f<sub>1</sub> = ${toFixed(p1.netFlux, 0)} ${countsWord}`,
          `f<sub>2</sub> = ${toFixed(p2.netFlux, 0)} ${countsWord}`,
          `m<sub>1</sub> − m<sub>2</sub> = −2.5 log<sub>10</sub>(f<sub>1</sub>/f<sub>2</sub>)`,
          deltaMag === null
            ? `         = — (${netFluxNonPositive})`
            : `         = ${deltaMag >= 0 ? "+" : ""}${toFixed(deltaMag, 3)} ${magWord}`,
        ];
        magnitudeText.string = lines.join("<br>");
      },
    );

    const magnitudeSection = new VBox({
      spacing: 6,
      align: "left",
      children: [new Text(strings.magnitudeDifferenceStringProperty, { font: HEADER_FONT }), magnitudeText],
    });

    const magnitudePanel = new Panel(magnitudeSection, {
      fill: VariableStarPhotometryColors.controlPanelFillProperty,
      stroke: VariableStarPhotometryColors.controlPanelStrokeProperty,
      cornerRadius: VariableStarPhotometryConstants.LAYOUT.PANEL_CORNER_RADIUS,
      xMargin: VariableStarPhotometryConstants.LAYOUT.PANEL_X_MARGIN,
      yMargin: VariableStarPhotometryConstants.LAYOUT.PANEL_Y_MARGIN,
    });

    const rightColumn = new VBox({
      spacing: 8,
      align: "left",
      children: [aperture1Info, aperture2Info],
    });
    rightColumn.left = leftColumn.right + 12;
    rightColumn.top = leftColumn.top;
    this.addChild(rightColumn);

    // Δm gets its own column: stacked under the aperture panels it ran ~40 px
    // past the bottom of the layout, hiding the result the lab asks for.
    magnitudePanel.left = rightColumn.right + 12;
    magnitudePanel.top = leftColumn.top;
    this.addChild(magnitudePanel);

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
    // nodes — apertures first, then the field controls, Reset All last.
    // -----------------------------------------------------------------------
    this.addChild(
      new Node({
        pdomOrder: [
          aperture1,
          aperture2,
          epochPicker,
          apertureControl,
          skyInnerControl,
          skyOuterControl,
          labelCheckbox,
          resetAllButton,
        ],
      }),
    );
  }
}
