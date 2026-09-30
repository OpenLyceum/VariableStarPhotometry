/**
 * StarFieldNode.ts
 *
 * SceneryStack CanvasNode that displays one rendered CCD star-field image.
 * Call setObservation( index, invert ) to switch to a different epoch.
 *
 * Implementation note: the rendered `ImageData` is turned into an `ImageBitmap`
 * and drawn with `context.drawImage()`.  `putImageData()` cannot be used
 * directly because it ignores the canvas transformation matrix — and Scenery
 * hands `paintCanvas()` a context already transformed into this node's local
 * frame (which includes the ScreenView layout scale plus any translation
 * applied by the scene graph).  `drawImage()` honours that transform.
 */

import { Bounds2 } from "scenerystack/dot";
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import type { CanvasNodeOptions } from "scenerystack/scenery";
import { CanvasNode } from "scenerystack/scenery";
import { CCDField } from "../model/CCDField.js";

const FIELD = CCDField.getInstance();

export type StarFieldNodeOptions = CanvasNodeOptions;

export class StarFieldNode extends CanvasNode {
  private obsIndex: number;
  private invert: boolean;

  // Current frame, drawn via drawImage() so the node transform (layout scale,
  // translation) is respected. Null until the first bitmap resolves.
  private frame: ImageBitmap | null = null;
  private frameRequest = 0;

  public constructor(obsIndex = 0, invert = false, providedOptions?: StarFieldNodeOptions) {
    const options = optionize<StarFieldNodeOptions, EmptySelfOptions, CanvasNodeOptions>()(
      { canvasBounds: new Bounds2(0, 0, FIELD.width, FIELD.height) },
      providedOptions,
    );

    super(options);

    this.obsIndex = obsIndex;
    this.invert = invert;

    this.refresh();
  }

  /** Switch to a new observation; triggers a repaint only when something changed. */
  public setObservation(obsIndex: number, invert = false): void {
    if (this.obsIndex === obsIndex && this.invert === invert) {
      return;
    }
    this.obsIndex = obsIndex;
    this.invert = invert;
    this.refresh();
  }

  /** The observation index currently displayed. */
  public get observationIndex(): number {
    return this.obsIndex;
  }

  private refresh(): void {
    const imageData = FIELD.render(this.obsIndex, this.invert);
    const request = ++this.frameRequest;
    createImageBitmap(imageData).then(
      (bitmap) => {
        if (request !== this.frameRequest) {
          bitmap.close();
          return;
        }
        this.frame?.close();
        this.frame = bitmap;
        this.invalidatePaint();
      },
      () => {
        // A failed bitmap leaves the previous frame (or a blank field) in place.
      },
    );
  }

  public override paintCanvas(context: CanvasRenderingContext2D): void {
    if (this.frame) {
      context.drawImage(this.frame, 0, 0);
    }
  }
}
