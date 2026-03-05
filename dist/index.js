'use strict';

var react = require('react');

var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// src/core/EventBus.ts
var EventBus = class {
  constructor() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.listeners = /* @__PURE__ */ new Map();
  }
  /**
   * Subscribe to a channel. Returns an unsubscribe function.
   *
   * @example
   * const unsub = bus.on(EventChannel.InputRaw, (event) => { ... });
   * // later:
   * unsub();
   */
  on(channel, handler) {
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, /* @__PURE__ */ new Set());
    }
    this.listeners.get(channel).add(handler);
    return () => this.off(channel, handler);
  }
  /**
   * Emit data on a channel. All registered handlers are called synchronously.
   * The generic parameter ensures the data type matches the channel.
   */
  emit(channel, data) {
    const handlers = this.listeners.get(channel);
    if (!handlers) return;
    for (const handler of Array.from(handlers)) {
      try {
        handler(data);
      } catch (error) {
        if (typeof __DEV__ !== "undefined" && __DEV__) {
          console.error(`[EventBus] Error in handler for ${channel}:`, error);
        }
      }
    }
  }
  /**
   * Remove a specific handler from a channel.
   */
  off(channel, handler) {
    const handlers = this.listeners.get(channel);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.listeners.delete(channel);
      }
    }
  }
  /**
   * Remove all handlers from all channels. Called during engine teardown.
   */
  clear() {
    this.listeners.clear();
  }
};

// src/core/types.ts
var InputType = /* @__PURE__ */ ((InputType2) => {
  InputType2["Touch"] = "touch";
  InputType2["Sensor"] = "sensor";
  InputType2["Hardware"] = "hardware";
  InputType2["Camera"] = "camera";
  return InputType2;
})(InputType || {});
var TouchType = /* @__PURE__ */ ((TouchType2) => {
  TouchType2["Pan"] = "pan";
  TouchType2["Tap"] = "tap";
  TouchType2["Pinch"] = "pinch";
  TouchType2["Rotation"] = "rotation";
  return TouchType2;
})(TouchType || {});
var SensorType = /* @__PURE__ */ ((SensorType2) => {
  SensorType2["Accelerometer"] = "accelerometer";
  SensorType2["Gyroscope"] = "gyroscope";
  return SensorType2;
})(SensorType || {});
var CardinalDirection = /* @__PURE__ */ ((CardinalDirection3) => {
  CardinalDirection3["Up"] = "up";
  CardinalDirection3["Down"] = "down";
  CardinalDirection3["Left"] = "left";
  CardinalDirection3["Right"] = "right";
  CardinalDirection3["UpLeft"] = "up-left";
  CardinalDirection3["UpRight"] = "up-right";
  CardinalDirection3["DownLeft"] = "down-left";
  CardinalDirection3["DownRight"] = "down-right";
  CardinalDirection3["None"] = "none";
  return CardinalDirection3;
})(CardinalDirection || {});
var RecognizerState = /* @__PURE__ */ ((RecognizerState2) => {
  RecognizerState2["Idle"] = "idle";
  RecognizerState2["Possible"] = "possible";
  RecognizerState2["Began"] = "began";
  RecognizerState2["Changed"] = "changed";
  RecognizerState2["Ended"] = "ended";
  RecognizerState2["Failed"] = "failed";
  RecognizerState2["Cancelled"] = "cancelled";
  return RecognizerState2;
})(RecognizerState || {});
var EventChannel = /* @__PURE__ */ ((EventChannel2) => {
  EventChannel2["InputRaw"] = "input:raw";
  EventChannel2["ProcessingSample"] = "processing:sample";
  EventChannel2["RecognitionGesture"] = "recognition:gesture";
  EventChannel2["ConflictResolved"] = "conflict:resolved";
  EventChannel2["ActionDispatched"] = "action:dispatched";
  return EventChannel2;
})(EventChannel || {});
function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// src/input/TouchInputProvider.ts
var TouchInputProvider = class {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this._isActive = false;
  }
  get isActive() {
    return this._isActive;
  }
  start() {
    this._isActive = true;
  }
  stop() {
    this._isActive = false;
  }
  /**
   * Called from RNGH Pan gesture callbacks.
   * Emits normalized TouchData with translation and velocity.
   */
  onPan(data) {
    if (!this._isActive) return;
    const touchData = {
      type: "pan" /* Pan */,
      x: data.x,
      y: data.y,
      translationX: data.translationX,
      translationY: data.translationY,
      velocityX: data.velocityX,
      velocityY: data.velocityY,
      scale: 1,
      rotation: 0,
      numberOfPointers: data.numberOfPointers
    };
    this.emitInput(touchData);
  }
  /**
   * Called from RNGH Tap gesture callbacks.
   */
  onTap(data) {
    if (!this._isActive) return;
    const touchData = {
      type: "tap" /* Tap */,
      x: data.x,
      y: data.y,
      translationX: 0,
      translationY: 0,
      velocityX: 0,
      velocityY: 0,
      scale: 1,
      rotation: 0,
      numberOfPointers: data.numberOfPointers
    };
    this.emitInput(touchData);
  }
  /**
   * Called from RNGH Pinch gesture callbacks.
   */
  onPinch(data) {
    if (!this._isActive) return;
    const touchData = {
      type: "pinch" /* Pinch */,
      x: data.focalX,
      y: data.focalY,
      translationX: 0,
      translationY: 0,
      velocityX: 0,
      velocityY: data.velocity,
      scale: data.scale,
      rotation: 0,
      numberOfPointers: data.numberOfPointers
    };
    this.emitInput(touchData);
  }
  /**
   * Called from RNGH Rotation gesture callbacks.
   */
  onRotation(data) {
    if (!this._isActive) return;
    const touchData = {
      type: "rotation" /* Rotation */,
      x: data.anchorX,
      y: data.anchorY,
      translationX: 0,
      translationY: 0,
      velocityX: 0,
      velocityY: data.velocity,
      scale: 1,
      rotation: data.rotation,
      numberOfPointers: data.numberOfPointers
    };
    this.emitInput(touchData);
  }
  /** Emit a normalized InputEvent onto the EventBus */
  emitInput(touchData) {
    const event = {
      id: generateId(),
      timestamp: Date.now(),
      inputType: "touch" /* Touch */,
      data: touchData
    };
    this.eventBus.emit("input:raw" /* InputRaw */, event);
  }
};

// src/input/SensorInputProvider.ts
var Accelerometer;
var Gyroscope;
function loadSensorModules() {
  try {
    const sensors = __require("expo-sensors");
    Accelerometer = sensors.Accelerometer;
    Gyroscope = sensors.Gyroscope;
  } catch {
    console.warn(
      "[GestureEngine] expo-sensors not found. SensorInputProvider will not function."
    );
  }
}
var SensorInputProvider = class {
  constructor(eventBus, updateIntervalMs = 100) {
    this.eventBus = eventBus;
    this._isActive = false;
    this.accelSubscription = null;
    this.gyroSubscription = null;
    this.updateIntervalMs = Math.max(16, updateIntervalMs);
    loadSensorModules();
  }
  get isActive() {
    return this._isActive;
  }
  start() {
    if (this._isActive) return;
    this._isActive = true;
    if (!Accelerometer || !Gyroscope) {
      console.warn("[GestureEngine] Sensors unavailable. Skipping sensor subscriptions.");
      return;
    }
    Accelerometer.setUpdateInterval(this.updateIntervalMs);
    Gyroscope.setUpdateInterval(this.updateIntervalMs);
    this.accelSubscription = Accelerometer.addListener(
      (data) => {
        if (!this._isActive) return;
        const sensorData = {
          type: "accelerometer" /* Accelerometer */,
          x: data.x,
          y: data.y,
          z: data.z
        };
        const event = {
          id: generateId(),
          timestamp: Date.now(),
          inputType: "sensor" /* Sensor */,
          data: sensorData
        };
        this.eventBus.emit("input:raw" /* InputRaw */, event);
      }
    );
    this.gyroSubscription = Gyroscope.addListener(
      (data) => {
        if (!this._isActive) return;
        const sensorData = {
          type: "gyroscope" /* Gyroscope */,
          x: data.x,
          y: data.y,
          z: data.z
        };
        const event = {
          id: generateId(),
          timestamp: Date.now(),
          inputType: "sensor" /* Sensor */,
          data: sensorData
        };
        this.eventBus.emit("input:raw" /* InputRaw */, event);
      }
    );
  }
  stop() {
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
};

// src/input/HardwareInputProvider.ts
var DeviceEventEmitter;
function loadEmitter() {
  try {
    const rn = __require("react-native");
    DeviceEventEmitter = rn.DeviceEventEmitter;
  } catch {
  }
}
var HardwareInputProvider = class {
  constructor(eventBus, eventName = "onHardwareKey") {
    this.eventBus = eventBus;
    this._isActive = false;
    this.subscription = null;
    this.eventName = eventName;
    loadEmitter();
  }
  get isActive() {
    return this._isActive;
  }
  start() {
    if (this._isActive) return;
    this._isActive = true;
    if (!DeviceEventEmitter) {
      return;
    }
    this.subscription = DeviceEventEmitter.addListener(
      this.eventName,
      (data) => {
        if (!this._isActive) return;
        const hardwareData = {
          key: data.key,
          action: data.action
        };
        const event = {
          id: generateId(),
          timestamp: Date.now(),
          inputType: "hardware" /* Hardware */,
          data: hardwareData
        };
        this.eventBus.emit("input:raw" /* InputRaw */, event);
      }
    );
  }
  stop() {
    this._isActive = false;
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }
  }
};

