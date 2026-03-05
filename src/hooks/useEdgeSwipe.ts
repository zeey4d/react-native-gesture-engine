// ─── useEdgeSwipe ───────────────────────────────────────────────────────────
// Convenience hook for edge swipe detection.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react';
import { GestureEngine } from '../GestureEngine';
import { EdgeSwipeRecognizer } from '../recognition/spatial/EdgeSwipeRecognizer';
import { CustomAction } from '../actions/CustomAction';
import { HapticFeedback } from '../feedback/HapticFeedback';
import { GestureEvent } from '../core/types';

export interface UseEdgeSwipeConfig {
  /** Edge to detect: 'left', 'right', 'top', 'bottom' */
  edge: 'left' | 'right' | 'top' | 'bottom';
  /** Minimum swipe distance in px (default 50) */
  minDistance?: number;
  /** Edge zone width in px (default 30) */
  edgeZoneWidth?: number;
  /** Minimum velocity in px/ms (default 0.3) */
  minVelocity?: number;
  /** Screen width in px */
  screenWidth?: number;
  /** Screen height in px */
  screenHeight?: number;
  /** Callback when edge swipe is detected */
  onSwipe: (event: GestureEvent) => void;
  /** Enable haptic feedback (default true) */
  hapticEnabled?: boolean;
}

/**
 * Convenience hook for edge swipe detection.
 *
 * @example
 * ```tsx
 * useEdgeSwipe({
 *   edge: 'left',
 *   minDistance: 50,
 *   onSwipe: (event) => navigation.goBack(),
 * });
 * ```
 */
export function useEdgeSwipe(config: UseEdgeSwipeConfig): void {
  const engineRef = useRef<GestureEngine | null>(null);
  const callbackRef = useRef(config.onSwipe);
  callbackRef.current = config.onSwipe;

  useEffect(() => {
    const engine = new GestureEngine({
      hapticEnabled: config.hapticEnabled ?? true,
      screenWidth: config.screenWidth,
      screenHeight: config.screenHeight,
    });

    const gestureName = `edge-swipe-${config.edge}`;

    const recognizer = new EdgeSwipeRecognizer(engine.eventBus, {
      edge: config.edge,
      minDistance: config.minDistance,
      edgeZoneWidth: config.edgeZoneWidth,
      minVelocity: config.minVelocity,
      screenWidth: config.screenWidth,
      screenHeight: config.screenHeight,
    });
    engine.registerRecognizer(recognizer);

    const action = new CustomAction(`${gestureName}-callback`, (event) => {
      callbackRef.current(event);
    });
    engine.registerAction(gestureName, action);

    if (config.hapticEnabled !== false) {
      engine.registerFeedback(new HapticFeedback(true));
    }

    engine.start();
    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.edge, config.minDistance, config.edgeZoneWidth, config.minVelocity]);
}
