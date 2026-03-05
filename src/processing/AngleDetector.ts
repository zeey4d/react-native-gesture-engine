// ─── AngleDetector ──────────────────────────────────────────────────────────
// Computes direction angle from X/Y components using Math.atan2.
// Provides both radians and degrees, plus cardinal direction classification.
// ─────────────────────────────────────────────────────────────────────────────

import { CardinalDirection } from '../core/types';

/**
 * Detects direction angle and classifies into cardinal directions.
 *
 * Coordinate system:
 * - 0° / 0 rad = right
 * - 90° / π/2 rad = down (screen coordinates, Y grows downward)
 * - 180° / π rad = left
 * - -90° / -π/2 rad = up
 */
export class AngleDetector {
  /**
   * Calculate angle from X/Y deltas.
   *
   * @param dx - Change in X (positive = right)
   * @param dy - Change in Y (positive = down in screen coords)
   * @returns Angle in radians, degrees, and cardinal direction
   */
  calculate(
    dx: number,
    dy: number,
  ): {
    angleRadians: number;
    angleDegrees: number;
    direction: CardinalDirection;
  } {
    // No movement — no direction
    if (dx === 0 && dy === 0) {
      return {
        angleRadians: 0,
        angleDegrees: 0,
        direction: CardinalDirection.None,
      };
    }

    const angleRadians = Math.atan2(dy, dx);
    const angleDegrees = (angleRadians * 180) / Math.PI;
    const direction = this.classifyDirection(angleDegrees);

    return { angleRadians, angleDegrees, direction };
  }

  /**
   * Classify angle (in degrees) into 8 cardinal directions.
   * Uses 45° sectors centered on each direction.
   *
   * Sectors (in screen coordinates where Y grows down):
   *   Right:      -22.5° to 22.5°
   *   DownRight:   22.5° to 67.5°
   *   Down:        67.5° to 112.5°
   *   DownLeft:   112.5° to 157.5°
   *   Left:       157.5° to 180° or -180° to -157.5°
   *   UpLeft:    -157.5° to -112.5°
   *   Up:        -112.5° to -67.5°
   *   UpRight:    -67.5° to -22.5°
   */
  private classifyDirection(degrees: number): CardinalDirection {
    // Normalize to [-180, 180]
    const d = degrees;

    if (d >= -22.5 && d < 22.5) return CardinalDirection.Right;
    if (d >= 22.5 && d < 67.5) return CardinalDirection.DownRight;
    if (d >= 67.5 && d < 112.5) return CardinalDirection.Down;
    if (d >= 112.5 && d < 157.5) return CardinalDirection.DownLeft;
    if (d >= 157.5 || d < -157.5) return CardinalDirection.Left;
    if (d >= -157.5 && d < -112.5) return CardinalDirection.UpLeft;
    if (d >= -112.5 && d < -67.5) return CardinalDirection.Up;
    if (d >= -67.5 && d < -22.5) return CardinalDirection.UpRight;

    return CardinalDirection.None;
  }
}