// src/input/CameraInputProvider.ts
var CameraInputProvider = class {
  // EventBus stored for future use when camera input is implemented
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(eventBus) {
    this.eventBus = eventBus;
    this._isActive = false;
  }
  get isActive() {
    return this._isActive;
  }
  start() {
    this._isActive = true;
  }
  stop() {
    this._isActive = false;
  }
};

// src/processing/NoiseFilter.ts
var NoiseFilter = class {
  /**
   * @param alpha - Filter coefficient [0, 1]. Default 0.8.
   *  - For low-pass: 0.1 = very smooth, 0.9 = barely filtered
   *  - For high-pass: same alpha applied to the underlying low-pass
   */
  constructor(alpha = 0.8) {
    this.lowPassState = null;
    this.alpha = Math.max(0, Math.min(1, alpha));
  }
  /**
   * Apply low-pass filter. Removes high-frequency jitter.
   */
  lowPass(x, y, z) {
    if (this.lowPassState === null) {
      this.lowPassState = { x, y, z };
      return { x, y, z };
    }
    const prev = this.lowPassState;
    const filtered = {
      x: this.alpha * x + (1 - this.alpha) * prev.x,
      y: this.alpha * y + (1 - this.alpha) * prev.y,
      z: this.alpha * z + (1 - this.alpha) * prev.z
    };
    this.lowPassState = filtered;
    return filtered;
  }
  /**
   * Apply high-pass filter. Removes low-frequency components (gravity).
   * Returns only the dynamic/transient part of the signal.
   */
  highPass(x, y, z) {
    const low = this.lowPass(x, y, z);
    return {
      x: x - low.x,
      y: y - low.y,
      z: z - low.z
    };
  }
  /**
   * Reset filter state. Call when starting a new gesture or after a pause.
   */
  reset() {
    this.lowPassState = null;
  }
  /**
   * Update alpha dynamically (e.g., for adaptive filtering).
   */
  setAlpha(alpha) {
    this.alpha = Math.max(0, Math.min(1, alpha));
  }
};

// src/processing/VelocityCalculator.ts
var VelocityCalculator = class {
  constructor() {
    this.prevX = null;
    this.prevY = null;
    this.prevTimestamp = null;
  }
  /**
   * Calculate velocity from a new position sample.
   *
   * @param x - Current X position
   * @param y - Current Y position
   * @param timestamp - Current timestamp in milliseconds
   * @returns Velocity components and magnitude
   */
  calculate(x, y, timestamp) {
    if (this.prevX === null || this.prevY === null || this.prevTimestamp === null) {
      this.prevX = x;
      this.prevY = y;
      this.prevTimestamp = timestamp;
      return { velocityX: 0, velocityY: 0, velocity: 0 };
    }
    const dt = timestamp - this.prevTimestamp;
    if (dt <= 0) {
      return { velocityX: 0, velocityY: 0, velocity: 0 };
    }
    const dx = x - this.prevX;
    const dy = y - this.prevY;
    const velocityX = dx / dt;
    const velocityY = dy / dt;
    const velocity = Math.sqrt(velocityX * velocityX + velocityY * velocityY);
    this.prevX = x;
    this.prevY = y;
    this.prevTimestamp = timestamp;
    return { velocityX, velocityY, velocity };
  }
  /**
   * Reset state. Call when starting a new gesture.
   */
  reset() {
    this.prevX = null;
    this.prevY = null;
    this.prevTimestamp = null;
  }
};

// src/processing/AngleDetector.ts
var AngleDetector = class {
  /**
   * Calculate angle from X/Y deltas.
   *
   * @param dx - Change in X (positive = right)
   * @param dy - Change in Y (positive = down in screen coords)
   * @returns Angle in radians, degrees, and cardinal direction
   */
  calculate(dx, dy) {
    if (dx === 0 && dy === 0) {
      return {
        angleRadians: 0,
        angleDegrees: 0,
        direction: "none" /* None */
      };
    }
    const angleRadians = Math.atan2(dy, dx);
    const angleDegrees = angleRadians * 180 / Math.PI;
    const direction = this.classifyDirection(angleDegrees);
    return { angleRadians, angleDegrees, direction };
  }
  /**
   * Classify angle (in degrees) into 8 cardinal directions.
   * Uses 45° sectors centered on each direction.
   *
   * Sectors (in screen coordinates where Y grows down):
   *   Right:      -22.5° to 22.5°
   *   DownRight:   22.5° to 67.5°
   *   Down:        67.5° to 112.5°
   *   DownLeft:   112.5° to 157.5°
   *   Left:       157.5° to 180° or -180° to -157.5°
   *   UpLeft:    -157.5° to -112.5°
   *   Up:        -112.5° to -67.5°
   *   UpRight:    -67.5° to -22.5°
   */
  classifyDirection(degrees) {
    const d = degrees;
    if (d >= -22.5 && d < 22.5) return "right" /* Right */;
    if (d >= 22.5 && d < 67.5) return "down-right" /* DownRight */;
    if (d >= 67.5 && d < 112.5) return "down" /* Down */;
    if (d >= 112.5 && d < 157.5) return "down-left" /* DownLeft */;
    if (d >= 157.5 || d < -157.5) return "left" /* Left */;
    if (d >= -157.5 && d < -112.5) return "up-left" /* UpLeft */;
    if (d >= -112.5 && d < -67.5) return "up" /* Up */;
    if (d >= -67.5 && d < -22.5) return "up-right" /* UpRight */;
    return "none" /* None */;
  }
};

// src/processing/ThresholdNormalizer.ts
var ThresholdNormalizer = class {
  /**
   * @param min - Minimum threshold. Values at or below this map to 0.
   * @param max - Maximum threshold. Values at or above this map to 1.
   */
  constructor(min = 0, max = 1) {
    if (min >= max) {
      throw new Error(
        `[ThresholdNormalizer] min (${min}) must be less than max (${max})`
      );
    }
    this.min = min;
    this.max = max;
  }
  /**
   * Normalize a raw value to [0, 1].
   */
  normalize(value) {
    if (value <= this.min) return 0;
    if (value >= this.max) return 1;
    return (value - this.min) / (this.max - this.min);
  }
  /**
   * Update thresholds dynamically.
   */
  setRange(min, max) {
    if (min >= max) {
      throw new Error(
        `[ThresholdNormalizer] min (${min}) must be less than max (${max})`
      );
    }
    this.min = min;
    this.max = max;
  }
  /**
   * Get current min threshold.
   */
  getMin() {
    return this.min;
  }
  /**
   * Get current max threshold.
   */
  getMax() {
    return this.max;
  }
};

// src/processing/StreamBuffer.ts
var StreamBuffer = class {
  /**
   * @param windowMs - Time window in ms. Samples older than this are evicted. Default 400.
   * @param capacity - Maximum buffer size. Default 64 (~1 sec at 60Hz).
   */
  constructor(windowMs = 400, capacity = 64) {
    this.head = 0;
    this.count = 0;
    this.windowMs = windowMs;
    this.capacity = capacity;
    this.buffer = new Array(capacity).fill(null);
  }
  /**
   * Push a new sample. Automatically evicts stale samples.
   * O(1) amortized.
   */
  push(sample) {
    const writeIndex = (this.head + this.count) % this.capacity;
    if (this.count === this.capacity) {
      this.buffer[this.head] = sample;
      this.head = (this.head + 1) % this.capacity;
    } else {
      this.buffer[writeIndex] = sample;
      this.count++;
    }
    this.evictStale(sample.timestamp);
  }
  /**
   * Get all non-stale samples in chronological order.
   */
  getAll() {
    const result = [];
    for (let i = 0; i < this.count; i++) {
      const index = (this.head + i) % this.capacity;
      const sample = this.buffer[index];
      if (sample) {
        result.push(sample);
      }
    }
    return result;
  }
  /**
   * Get the most recent sample, or null if buffer is empty.
   */
  latest() {
    if (this.count === 0) return null;
    const index = (this.head + this.count - 1) % this.capacity;
    return this.buffer[index];
  }
  /**
   * Get the number of samples currently in the buffer.
   */
  size() {
    return this.count;
  }
  /**
   * Clear the buffer.
   */
  clear() {
    this.buffer.fill(null);
    this.head = 0;
    this.count = 0;
  }
  /**
   * Remove samples older than windowMs from the head.
   */
  evictStale(currentTimestamp) {
    const cutoff = currentTimestamp - this.windowMs;
    while (this.count > 0) {
      const sample = this.buffer[this.head];
      if (sample && sample.timestamp < cutoff) {
        this.buffer[this.head] = null;
        this.head = (this.head + 1) % this.capacity;
        this.count--;
      } else {
        break;
      }
    }
  }
};

