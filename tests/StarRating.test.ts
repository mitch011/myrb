import { describe, expect, it } from "vitest";
import { starsForAccuracy } from "@core/StarRating";

describe("starsForAccuracy", () => {
  it("gives 1 star below every threshold", () => {
    expect(starsForAccuracy(0.2)).toBe(1);
  });
  it("gives 2 stars at 50%", () => {
    expect(starsForAccuracy(0.5)).toBe(2);
  });
  it("gives 3 stars at 70%", () => {
    expect(starsForAccuracy(0.7)).toBe(3);
  });
  it("gives 4 stars at 80%", () => {
    expect(starsForAccuracy(0.8)).toBe(4);
  });
  it("gives 5 stars at 90%+", () => {
    expect(starsForAccuracy(0.9)).toBe(5);
    expect(starsForAccuracy(1)).toBe(5);
  });
});
