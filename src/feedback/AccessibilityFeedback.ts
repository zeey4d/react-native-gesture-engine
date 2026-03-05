// ─── AccessibilityFeedback ──────────────────────────────────────────────────
// Posts accessibility announcements when gestures are recognized.
// Uses AccessibilityInfo.announceForAccessibility() from React Native.
// ─────────────────────────────────────────────────────────────────────────────

import { IFeedbackProvider, GestureEvent, RecognizerState } from '../core/types';

// Lazy import
let AccessibilityInfo: any;

function loadAccessibility() {
  try {
    const rn = require('react-native');
    AccessibilityInfo = rn.AccessibilityInfo;
  } catch {
    // Not available
  }
}

/**
 * AccessibilityFeedback announces gesture events for screen reader users.
 *
 * Automatically generates human-readable announcements based on gesture names.
 * Custom announcement builders can be provided via setAnnouncementBuilder().
 */
export class AccessibilityFeedback implements IFeedbackProvider {
  private _isSupported = false;
  private announcementBuilder: ((event: GestureEvent) => string) | null = null;

  constructor() {
    loadAccessibility();
    this._isSupported = !!AccessibilityInfo?.announceForAccessibility;
  }

  get isSupported(): boolean {
    return this._isSupported;
  }

  trigger(event: GestureEvent): void {
    if (!this._isSupported) return;

    // Only announce on Ended state to avoid spam
    if (event.state !== RecognizerState.Ended) return;

    const announcement = this.announcementBuilder
      ? this.announcementBuilder(event)
      : this.defaultAnnouncement(event);

    AccessibilityInfo.announceForAccessibility(announcement);
  }

  /**
   * Set a custom function to build announcement strings.
   */
  setAnnouncementBuilder(builder: (event: GestureEvent) => string): void {
    this.announcementBuilder = builder;
  }

  /**
   * Generate a default human-readable announcement based on gesture name.
   */
  private defaultAnnouncement(event: GestureEvent): string {
    const name = event.name
      .replace(/-/g, ' ')
      .replace(/:/g, ' ')
      .replace(/>/g, ' then ');

    return `Gesture detected: ${name}`;
  }
}