// src/recognition/base/BaseRecognizer.ts
var BaseRecognizer = class {
  constructor(name, eventBus, options = {}) {
    this._state = "idle" /* Idle */;
    this.id = generateId();
    this.name = name;
    this.eventBus = eventBus;
    this.priority = options.priority ?? 100;
    this.isExclusive = options.isExclusive ?? false;
    this.enabled = options.enabled ?? true;
  }
  get state() {
    return this._state;
  }
  /**
   * Reset the recognizer to Idle state.
   */
  reset() {
    this._state = "idle" /* Idle */;
  }
  /**
   * Clean up resources. Override in subclasses for custom cleanup.
   */
  dispose() {
    this.reset();
  }
  // ─── Protected: state transition helpers ────────────────────────────
  /**
   * Transition to Possible state (gesture might be starting).
   */
  transitionToPossible() {
    if (this._state === "idle" /* Idle */) {
      this._state = "possible" /* Possible */;
    }
  }
  /**
   * Transition to Began state and emit gesture event.
   * Only valid from Possible state.
   */
  transitionToBegan(metadata = {}) {
    if (this._state === "possible" /* Possible */) {
      this._state = "began" /* Began */;
      this.emitGestureEvent(metadata);
    }
  }
  /**
   * Transition to Changed state and emit gesture event.
   * Only valid from Began or Changed state (continuous gestures).
   */
  transitionToChanged(metadata = {}) {
    if (this._state === "began" /* Began */ || this._state === "changed" /* Changed */) {
      this._state = "changed" /* Changed */;
      this.emitGestureEvent(metadata);
    }
  }
  /**
   * Transition to Ended state and emit gesture event.
   * Valid from Began, Changed, or Possible states.
   */
  transitionToEnded(metadata = {}) {
    if (this._state === "began" /* Began */ || this._state === "changed" /* Changed */ || this._state === "possible" /* Possible */) {
      this._state = "ended" /* Ended */;
      this.emitGestureEvent(metadata);
      this._state = "idle" /* Idle */;
    }
  }
  /**
   * Transition to Failed state (gesture didn't match criteria).
   * Auto-resets to Idle.
   */
  transitionToFailed() {
    if (this._state === "possible" /* Possible */ || this._state === "began" /* Began */) {
      this._state = "failed" /* Failed */;
      this._state = "idle" /* Idle */;
    }
  }
  /**
   * Transition to Cancelled state (gesture was interrupted).
   * Auto-resets to Idle.
   */
  transitionToCancelled() {
    if (this._state === "began" /* Began */ || this._state === "changed" /* Changed */) {
      this._state = "cancelled" /* Cancelled */;
      this.emitGestureEvent({});
      this._state = "idle" /* Idle */;
    }
  }
  /**
   * Emit a GestureEvent on the RecognitionGesture channel.
   */
  emitGestureEvent(metadata) {
    const event = {
      id: generateId(),
      name: this.name,
      state: this._state,
      priority: this.priority,
      isExclusive: this.isExclusive,
      timestamp: Date.now(),
      metadata
    };
    this.eventBus.emit("recognition:gesture" /* RecognitionGesture */, event);
  }
};

// src/recognition/discrete/TapRecognizer.ts
var TapRecognizer = class extends BaseRecognizer {
  constructor(eventBus, config = {}) {
    super("tap", eventBus, {
      priority: config.priority ?? 10,
      isExclusive: config.isExclusive ?? false,
      enabled: config.enabled
    });
    this.startTime = null;
    this.startX = null;
    this.startY = null;
    this.maxDuration = config.maxDuration ?? 300;
    this.maxDistance = config.maxDistance ?? 10;
  }
  onProcessedSample(sample) {
    if (!this.enabled) return;
    const { inputEvent } = sample;
    if (inputEvent.inputType !== "touch" /* Touch */) return;
    const touchData = inputEvent.data;
    if (touchData.type !== "tap" /* Tap */ && touchData.type !== "pan" /* Pan */) return;
    if (touchData.type === "tap" /* Tap */) {
      this.transitionToPossible();
      this.transitionToBegan({
        translation: { x: touchData.x, y: touchData.y }
      });
      this.transitionToEnded({
        translation: { x: touchData.x, y: touchData.y }
      });
      return;
    }
    if (this.startTime === null) {
      this.startTime = inputEvent.timestamp;
      this.startX = touchData.x;
      this.startY = touchData.y;
      this.transitionToPossible();
      return;
    }
    const elapsed = inputEvent.timestamp - this.startTime;
    const dx = touchData.x - (this.startX ?? 0);
    const dy = touchData.y - (this.startY ?? 0);
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > this.maxDistance) {
      this.transitionToFailed();
      this.resetState();
      return;
    }
    if (elapsed > this.maxDuration) {
      this.transitionToFailed();
      this.resetState();
      return;
    }
    if (Math.abs(touchData.velocityX) < 0.01 && Math.abs(touchData.velocityY) < 0.01 && elapsed > 20) {
      this.transitionToBegan({
        translation: { x: this.startX ?? 0, y: this.startY ?? 0 }
      });
      this.transitionToEnded({
        translation: { x: touchData.x, y: touchData.y }
      });
      this.resetState();
    }
  }
  reset() {
    super.reset();
    this.resetState();
  }
  resetState() {
    this.startTime = null;
    this.startX = null;
    this.startY = null;
  }
};

// src/recognition/discrete/DoubleTapRecognizer.ts
var DoubleTapRecognizer = class extends BaseRecognizer {
  constructor(eventBus, config = {}) {
    super("double-tap", eventBus, {
      priority: config.priority ?? 5,
      isExclusive: config.isExclusive ?? false,
      enabled: config.enabled
    });
    this.firstTapTime = null;
    this.firstTapX = null;
    this.firstTapY = null;
    this.tapCount = 0;
    this.maxInterval = config.maxInterval ?? 300;
    this.maxDistance = config.maxDistance ?? 30;
  }
  onProcessedSample(sample) {
    if (!this.enabled) return;
    const { inputEvent } = sample;
    if (inputEvent.inputType !== "touch" /* Touch */) return;
    const touchData = inputEvent.data;
    if (touchData.type !== "tap" /* Tap */) return;
    const now = inputEvent.timestamp;
    if (this.tapCount === 0) {
      this.firstTapTime = now;
      this.firstTapX = touchData.x;
      this.firstTapY = touchData.y;
      this.tapCount = 1;
      this.transitionToPossible();
      return;
    }
    if (this.tapCount === 1) {
      const elapsed = now - (this.firstTapTime ?? 0);
      const dx = touchData.x - (this.firstTapX ?? 0);
      const dy = touchData.y - (this.firstTapY ?? 0);
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (elapsed <= this.maxInterval && distance <= this.maxDistance) {
        this.transitionToBegan({
          translation: { x: touchData.x, y: touchData.y }
        });
        this.transitionToEnded({
          translation: { x: touchData.x, y: touchData.y }
        });
        this.resetState();
      } else {
        this.transitionToFailed();
        this.firstTapTime = now;
        this.firstTapX = touchData.x;
        this.firstTapY = touchData.y;
        this.tapCount = 1;
        this.transitionToPossible();
      }
    }
  }
  reset() {
    super.reset();
    this.resetState();
  }
  resetState() {
    this.firstTapTime = null;
    this.firstTapX = null;
    this.firstTapY = null;
    this.tapCount = 0;
  }
};

// src/recognition/continuous/PanRecognizer.ts
var PanRecognizer = class extends BaseRecognizer {
  constructor(eventBus, config = {}) {
    super("pan", eventBus, {
      priority: config.priority ?? 50,
      isExclusive: config.isExclusive ?? false,
      enabled: config.enabled
    });
    this.minDistance = config.minDistance ?? 10;
  }
  onProcessedSample(sample) {
    if (!this.enabled) return;
    const { inputEvent } = sample;
    if (inputEvent.inputType !== "touch" /* Touch */) return;
    const touchData = inputEvent.data;
    if (touchData.type !== "pan" /* Pan */) return;
    const translation = {
      x: touchData.translationX,
      y: touchData.translationY
    };
    const distance = Math.sqrt(
      translation.x * translation.x + translation.y * translation.y
    );
    const velocity = {
      x: touchData.velocityX,
      y: touchData.velocityY
    };
    if (this.state === "idle" || this.state === "possible") {
      this.transitionToPossible();
      if (distance >= this.minDistance) {
        this.transitionToBegan({ translation, velocity });
      }
      return;
    }
    if (this.state === "began" || this.state === "changed") {
      if (Math.abs(touchData.velocityX) < 1e-3 && Math.abs(touchData.velocityY) < 1e-3) {
        this.transitionToEnded({ translation, velocity });
      } else {
        this.transitionToChanged({ translation, velocity });
      }
    }
  }
};

