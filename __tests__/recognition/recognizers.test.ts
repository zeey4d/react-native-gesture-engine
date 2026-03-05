import { EventBus } from '../../src/core/EventBus';
import {
  EventChannel, GestureEvent, RecognizerState, ProcessedSample,
  InputEvent, InputType, SensorType, TouchType, CardinalDirection,
} from '../../src/core/types';
import { ShakeRecognizer } from '../../src/recognition/sensor/ShakeRecognizer';
import { EdgeSwipeRecognizer } from '../../src/recognition/spatial/EdgeSwipeRecognizer';
import { SequenceRecognizer } from '../../src/recognition/sequence/SequenceRecognizer';
import { TapRecognizer } from '../../src/recognition/discrete/TapRecognizer';
import { DoubleTapRecognizer } from '../../src/recognition/discrete/DoubleTapRecognizer';

function makeTouchSample(overrides: Partial<{
  x: number; y: number; translationX: number; translationY: number;
  velocityX: number; velocityY: number; touchType: TouchType; timestamp: number;
}> = {}): ProcessedSample {
  const timestamp = overrides.timestamp ?? Date.now();
  return {
    inputEvent: {
      id: `test-${timestamp}`,
      timestamp,
      inputType: InputType.Touch,
      data: {
        type: overrides.touchType ?? TouchType.Pan,
        x: overrides.x ?? 0,
        y: overrides.y ?? 0,
        translationX: overrides.translationX ?? 0,
        translationY: overrides.translationY ?? 0,
        velocityX: overrides.velocityX ?? 0,
        velocityY: overrides.velocityY ?? 0,
        scale: 1,
        rotation: 0,
        numberOfPointers: 1,
      },
    },
    velocity: 0,
    velocityX: overrides.velocityX ?? 0,
    velocityY: overrides.velocityY ?? 0,
    angleRadians: 0,
    angleDegrees: 0,
    direction: CardinalDirection.None,
    normalizedMagnitude: 0,
    filtered: { x: 0, y: 0, z: 0 },
    timestamp,
  };
}

function makeSensorSample(x: number, y: number, z: number, timestamp = Date.now()): ProcessedSample {
  return {
    inputEvent: {
      id: `sensor-${timestamp}`,
      timestamp,
      inputType: InputType.Sensor,
      data: { type: SensorType.Accelerometer, x, y, z },
    },
    velocity: Math.sqrt(x * x + y * y + z * z),
    velocityX: x,
    velocityY: y,
    angleRadians: 0,
    angleDegrees: 0,
    direction: CardinalDirection.None,
    normalizedMagnitude: 0,
    filtered: { x, y, z }, // Pre-filtered (high-pass) data
    timestamp,
  };
}

// ─── ShakeRecognizer ────────────────────────────────────────────────────────

describe('ShakeRecognizer', () => {
  let bus: EventBus;
  let events: GestureEvent[];

  beforeEach(() => {
    bus = new EventBus();
    events = [];
    bus.on(EventChannel.RecognitionGesture, (e) => events.push(e));
  });

  afterEach(() => bus.clear());

  it('should detect shake when magnitude exceeds threshold for consecutive samples', () => {
    const recognizer = new ShakeRecognizer(bus, {
      threshold: 1.5,
      consecutiveSamples: 2,
      cooldownMs: 0,
    });

    // Two consecutive samples above 1.5g
    recognizer.onProcessedSample(makeSensorSample(1.0, 1.0, 1.0)); // mag ≈ 1.73 > 1.5
    recognizer.onProcessedSample(makeSensorSample(1.0, 1.0, 1.0)); // 2nd consecutive

    // Should have emitted Began + Ended
    const endedEvents = events.filter((e) => e.state === RecognizerState.Ended);
    expect(endedEvents.length).toBe(1);
    expect(endedEvents[0].name).toBe('shake');
  });

  it('should not trigger if below threshold', () => {
    const recognizer = new ShakeRecognizer(bus, {
      threshold: 5.0,
      consecutiveSamples: 2,
    });

    recognizer.onProcessedSample(makeSensorSample(0.1, 0.1, 0.1));
    recognizer.onProcessedSample(makeSensorSample(0.1, 0.1, 0.1));

    expect(events.length).toBe(0);
  });

  it('should reset consecutive count when magnitude drops', () => {
    const recognizer = new ShakeRecognizer(bus, {
      threshold: 1.5,
      consecutiveSamples: 3,
      cooldownMs: 0,
    });

    recognizer.onProcessedSample(makeSensorSample(1.0, 1.0, 1.0)); // above
    recognizer.onProcessedSample(makeSensorSample(1.0, 1.0, 1.0)); // above
    recognizer.onProcessedSample(makeSensorSample(0.01, 0.01, 0.01)); // below → resets
    recognizer.onProcessedSample(makeSensorSample(1.0, 1.0, 1.0)); // above (new count=1)

    expect(events.length).toBe(0); // Didn't reach 3 consecutive
  });

  it('should ignore non-sensor data', () => {
    const recognizer = new ShakeRecognizer(bus, { threshold: 0.1, consecutiveSamples: 1, cooldownMs: 0 });
    recognizer.onProcessedSample(makeTouchSample({ x: 100, y: 100 }));
    expect(events.length).toBe(0);
  });

  it('should respect cooldown', () => {
    const recognizer = new ShakeRecognizer(bus, {
      threshold: 1.5,
      consecutiveSamples: 2,
      cooldownMs: 5000, // 5 second cooldown
    });

    const now = Date.now();
    recognizer.onProcessedSample(makeSensorSample(1.0, 1.0, 1.0, now));
    recognizer.onProcessedSample(makeSensorSample(1.0, 1.0, 1.0, now + 10));

    // First shake fires
    const firstEndedCount = events.filter((e) => e.state === RecognizerState.Ended).length;
    expect(firstEndedCount).toBe(1);

    // Try again immediately — should be blocked by cooldown
    recognizer.onProcessedSample(makeSensorSample(1.0, 1.0, 1.0, now + 20));
    recognizer.onProcessedSample(makeSensorSample(1.0, 1.0, 1.0, now + 30));

    const secondEndedCount = events.filter((e) => e.state === RecognizerState.Ended).length;
    expect(secondEndedCount).toBe(1); // Still just 1
  });
});

