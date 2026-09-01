import { describe, it, expect } from "vitest";
import { fmtUsd, fmtUsdSpoken } from "./format";

// USD formatting for the Wallet modal's market-rate estimate — see
// USD DISPLAY FORMAT: "≈ $X.XX USD... use thousands separators... do not
// show excessive decimal precision."
describe("fmtUsd", () => {
  it("formats zero with two decimal places", () => {
    expect(fmtUsd(0)).toBe("$0.00");
  });

  it("formats a mid-size value", () => {
    expect(fmtUsd(842.41)).toBe("$842.41");
  });

  it("adds thousands separators for larger values", () => {
    expect(fmtUsd(6284.2)).toBe("$6,284.20");
  });
});

// Spoken-out accessible label — see ACCESSIBILITY: "Approximate value: 842
// dollars and 41 cents USD."
describe("fmtUsdSpoken", () => {
  it("spells out dollars and cents", () => {
    expect(fmtUsdSpoken(842.41)).toBe("842 dollars and 41 cents");
  });

  it("uses singular units for exactly one dollar and one cent", () => {
    expect(fmtUsdSpoken(1.01)).toBe("1 dollar and 1 cent");
  });

  it("handles zero", () => {
    expect(fmtUsdSpoken(0)).toBe("0 dollars and 0 cents");
  });
});
