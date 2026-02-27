/**
 * Server-side face descriptor matching.
 *
 * face-api.js extracts a 128-dimensional Float32 descriptor on the client.
 * The server stores these as JSON arrays and uses Euclidean distance to
 * determine whether two descriptors belong to the same person.
 */

/** Expected length of a face-api.js descriptor vector. */
export const DESCRIPTOR_LENGTH = 128;

/**
 * Euclidean distance threshold below which two descriptors are considered a
 * match.  0.6 is the commonly recommended default for face-api.js; lower
 * values are stricter.
 */
export const MATCH_THRESHOLD = 0.6;

/** Maximum number of descriptors a single user may register. */
export const MAX_DESCRIPTORS_PER_USER = 5;

/** Euclidean distance between two equal-length number arrays. */
export function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(
      `Descriptor length mismatch: ${a.length} vs ${b.length}`,
    );
  }
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += (a[i] - b[i]) ** 2;
  }
  return Math.sqrt(sum);
}

/**
 * Validate that a value looks like a valid face descriptor (128 finite
 * numbers in [−10, 10]).
 */
export function isValidDescriptor(v: unknown): v is number[] {
  if (!Array.isArray(v) || v.length !== DESCRIPTOR_LENGTH) return false;
  return v.every(
    (n) => typeof n === "number" && Number.isFinite(n) && n >= -10 && n <= 10,
  );
}

export interface MatchResult {
  matched: boolean;
  distance: number;
}

/**
 * Find the best (lowest distance) match between `input` and a list of
 * stored descriptors.  Returns `{ matched, distance }`.
 */
export function findBestMatch(
  input: number[],
  stored: number[][],
): MatchResult {
  if (stored.length === 0) {
    return { matched: false, distance: Infinity };
  }

  let minDistance = Infinity;
  for (const s of stored) {
    const d = euclideanDistance(input, s);
    if (d < minDistance) minDistance = d;
  }

  return { matched: minDistance < MATCH_THRESHOLD, distance: minDistance };
}
