// ─── VelocityCalculator ─────────────────────────────────────────────────────
// Computes velocity as Δposition / Δtime from sequential samples.
// Handles edge cases: first sample, zero time delta, and NaN prevention.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Computes velocity from sequential position/time samples.
 * Velocity = (currentPosition - previousPosition) / (currentTime - previousTime)
 */
export class VelocityCalculator {
  private prevX: number | null = null;
  private prevY: number | null = null;
  private prevTimestamp: number | null = null;

  /**
   * Calculate velocity from a new position sample.
   *
   * @param x - Current X position
   * @param y - Current Y position
   * @param timestamp - Current timestamp in milliseconds
   * @returns Velocity components and magnitude
   */
  calculate(
    x: number,
    y: number,
    timestamp: number,
  ): {
    velocityX: number;
    velocityY: number;
    velocity: number;
  } {
    if (this.prevX === null || this.prevY === null || this.prevTimestamp === null) {
      // First sample — no velocity yet
      this.prevX = x;
      this.prevY = y;
      this.prevTimestamp = timestamp;
      return { velocityX: 0, velocityY: 0, velocity: 0 };
    }

    const dt = timestamp - this.prevTimestamp;

    // Guard against division by zero (simultaneous events)
    if (dt <= 0) {
      return { velocityX: 0, velocityY: 0, velocity: 0 };
    }

    const dx = x - this.prevX;
    const dy = y - this.prevY;

    const velocityX = dx / dt;
    const velocityY = dy / dt;
    const velocity = Math.sqrt(velocityX * velocityX + velocityY * velocityY);

    // Update state for next calculation
    this.prevX = x;
    this.prevY = y;
    this.prevTimestamp = timestamp;

    return { velocityX, velocityY, velocity };
  }

  /**
   * Reset state. Call when starting a new gesture.
   */
  reset(): void {
    this.prevX = null;
    this.prevY = null;
    this.prevTimestamp = null;
  }
}
