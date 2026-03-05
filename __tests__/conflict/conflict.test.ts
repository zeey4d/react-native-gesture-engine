import { GesturePriorityQueue } from '../../src/conflict/GesturePriorityQueue';
import { LockManager } from '../../src/conflict/LockManager';
import { ConflictResolver } from '../../src/conflict/ConflictResolver';
import { EventBus } from '../../src/core/EventBus';
import { EventChannel, GestureEvent, RecognizerState } from '../../src/core/types';

function makeGestureEvent(
  name: string,
  priority: number,
  state = RecognizerState.Ended,
  isExclusive = false,
): GestureEvent {
  return {
    id: `${name}-${Date.now()}-${Math.random()}`,
    name,
    state,
    priority,
    isExclusive,
    timestamp: Date.now(),
    metadata: {},
  };
}

// ─── GesturePriorityQueue ───────────────────────────────────────────────────

describe('GesturePriorityQueue', () => {
  it('should extract events in priority order (lower number first)', () => {
    const queue = new GesturePriorityQueue();
    queue.insert(makeGestureEvent('low-priority', 100));
    queue.insert(makeGestureEvent('high-priority', 1));
    queue.insert(makeGestureEvent('mid-priority', 50));

    expect(queue.extractMin()?.name).toBe('high-priority');
    expect(queue.extractMin()?.name).toBe('mid-priority');
    expect(queue.extractMin()?.name).toBe('low-priority');
  });

  it('should return null when empty', () => {
    const queue = new GesturePriorityQueue();
    expect(queue.extractMin()).toBeNull();
    expect(queue.peek()).toBeNull();
  });

  it('should report correct size', () => {
    const queue = new GesturePriorityQueue();
    expect(queue.isEmpty()).toBe(true);
    queue.insert(makeGestureEvent('a', 1));
    expect(queue.size).toBe(1);
    expect(queue.isEmpty()).toBe(false);
    queue.extractMin();
    expect(queue.isEmpty()).toBe(true);
  });

  it('should peek without removing', () => {
    const queue = new GesturePriorityQueue();
    queue.insert(makeGestureEvent('a', 10));
    queue.insert(makeGestureEvent('b', 5));
    expect(queue.peek()?.name).toBe('b');
    expect(queue.size).toBe(2);
  });

  it('should drain all in order', () => {
    const queue = new GesturePriorityQueue();
    queue.insert(makeGestureEvent('c', 30));
    queue.insert(makeGestureEvent('a', 10));
    queue.insert(makeGestureEvent('b', 20));

    const drained = queue.drainAll();
    expect(drained.map((e) => e.name)).toEqual(['a', 'b', 'c']);
    expect(queue.isEmpty()).toBe(true);
  });
});

// ─── LockManager ────────────────────────────────────────────────────────────

describe('LockManager', () => {
  it('should acquire and check locks', () => {
    const lm = new LockManager();
    lm.acquireLock('swipe', 10);
    expect(lm.hasLock('swipe')).toBe(true);
    expect(lm.activeLockCount).toBe(1);
  });

  it('should block lower-priority gestures', () => {
    const lm = new LockManager();
    lm.acquireLock('swipe', 10); // high priority lock

    // 'tap' with priority 50 should be blocked (50 > 10)
    expect(lm.isLocked('tap', 50)).toBe(true);
    // 'tap' with priority 5 should NOT be blocked (5 < 10)
    expect(lm.isLocked('tap', 5)).toBe(false);
  });

  it('should not block the gesture that holds the lock', () => {
    const lm = new LockManager();
    lm.acquireLock('swipe', 10);
    expect(lm.isLocked('swipe', 10)).toBe(false);
  });

  it('should release locks', () => {
    const lm = new LockManager();
    lm.acquireLock('swipe', 10);
    lm.releaseLock('swipe');
    expect(lm.hasLock('swipe')).toBe(false);
    expect(lm.isLocked('tap', 50)).toBe(false);
  });

  it('should clear all locks', () => {
    const lm = new LockManager();
    lm.acquireLock('a', 10);
    lm.acquireLock('b', 20);
    lm.clearAll();
    expect(lm.activeLockCount).toBe(0);
  });
});

// ─── ConflictResolver ───────────────────────────────────────────────────────

describe('ConflictResolver', () => {
  let bus: EventBus;
  let resolver: ConflictResolver;
  let resolvedEvents: GestureEvent[];

  beforeEach(() => {
    bus = new EventBus();
    resolver = new ConflictResolver(bus);
    resolvedEvents = [];
    bus.on(EventChannel.ConflictResolved, (e) => resolvedEvents.push(e));
    resolver.start();
  });

  afterEach(() => {
    resolver.stop();
    bus.clear();
  });

  it('should pass through non-exclusive events', async () => {
    bus.emit(EventChannel.RecognitionGesture, makeGestureEvent('tap', 10));
    // Wait for microtask
    await Promise.resolve();
    expect(resolvedEvents.length).toBe(1);
    expect(resolvedEvents[0].name).toBe('tap');
  });

  it('should block lower-priority events when exclusive gesture is active', async () => {
    // Exclusive gesture begins
    bus.emit(
      EventChannel.RecognitionGesture,
      makeGestureEvent('swipe', 10, RecognizerState.Began, true),
    );
    await Promise.resolve();

    // Lower priority gesture
    bus.emit(
      EventChannel.RecognitionGesture,
      makeGestureEvent('tap', 50, RecognizerState.Ended, false),
    );
    await Promise.resolve();

    // swipe should pass, tap should be blocked
    const swipeEvents = resolvedEvents.filter((e) => e.name === 'swipe');
    const tapEvents = resolvedEvents.filter((e) => e.name === 'tap');
    expect(swipeEvents.length).toBe(1);
    expect(tapEvents.length).toBe(0);
  });

  it('should release lock when exclusive gesture ends', async () => {
    bus.emit(
      EventChannel.RecognitionGesture,
      makeGestureEvent('swipe', 10, RecognizerState.Began, true),
    );
    await Promise.resolve();

    bus.emit(
      EventChannel.RecognitionGesture,
      makeGestureEvent('swipe', 10, RecognizerState.Ended, true),
    );
    await Promise.resolve();

    // Now tap should pass through
    bus.emit(
      EventChannel.RecognitionGesture,
      makeGestureEvent('tap', 50, RecognizerState.Ended, false),
    );
    await Promise.resolve();

    const tapEvents = resolvedEvents.filter((e) => e.name === 'tap');
    expect(tapEvents.length).toBe(1);
  });
});
