/**
 * Fleet-standard memory-leak regression suite (SceneryStackTemplate / QubitSketch pattern).
 *
 * Creates a disposable model object inside a function boundary, disposes it, forces
 * garbage collection via global.gc (--expose-gc in vitest.config.ts), then asserts via
 * WeakRef that the object was collected. V8 requires a function boundary (not merely
 * a block scope) so local strong references die when the helper returns.
 *
 * No model in src/ has a dispose() (and AnalyzerObservationsNode and the other analyzer
 * nodes are isDisposable: false), so describeDisposalLeaks([], { emptyOk: "custom forceGC coverage below for PhotometryModel and charts" }) only runs the harness sanity
 * checks. Real coverage is:
 *  - PhotometryModel disposes its owned Properties explicitly (DerivedProperties first, then
 *    leaf Properties);
 *  - AnalyzerModel, BlinkComparatorModel and RegistrationModel are checked with create/drop
 *    + forceGC. RegistrationModel links the preferences Properties, so its preferences are
 *    created together with it and dropped with it.
 */

import { Vector2 } from "scenerystack/dot";
import { describe, expect, it } from "vitest";
import { AnalyzerModel } from "../src/analyzer/model/AnalyzerModel.js";
import { BlinkComparatorModel } from "../src/blink-comparator/model/BlinkComparatorModel.js";
import { BlinkComparatorScreenView } from "../src/blink-comparator/view/BlinkComparatorScreenView.js";
import { StringManager } from "../src/i18n/StringManager.js";
import { PhotometryModel } from "../src/photometry/model/PhotometryModel.js";
import { VariableStarPhotometryPreferencesModel } from "../src/preferences/VariableStarPhotometryPreferencesModel.js";
import { RegistrationModel } from "../src/registration/model/RegistrationModel.js";
import { describeDisposalLeaks, expectNoListenerGrowth, forceGC } from "./helpers/memoryLeak.js";

// Nothing in src/ is created and disposed at run time (see the header).
describeDisposalLeaks([], {
  emptyOk: "custom forceGC coverage below for PhotometryModel and charts",
});

/** Dispose all reactive state owned by a PhotometryModel instance. Idempotent. */
function disposePhotometryModel(model: PhotometryModel): void {
  const disposeIfNeeded = (property: { isDisposed?: boolean; dispose(): void }): void => {
    if (!property.isDisposed) {
      property.dispose();
    }
  };

  disposeIfNeeded(model.magnitudeDifferenceProperty);
  disposeIfNeeded(model.aperture1PhotometryProperty);
  disposeIfNeeded(model.aperture2PhotometryProperty);
  disposeIfNeeded(model.labelAperturesProperty);
  disposeIfNeeded(model.aperture2CenterProperty);
  disposeIfNeeded(model.aperture1CenterProperty);
  disposeIfNeeded(model.epochIndexProperty);
  disposeIfNeeded(model.annulusOuterRadiusProperty);
  disposeIfNeeded(model.annulusInnerRadiusProperty);
  disposeIfNeeded(model.apertureDiameterProperty);
}

function createAndDisposePhotometryModel(): WeakRef<object> {
  const model = new PhotometryModel();
  const ref = new WeakRef<object>(model);
  disposePhotometryModel(model);
  return ref;
}

describe("Memory leak regression", () => {
  it("PhotometryModel is collected after its Properties are disposed", async () => {
    const ref = createAndDisposePhotometryModel();
    await forceGC(ref);
    expect(ref.deref()).toBeUndefined();
  });

  it("double dispose of Properties does not throw", () => {
    const model = new PhotometryModel();
    disposePhotometryModel(model);
    expect(() => disposePhotometryModel(model)).not.toThrow();
  });

  it("repeated create/dispose cycles leave no survivors", async () => {
    const refs: WeakRef<object>[] = [];
    for (let i = 0; i < 10; i++) {
      refs.push(createAndDisposePhotometryModel());
    }
    await forceGC(refs);
    const survivors = refs.filter((r) => r.deref() !== undefined).length;
    expect(survivors).toBe(0);
  });
});

