// ─── RotationRecognizer ─────────────────────────────────────────────────────
// Continuous recognizer for two-finger rotation gestures.
// Emits Changed state with rotation angle updates.
// ─────────────────────────────────────────────────────────────────────────────

import { ProcessedSample, InputType, TouchType, TouchData, IEventBus, RotationRecognizerConfig } from '../../core/types';
import { BaseRecognizer } from '../base/BaseRecognizer';

export class RotationRecognizer extends BaseRecognizer {
  private minRotation: number;

  constructor(eventBus: IEventBus, config: RotationRecognizerConfig = {}) {
    super('rotation', eventBus, {
      priority: config.priority ?? 45,
      isExclusive: config.isExclusive ?? false,
      enabled: config.enabled,
    });
    this.minRotation = config.minRotation ?? 0.05;
  }

  onProcessedSample(sample: ProcessedSample): void {
    if (!this.enabled) return;

    const { inputEvent } = sample;
    if (inputEvent.inputType !== InputType.Touch) return;

    const touchData = inputEvent.data as TouchData;
    if (touchData.type !== TouchType.Rotation) return;

    const rotationAbs = Math.abs(touchData.rotation);

    if (this.state === 'idle' || this.state === 'possible') {
      this.transitionToPossible();
      if (rotationAbs >= this.minRotation) {
        this.transitionToBegan({ rotation: touchData.rotation });
      }
      return;
    }

    if (this.state === 'began' || this.state === 'changed') {
      if (touchData.numberOfPointers < 2) {
        this.transitionToEnded({ rotation: touchData.rotation });
      } else {
        this.transitionToChanged({ rotation: touchData.rotation });
      }
    }
  }
}
