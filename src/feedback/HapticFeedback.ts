// ─── HapticFeedback ─────────────────────────────────────────────────────────
// Uses expo-haptics for impact/notification/selection haptics.
// Falls back to react-native Vibration API if expo-haptics is unavailable.
// ─────────────────────────────────────────────────────────────────────────────

import { IFeedbackProvider, GestureEvent, RecognizerState } from '../core/types';

// Lazy imports — expo-haptics is an optional peer dependency
let Haptics: any;
let Vibration: any;

function loadModules() {
  try {
    Haptics = require('expo-haptics');
  } catch {
    // expo-haptics not installed — fall back to Vibration
  }
  try {
    const rn = require('react-native');
    Vibration = rn.Vibration;
  } catch {
    // react-native not available (testing)
  }
}

/**
 * HapticFeedback triggers haptic responses when gestures are recognized.
 *
 * Supports three haptic types (via expo-haptics):
 * - Impact: for gesture activations (tap, swipe)
 * - Notification: for important events (shake, sequence complete)
 * - Selection: for continuous feedback (pan, rotation)
 *
 * Falls back to react-native Vibration API when expo-haptics is not installed.
 */
export class HapticFeedback implements IFeedbackProvider {
  private _isSupported = false;
  private useVibrationFallback = false;
  private enabled: boolean;

  constructor(enabled = true) {
    this.enabled = enabled;
    loadModules();

    if (Haptics) {
      this._isSupported = true;
    } else if (Vibration) {
      this._isSupported = true;
      this.useVibrationFallback = true;
    }
  }

  get isSupported(): boolean {
    return this._isSupported && this.enabled;
  }

  trigger(event: GestureEvent): void {
    if (!this.isSupported) return;

    // Only trigger on Began and Ended states to avoid spam
    if (
      event.state !== RecognizerState.Began &&
      event.state !== RecognizerState.Ended
    ) {
      return;
    }

    if (this.useVibrationFallback) {
      Vibration?.vibrate(50);
      return;
    }

    // Choose haptic type based on gesture
    const gestureName = event.name;

    if (gestureName.startsWith('sequence:') || gestureName === 'shake') {
      // Notification haptic for important events
      Haptics?.notificationAsync?.(Haptics.NotificationFeedbackType?.Success);
    } else if (gestureName === 'tap' || gestureName === 'double-tap') {
      // Light impact for taps
      Haptics?.impactAsync?.(Haptics.ImpactFeedbackStyle?.Light);
    } else if (gestureName.startsWith('edge-swipe') || gestureName.startsWith('corner')) {
      // Medium impact for spatial gestures
      Haptics?.impactAsync?.(Haptics.ImpactFeedbackStyle?.Medium);
    } else {
      // Selection for continuous gestures
      Haptics?.selectionAsync?.();
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}