// AnalyzerModel: select both stars so the measurement / PDM DerivedProperties compute,
// then undo and reset.
function createAndDropAnalyzerModel(): WeakRef<object> {
  const model = new AnalyzerModel();
  model.selectStarAt(new Vector2(100, 100));
  model.selectStarAt(new Vector2(150, 120));
  model.reset();
  return new WeakRef<object>(model);
}

// BlinkComparatorModel: step through several blink frames and mutate the queue.
function createAndDropBlinkComparatorModel(): WeakRef<object> {
  const model = new BlinkComparatorModel();
  model.addSelectedToQueue();
  for (let i = 0; i < 20; i++) {
    model.step(0.5);
  }
  model.reset();
  return new WeakRef<object>(model);
}

// RegistrationModel mirrors two preferences Properties in both directions, so its
// listeners live on the preferences object; both are created and dropped together.
function createAndDropRegistrationModel(): WeakRef<object> {
  const preferences = new VariableStarPhotometryPreferencesModel();
  const model = new RegistrationModel(preferences);
  preferences.showGridProperty.value = !preferences.showGridProperty.value;
  model.invertColorsProperty.value = !model.invertColorsProperty.value;
  model.reset();
  return new WeakRef<object>(model);
}

describe("Screen models (no dispose(): create/drop)", () => {
  const cases: readonly { name: string; createAndDrop: () => WeakRef<object> }[] = [
    { name: "AnalyzerModel", createAndDrop: createAndDropAnalyzerModel },
    { name: "BlinkComparatorModel", createAndDrop: createAndDropBlinkComparatorModel },
    { name: "RegistrationModel (with its preferences)", createAndDrop: createAndDropRegistrationModel },
  ];

  for (const { name, createAndDrop } of cases) {
    it(`${name} is collected after drop`, async () => {
      const ref = createAndDrop();
      await forceGC(ref);
      expect(ref.deref()).toBeUndefined();
    });

    it(`${name}: repeated create/drop cycles leave no survivors`, async () => {
      const refs: WeakRef<object>[] = [];
      for (let i = 0; i < 10; i++) {
        refs.push(createAndDrop());
      }
      await forceGC(refs);
      expect(refs.filter((r) => r.deref() !== undefined).length).toBe(0);
    });
  }
});

// BlinkComparatorScreenView rebuilds observation/queue rows on selection and queue
// changes. Rows include Text(inQueueMarkerStringProperty); Node.dispose() alone left
// those Text nodes linked to the sim-lifetime string Property (pointer-fuzz climb).
describe("BlinkComparatorScreenView row rebuilds", () => {
  it("selection/queue churn leaves no listeners on inQueueMarkerStringProperty", async () => {
    const preferences = new VariableStarPhotometryPreferencesModel();
    const model = new BlinkComparatorModel();
    // ScreenView is long-lived; we only assert that rebuilds do not accumulate listeners.
    new BlinkComparatorScreenView(model, preferences);

    // Warm up so the visible in-queue checkmark count is stable before sampling.
    // Growing the queue during the assertion would add live Text(marker) nodes and
    // look like a leak even with correct disposeSubtree teardown.
    for (let i = 0; i < 10; i++) {
      model.selectedObsIndexProperty.value = i;
      model.addSelectedToQueue();
    }

    const marker = StringManager.getInstance().getBlinkViewStrings().inQueueMarkerStringProperty;
    await expectNoListenerGrowth([marker, model.selectedObsIndexProperty, model.queuePositionProperty], () => {
      model.selectedObsIndexProperty.value = (model.selectedObsIndexProperty.value + 1) % 10;
      model.queuePositionProperty.value = (model.queuePositionProperty.value + 1) % model.blinkQueue.length;
    });
  });
});
