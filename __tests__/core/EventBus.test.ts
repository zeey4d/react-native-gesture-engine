import { EventBus } from '../../src/core/EventBus';
import { EventChannel, InputEvent, InputType, TouchType, generateId } from '../../src/core/types';

describe('EventBus', () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = new EventBus();
  });

  afterEach(() => {
    bus.clear();
  });

  it('should subscribe and receive events', () => {
    const handler = jest.fn();
    bus.on(EventChannel.InputRaw, handler);

    const event: InputEvent = {
      id: generateId(),
      timestamp: Date.now(),
      inputType: InputType.Touch,
      data: {
        type: TouchType.Tap,
        x: 100, y: 200,
        translationX: 0, translationY: 0,
        velocityX: 0, velocityY: 0,
        scale: 1, rotation: 0,
        numberOfPointers: 1,
      },
    };

    bus.emit(EventChannel.InputRaw, event);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(event);
  });

  it('should support multiple handlers on the same channel', () => {
    const handler1 = jest.fn();
    const handler2 = jest.fn();
    bus.on(EventChannel.InputRaw, handler1);
    bus.on(EventChannel.InputRaw, handler2);

    const event: InputEvent = {
      id: 'test',
      timestamp: 0,
      inputType: InputType.Touch,
      data: { type: TouchType.Tap, x: 0, y: 0, translationX: 0, translationY: 0, velocityX: 0, velocityY: 0, scale: 1, rotation: 0, numberOfPointers: 1 },
    };

    bus.emit(EventChannel.InputRaw, event);
    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).toHaveBeenCalledTimes(1);
  });

  it('should unsubscribe via returned function', () => {
    const handler = jest.fn();
    const unsub = bus.on(EventChannel.InputRaw, handler);

    const event: InputEvent = {
      id: 'test',
      timestamp: 0,
      inputType: InputType.Touch,
      data: { type: TouchType.Tap, x: 0, y: 0, translationX: 0, translationY: 0, velocityX: 0, velocityY: 0, scale: 1, rotation: 0, numberOfPointers: 1 },
    };

    bus.emit(EventChannel.InputRaw, event);
    expect(handler).toHaveBeenCalledTimes(1);

    unsub();
    bus.emit(EventChannel.InputRaw, event);
    expect(handler).toHaveBeenCalledTimes(1); // Still 1
  });

  it('should unsubscribe via off()', () => {
    const handler = jest.fn();
    bus.on(EventChannel.InputRaw, handler);

    bus.off(EventChannel.InputRaw, handler);

    const event: InputEvent = {
      id: 'test',
      timestamp: 0,
      inputType: InputType.Touch,
      data: { type: TouchType.Tap, x: 0, y: 0, translationX: 0, translationY: 0, velocityX: 0, velocityY: 0, scale: 1, rotation: 0, numberOfPointers: 1 },
    };

    bus.emit(EventChannel.InputRaw, event);
    expect(handler).not.toHaveBeenCalled();
  });

  it('should clear all handlers', () => {
    const handler1 = jest.fn();
    const handler2 = jest.fn();
    bus.on(EventChannel.InputRaw, handler1);
    bus.on(EventChannel.ProcessingSample, handler2 as any);

    bus.clear();

    const event: InputEvent = {
      id: 'test',
      timestamp: 0,
      inputType: InputType.Touch,
      data: { type: TouchType.Tap, x: 0, y: 0, translationX: 0, translationY: 0, velocityX: 0, velocityY: 0, scale: 1, rotation: 0, numberOfPointers: 1 },
    };

    bus.emit(EventChannel.InputRaw, event);
    expect(handler1).not.toHaveBeenCalled();
  });

  it('should not throw when emitting on empty channel', () => {
    expect(() => {
      const event: InputEvent = {
        id: 'test',
        timestamp: 0,
        inputType: InputType.Touch,
        data: { type: TouchType.Tap, x: 0, y: 0, translationX: 0, translationY: 0, velocityX: 0, velocityY: 0, scale: 1, rotation: 0, numberOfPointers: 1 },
      };
      bus.emit(EventChannel.InputRaw, event);
    }).not.toThrow();
  });

  it('should isolate handler errors', () => {
    const badHandler = jest.fn(() => { throw new Error('boom'); });
    const goodHandler = jest.fn();
    bus.on(EventChannel.InputRaw, badHandler);
    bus.on(EventChannel.InputRaw, goodHandler);

    const event: InputEvent = {
      id: 'test',
      timestamp: 0,
      inputType: InputType.Touch,
      data: { type: TouchType.Tap, x: 0, y: 0, translationX: 0, translationY: 0, velocityX: 0, velocityY: 0, scale: 1, rotation: 0, numberOfPointers: 1 },
    };

    expect(() => bus.emit(EventChannel.InputRaw, event)).not.toThrow();
    expect(goodHandler).toHaveBeenCalledTimes(1);
  });
});
