// ─── TiltRecognizer ─────────────────────────────────────────────────────────
// Detects device tilt from accelerometer data by computing pitch and roll
// angles. Triggers when the tilt exceeds a configurable threshold.
// ─────────────────────────────────────────────────────────────────────────────

import {
  ProcessedSample, InputType, SensorType, SensorData,
  IEventBus, TiltRecognizerConfig,
} from '../../core/types';
import { BaseRecognizer } from '../base/BaseRecognizer';

export class TiltRecognizer extends BaseRecognizer {
  private tiltThreshold: number;
  private cooldownMs: number;
  private lastTriggerTime = 0;

  constructor(eventBus: IEventBus, config: TiltRecognizerConfig = {}) {
    super('tilt', eventBus, {
      priority: config.priority ?? 35,
      isExclusive: config.isExclusive ?? false,
      enabled: config.enabled,
    });
    this.tiltThreshold = config.tiltThreshold ?? 30;
    this.cooldownMs = config.cooldownMs ?? 500;
  }

  onProcessedSample(sample: ProcessedSample): void {
    if (!this.enabled) return;

    const { inputEvent } = sample;
    if (inputEvent.inputType !== InputType.Sensor) return;

    const sensorData = inputEvent.data as SensorData;
    if (sensorData.type !== SensorType.Accelerometer) return;

    // Use raw (unfiltered) accelerometer data for tilt
    // since tilt is a sustained orientation, not a transient impulse
    const { x, y, z } = sensorData;

    // Compute pitch and roll from accelerometer
    // pitch = rotation around X axis (tilting forward/backward)
    // roll = rotation around Y axis (tilting left/right)
    const pitch = Math.atan2(y, Math.sqrt(x * x + z * z)) * (180 / Math.PI);
    const roll = Math.atan2(x, Math.sqrt(y * y + z * z)) * (180 / Math.PI);

    const maxTilt = Math.max(Math.abs(pitch), Math.abs(roll));

    if (maxTilt >= this.tiltThreshold) {
      const now = Date.now();

      if (now - this.lastTriggerTime < this.cooldownMs) {
        return;
      }

      this.lastTriggerTime = now;

      this.transitionToPossible();
      this.transitionToBegan({
        tilt: { pitch, roll },
        magnitude: maxTilt,
      });
      this.transitionToEnded({
        tilt: { pitch, roll },
        magnitude: maxTilt,
      });
    }
  }
}