// ─── EdgeSwipeRecognizer ────────────────────────────────────────────────────

describe('EdgeSwipeRecognizer', () => {
  let bus: EventBus;
  let events: GestureEvent[];

  beforeEach(() => {
    bus = new EventBus();
    events = [];
    bus.on(EventChannel.RecognitionGesture, (e) => events.push(e));
  });

  afterEach(() => bus.clear());

  it('should detect left edge swipe', () => {
    const recognizer = new EdgeSwipeRecognizer(bus, {
      edge: 'left',
      edgeZoneWidth: 30,
      minDistance: 50,
      minVelocity: 0.3,
      screenWidth: 400,
      screenHeight: 800,
    });

    // Start in left edge zone
    recognizer.onProcessedSample(makeTouchSample({
      x: 10, y: 400, translationX: 0, translationY: 0,
      velocityX: 0, velocityY: 0, timestamp: 1000,
    }));

    // Swipe right with sufficient distance and velocity
    recognizer.onProcessedSample(makeTouchSample({
      x: 160, y: 400, translationX: 150, translationY: 0,
      velocityX: 0.5, velocityY: 0, timestamp: 1100,
    }));

    const endedEvents = events.filter((e) => e.state === RecognizerState.Ended);
    expect(endedEvents.length).toBe(1);
    expect(endedEvents[0].name).toBe('edge-swipe-left');
  });

  it('should not trigger if gesture starts outside edge zone', () => {
    const recognizer = new EdgeSwipeRecognizer(bus, {
      edge: 'left',
      edgeZoneWidth: 30,
      minDistance: 50,
      minVelocity: 0.3,
      screenWidth: 400,
    });

    // Start outside edge zone
    recognizer.onProcessedSample(makeTouchSample({
      x: 200, y: 400, translationX: 0, translationY: 0, timestamp: 1000,
    }));

    recognizer.onProcessedSample(makeTouchSample({
      x: 350, y: 400, translationX: 150, translationY: 0,
      velocityX: 0.5, velocityY: 0, timestamp: 1100,
    }));

    expect(events.length).toBe(0);
  });

  it('should not trigger if distance is insufficient', () => {
    const recognizer = new EdgeSwipeRecognizer(bus, {
      edge: 'left',
      edgeZoneWidth: 30,
      minDistance: 50,
      minVelocity: 0.3,
      screenWidth: 400,
    });

    recognizer.onProcessedSample(makeTouchSample({
      x: 10, y: 400, timestamp: 1000,
    }));

    recognizer.onProcessedSample(makeTouchSample({
      x: 30, y: 400, translationX: 20, translationY: 0,
      velocityX: 0.5, velocityY: 0, timestamp: 1100,
    }));

    expect(events.filter((e) => e.state === RecognizerState.Ended).length).toBe(0);
  });

  it('should detect right edge swipe', () => {
    const recognizer = new EdgeSwipeRecognizer(bus, {
      edge: 'right',
      edgeZoneWidth: 30,
      minDistance: 50,
      minVelocity: 0.3,
      screenWidth: 400,
    });

    // Start in right edge zone
    recognizer.onProcessedSample(makeTouchSample({
      x: 390, y: 400, timestamp: 1000,
    }));

    // Swipe left
    recognizer.onProcessedSample(makeTouchSample({
      x: 290, y: 400, translationX: -100, translationY: 0,
      velocityX: -0.5, velocityY: 0, timestamp: 1100,
    }));

    const endedEvents = events.filter((e) => e.state === RecognizerState.Ended);
    expect(endedEvents.length).toBe(1);
    expect(endedEvents[0].name).toBe('edge-swipe-right');
  });
});

