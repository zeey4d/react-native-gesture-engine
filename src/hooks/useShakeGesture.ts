// ─── useShakeGesture ────────────────────────────────────────────────────────
// Convenience hook for shake detection. Creates a self-contained
// GestureEngine with a ShakeRecognizer + CustomAction.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react';
import { GestureEngine } from '../GestureEngine';
import { ShakeRecognizer } from '../recognition/sensor/ShakeRecognizer';
import { CustomAction } from '../actions/CustomAction';
import { HapticFeedback } from '../feedback/HapticFeedback';
import { EventBus } from '../core/EventBus';

export interface UseShakeGestureConfig {
  /** Acceleration threshold in g (default 1.5) */
  threshold?: number;
  /** Cooldown in ms (default 1000) */
  cooldownMs?: number;
  /** Callback when shake is detected */
  onShake: () => void;
  /** Enable haptic feedback (default true) */
  hapticEnabled?: boolean;
  /** Sensor polling interval in ms (default 100) */
  sensorInterval?: number;
}

/**
 * Convenience hook for shake gesture detection.
 *
 * Creates a minimal GestureEngine with just a ShakeRecognizer.
 * Ideal for simple use cases where you just need shake detection.
 *
 * @example
 * ```tsx
 * useShakeGesture({
 *   threshold: 1.5,
 *   cooldownMs: 1000,
 *   onShake: () => console.log('Device shaken!'),
 * });
 * ```
 */
export function useShakeGesture(config: UseShakeGestureConfig): void {
  const engineRef = useRef<GestureEngine | null>(null);
  const callbackRef = useRef(config.onShake);

  // Keep callback ref current without re-creating the engine
  callbackRef.current = config.onShake;

  useEffect(() => {
    const engine = new GestureEngine({
      sensorInterval: config.sensorInterval ?? 100,
      hapticEnabled: config.hapticEnabled ?? true,
    });

    // Create shake recognizer
    const shakeRecognizer = new ShakeRecognizer(engine.eventBus, {
      threshold: config.threshold,
      cooldownMs: config.cooldownMs,
    });
    engine.registerRecognizer(shakeRecognizer);

    // Register action
    const action = new CustomAction('shake-callback', () => {
      callbackRef.current();
    });
    engine.registerAction('shake', action);

    // Add haptic feedback if enabled
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
  }, [config.threshold, config.cooldownMs, config.sensorInterval]);
}
