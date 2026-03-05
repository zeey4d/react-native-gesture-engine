// ─── ThresholdNormalizer ─────────────────────────────────────────────────────
// Maps raw magnitude values to the [0, 1] range given min/max thresholds.
// Values below min map to 0, above max map to 1, in between are linear.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maps raw magnitudes to a normalized [0, 1] range with clamping.
 *
 * Formula: normalized = clamp((value - min) / (max - min), 0, 1)
 *
 * This is useful for turning raw sensor values (e.g., acceleration in g,
 * velocity in px/ms) into intensity values that can be used for feedback
 * or threshold comparison.
 */
export class ThresholdNormalizer {
  private min: number;
  private max: number;

  /**
   * @param min - Minimum threshold. Values at or below this map to 0.
   * @param max - Maximum threshold. Values at or above this map to 1.
   */
  constructor(min = 0, max = 1) {
    if (min >= max) {
      throw new Error(
        `[ThresholdNormalizer] min (${min}) must be less than max (${max})`,
      );
    }
    this.min = min;
    this.max = max;
  }

  /**
   * Normalize a raw value to [0, 1].
   */
  normalize(value: number): number {
    if (value <= this.min) return 0;
    if (value >= this.max) return 1;
    return (value - this.min) / (this.max - this.min);
  }

  /**
   * Update thresholds dynamically.
   */
  setRange(min: number, max: number): void {
    if (min >= max) {
      throw new Error(
        `[ThresholdNormalizer] min (${min}) must be less than max (${max})`,
      );
    }
    this.min = min;
    this.max = max;
  }

  /**
   * Get current min threshold.
   */
  getMin(): number {
    return this.min;
  }

  /**
   * Get current max threshold.
   */
  getMax(): number {
    return this.max;
  }
}
