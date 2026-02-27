import { describe, it, expect } from "vitest";
import {
  euclideanDistance,
  findBestMatch,
  isValidDescriptor,
  DESCRIPTOR_LENGTH,
  MATCH_THRESHOLD,
} from "@/lib/face-match";

/** Create a dummy descriptor with all elements set to `fill`. */
function makeDescriptor(fill: number): number[] {
  return Array.from({ length: DESCRIPTOR_LENGTH }, () => fill);
}

describe("euclideanDistance", () => {
  it("returns 0 for identical descriptors", () => {
    const a = makeDescriptor(0.5);
    expect(euclideanDistance(a, a)).toBe(0);
  });

  it("computes correct distance for simple case", () => {
    const a = Array.from({ length: DESCRIPTOR_LENGTH }, () => 0);
    const b = Array.from({ length: DESCRIPTOR_LENGTH }, () => 1);
    // sqrt(128 * 1^2) = sqrt(128) ≈ 11.314
    expect(euclideanDistance(a, b)).toBeCloseTo(Math.sqrt(128), 5);
  });

  it("throws when lengths differ", () => {
    expect(() => euclideanDistance([1, 2], [1])).toThrow("length mismatch");
  });
});

describe("isValidDescriptor", () => {
  it("accepts a valid 128-element number array", () => {
    expect(isValidDescriptor(makeDescriptor(0.1))).toBe(true);
  });

  it("rejects wrong length", () => {
    expect(isValidDescriptor([1, 2, 3])).toBe(false);
  });

  it("rejects non-array", () => {
    expect(isValidDescriptor("hello")).toBe(false);
  });

  it("rejects NaN elements", () => {
    const d = makeDescriptor(0);
    d[0] = NaN;
    expect(isValidDescriptor(d)).toBe(false);
  });

  it("rejects out-of-range elements", () => {
    const d = makeDescriptor(0);
    d[0] = 99;
    expect(isValidDescriptor(d)).toBe(false);
  });
});

describe("findBestMatch", () => {
  it("returns matched=false for empty stored list", () => {
    const result = findBestMatch(makeDescriptor(0), []);
    expect(result.matched).toBe(false);
    expect(result.distance).toBe(Infinity);
  });

  it("returns matched=true for identical descriptor", () => {
    const d = makeDescriptor(0.5);
    const result = findBestMatch(d, [d]);
    expect(result.matched).toBe(true);
    expect(result.distance).toBe(0);
  });

  it("returns matched=false for very different descriptors", () => {
    const a = makeDescriptor(0);
    const b = makeDescriptor(5);
    const result = findBestMatch(a, [b]);
    expect(result.matched).toBe(false);
    expect(result.distance).toBeGreaterThan(MATCH_THRESHOLD);
  });

  it("picks the closest match among multiple stored descriptors", () => {
    const input = makeDescriptor(0);
    const close = makeDescriptor(0.01); // very close
    const far = makeDescriptor(5);
    const result = findBestMatch(input, [far, close]);
    expect(result.matched).toBe(true);
    expect(result.distance).toBeLessThan(MATCH_THRESHOLD);
  });
});
