// ─── WristFlickRecognizer ───────────────────────────────────────────────────
// Detects wrist flick gestures from gyroscope data.
// A wrist flick is a rapid rotational movement detected via high angular
// velocity on the gyroscope axes.
// ─────────────────────────────────────────────────────────────────────────────

import {
  ProcessedSample, InputType, SensorType, SensorData,
  IEventBus, WristFlickRecognizerConfig,
} from '../../core/types';
import { BaseRecognizer } from '../base/BaseRecognizer';

export class WristFlickRecognizer extends BaseRecognizer {
  private angularVelocityThreshold: number;
  private cooldownMs: number;
  private lastTriggerTime = 0;

  constructor(eventBus: IEventBus, config: WristFlickRecognizerConfig = {}) {
    super('wrist-flick', eventBus, {
      priority: config.priority ?? 25,
      isExclusive: config.isExclusive ?? false,
      enabled: config.enabled,
    });
    // Threshold in deg/s — gyroscope typically reports rad/s,
    // so we convert threshold to rad/s internally
    this.angularVelocityThreshold =
      ((config.angularVelocityThreshold ?? 150) * Math.PI) / 180;
    this.cooldownMs = config.cooldownMs ?? 800;
  }

  onProcessedSample(sample: ProcessedSample): void {
    if (!this.enabled) return;

    const { inputEvent } = sample;
    if (inputEvent.inputType !== InputType.Sensor) return;

    const sensorData = inputEvent.data as SensorData;
    if (sensorData.type !== SensorType.Gyroscope) return;

    // Use filtered gyroscope data
    const { x, y, z } = sample.filtered;

    // Compute angular velocity magnitude (rad/s)
    const angularVelocity = Math.sqrt(x * x + y * y + z * z);

    if (angularVelocity >= this.angularVelocityThreshold) {
      const now = Date.now();

      if (now - this.lastTriggerTime < this.cooldownMs) {
        return;
      }

      this.lastTriggerTime = now;

      this.transitionToPossible();
      this.transitionToBegan({
        magnitude: angularVelocity * (180 / Math.PI), // Convert back to deg/s for metadata
      });
      this.transitionToEnded({
        magnitude: angularVelocity * (180 / Math.PI),
      });
    }
  }
}
