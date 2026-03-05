// ─── EdgeSwipeRecognizer ────────────────────────────────────────────────────
// Detects gestures that START within the edge zone of the screen.
// Supports all 4 edges (left, right, top, bottom) with configurable:
// - Edge zone width (default 30px)
// - Minimum swipe distance (default 50px)
// - Minimum velocity (default 0.3 px/ms)
//
// Emits GestureEvent with name 'edge-swipe-{left|right|top|bottom}'
// ─────────────────────────────────────────────────────────────────────────────

import {
  ProcessedSample, InputType, TouchType, TouchData,
  IEventBus, EdgeSwipeRecognizerConfig,
} from '../../core/types';
import { BaseRecognizer } from '../base/BaseRecognizer';

export class EdgeSwipeRecognizer extends BaseRecognizer {
  private edge: 'left' | 'right' | 'top' | 'bottom';
  private edgeZoneWidth: number;
  private minDistance: number;
  private minVelocity: number;
  private screenWidth: number;
  private screenHeight: number;
  private startedInEdge = false;
  private startX: number | null = null;
  private startY: number | null = null;

  constructor(eventBus: IEventBus, config: EdgeSwipeRecognizerConfig) {
    super(`edge-swipe-${config.edge}`, eventBus, {
      priority: config.priority ?? 20,
      isExclusive: config.isExclusive ?? true,
      enabled: config.enabled,
    });
    this.edge = config.edge;
    this.edgeZoneWidth = config.edgeZoneWidth ?? 30;
    this.minDistance = config.minDistance ?? 50;
    this.minVelocity = config.minVelocity ?? 0.3;
    this.screenWidth = config.screenWidth ?? 400;
    this.screenHeight = config.screenHeight ?? 800;
  }

  onProcessedSample(sample: ProcessedSample): void {
    if (!this.enabled) return;

    const { inputEvent } = sample;
    if (inputEvent.inputType !== InputType.Touch) return;

    const touchData = inputEvent.data as TouchData;
    if (touchData.type !== TouchType.Pan) return;

    // Track initial touch position to detect edge start
    if (this.startX === null) {
      this.startX = touchData.x;
      this.startY = touchData.y;
      this.startedInEdge = this.isInEdgeZone(touchData.x, touchData.y);

      if (this.startedInEdge) {
        this.transitionToPossible();
      }
      return;
    }

    // Ignore if gesture didn't start in the edge zone
    if (!this.startedInEdge) return;

    // Calculate swipe distance in the expected direction
    const swipeDistance = this.getSwipeDistance(touchData);
    const swipeVelocity = this.getSwipeVelocity(touchData);

    if (this.state === 'possible') {
      // Check if swipe conditions are met
      if (swipeDistance >= this.minDistance && swipeVelocity >= this.minVelocity) {
        this.transitionToBegan({
          edge: this.edge,
          translation: {
            x: touchData.translationX,
            y: touchData.translationY,
          },
          velocity: {
            x: touchData.velocityX,
            y: touchData.velocityY,
          },
        });
        this.transitionToEnded({
          edge: this.edge,
          translation: {
            x: touchData.translationX,
            y: touchData.translationY,
          },
          velocity: {
            x: touchData.velocityX,
            y: touchData.velocityY,
          },
        });
        this.resetState();
      }
    }
  }

  override reset(): void {
    super.reset();
    this.resetState();
  }

  /**
   * Check if a point is within the configured edge zone.
   */
  private isInEdgeZone(x: number, y: number): boolean {
    switch (this.edge) {
      case 'left':
        return x <= this.edgeZoneWidth;
      case 'right':
        return x >= this.screenWidth - this.edgeZoneWidth;
      case 'top':
        return y <= this.edgeZoneWidth;
      case 'bottom':
        return y >= this.screenHeight - this.edgeZoneWidth;
    }
  }

  /**
   * Get the swipe distance along the expected axis.
   * Left/right edges → horizontal distance, top/bottom → vertical.
   */
  private getSwipeDistance(touchData: TouchData): number {
    switch (this.edge) {
      case 'left':
        return touchData.translationX; // positive = swiping right (from left edge)
      case 'right':
        return -touchData.translationX; // positive = swiping left (from right edge)
      case 'top':
        return touchData.translationY; // positive = swiping down (from top edge)
      case 'bottom':
        return -touchData.translationY; // positive = swiping up (from bottom edge)
    }
  }

  /**
   * Get the swipe velocity along the expected axis.
   */
  private getSwipeVelocity(touchData: TouchData): number {
    switch (this.edge) {
      case 'left':
        return touchData.velocityX;
      case 'right':
        return -touchData.velocityX;
      case 'top':
        return touchData.velocityY;
      case 'bottom':
        return -touchData.velocityY;
    }
  }

  private resetState(): void {
    this.startX = null;
    this.startY = null;
    this.startedInEdge = false;
  }
}
