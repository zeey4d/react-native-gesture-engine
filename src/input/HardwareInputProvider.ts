// ─── HardwareInputProvider ──────────────────────────────────────────────────
// Extensible stub for hardware button events (e.g., volume buttons on Android).
// Uses DeviceEventEmitter to listen for native module events.
// ─────────────────────────────────────────────────────────────────────────────

import {
  IInputProvider,
  IEventBus,
  EventChannel,
  InputType,
  HardwareData,
  InputEvent,
  generateId,
} from '../core/types';

// Lazy import — may not be available in all environments
let DeviceEventEmitter: any;

function loadEmitter() {
  try {
    const rn = require('react-native');
    DeviceEventEmitter = rn.DeviceEventEmitter;
  } catch {
    // React Native not available (testing or web)
  }
}

/**
 * HardwareInputProvider listens for hardware button events on Android
 * via DeviceEventEmitter and emits them as InputEvents.
 *
 * Note: This requires a companion native module to forward volume button
 * events. Without one, this provider is effectively a no-op stub that
 * demonstrates the extensibility of the input layer.
 *
 * To extend for custom hardware events:
 * 1. Create a native module that emits 'onHardwareKey' events
 * 2. The event payload should contain { key: string, action: 'down' | 'up' }
 */
export class HardwareInputProvider implements IInputProvider {
  private _isActive = false;
  private subscription: { remove(): void } | null = null;
  private eventName: string;

  constructor(
    private eventBus: IEventBus,
    eventName = 'onHardwareKey',
  ) {
    this.eventName = eventName;
    loadEmitter();
  }

  get isActive(): boolean {
    return this._isActive;
  }

  start(): void {
    if (this._isActive) return;
    this._isActive = true;

    if (!DeviceEventEmitter) {
      return;
    }

    this.subscription = DeviceEventEmitter.addListener(
      this.eventName,
      (data: { key: string; action: 'down' | 'up' }) => {
        if (!this._isActive) return;

        const hardwareData: HardwareData = {
          key: data.key,
          action: data.action,
        };

        const event: InputEvent = {
          id: generateId(),
          timestamp: Date.now(),
          inputType: InputType.Hardware,
          data: hardwareData,
        };

        this.eventBus.emit(EventChannel.InputRaw, event);
      },
    );
  }

  stop(): void {
    this._isActive = false;

    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }
  }
}
