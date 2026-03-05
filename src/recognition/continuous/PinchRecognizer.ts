// ─── PinchRecognizer ────────────────────────────────────────────────────────
// Continuous recognizer for pinch/zoom gestures.
// Emits Changed state with scale factor updates.
// ─────────────────────────────────────────────────────────────────────────────

import { ProcessedSample, InputType, TouchType, TouchData, IEventBus, PinchRecognizerConfig } from '../../core/types';
import { BaseRecognizer } from '../base/BaseRecognizer';

export class PinchRecognizer extends BaseRecognizer {
  private minScale: number;

  constructor(eventBus: IEventBus, config: PinchRecognizerConfig = {}) {
    super('pinch', eventBus, {
      priority: config.priority ?? 40,
      isExclusive: config.isExclusive ?? false,
      enabled: config.enabled,
    });
    this.minScale = config.minScale ?? 0.05;
  }

  onProcessedSample(sample: ProcessedSample): void {
    if (!this.enabled) return;

    const { inputEvent } = sample;
    if (inputEvent.inputType !== InputType.Touch) return;

    const touchData = inputEvent.data as TouchData;
    if (touchData.type !== TouchType.Pinch) return;

    const scaleDelta = Math.abs(touchData.scale - 1);

    if (this.state === 'idle' || this.state === 'possible') {
      this.transitionToPossible();
      if (scaleDelta >= this.minScale) {
        this.transitionToBegan({ scale: touchData.scale });
      }
      return;
    }

    if (this.state === 'began' || this.state === 'changed') {
      if (touchData.numberOfPointers < 2) {
        this.transitionToEnded({ scale: touchData.scale });
      } else {
        this.transitionToChanged({ scale: touchData.scale });
      }
    }
  }
}
