// ─── ShakeRecognizer ────────────────────────────────────────────────────────
// Detects device shake gestures from high-pass filtered accelerometer data.
//
// Algorithm:
// 1. Consume ProcessedSamples with SensorType.Accelerometer
// 2. Compute magnitude = √(x² + y² + z²) from filtered data
// 3. Track consecutive samples above threshold (default 1.5g)
// 4. When consecutiveSamples (default 2) are above threshold → trigger shake
// 5. Enforce cooldown period (default 1000ms) to prevent rapid re-fires
//
// Emits GestureEvent with name: 'shake', metadata.magnitude
// ─────────────────────────────────────────────────────────────────────────────

import {
  ProcessedSample, InputType, SensorType, SensorData,
  IEventBus, ShakeRecognizerConfig,
} from '../../core/types';
import { BaseRecognizer } from '../base/BaseRecognizer';

export class ShakeRecognizer extends BaseRecognizer {
  private threshold: number;
  private consecutiveSamples: number;
  private cooldownMs: number;

  private aboveThresholdCount = 0;
  private lastTriggerTime = 0;

  constructor(eventBus: IEventBus, config: ShakeRecognizerConfig = {}) {
    super('shake', eventBus, {
      priority: config.priority ?? 30,
      isExclusive: config.isExclusive ?? false,
      enabled: config.enabled,
    });
    this.threshold = config.threshold ?? 1.5;
    this.consecutiveSamples = config.consecutiveSamples ?? 2;
    this.cooldownMs = config.cooldownMs ?? 1000;
  }

  onProcessedSample(sample: ProcessedSample): void {
    if (!this.enabled) return;

    const { inputEvent } = sample;
    if (inputEvent.inputType !== InputType.Sensor) return;

    const sensorData = inputEvent.data as SensorData;
    if (sensorData.type !== SensorType.Accelerometer) return;

    // Use high-pass filtered data (gravity removed) from the processing layer
    const { x, y, z } = sample.filtered;

    // Compute acceleration magnitude
    const magnitude = Math.sqrt(x * x + y * y + z * z);

    if (magnitude >= this.threshold) {
      this.aboveThresholdCount++;

      if (this.aboveThresholdCount >= this.consecutiveSamples) {
        const now = Date.now();

        // Check cooldown
        if (now - this.lastTriggerTime < this.cooldownMs) {
          // Still in cooldown — don't re-trigger
          return;
        }

        // Shake detected!
        this.lastTriggerTime = now;
        this.aboveThresholdCount = 0;

        this.transitionToPossible();
        this.transitionToBegan({ magnitude });
        this.transitionToEnded({ magnitude });
      }
    } else {
      // Below threshold — reset consecutive count
      this.aboveThresholdCount = 0;
    }
  }

  override reset(): void {
    super.reset();
    this.aboveThresholdCount = 0;
  }
}
