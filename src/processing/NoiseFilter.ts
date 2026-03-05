// ─── NoiseFilter ────────────────────────────────────────────────────────────
// IIR (Infinite Impulse Response) low-pass and high-pass filters.
// Low-pass removes jitter/noise; high-pass removes gravity component.
// Configurable alpha controls filter responsiveness vs. smoothness.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * First-order IIR noise filter with both low-pass and high-pass modes.
 *
 * Low-pass: output = α * input + (1 - α) * previousOutput
 *   - Smooths noisy signals (e.g., touch jitter)
 *   - Higher alpha = more responsive but noisier
 *
 * High-pass: output = input - lowPass(input)
 *   - Removes slowly-changing components (e.g., gravity from accelerometer)
 *   - Isolates sudden movements (shakes, flicks)
 */
export class NoiseFilter {
  private lowPassState: { x: number; y: number; z: number } | null = null;
  private alpha: number;

  /**
   * @param alpha - Filter coefficient [0, 1]. Default 0.8.
   *  - For low-pass: 0.1 = very smooth, 0.9 = barely filtered
   *  - For high-pass: same alpha applied to the underlying low-pass
   */
  constructor(alpha = 0.8) {
    this.alpha = Math.max(0, Math.min(1, alpha));
  }

  /**
   * Apply low-pass filter. Removes high-frequency jitter.
   */
  lowPass(x: number, y: number, z: number): { x: number; y: number; z: number } {
    if (this.lowPassState === null) {
      // First sample — initialize state
      this.lowPassState = { x, y, z };
      return { x, y, z };
    }

    const prev = this.lowPassState;
    const filtered = {
      x: this.alpha * x + (1 - this.alpha) * prev.x,
      y: this.alpha * y + (1 - this.alpha) * prev.y,
      z: this.alpha * z + (1 - this.alpha) * prev.z,
    };

    this.lowPassState = filtered;
    return filtered;
  }

  /**
   * Apply high-pass filter. Removes low-frequency components (gravity).
   * Returns only the dynamic/transient part of the signal.
   */
  highPass(x: number, y: number, z: number): { x: number; y: number; z: number } {
    const low = this.lowPass(x, y, z);
    return {
      x: x - low.x,
      y: y - low.y,
      z: z - low.z,
    };
  }

  /**
   * Reset filter state. Call when starting a new gesture or after a pause.
   */
  reset(): void {
    this.lowPassState = null;
  }

  /**
   * Update alpha dynamically (e.g., for adaptive filtering).
   */
  setAlpha(alpha: number): void {
    this.alpha = Math.max(0, Math.min(1, alpha));
  }
}
