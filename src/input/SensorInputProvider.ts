// ─── SensorInputProvider ────────────────────────────────────────────────────
// Subscribes to Accelerometer and Gyroscope from expo-sensors and emits
// SensorData events on the EventBus. Supports configurable update intervals
// and lazy initialization (only subscribes when start() is called).
// ─────────────────────────────────────────────────────────────────────────────

import {
  IInputProvider,
  IEventBus,
  EventChannel,
  InputType,
  SensorType,
  SensorData,
  InputEvent,
  generateId,
} from '../core/types';

// Lazy imports — expo-sensors is a peer dependency
let Accelerometer: any;
let Gyroscope: any;

function loadSensorModules() {
  try {
    const sensors = require('expo-sensors');
    Accelerometer = sensors.Accelerometer;
    Gyroscope = sensors.Gyroscope;
  } catch {
    console.warn(
      '[GestureEngine] expo-sensors not found. SensorInputProvider will not function.',
    );
  }
}

/**
 * SensorInputProvider subscribes to device accelerometer and gyroscope
 * and emits normalized SensorData events.
 *
 * Performance considerations:
 * - Default update interval is 100ms (10Hz) — configurable, capped at ~60Hz.
 * - Subscriptions are lazily created and cleaned up on stop().
 * - Data is emitted as-is; filtering happens in the Processing layer.
 */
export class SensorInputProvider implements IInputProvider {
  private _isActive = false;
  private accelSubscription: { remove(): void } | null = null;
  private gyroSubscription: { remove(): void } | null = null;
  private updateIntervalMs: number;

  constructor(
    private eventBus: IEventBus,
    updateIntervalMs = 100,
  ) {
    // Clamp to minimum 16ms (~60Hz) to prevent battery drain
    this.updateIntervalMs = Math.max(16, updateIntervalMs);
    loadSensorModules();
  }

  get isActive(): boolean {
    return this._isActive;
  }

  start(): void {
    if (this._isActive) return;
    this._isActive = true;

    if (!Accelerometer || !Gyroscope) {
      console.warn('[GestureEngine] Sensors unavailable. Skipping sensor subscriptions.');
      return;
    }

    // Configure update intervals
    Accelerometer.setUpdateInterval(this.updateIntervalMs);
    Gyroscope.setUpdateInterval(this.updateIntervalMs);

    // Subscribe to accelerometer
    this.accelSubscription = Accelerometer.addListener(
      (data: { x: number; y: number; z: number }) => {
        if (!this._isActive) return;

        const sensorData: SensorData = {
          type: SensorType.Accelerometer,
          x: data.x,
          y: data.y,
          z: data.z,
        };

        const event: InputEvent = {
          id: generateId(),
          timestamp: Date.now(),
          inputType: InputType.Sensor,
          data: sensorData,
        };

        this.eventBus.emit(EventChannel.InputRaw, event);
      },
    );

    // Subscribe to gyroscope
    this.gyroSubscription = Gyroscope.addListener(
      (data: { x: number; y: number; z: number }) => {
        if (!this._isActive) return;

        const sensorData: SensorData = {
          type: SensorType.Gyroscope,
          x: data.x,
          y: data.y,
          z: data.z,
        };

        const event: InputEvent = {
          id: generateId(),
          timestamp: Date.now(),
          inputType: InputType.Sensor,
          data: sensorData,
        };

        this.eventBus.emit(EventChannel.InputRaw, event);
      },
    );
  }

  stop(): void {
    this._isActive = false;

    if (this.accelSubscription) {
      this.accelSubscription.remove();
      this.accelSubscription = null;
    }

    if (this.gyroSubscription) {
      this.gyroSubscription.remove();
      this.gyroSubscription = null;
    }
  }
}