// src/recognition/continuous/PinchRecognizer.ts
var PinchRecognizer = class extends BaseRecognizer {
  constructor(eventBus, config = {}) {
    super("pinch", eventBus, {
      priority: config.priority ?? 40,
      isExclusive: config.isExclusive ?? false,
      enabled: config.enabled
    });
    this.minScale = config.minScale ?? 0.05;
  }
  onProcessedSample(sample) {
    if (!this.enabled) return;
    const { inputEvent } = sample;
    if (inputEvent.inputType !== "touch" /* Touch */) return;
    const touchData = inputEvent.data;
    if (touchData.type !== "pinch" /* Pinch */) return;
    const scaleDelta = Math.abs(touchData.scale - 1);
    if (this.state === "idle" || this.state === "possible") {
      this.transitionToPossible();
      if (scaleDelta >= this.minScale) {
        this.transitionToBegan({ scale: touchData.scale });
      }
      return;
    }
    if (this.state === "began" || this.state === "changed") {
      if (touchData.numberOfPointers < 2) {
        this.transitionToEnded({ scale: touchData.scale });
      } else {
        this.transitionToChanged({ scale: touchData.scale });
      }
    }
  }
};

// src/recognition/continuous/RotationRecognizer.ts
var RotationRecognizer = class extends BaseRecognizer {
  constructor(eventBus, config = {}) {
    super("rotation", eventBus, {
      priority: config.priority ?? 45,
      isExclusive: config.isExclusive ?? false,
      enabled: config.enabled
    });
    this.minRotation = config.minRotation ?? 0.05;
  }
  onProcessedSample(sample) {
    if (!this.enabled) return;
    const { inputEvent } = sample;
    if (inputEvent.inputType !== "touch" /* Touch */) return;
    const touchData = inputEvent.data;
    if (touchData.type !== "rotation" /* Rotation */) return;
    const rotationAbs = Math.abs(touchData.rotation);
    if (this.state === "idle" || this.state === "possible") {
      this.transitionToPossible();
      if (rotationAbs >= this.minRotation) {
        this.transitionToBegan({ rotation: touchData.rotation });
      }
      return;
    }
    if (this.state === "began" || this.state === "changed") {
      if (touchData.numberOfPointers < 2) {
        this.transitionToEnded({ rotation: touchData.rotation });
      } else {
        this.transitionToChanged({ rotation: touchData.rotation });
      }
    }
  }
};

// src/recognition/spatial/EdgeSwipeRecognizer.ts
var EdgeSwipeRecognizer = class extends BaseRecognizer {
  constructor(eventBus, config) {
    super(`edge-swipe-${config.edge}`, eventBus, {
      priority: config.priority ?? 20,
      isExclusive: config.isExclusive ?? true,
      enabled: config.enabled
    });
    this.startedInEdge = false;
    this.startX = null;
    this.startY = null;
    this.edge = config.edge;
    this.edgeZoneWidth = config.edgeZoneWidth ?? 30;
    this.minDistance = config.minDistance ?? 50;
    this.minVelocity = config.minVelocity ?? 0.3;
    this.screenWidth = config.screenWidth ?? 400;
    this.screenHeight = config.screenHeight ?? 800;
  }
  onProcessedSample(sample) {
    if (!this.enabled) return;
    const { inputEvent } = sample;
    if (inputEvent.inputType !== "touch" /* Touch */) return;
    const touchData = inputEvent.data;
    if (touchData.type !== "pan" /* Pan */) return;
    if (this.startX === null) {
      this.startX = touchData.x;
      this.startY = touchData.y;
      this.startedInEdge = this.isInEdgeZone(touchData.x, touchData.y);
      if (this.startedInEdge) {
        this.transitionToPossible();
      }
      return;
    }
    if (!this.startedInEdge) return;
    const swipeDistance = this.getSwipeDistance(touchData);
    const swipeVelocity = this.getSwipeVelocity(touchData);
    if (this.state === "possible") {
      if (swipeDistance >= this.minDistance && swipeVelocity >= this.minVelocity) {
        this.transitionToBegan({
          edge: this.edge,
          translation: {
            x: touchData.translationX,
            y: touchData.translationY
          },
          velocity: {
            x: touchData.velocityX,
            y: touchData.velocityY
          }
        });
        this.transitionToEnded({
          edge: this.edge,
          translation: {
            x: touchData.translationX,
            y: touchData.translationY
          },
          velocity: {
            x: touchData.velocityX,
            y: touchData.velocityY
          }
        });
        this.resetState();
      }
    }
  }
  reset() {
    super.reset();
    this.resetState();
  }
  /**
   * Check if a point is within the configured edge zone.
   */
  isInEdgeZone(x, y) {
    switch (this.edge) {
      case "left":
        return x <= this.edgeZoneWidth;
      case "right":
        return x >= this.screenWidth - this.edgeZoneWidth;
      case "top":
        return y <= this.edgeZoneWidth;
      case "bottom":
        return y >= this.screenHeight - this.edgeZoneWidth;
    }
  }
  /**
   * Get the swipe distance along the expected axis.
   * Left/right edges → horizontal distance, top/bottom → vertical.
   */
  getSwipeDistance(touchData) {
    switch (this.edge) {
      case "left":
        return touchData.translationX;
      // positive = swiping right (from left edge)
      case "right":
        return -touchData.translationX;
      // positive = swiping left (from right edge)
      case "top":
        return touchData.translationY;
      // positive = swiping down (from top edge)
      case "bottom":
        return -touchData.translationY;
    }
  }
  /**
   * Get the swipe velocity along the expected axis.
   */
  getSwipeVelocity(touchData) {
    switch (this.edge) {
      case "left":
        return touchData.velocityX;
      case "right":
        return -touchData.velocityX;
      case "top":
        return touchData.velocityY;
      case "bottom":
        return -touchData.velocityY;
    }
  }
  resetState() {
    this.startX = null;
    this.startY = null;
    this.startedInEdge = false;
  }
};

// src/recognition/spatial/CornerRecognizer.ts
var CornerRecognizer = class extends BaseRecognizer {
  constructor(eventBus, config) {
    super(`corner-${config.corner}`, eventBus, {
      priority: config.priority ?? 15,
      isExclusive: config.isExclusive ?? true,
      enabled: config.enabled
    });
    this.startedInCorner = false;
    this.startX = null;
    this.startY = null;
    this.corner = config.corner;
    this.cornerZoneSize = config.cornerZoneSize ?? 50;
    this.minDistance = config.minDistance ?? 40;
    this.screenWidth = config.screenWidth ?? 400;
    this.screenHeight = config.screenHeight ?? 800;
  }
  onProcessedSample(sample) {
    if (!this.enabled) return;
    const { inputEvent } = sample;
    if (inputEvent.inputType !== "touch" /* Touch */) return;
    const touchData = inputEvent.data;
    if (touchData.type !== "pan" /* Pan */) return;
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
      touchData.translationX ** 2 + touchData.translationY ** 2
    );
    if (this.state === "possible" && distance >= this.minDistance) {
      this.transitionToBegan({
        translation: {
          x: touchData.translationX,
          y: touchData.translationY
        }
      });
      this.transitionToEnded({
        translation: {
          x: touchData.translationX,
          y: touchData.translationY
        }
      });
      this.resetState();
    }
  }
  reset() {
    super.reset();
    this.resetState();
  }
  isInCornerZone(x, y) {
    const zone = this.cornerZoneSize;
    switch (this.corner) {
      case "top-left":
        return x <= zone && y <= zone;
      case "top-right":
        return x >= this.screenWidth - zone && y <= zone;
      case "bottom-left":
        return x <= zone && y >= this.screenHeight - zone;
      case "bottom-right":
        return x >= this.screenWidth - zone && y >= this.screenHeight - zone;
    }
  }
  resetState() {
    this.startX = null;
    this.startY = null;
    this.startedInCorner = false;
  }
};

// src/recognition/sensor/ShakeRecognizer.ts
var ShakeRecognizer = class extends BaseRecognizer {
  constructor(eventBus, config = {}) {
    super("shake", eventBus, {
      priority: config.priority ?? 30,
      isExclusive: config.isExclusive ?? false,
      enabled: config.enabled
    });
    this.aboveThresholdCount = 0;
    this.lastTriggerTime = 0;
    this.threshold = config.threshold ?? 1.5;
    this.consecutiveSamples = config.consecutiveSamples ?? 2;
    this.cooldownMs = config.cooldownMs ?? 1e3;
  }
  onProcessedSample(sample) {
    if (!this.enabled) return;
    const { inputEvent } = sample;
    if (inputEvent.inputType !== "sensor" /* Sensor */) return;
    const sensorData = inputEvent.data;
    if (sensorData.type !== "accelerometer" /* Accelerometer */) return;
    const { x, y, z } = sample.filtered;
    const magnitude = Math.sqrt(x * x + y * y + z * z);
    if (magnitude >= this.threshold) {
      this.aboveThresholdCount++;
      if (this.aboveThresholdCount >= this.consecutiveSamples) {
        const now = Date.now();
        if (now - this.lastTriggerTime < this.cooldownMs) {
          return;
        }
        this.lastTriggerTime = now;
        this.aboveThresholdCount = 0;
        this.transitionToPossible();
        this.transitionToBegan({ magnitude });
        this.transitionToEnded({ magnitude });
      }
    } else {
      this.aboveThresholdCount = 0;
    }
  }
  reset() {
    super.reset();
    this.aboveThresholdCount = 0;
  }
};

