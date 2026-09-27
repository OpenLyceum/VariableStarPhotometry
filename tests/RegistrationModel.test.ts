/**
 * RegistrationModel.test.ts — the working frames carry a telescope pointing
 * error, so registering them is a real task (NAAP student guide, Question 6).
 */
import { describe, expect, it } from "vitest";
import { VariableStarPhotometryPreferencesModel } from "../src/preferences/VariableStarPhotometryPreferencesModel.js";
import { REG_POINTING_ERRORS, RegistrationModel } from "../src/registration/model/RegistrationModel.js";

describe("RegistrationModel", () => {
  it("starts with both working fields misregistered", () => {
    const model = new RegistrationModel(new VariableStarPhotometryPreferencesModel());
    expect(model.isFieldAligned(2)).toBe(false);
    expect(model.isFieldAligned(3)).toBe(false);
  });

  it("registers a field when its offset cancels the pointing error", () => {
    const model = new RegistrationModel(new VariableStarPhotometryPreferencesModel());
    model.setFieldOffset(2, -REG_POINTING_ERRORS[2].x, -REG_POINTING_ERRORS[2].y);
    expect(model.isFieldAligned(2)).toBe(true);
    expect(model.isFieldAligned(3)).toBe(false);
    model.reset();
    expect(model.isFieldAligned(2)).toBe(false);
  });
});
