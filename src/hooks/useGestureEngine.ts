// ─── useGestureEngine ───────────────────────────────────────────────────────
// Main React hook that creates and manages a GestureEngine instance.
// Lives outside the React tree render cycle for performance.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import { GestureEngine } from '../GestureEngine';
import {
  GestureEngineConfig,
  IRecognizer,
  IGestureAction,
  IFeedbackProvider,
} from '../core/types';

export interface UseGestureEngineConfig extends GestureEngineConfig {
  /**
   * Recognizer instances to register with the engine.
   * These are created outside the hook and passed in.
   */
  recognizers?: IRecognizer[];
  /**
   * Action mappings: gestureName → array of actions
   */
  actions?: Record<string, IGestureAction[]>;
  /**
   * Feedback providers to register
   */
  feedback?: IFeedbackProvider[];
}

export interface UseGestureEngineResult {
  /** The GestureEngine instance */
  engine: GestureEngine | null;
  /** Whether the engine is initialized and running */
  isReady: boolean;
}

/**
 * React hook that creates, configures, and manages a GestureEngine lifecycle.
 *
 * The engine is created once on mount and disposed on unmount.
 * Uses useRef to keep the engine outside the React render cycle.
 *
 * @example
 * ```tsx
 * const { engine, isReady } = useGestureEngine({
 *   sensorInterval: 100,
 *   hapticEnabled: true,
 *   recognizers: [shakeRecognizer, edgeSwipeRecognizer],
 *   actions: { 'shake': [myShakeAction] },
 * });
 * ```
 */
export function useGestureEngine(
  config: UseGestureEngineConfig = {},
): UseGestureEngineResult {
  const engineRef = useRef<GestureEngine | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Create engine
    const engine = new GestureEngine({
      sensorInterval: config.sensorInterval,
      hapticEnabled: config.hapticEnabled,
      debug: config.debug,
      screenWidth: config.screenWidth,
      screenHeight: config.screenHeight,
    });

    // Register recognizers
    if (config.recognizers) {
      for (const recognizer of config.recognizers) {
        engine.registerRecognizer(recognizer);
      }
    }

    // Register actions
    if (config.actions) {
      for (const [gestureName, actions] of Object.entries(config.actions)) {
        for (const action of actions) {
          engine.registerAction(gestureName, action);
        }
      }
    }

    // Register feedback providers
    if (config.feedback) {
      for (const provider of config.feedback) {
        engine.registerFeedback(provider);
      }
    }

    // Start the engine
    engine.start();
    engineRef.current = engine;
    setIsReady(true);

    // Cleanup on unmount
    return () => {
      engine.dispose();
      engineRef.current = null;
      setIsReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount — config changes require remounting

  return {
    engine: engineRef.current,
    isReady,
  };
}
