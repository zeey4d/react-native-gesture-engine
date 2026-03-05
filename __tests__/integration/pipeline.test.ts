import { EventBus } from '../../src/core/EventBus';
import {
  EventChannel, InputEvent, GestureEvent, ProcessedSample,
  RecognizerState, InputType, SensorType, CardinalDirection,
} from '../../src/core/types';
import { ShakeRecognizer } from '../../src/recognition/sensor/ShakeRecognizer';
import { ConflictResolver } from '../../src/conflict/ConflictResolver';
import { ActionDispatcher } from '../../src/actions/ActionDispatcher';
import { CustomAction } from '../../src/actions/CustomAction';

/**
 * Integration test: Full pipeline flow
 * Sensor input → Processing (mock) → ShakeRecognizer → ConflictResolver → ActionDispatcher
 */
describe('Full Pipeline Integration', () => {
  it('should flow from sensor input to action dispatch', async () => {
    const bus = new EventBus();
    const actionResults: GestureEvent[] = [];

    // Set up Layer 3: Recognizer
    const shakeRecognizer = new ShakeRecognizer(bus, {
      threshold: 1.5,
      consecutiveSamples: 2,
      cooldownMs: 0,
    });

    // Set up Layer 4: Conflict Resolver
    const conflictResolver = new ConflictResolver(bus);
    conflictResolver.start();

    // Set up Layer 5: Action Dispatcher
    const dispatcher = new ActionDispatcher(bus);
    dispatcher.registerAction(
      'shake',
      new CustomAction('test-shake-action', (event) => {
        actionResults.push(event);
      }),
    );
    dispatcher.start();

    // Simulate Layer 1 + 2: Create processed samples from "sensor input"
    const now = Date.now();

    const sample1: ProcessedSample = {
      inputEvent: {
        id: 'sensor-1',
        timestamp: now,
        inputType: InputType.Sensor,
        data: { type: SensorType.Accelerometer, x: 1, y: 1, z: 1 },
      },
      velocity: Math.sqrt(3),
      velocityX: 1,
      velocityY: 1,
      angleRadians: 0,
      angleDegrees: 0,
      direction: CardinalDirection.None,
      normalizedMagnitude: 0.5,
      filtered: { x: 1, y: 1, z: 1 },
      timestamp: now,
    };

    const sample2: ProcessedSample = {
      inputEvent: {
        id: 'sensor-2',
        timestamp: now + 100,
        inputType: InputType.Sensor,
        data: { type: SensorType.Accelerometer, x: 1.2, y: 1.2, z: 1.2 },
      },
      velocity: Math.sqrt(3 * 1.44),
      velocityX: 1.2,
      velocityY: 1.2,
      angleRadians: 0,
      angleDegrees: 0,
      direction: CardinalDirection.None,
      normalizedMagnitude: 0.6,
      filtered: { x: 1.2, y: 1.2, z: 1.2 },
      timestamp: now + 100,
    };

    // Feed samples into recognizer (simulating the GestureEngine pipeline)
    shakeRecognizer.onProcessedSample(sample1);
    shakeRecognizer.onProcessedSample(sample2);

    // Wait for ConflictResolver microtask batching
    await Promise.resolve();
    await Promise.resolve();

    // Verify the action was dispatched (both Began and Ended arrive)
    expect(actionResults.length).toBeGreaterThanOrEqual(1);
    const endedResult = actionResults.find((e) => e.state === RecognizerState.Ended);
    expect(endedResult).toBeDefined();
    expect(endedResult!.name).toBe('shake');

    // Clean up
    conflictResolver.stop();
    dispatcher.stop();
    shakeRecognizer.dispose();
    bus.clear();
  });

  it('should block lower-priority actions when exclusive gesture is active', async () => {
    const bus = new EventBus();
    const resolvedNames: string[] = [];

    const conflictResolver = new ConflictResolver(bus);
    conflictResolver.start();

    bus.on(EventChannel.ConflictResolved, (e) => resolvedNames.push(e.name));

    // Exclusive high-priority gesture begins
    bus.emit(EventChannel.RecognitionGesture, {
      id: 'exc-1', name: 'edge-swipe-left', state: RecognizerState.Began,
      priority: 5, isExclusive: true, timestamp: Date.now(), metadata: {},
    });

    // Lower-priority non-exclusive gesture
    bus.emit(EventChannel.RecognitionGesture, {
      id: 'tap-1', name: 'tap', state: RecognizerState.Ended,
      priority: 50, isExclusive: false, timestamp: Date.now(), metadata: {},
    });

    await Promise.resolve();

    // Only edge-swipe should pass through
    expect(resolvedNames).toContain('edge-swipe-left');
    expect(resolvedNames).not.toContain('tap');

    conflictResolver.stop();
    bus.clear();
  });
});
