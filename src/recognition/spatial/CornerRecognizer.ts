// ─── CornerRecognizer ───────────────────────────────────────────────────────
// Detects gestures that start from screen corners. Supports all 4 corners.
// ─────────────────────────────────────────────────────────────────────────────

import {
  ProcessedSample, InputType, TouchType, TouchData,
  IEventBus, CornerRecognizerConfig,
} from '../../core/types';
import { BaseRecognizer } from '../base/BaseRecognizer';

export class CornerRecognizer extends BaseRecognizer {
  private corner: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  private cornerZoneSize: number;
  private minDistance: number;
  private screenWidth: number;
  private screenHeight: number;
  private startedInCorner = false;
  private startX: number | null = null;
  private startY: number | null = null;

  constructor(eventBus: IEventBus, config: CornerRecognizerConfig) {
    super(`corner-${config.corner}`, eventBus, {
      priority: config.priority ?? 15,
      isExclusive: config.isExclusive ?? true,
      enabled: config.enabled,
    });
    this.corner = config.corner;
    this.cornerZoneSize = config.cornerZoneSize ?? 50;
    this.minDistance = config.minDistance ?? 40;
    this.screenWidth = config.screenWidth ?? 400;
    this.screenHeight = config.screenHeight ?? 800;
  }

  onProcessedSample(sample: ProcessedSample): void {
    if (!this.enabled) return;

    const { inputEvent } = sample;
    if (inputEvent.inputType !== InputType.Touch) return;

    const touchData = inputEvent.data as TouchData;
    if (touchData.type !== TouchType.Pan) return;

    if (this.startX === null) {
      this.startX = touchData.x;
      this.startY = touchData.y;
      this.startedInCorner = this.isInCornerZone(touchData.x, touchData.y);

      if (this.startedInCorner) {
        this.transitionToPossible();
      }
      return;
    }

    if (!this.startedInCorner) return;

    const distance = Math.sqrt(
      touchData.translationX ** 2 + touchData.translationY ** 2,
    );

    if (this.state === 'possible' && distance >= this.minDistance) {
      this.transitionToBegan({
        translation: {
          x: touchData.translationX,
          y: touchData.translationY,
        },
      });
      this.transitionToEnded({
        translation: {
          x: touchData.translationX,
          y: touchData.translationY,
        },
      });
      this.resetState();
    }
  }

  override reset(): void {
    super.reset();
    this.resetState();
  }

  private isInCornerZone(x: number, y: number): boolean {
    const zone = this.cornerZoneSize;
    switch (this.corner) {
      case 'top-left':
        return x <= zone && y <= zone;
      case 'top-right':
        return x >= this.screenWidth - zone && y <= zone;
      case 'bottom-left':
        return x <= zone && y >= this.screenHeight - zone;
      case 'bottom-right':
        return x >= this.screenWidth - zone && y >= this.screenHeight - zone;
    }
  }

  private resetState(): void {
    this.startX = null;
    this.startY = null;
    this.startedInCorner = false;
  }
}