// src/recognition/sensor/TiltRecognizer.ts
var TiltRecognizer = class extends BaseRecognizer {
  constructor(eventBus, config = {}) {
    super("tilt", eventBus, {
      priority: config.priority ?? 35,
      isExclusive: config.isExclusive ?? false,
      enabled: config.enabled
    });
    this.lastTriggerTime = 0;
    this.tiltThreshold = config.tiltThreshold ?? 30;
    this.cooldownMs = config.cooldownMs ?? 500;
  }
  onProcessedSample(sample) {
    if (!this.enabled) return;
    const { inputEvent } = sample;
    if (inputEvent.inputType !== "sensor" /* Sensor */) return;
    const sensorData = inputEvent.data;
    if (sensorData.type !== "accelerometer" /* Accelerometer */) return;
    const { x, y, z } = sensorData;
    const pitch = Math.atan2(y, Math.sqrt(x * x + z * z)) * (180 / Math.PI);
    const roll = Math.atan2(x, Math.sqrt(y * y + z * z)) * (180 / Math.PI);
    const maxTilt = Math.max(Math.abs(pitch), Math.abs(roll));
    if (maxTilt >= this.tiltThreshold) {
      const now = Date.now();
      if (now - this.lastTriggerTime < this.cooldownMs) {
        return;
      }
      this.lastTriggerTime = now;
      this.transitionToPossible();
      this.transitionToBegan({
        tilt: { pitch, roll },
        magnitude: maxTilt
      });
      this.transitionToEnded({
        tilt: { pitch, roll },
        magnitude: maxTilt
      });
    }
  }
};

// src/recognition/sensor/WristFlickRecognizer.ts
var WristFlickRecognizer = class extends BaseRecognizer {
  constructor(eventBus, config = {}) {
    super("wrist-flick", eventBus, {
      priority: config.priority ?? 25,
      isExclusive: config.isExclusive ?? false,
      enabled: config.enabled
    });
    this.lastTriggerTime = 0;
    this.angularVelocityThreshold = (config.angularVelocityThreshold ?? 150) * Math.PI / 180;
    this.cooldownMs = config.cooldownMs ?? 800;
  }
  onProcessedSample(sample) {
    if (!this.enabled) return;
    const { inputEvent } = sample;
    if (inputEvent.inputType !== "sensor" /* Sensor */) return;
    const sensorData = inputEvent.data;
    if (sensorData.type !== "gyroscope" /* Gyroscope */) return;
    const { x, y, z } = sample.filtered;
    const angularVelocity = Math.sqrt(x * x + y * y + z * z);
    if (angularVelocity >= this.angularVelocityThreshold) {
      const now = Date.now();
      if (now - this.lastTriggerTime < this.cooldownMs) {
        return;
      }
      this.lastTriggerTime = now;
      this.transitionToPossible();
      this.transitionToBegan({
        magnitude: angularVelocity * (180 / Math.PI)
        // Convert back to deg/s for metadata
      });
      this.transitionToEnded({
        magnitude: angularVelocity * (180 / Math.PI)
      });
    }
  }
};

// src/recognition/sequence/SequenceRecognizer.ts
var SequenceRecognizer = class extends BaseRecognizer {
  constructor(eventBus, config) {
    const sequenceName = `sequence:${config.sequence.join(">")}`;
    super(sequenceName, eventBus, {
      priority: config.priority ?? 1,
      isExclusive: config.isExclusive ?? false,
      enabled: config.enabled
    });
    this.currentIndex = 0;
    this.lastStepTime = 0;
    this.unsubscribe = null;
    this.sequence = config.sequence;
    this.timeoutMs = config.timeoutMs ?? 800;
    this.subscribeToGestures();
  }
  /**
   * SequenceRecognizer doesn't use ProcessedSample — it listens
   * to GestureEvent objects on the EventBus instead.
   */
  onProcessedSample(_sample) {
  }
  reset() {
    super.reset();
    this.currentIndex = 0;
    this.lastStepTime = 0;
  }
  dispose() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    super.dispose();
  }
  /**
   * Subscribe to the RecognitionGesture channel to listen for
   * completed gestures and advance the sequence.
   */
  subscribeToGestures() {
    this.unsubscribe = this.eventBus.on(
      "recognition:gesture" /* RecognitionGesture */,
      (event) => {
        if (!this.enabled) return;
        if (event.state !== "ended" /* Ended */) return;
        if (event.name.startsWith("sequence:")) return;
        const now = Date.now();
        if (this.currentIndex > 0 && now - this.lastStepTime > this.timeoutMs) {
          this.reset();
        }
        const expectedName = this.sequence[this.currentIndex];
        if (event.name === expectedName) {
          this.currentIndex++;
          this.lastStepTime = now;
          if (this.currentIndex >= this.sequence.length) {
            this.transitionToPossible();
            this.transitionToBegan({});
            this.transitionToEnded({});
            this.currentIndex = 0;
            this.lastStepTime = 0;
          }
        }
      }
    );
  }
};

// src/recognition/symbolic/SymbolRecognizer.ts
function generateCircleTemplate(n = 64) {
  const points = [];
  for (let i = 0; i < n; i++) {
    const angle = 2 * Math.PI * i / n;
    points.push({ x: Math.cos(angle), y: Math.sin(angle) });
  }
  return points;
}
function generateTriangleTemplate() {
  const pts = [];
  const vertices = [
    { x: 0.5, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 }
  ];
  for (let side = 0; side < 3; side++) {
    const from = vertices[side];
    const to = vertices[(side + 1) % 3];
    for (let i = 0; i < 21; i++) {
      const t = i / 20;
      pts.push({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t });
    }
  }
  return pts;
}
function generateCheckTemplate() {
  const pts = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    pts.push({ x: t * 0.4, y: 0.3 + t * 0.7 });
  }
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    pts.push({ x: 0.4 + t * 0.6, y: 1 - t * 1 });
  }
  return pts;
}
var DEFAULT_TEMPLATES = {
  circle: generateCircleTemplate(),
  triangle: generateTriangleTemplate(),
  check: generateCheckTemplate()
};
var SymbolRecognizer = class extends BaseRecognizer {
  constructor(eventBus, config = {}) {
    super("symbol", eventBus, {
      priority: config.priority ?? 60,
      isExclusive: config.isExclusive ?? false,
      enabled: config.enabled
    });
    this.currentPath = [];
    this.isDrawing = false;
    this.resampleCount = 64;
    this.squareSize = 250;
    this.templates = config.templates ?? DEFAULT_TEMPLATES;
    this.minConfidence = config.minConfidence ?? 0.7;
  }
  onProcessedSample(sample) {
    if (!this.enabled) return;
    const { inputEvent } = sample;
    if (inputEvent.inputType !== "touch" /* Touch */) return;
    const touchData = inputEvent.data;
    if (touchData.type !== "pan" /* Pan */) return;
    const velocity = Math.sqrt(
      touchData.velocityX ** 2 + touchData.velocityY ** 2
    );
    if (!this.isDrawing) {
      this.isDrawing = true;
      this.currentPath = [];
      this.transitionToPossible();
    }
    this.currentPath.push({ x: touchData.x, y: touchData.y });
    if (velocity < 0.01 && this.currentPath.length > 10) {
      this.isDrawing = false;
      this.recognize();
    }
  }
  reset() {
    super.reset();
    this.currentPath = [];
    this.isDrawing = false;
  }
  /**
   * Run the $1 recognizer against collected path points.
   */
  recognize() {
    if (this.currentPath.length < 10) {
      this.transitionToFailed();
      return;
    }
    const resampled = this.resample(this.currentPath, this.resampleCount);
    const centroid = this.getCentroid(resampled);
    const angle = Math.atan2(centroid.y - resampled[0].y, centroid.x - resampled[0].x);
    const rotated = this.rotateBy(resampled, -angle);
    const scaled = this.scaleTo(rotated, this.squareSize);
    const translated = this.translateToOrigin(scaled);
    let bestMatch = "";
    let bestScore = 0;
    for (const [name, templatePoints] of Object.entries(this.templates)) {
      const tResampled = this.resample(templatePoints, this.resampleCount);
      const tCentroid = this.getCentroid(tResampled);
      const tAngle = Math.atan2(tCentroid.y - tResampled[0].y, tCentroid.x - tResampled[0].x);
      const tRotated = this.rotateBy(tResampled, -tAngle);
      const tScaled = this.scaleTo(tRotated, this.squareSize);
      const tTranslated = this.translateToOrigin(tScaled);
      const distance = this.pathDistance(translated, tTranslated);
      const halfDiagonal = 0.5 * Math.sqrt(2) * this.squareSize;
      const score = 1 - distance / halfDiagonal;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = name;
      }
    }
    if (bestScore >= this.minConfidence) {
      this.transitionToBegan({
        symbol: bestMatch,
        confidence: bestScore
      });
      this.transitionToEnded({
        symbol: bestMatch,
        confidence: bestScore
      });
    } else {
      this.transitionToFailed();
    }
    this.currentPath = [];
  }
  // ─── $1 Unistroke helper functions ────────────────────────────────
  resample(points, n) {
    const totalLength = this.pathLength(points);
    const interval = totalLength / (n - 1);
    const resampled = [points[0]];
    let accumulated = 0;
    for (let i = 1; i < points.length; i++) {
      const d = this.distance(points[i - 1], points[i]);
      if (accumulated + d >= interval) {
        const t = (interval - accumulated) / d;
        const newPoint = {
          x: points[i - 1].x + t * (points[i].x - points[i - 1].x),
          y: points[i - 1].y + t * (points[i].y - points[i - 1].y)
        };
        resampled.push(newPoint);
        points.splice(i, 0, newPoint);
        accumulated = 0;
      } else {
        accumulated += d;
      }
    }
    while (resampled.length < n) {
      resampled.push(points[points.length - 1]);
    }
    return resampled.slice(0, n);
  }
  getCentroid(points) {
    let sumX = 0, sumY = 0;
    for (const p of points) {
      sumX += p.x;
      sumY += p.y;
    }
    return { x: sumX / points.length, y: sumY / points.length };
  }
  rotateBy(points, angle) {
    const centroid = this.getCentroid(points);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return points.map((p) => ({
      x: (p.x - centroid.x) * cos - (p.y - centroid.y) * sin + centroid.x,
      y: (p.x - centroid.x) * sin + (p.y - centroid.y) * cos + centroid.y
    }));
  }
  scaleTo(points, size) {
    const bb = this.boundingBox(points);
    const w = bb.maxX - bb.minX;
    const h = bb.maxY - bb.minY;
    if (w === 0 || h === 0) return points;
    return points.map((p) => ({
      x: p.x * size / w,
      y: p.y * size / h
    }));
  }
  translateToOrigin(points) {
    const centroid = this.getCentroid(points);
    return points.map((p) => ({
      x: p.x - centroid.x,
      y: p.y - centroid.y
    }));
  }
  boundingBox(points) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of points) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
    return { minX, minY, maxX, maxY };
  }
  pathDistance(a, b) {
    const len = Math.min(a.length, b.length);
    let total = 0;
    for (let i = 0; i < len; i++) {
      total += this.distance(a[i], b[i]);
    }
    return total / len;
  }
  pathLength(points) {
    let total = 0;
    for (let i = 1; i < points.length; i++) {
      total += this.distance(points[i - 1], points[i]);
    }
    return total;
  }
  distance(a, b) {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  }
};

