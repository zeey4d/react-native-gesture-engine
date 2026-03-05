// ─── useGestureSequence ─────────────────────────────────────────────────────
// Convenience hook for gesture sequence detection.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react';
import { GestureEngine } from '../GestureEngine';
import { SequenceRecognizer } from '../recognition/sequence/SequenceRecognizer';
import { CustomAction } from '../actions/CustomAction';
import { HapticFeedback } from '../feedback/HapticFeedback';

export interface UseGestureSequenceConfig {
  /** Ordered gesture names to match */
  sequence: string[];
  /** Max time between steps in ms (default 800) */
  timeoutMs?: number;
  /** Callback when sequence is completed */
  onComplete: () => void;
  /** Enable haptic feedback (default true) */
  hapticEnabled?: boolean;
}

/**
 * Convenience hook for gesture sequence detection.
 *
 * @example
 * ```tsx
 * useGestureSequence({
 *   sequence: ['tap', 'tap', 'edge-swipe-right'],
 *   timeoutMs: 800,
 *   onComplete: () => console.log('Secret gesture unlocked!'),
 * });
 * ```
 */
export function useGestureSequence(config: UseGestureSequenceConfig): void {
  const engineRef = useRef<GestureEngine | null>(null);
  const callbackRef = useRef(config.onComplete);
  callbackRef.current = config.onComplete;

  useEffect(() => {
    const engine = new GestureEngine({
      hapticEnabled: config.hapticEnabled ?? true,
    });

    const sequenceName = `sequence:${config.sequence.join('>')}`;

    const recognizer = new SequenceRecognizer(engine.eventBus, {
      sequence: config.sequence,
      timeoutMs: config.timeoutMs,
    });
    engine.registerRecognizer(recognizer);

    const action = new CustomAction(`${sequenceName}-callback`, () => {
      callbackRef.current();
    });
    engine.registerAction(sequenceName, action);

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
  }, [config.sequence.join(','), config.timeoutMs]);
}