// ─── SequenceRecognizer ─────────────────────────────────────────────────────

describe('SequenceRecognizer', () => {
  let bus: EventBus;
  let events: GestureEvent[];

  beforeEach(() => {
    bus = new EventBus();
    events = [];
    bus.on(EventChannel.RecognitionGesture, (e) => {
      if (e.name.startsWith('sequence:')) {
        events.push(e);
      }
    });
  });

  afterEach(() => bus.clear());

  it('should detect a simple 2-gesture sequence', () => {
    const recognizer = new SequenceRecognizer(bus, {
      sequence: ['tap', 'tap'],
      timeoutMs: 5000,
    });

    // Emit first tap
    bus.emit(EventChannel.RecognitionGesture, {
      id: '1', name: 'tap', state: RecognizerState.Ended,
      priority: 10, isExclusive: false, timestamp: Date.now(), metadata: {},
    });

    // Emit second tap
    bus.emit(EventChannel.RecognitionGesture, {
      id: '2', name: 'tap', state: RecognizerState.Ended,
      priority: 10, isExclusive: false, timestamp: Date.now(), metadata: {},
    });

    const seqEvents = events.filter((e) => e.state === RecognizerState.Ended);
    expect(seqEvents.length).toBe(1);
    expect(seqEvents[0].name).toBe('sequence:tap>tap');

    recognizer.dispose();
  });

  it('should not trigger on wrong sequence', () => {
    const recognizer = new SequenceRecognizer(bus, {
      sequence: ['tap', 'shake'],
      timeoutMs: 5000,
    });

    bus.emit(EventChannel.RecognitionGesture, {
      id: '1', name: 'tap', state: RecognizerState.Ended,
      priority: 10, isExclusive: false, timestamp: Date.now(), metadata: {},
    });

    bus.emit(EventChannel.RecognitionGesture, {
      id: '2', name: 'tap', state: RecognizerState.Ended,
      priority: 10, isExclusive: false, timestamp: Date.now(), metadata: {},
    });

    expect(events.filter((e) => e.state === RecognizerState.Ended).length).toBe(0);

    recognizer.dispose();
  });

  it('should ignore non-Ended gesture events', () => {
    const recognizer = new SequenceRecognizer(bus, {
      sequence: ['tap'],
      timeoutMs: 5000,
    });

    bus.emit(EventChannel.RecognitionGesture, {
      id: '1', name: 'tap', state: RecognizerState.Began,
      priority: 10, isExclusive: false, timestamp: Date.now(), metadata: {},
    });

    expect(events.filter((e) => e.state === RecognizerState.Ended).length).toBe(0);

    recognizer.dispose();
  });

  it('should reset on timeout', (done) => {
    const recognizer = new SequenceRecognizer(bus, {
      sequence: ['tap', 'tap'],
      timeoutMs: 50, // 50ms timeout
    });

    const now = Date.now();

    bus.emit(EventChannel.RecognitionGesture, {
      id: '1', name: 'tap', state: RecognizerState.Ended,
      priority: 10, isExclusive: false, timestamp: now, metadata: {},
    });

    // Wait longer than timeout then send second tap
    setTimeout(() => {
      bus.emit(EventChannel.RecognitionGesture, {
        id: '2', name: 'tap', state: RecognizerState.Ended,
        priority: 10, isExclusive: false, timestamp: Date.now(), metadata: {},
      });

      // Should have reset, so this tap is treated as first step again
      expect(events.filter((e) => e.state === RecognizerState.Ended).length).toBe(0);
      recognizer.dispose();
      done();
    }, 100);
  });
});

// ─── DoubleTapRecognizer ────────────────────────────────────────────────────

describe('DoubleTapRecognizer', () => {
  let bus: EventBus;
  let events: GestureEvent[];

  beforeEach(() => {
    bus = new EventBus();
    events = [];
    bus.on(EventChannel.RecognitionGesture, (e) => events.push(e));
  });

  afterEach(() => bus.clear());

  it('should detect double tap within interval and distance', () => {
    const recognizer = new DoubleTapRecognizer(bus, {
      maxInterval: 300,
      maxDistance: 30,
    });

    const now = Date.now();
    recognizer.onProcessedSample(makeTouchSample({
      x: 100, y: 200, touchType: TouchType.Tap, timestamp: now,
    }));
    recognizer.onProcessedSample(makeTouchSample({
      x: 105, y: 205, touchType: TouchType.Tap, timestamp: now + 100,
    }));

    const endedEvents = events.filter((e) => e.state === RecognizerState.Ended);
    expect(endedEvents.length).toBe(1);
    expect(endedEvents[0].name).toBe('double-tap');
  });
});