// src/conflict/GesturePriorityQueue.ts
var GesturePriorityQueue = class {
  constructor() {
    this.heap = [];
  }
  get size() {
    return this.heap.length;
  }
  isEmpty() {
    return this.heap.length === 0;
  }
  /** Insert a gesture event into the queue. O(log n). */
  insert(event) {
    this.heap.push(event);
    this.bubbleUp(this.heap.length - 1);
  }
  /** Extract and return the highest-priority (lowest priority number) event. O(log n). */
  extractMin() {
    if (this.heap.length === 0) return null;
    if (this.heap.length === 1) return this.heap.pop();
    const min = this.heap[0];
    this.heap[0] = this.heap.pop();
    this.bubbleDown(0);
    return min;
  }
  /** Peek at the highest-priority event without removing it. O(1). */
  peek() {
    return this.heap.length > 0 ? this.heap[0] : null;
  }
  /** Remove all events from the queue. */
  clear() {
    this.heap = [];
  }
  /** Drain the queue, returning all events in priority order. */
  drainAll() {
    const result = [];
    while (!this.isEmpty()) {
      result.push(this.extractMin());
    }
    return result;
  }
  bubbleUp(index) {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.heap[parentIndex].priority <= this.heap[index].priority) break;
      [this.heap[parentIndex], this.heap[index]] = [this.heap[index], this.heap[parentIndex]];
      index = parentIndex;
    }
  }
  bubbleDown(index) {
    const length = this.heap.length;
    while (true) {
      let smallest = index;
      const left = 2 * index + 1;
      const right = 2 * index + 2;
      if (left < length && this.heap[left].priority < this.heap[smallest].priority) {
        smallest = left;
      }
      if (right < length && this.heap[right].priority < this.heap[smallest].priority) {
        smallest = right;
      }
      if (smallest === index) break;
      [this.heap[smallest], this.heap[index]] = [this.heap[index], this.heap[smallest]];
      index = smallest;
    }
  }
};

// src/conflict/LockManager.ts
var LockManager = class {
  constructor() {
    /** Active locks: gestureName → priority */
    this.locks = /* @__PURE__ */ new Map();
  }
  /**
   * Acquire an exclusive lock for a gesture.
   *
   * @param gestureName - The gesture acquiring the lock
   * @param priority - The priority level of the lock (lower = higher priority)
   * @returns true if the lock was acquired
   */
  acquireLock(gestureName, priority) {
    this.locks.set(gestureName, priority);
    return true;
  }
  /**
   * Release the lock held by a gesture.
   */
  releaseLock(gestureName) {
    this.locks.delete(gestureName);
  }
  /**
   * Check if a gesture with the given priority is blocked by any active lock.
   * A gesture is blocked if an active lock has higher or equal priority
   * (lower or equal priority number) and is not the same gesture.
   *
   * @param gestureName - The gesture to check
   * @param priority - The priority of the gesture to check
   * @returns true if the gesture is blocked
   */
  isLocked(gestureName, priority) {
    for (const [lockName, lockPriority] of this.locks) {
      if (lockName !== gestureName && lockPriority <= priority) {
        return true;
      }
    }
    return false;
  }
  /**
   * Check if a specific gesture holds a lock.
   */
  hasLock(gestureName) {
    return this.locks.has(gestureName);
  }
  /**
   * Clear all locks. Called during engine reset.
   */
  clearAll() {
    this.locks.clear();
  }
  /**
   * Get the number of active locks.
   */
  get activeLockCount() {
    return this.locks.size;
  }
};

// src/conflict/ConflictResolver.ts
var ConflictResolver = class {
  constructor(eventBus) {
    this.unsubscribe = null;
    // Buffer for batching events within a single tick
    this.pendingEvents = [];
    this.processingScheduled = false;
    this.eventBus = eventBus;
    this.priorityQueue = new GesturePriorityQueue();
    this.lockManager = new LockManager();
  }
  /**
   * Start listening for gesture events and resolving conflicts.
   */
  start() {
    this.unsubscribe = this.eventBus.on(
      "recognition:gesture" /* RecognitionGesture */,
      (event) => {
        this.pendingEvents.push(event);
        this.scheduleProcessing();
      }
    );
  }
  /**
   * Stop listening and clear all state.
   */
  stop() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.priorityQueue.clear();
    this.lockManager.clearAll();
    this.pendingEvents = [];
  }
  /**
   * Schedule conflict resolution for the next microtask.
   * This batches events that arrive in the same tick.
   */
  scheduleProcessing() {
    if (this.processingScheduled) return;
    this.processingScheduled = true;
    Promise.resolve().then(() => {
      this.processingScheduled = false;
      this.processEvents();
    });
  }
  /**
   * Process all pending events through priority queue and lock rules.
   */
  processEvents() {
    for (const event of this.pendingEvents) {
      this.priorityQueue.insert(event);
    }
    this.pendingEvents = [];
    const sortedEvents = this.priorityQueue.drainAll();
    for (const event of sortedEvents) {
      if (event.isExclusive) {
        if (event.state === "began" /* Began */) {
          this.lockManager.acquireLock(event.name, event.priority);
        } else if (event.state === "ended" /* Ended */ || event.state === "cancelled" /* Cancelled */ || event.state === "failed" /* Failed */) {
          this.lockManager.releaseLock(event.name);
        }
      }
      if (this.lockManager.isLocked(event.name, event.priority)) {
        continue;
      }
      this.eventBus.emit("conflict:resolved" /* ConflictResolved */, event);
    }
  }
  /** Expose lock manager for testing */
  getLockManager() {
    return this.lockManager;
  }
};

