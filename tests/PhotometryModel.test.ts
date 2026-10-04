import { describe, expect, it } from "vitest";
import { PhotometryModel } from "../src/photometry/model/PhotometryModel.js";

describe("Photometry aperture geometry", () => {
  it("moves the sky annulus outside an enlarged aperture", () => {
    const model = new PhotometryModel();
    model.apertureDiameterProperty.value = 30;
    expect(model.apertureDiameterProperty.value).toBe(30);
    expect(model.annulusInnerRadiusProperty.value).toBeGreaterThan(15);
    expect(model.annulusOuterRadiusProperty.value).toBeGreaterThan(model.annulusInnerRadiusProperty.value);
    expect(model.aperture1PhotometryProperty.value.sky.totalPixels).toBeGreaterThan(0);
  });

  it("widens the outer ring when the inner ring is increased", () => {
    const model = new PhotometryModel();
    model.annulusInnerRadiusProperty.value = 25;
    expect(model.annulusInnerRadiusProperty.value).toBe(25);
    expect(model.annulusOuterRadiusProperty.value).toBe(26);
    expect(model.aperture1PhotometryProperty.value.sky.totalPixels).toBeGreaterThan(0);
  });

  it("shrinks the inner ring and aperture when the outer ring is reduced", () => {
    const model = new PhotometryModel();
    model.apertureDiameterProperty.value = 30;
    model.annulusInnerRadiusProperty.value = 25;
    model.annulusOuterRadiusProperty.value = 12;
    expect(model.annulusOuterRadiusProperty.value).toBe(12);
    expect(model.annulusInnerRadiusProperty.value).toBe(11);
    expect(model.apertureDiameterProperty.value).toBe(20);
    expect(model.aperture1PhotometryProperty.value.sky.totalPixels).toBeGreaterThan(0);
    model.reset();
    expect(model.annulusInnerRadiusProperty.value).toBeGreaterThan(model.apertureDiameterProperty.value / 2);
    expect(model.annulusOuterRadiusProperty.value).toBeGreaterThan(model.annulusInnerRadiusProperty.value);
  });
});