// src/actions/ActionDispatcher.ts
var ActionDispatcher = class {
  constructor(eventBus) {
    this.actionMap = /* @__PURE__ */ new Map();
    this.unsubscribe = null;
    this.eventBus = eventBus;
  }
  /**
   * Start listening for resolved gesture events.
   */
  start() {
    this.unsubscribe = this.eventBus.on(
      "conflict:resolved" /* ConflictResolved */,
      (event) => {
        this.dispatch(event);
      }
    );
  }
  /**
   * Stop listening.
   */
  stop() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }
  /**
   * Register an action for a gesture name.
   */
  registerAction(gestureName, action) {
    if (!this.actionMap.has(gestureName)) {
      this.actionMap.set(gestureName, []);
    }
    this.actionMap.get(gestureName).push(action);
  }
  /**
   * Unregister a specific action from a gesture.
   */
  unregisterAction(gestureName, actionId) {
    const actions = this.actionMap.get(gestureName);
    if (actions) {
      const filtered = actions.filter((a) => a.actionId !== actionId);
      if (filtered.length > 0) {
        this.actionMap.set(gestureName, filtered);
      } else {
        this.actionMap.delete(gestureName);
      }
    }
  }
  /**
   * Clear all registered actions.
   */
  clearActions() {
    this.actionMap.clear();
  }
  /**
   * Dispatch a gesture event to all matching registered actions.
   */
  dispatch(event) {
    const actions = this.actionMap.get(event.name);
    if (!actions || actions.length === 0) return;
    for (const action of actions) {
      try {
        action.execute(event);
      } catch (error) {
        console.warn(
          `[ActionDispatcher] Error executing action ${action.actionId} for gesture ${event.name}:`,
          error
        );
      }
    }
    this.eventBus.emit("action:dispatched" /* ActionDispatched */, event);
  }
};

// src/actions/NavigationAction.ts
var NavigationAction = class {
  constructor(actionId, callback) {
    this.actionId = actionId;
    this.callback = callback;
  }
  execute(event) {
    this.callback(event);
  }
};

// src/actions/UITransformAction.ts
var UITransformAction = class {
  constructor(actionId, transform) {
    this.actionId = actionId;
    this.transform = transform;
  }
  execute(event) {
    this.transform(event);
  }
};

// src/actions/SystemAction.ts
var SystemAction = class {
  constructor(actionId, callback) {
    this.actionId = actionId;
    this.callback = callback;
  }
  execute(event) {
    this.callback(event);
  }
};

// src/actions/CustomAction.ts
var CustomAction = class {
  constructor(actionId, callback) {
    this.actionId = actionId;
    this.callback = callback;
  }
  execute(event) {
    this.callback(event);
  }
};

// src/feedback/HapticFeedback.ts
var Haptics;
var Vibration;
function loadModules() {
  try {
    Haptics = __require("expo-haptics");
  } catch {
  }
  try {
    const rn = __require("react-native");
    Vibration = rn.Vibration;
  } catch {
  }
}
var HapticFeedback = class {
  constructor(enabled = true) {
    this._isSupported = false;
    this.useVibrationFallback = false;
    this.enabled = enabled;
    loadModules();
    if (Haptics) {
      this._isSupported = true;
    } else if (Vibration) {
      this._isSupported = true;
      this.useVibrationFallback = true;
    }
  }
  get isSupported() {
    return this._isSupported && this.enabled;
  }
  trigger(event) {
    if (!this.isSupported) return;
    if (event.state !== "began" /* Began */ && event.state !== "ended" /* Ended */) {
      return;
    }
    if (this.useVibrationFallback) {
      Vibration?.vibrate(50);
      return;
    }
    const gestureName = event.name;
    if (gestureName.startsWith("sequence:") || gestureName === "shake") {
      Haptics?.notificationAsync?.(Haptics.NotificationFeedbackType?.Success);
    } else if (gestureName === "tap" || gestureName === "double-tap") {
      Haptics?.impactAsync?.(Haptics.ImpactFeedbackStyle?.Light);
    } else if (gestureName.startsWith("edge-swipe") || gestureName.startsWith("corner")) {
      Haptics?.impactAsync?.(Haptics.ImpactFeedbackStyle?.Medium);
    } else {
      Haptics?.selectionAsync?.();
    }
  }
  setEnabled(enabled) {
    this.enabled = enabled;
  }
};

// src/feedback/VisualFeedback.ts
var VisualFeedback = class {
  constructor(callback) {
    this._isSupported = true;
    this.callback = callback ?? null;
  }
  get isSupported() {
    return this._isSupported;
  }
  trigger(event) {
    if (!this._isSupported || !this.callback) return;
    this.callback(event);
  }
  /**
   * Update the visual feedback callback at runtime.
   */
  setCallback(callback) {
    this.callback = callback;
  }
};

// src/feedback/AccessibilityFeedback.ts
var AccessibilityInfo;
function loadAccessibility() {
  try {
    const rn = __require("react-native");
    AccessibilityInfo = rn.AccessibilityInfo;
  } catch {
  }
}
var AccessibilityFeedback = class {
  constructor() {
    this._isSupported = false;
    this.announcementBuilder = null;
    loadAccessibility();
    this._isSupported = !!AccessibilityInfo?.announceForAccessibility;
  }
  get isSupported() {
    return this._isSupported;
  }
  trigger(event) {
    if (!this._isSupported) return;
    if (event.state !== "ended" /* Ended */) return;
    const announcement = this.announcementBuilder ? this.announcementBuilder(event) : this.defaultAnnouncement(event);
    AccessibilityInfo.announceForAccessibility(announcement);
  }
  /**
   * Set a custom function to build announcement strings.
   */
  setAnnouncementBuilder(builder) {
    this.announcementBuilder = builder;
  }
  /**
   * Generate a default human-readable announcement based on gesture name.
   */
  defaultAnnouncement(event) {
    const name = event.name.replace(/-/g, " ").replace(/:/g, " ").replace(/>/g, " then ");
    return `Gesture detected: ${name}`;
  }
};

// src/GestureEngine.ts
var GestureEngine = class {
  constructor(config = {}) {
    // ─── Layer 3: Recognition ──────────────────────────────────────────
    this.recognizers = [];
    // ─── Layer 6: Feedback ─────────────────────────────────────────────
    this.feedbackProviders = [];
    // ─── State ─────────────────────────────────────────────────────────
    this._isRunning = false;
    this.inputUnsubscribe = null;
    this.feedbackUnsubscribe = null;
    this.config = {
      sensorInterval: Math.max(16, config.sensorInterval ?? 100),
      hapticEnabled: config.hapticEnabled ?? true,
      debug: config.debug ?? false,
      screenWidth: config.screenWidth ?? 400,
      screenHeight: config.screenHeight ?? 800
    };
    this.eventBus = new EventBus();
    this.touchInput = new TouchInputProvider(this.eventBus);
    this.sensorInput = new SensorInputProvider(
      this.eventBus,
      this.config.sensorInterval
    );
    this.noiseFilter = new NoiseFilter(0.8);
    this.sensorNoiseFilter = new NoiseFilter(0.2);
    this.velocityCalc = new VelocityCalculator();
    this.angleDetector = new AngleDetector();
    this.normalizer = new ThresholdNormalizer(0, 10);
    this.streamBuffer = new StreamBuffer(400, 64);
    this.conflictResolver = new ConflictResolver(this.eventBus);
    this.actionDispatcher = new ActionDispatcher(this.eventBus);
  }
  // ═══════════════════════════════════════════════════════════════════════
  // Public API
  // ═══════════════════════════════════════════════════════════════════════
  get isRunning() {
    return this._isRunning;
  }
  /**
   * Start the gesture engine. Activates all providers and wires the pipeline.
   */
  start() {
    if (this._isRunning) return;
    this._isRunning = true;
    this.inputUnsubscribe = this.eventBus.on(
      "input:raw" /* InputRaw */,
      (event) => this.processInput(event)
    );
    this.feedbackUnsubscribe = this.eventBus.on(
      "action:dispatched" /* ActionDispatched */,
      (event) => {
        for (const provider of this.feedbackProviders) {
          if (provider.isSupported) {
            provider.trigger(event);
          }
        }
      }
    );
    this.touchInput.start();
    this.sensorInput.start();
    this.conflictResolver.start();
    this.actionDispatcher.start();
    if (this.config.debug) {
      console.log("[GestureEngine] Started with config:", this.config);
    }
  }
  /**
   * Stop the gesture engine. Cleans up all subscriptions and providers.
   */
  stop() {
    if (!this._isRunning) return;
    this._isRunning = false;
    this.touchInput.stop();
    this.sensorInput.stop();
    this.conflictResolver.stop();
    this.actionDispatcher.stop();
    this.inputUnsubscribe?.();
    this.feedbackUnsubscribe?.();
    this.inputUnsubscribe = null;
    this.feedbackUnsubscribe = null;
    this.noiseFilter.reset();
    this.sensorNoiseFilter.reset();
    this.velocityCalc.reset();
    this.streamBuffer.clear();
    for (const recognizer of this.recognizers) {
      recognizer.reset();
    }
    if (this.config.debug) {
      console.log("[GestureEngine] Stopped");
    }
  }
  /**
   * Register a gesture recognizer with the engine.
   */
  registerRecognizer(recognizer) {
    this.recognizers.push(recognizer);
    if (this.config.debug) {
      console.log(`[GestureEngine] Registered recognizer: ${recognizer.name}`);
    }
  }
  /**
   * Unregister a recognizer by its ID.
   */
  unregisterRecognizer(recognizerId) {
    const index = this.recognizers.findIndex((r) => r.id === recognizerId);
    if (index !== -1) {
      const [removed] = this.recognizers.splice(index, 1);
      removed.dispose();
    }
  }
  /**
   * Register an action for a gesture name.
   */
  registerAction(gestureName, action) {
    this.actionDispatcher.registerAction(gestureName, action);
  }
  /**
   * Register a feedback provider.
   */
  registerFeedback(provider) {
    this.feedbackProviders.push(provider);
  }
  /**
   * Get all registered recognizers.
   */
  getRecognizers() {
    return [...this.recognizers];
  }
  /**
   * Dispose the engine and clean up all resources.
   */
  dispose() {
    this.stop();
    for (const recognizer of this.recognizers) {
      recognizer.dispose();
    }
    this.recognizers = [];
    this.feedbackProviders = [];
    this.actionDispatcher.clearActions();
    this.eventBus.clear();
  }
  // ═══════════════════════════════════════════════════════════════════════
  // Pipeline: Input → Processing → Recognition
  // ═══════════════════════════════════════════════════════════════════════
  /**
   * Process a raw input event through Layer 2 (processing) and feed
   * the resulting ProcessedSample into Layer 3 (recognition).
   */
  processInput(event) {
    let filtered;
    let velocityResult;
    if (event.inputType === "touch" /* Touch */) {
      const touch = event.data;
      filtered = this.noiseFilter.lowPass(touch.x, touch.y, 0);
      velocityResult = this.velocityCalc.calculate(
        touch.x,
        touch.y,
        event.timestamp
      );
    } else if (event.inputType === "sensor" /* Sensor */) {
      const sensor = event.data;
      filtered = this.sensorNoiseFilter.highPass(sensor.x, sensor.y, sensor.z);
      const magnitude = Math.sqrt(
        filtered.x ** 2 + filtered.y ** 2 + filtered.z ** 2
      );
      velocityResult = { velocityX: filtered.x, velocityY: filtered.y, velocity: magnitude };
    } else {
      filtered = { x: 0, y: 0, z: 0 };
      velocityResult = { velocityX: 0, velocityY: 0, velocity: 0 };
    }
    const angle = this.angleDetector.calculate(
      velocityResult.velocityX,
      velocityResult.velocityY
    );
    const normalizedMagnitude = this.normalizer.normalize(velocityResult.velocity);
    const sample = {
      inputEvent: event,
      velocity: velocityResult.velocity,
      velocityX: velocityResult.velocityX,
      velocityY: velocityResult.velocityY,
      angleRadians: angle.angleRadians,
      angleDegrees: angle.angleDegrees,
      direction: angle.direction,
      normalizedMagnitude,
      filtered,
      timestamp: event.timestamp
    };
    this.streamBuffer.push(sample);
    this.eventBus.emit("processing:sample" /* ProcessingSample */, sample);
    for (const recognizer of this.recognizers) {
      if (recognizer.enabled) {
        recognizer.onProcessedSample(sample);
      }
    }
  }
};

// src/hooks/useGestureEngine.ts
function useGestureEngine(config = {}) {
  const engineRef = react.useRef(null);
  const [isReady, setIsReady] = react.useState(false);
  react.useEffect(() => {
    const engine = new GestureEngine({
      sensorInterval: config.sensorInterval,
      hapticEnabled: config.hapticEnabled,
      debug: config.debug,
      screenWidth: config.screenWidth,
      screenHeight: config.screenHeight
    });
    if (config.recognizers) {
      for (const recognizer of config.recognizers) {
        engine.registerRecognizer(recognizer);
      }
    }
    if (config.actions) {
      for (const [gestureName, actions] of Object.entries(config.actions)) {
        for (const action of actions) {
          engine.registerAction(gestureName, action);
        }
      }
    }
    if (config.feedback) {
      for (const provider of config.feedback) {
        engine.registerFeedback(provider);
      }
    }
    engine.start();
    engineRef.current = engine;
    setIsReady(true);
    return () => {
      engine.dispose();
      engineRef.current = null;
      setIsReady(false);
    };
  }, []);
  return {
    engine: engineRef.current,
    isReady
  };
}
function useShakeGesture(config) {
  const engineRef = react.useRef(null);
  const callbackRef = react.useRef(config.onShake);
  callbackRef.current = config.onShake;
  react.useEffect(() => {
    const engine = new GestureEngine({
      sensorInterval: config.sensorInterval ?? 100,
      hapticEnabled: config.hapticEnabled ?? true
    });
    const shakeRecognizer = new ShakeRecognizer(engine.eventBus, {
      threshold: config.threshold,
      cooldownMs: config.cooldownMs
    });
    engine.registerRecognizer(shakeRecognizer);
    const action = new CustomAction("shake-callback", () => {
      callbackRef.current();
    });
    engine.registerAction("shake", action);
    if (config.hapticEnabled !== false) {
      engine.registerFeedback(new HapticFeedback(true));
    }
    engine.start();
    engineRef.current = engine;
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [config.threshold, config.cooldownMs, config.sensorInterval]);
}
function useEdgeSwipe(config) {
  const engineRef = react.useRef(null);
  const callbackRef = react.useRef(config.onSwipe);
  callbackRef.current = config.onSwipe;
  react.useEffect(() => {
    const engine = new GestureEngine({
      hapticEnabled: config.hapticEnabled ?? true,
      screenWidth: config.screenWidth,
      screenHeight: config.screenHeight
    });
    const gestureName = `edge-swipe-${config.edge}`;
    const recognizer = new EdgeSwipeRecognizer(engine.eventBus, {
      edge: config.edge,
      minDistance: config.minDistance,
      edgeZoneWidth: config.edgeZoneWidth,
      minVelocity: config.minVelocity,
      screenWidth: config.screenWidth,
      screenHeight: config.screenHeight
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
  }, [config.edge, config.minDistance, config.edgeZoneWidth, config.minVelocity]);
}
function useGestureSequence(config) {
  const engineRef = react.useRef(null);
  const callbackRef = react.useRef(config.onComplete);
  callbackRef.current = config.onComplete;
  react.useEffect(() => {
    const engine = new GestureEngine({
      hapticEnabled: config.hapticEnabled ?? true
    });
    const sequenceName = `sequence:${config.sequence.join(">")}`;
    const recognizer = new SequenceRecognizer(engine.eventBus, {
      sequence: config.sequence,
      timeoutMs: config.timeoutMs
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
  }, [config.sequence.join(","), config.timeoutMs]);
}

exports.AccessibilityFeedback = AccessibilityFeedback;
exports.ActionDispatcher = ActionDispatcher;
exports.AngleDetector = AngleDetector;
exports.BaseRecognizer = BaseRecognizer;
exports.CameraInputProvider = CameraInputProvider;
exports.CardinalDirection = CardinalDirection;
exports.ConflictResolver = ConflictResolver;
exports.CornerRecognizer = CornerRecognizer;
exports.CustomAction = CustomAction;
exports.DoubleTapRecognizer = DoubleTapRecognizer;
exports.EdgeSwipeRecognizer = EdgeSwipeRecognizer;
exports.EventBus = EventBus;
exports.EventChannel = EventChannel;
exports.GestureEngine = GestureEngine;
exports.GesturePriorityQueue = GesturePriorityQueue;
exports.HapticFeedback = HapticFeedback;
exports.HardwareInputProvider = HardwareInputProvider;
exports.InputType = InputType;
exports.LockManager = LockManager;
exports.NavigationAction = NavigationAction;
exports.NoiseFilter = NoiseFilter;
exports.PanRecognizer = PanRecognizer;
exports.PinchRecognizer = PinchRecognizer;
exports.RecognizerState = RecognizerState;
exports.RotationRecognizer = RotationRecognizer;
exports.SensorInputProvider = SensorInputProvider;
exports.SensorType = SensorType;
exports.SequenceRecognizer = SequenceRecognizer;
exports.ShakeRecognizer = ShakeRecognizer;
exports.StreamBuffer = StreamBuffer;
exports.SymbolRecognizer = SymbolRecognizer;
exports.SystemAction = SystemAction;
exports.TapRecognizer = TapRecognizer;
exports.ThresholdNormalizer = ThresholdNormalizer;
exports.TiltRecognizer = TiltRecognizer;
exports.TouchInputProvider = TouchInputProvider;
exports.TouchType = TouchType;
exports.UITransformAction = UITransformAction;
exports.VelocityCalculator = VelocityCalculator;
exports.VisualFeedback = VisualFeedback;
exports.WristFlickRecognizer = WristFlickRecognizer;
exports.generateId = generateId;
exports.useEdgeSwipe = useEdgeSwipe;
exports.useGestureEngine = useGestureEngine;
exports.useGestureSequence = useGestureSequence;
exports.useShakeGesture = useShakeGesture;
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map