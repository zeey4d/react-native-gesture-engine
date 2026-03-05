import { NoiseFilter } from '../../src/processing/NoiseFilter';
import { VelocityCalculator } from '../../src/processing/VelocityCalculator';
import { AngleDetector } from '../../src/processing/AngleDetector';
import { ThresholdNormalizer } from '../../src/processing/ThresholdNormalizer';
import { StreamBuffer } from '../../src/processing/StreamBuffer';
import { CardinalDirection, ProcessedSample, InputType, TouchType, InputEvent } from '../../src/core/types';

// ─── NoiseFilter ────────────────────────────────────────────────────────────

describe('NoiseFilter', () => {
  it('should return the first sample unchanged', () => {
    const filter = new NoiseFilter(0.5);
    const result = filter.lowPass(1, 2, 3);
    expect(result).toEqual({ x: 1, y: 2, z: 3 });
  });

  it('should smooth subsequent samples with low-pass', () => {
    const filter = new NoiseFilter(0.5);
    filter.lowPass(0, 0, 0);
    const result = filter.lowPass(10, 10, 10);
    // Expected: 0.5 * 10 + 0.5 * 0 = 5
    expect(result.x).toBe(5);
    expect(result.y).toBe(5);
    expect(result.z).toBe(5);
  });

  it('should extract dynamic component with high-pass', () => {
    const filter = new NoiseFilter(0.5);
    filter.highPass(0, 0, 0); // Initialize
    const result = filter.highPass(10, 10, 10);
    // high-pass = input - lowPass(input)
    // lowPass(10) = 0.5*10 + 0.5*0 = 5
    // highPass = 10 - 5 = 5
    expect(result.x).toBe(5);
    expect(result.y).toBe(5);
    expect(result.z).toBe(5);
  });

  it('should reset state', () => {
    const filter = new NoiseFilter(0.5);
    filter.lowPass(100, 100, 100);
    filter.reset();
    const result = filter.lowPass(1, 2, 3);
    expect(result).toEqual({ x: 1, y: 2, z: 3 });
  });

  it('should clamp alpha to [0, 1]', () => {
    const filter1 = new NoiseFilter(-0.5);
    const r1 = filter1.lowPass(0, 0, 0);
    filter1.lowPass(10, 10, 10); // alpha=0: output = 0*10 + 1*0 = 0
    // alpha clamped to 0

    const filter2 = new NoiseFilter(1.5);
    filter2.lowPass(0, 0, 0);
    const r2 = filter2.lowPass(10, 10, 10);
    // alpha clamped to 1: output = 1*10 + 0*0 = 10
    expect(r2.x).toBe(10);
  });
});

// ─── VelocityCalculator ─────────────────────────────────────────────────────

describe('VelocityCalculator', () => {
  it('should return zero velocity for the first sample', () => {
    const calc = new VelocityCalculator();
    const result = calc.calculate(100, 200, 1000);
    expect(result.velocity).toBe(0);
    expect(result.velocityX).toBe(0);
    expect(result.velocityY).toBe(0);
  });

  it('should compute velocity from two samples', () => {
    const calc = new VelocityCalculator();
    calc.calculate(0, 0, 0);
    const result = calc.calculate(100, 0, 100);
    // velocity = 100px / 100ms = 1 px/ms
    expect(result.velocityX).toBe(1);
    expect(result.velocityY).toBe(0);
    expect(result.velocity).toBe(1);
  });

  it('should handle diagonal movement', () => {
    const calc = new VelocityCalculator();
    calc.calculate(0, 0, 0);
    const result = calc.calculate(30, 40, 100);
    // velocity = sqrt(0.3^2 + 0.4^2) = sqrt(0.25) = 0.5
    expect(result.velocityX).toBeCloseTo(0.3);
    expect(result.velocityY).toBeCloseTo(0.4);
    expect(result.velocity).toBeCloseTo(0.5);
  });

  it('should return zero for simultaneous events (dt=0)', () => {
    const calc = new VelocityCalculator();
    calc.calculate(0, 0, 100);
    const result = calc.calculate(50, 50, 100);
    expect(result.velocity).toBe(0);
  });

  it('should reset state', () => {
    const calc = new VelocityCalculator();
    calc.calculate(100, 200, 1000);
    calc.reset();
    const result = calc.calculate(0, 0, 2000);
    expect(result.velocity).toBe(0);
  });
});

// ─── AngleDetector ──────────────────────────────────────────────────────────

describe('AngleDetector', () => {
  it('should return None direction for zero movement', () => {
    const detector = new AngleDetector();
    const result = detector.calculate(0, 0);
    expect(result.direction).toBe(CardinalDirection.None);
  });

  it('should detect Right direction', () => {
    const detector = new AngleDetector();
    const result = detector.calculate(10, 0);
    expect(result.direction).toBe(CardinalDirection.Right);
    expect(result.angleDegrees).toBeCloseTo(0);
  });

  it('should detect Down direction', () => {
    const detector = new AngleDetector();
    const result = detector.calculate(0, 10);
    expect(result.direction).toBe(CardinalDirection.Down);
    expect(result.angleDegrees).toBeCloseTo(90);
  });

  it('should detect Left direction', () => {
    const detector = new AngleDetector();
    const result = detector.calculate(-10, 0);
    expect(result.direction).toBe(CardinalDirection.Left);
    expect(Math.abs(result.angleDegrees)).toBeCloseTo(180);
  });

  it('should detect Up direction', () => {
    const detector = new AngleDetector();
    const result = detector.calculate(0, -10);
    expect(result.direction).toBe(CardinalDirection.Up);
    expect(result.angleDegrees).toBeCloseTo(-90);
  });

  it('should detect diagonal directions', () => {
    const detector = new AngleDetector();
    expect(detector.calculate(10, 10).direction).toBe(CardinalDirection.DownRight);
    expect(detector.calculate(-10, 10).direction).toBe(CardinalDirection.DownLeft);
    expect(detector.calculate(10, -10).direction).toBe(CardinalDirection.UpRight);
    expect(detector.calculate(-10, -10).direction).toBe(CardinalDirection.UpLeft);
  });
});

// ─── ThresholdNormalizer ────────────────────────────────────────────────────

describe('ThresholdNormalizer', () => {
  it('should normalize to 0 for values at or below min', () => {
    const norm = new ThresholdNormalizer(0, 10);
    expect(norm.normalize(-5)).toBe(0);
    expect(norm.normalize(0)).toBe(0);
  });

  it('should normalize to 1 for values at or above max', () => {
    const norm = new ThresholdNormalizer(0, 10);
    expect(norm.normalize(10)).toBe(1);
    expect(norm.normalize(15)).toBe(1);
  });

  it('should linearly interpolate in between', () => {
    const norm = new ThresholdNormalizer(0, 10);
    expect(norm.normalize(5)).toBe(0.5);
    expect(norm.normalize(2.5)).toBe(0.25);
  });

  it('should throw if min >= max', () => {
    expect(() => new ThresholdNormalizer(10, 10)).toThrow();
    expect(() => new ThresholdNormalizer(10, 5)).toThrow();
  });

  it('should support dynamic range updates', () => {
    const norm = new ThresholdNormalizer(0, 10);
    norm.setRange(0, 100);
    expect(norm.normalize(50)).toBe(0.5);
  });
});

// ─── StreamBuffer ───────────────────────────────────────────────────────────

function makeSample(timestamp: number): ProcessedSample {
  return {
    inputEvent: {
      id: `test-${timestamp}`,
      timestamp,
      inputType: InputType.Touch,
      data: { type: TouchType.Pan, x: 0, y: 0, translationX: 0, translationY: 0, velocityX: 0, velocityY: 0, scale: 1, rotation: 0, numberOfPointers: 1 },
    },
    velocity: 0,
    velocityX: 0,
    velocityY: 0,
    angleRadians: 0,
    angleDegrees: 0,
    direction: CardinalDirection.None,
    normalizedMagnitude: 0,
    filtered: { x: 0, y: 0, z: 0 },
    timestamp,
  };
}

describe('StreamBuffer', () => {
  it('should store and retrieve samples', () => {
    const buffer = new StreamBuffer(1000, 10);
    buffer.push(makeSample(100));
    buffer.push(makeSample(200));
    expect(buffer.size()).toBe(2);
    expect(buffer.getAll()).toHaveLength(2);
  });

  it('should return latest sample', () => {
    const buffer = new StreamBuffer(1000, 10);
    buffer.push(makeSample(100));
    buffer.push(makeSample(200));
    expect(buffer.latest()?.timestamp).toBe(200);
  });

  it('should evict stale samples', () => {
    const buffer = new StreamBuffer(100, 10); // 100ms window
    buffer.push(makeSample(100));
    buffer.push(makeSample(150));
    buffer.push(makeSample(250)); // 100 is now 150ms old → evicted

    const all = buffer.getAll();
    expect(all.every((s) => s.timestamp >= 150)).toBe(true);
  });

  it('should wrap around when full', () => {
    const buffer = new StreamBuffer(10000, 3); // capacity=3
    buffer.push(makeSample(100));
    buffer.push(makeSample(200));
    buffer.push(makeSample(300));
    buffer.push(makeSample(400)); // overwrites first

    expect(buffer.size()).toBeLessThanOrEqual(3);
    expect(buffer.latest()?.timestamp).toBe(400);
  });

  it('should clear all samples', () => {
    const buffer = new StreamBuffer(1000, 10);
    buffer.push(makeSample(100));
    buffer.push(makeSample(200));
    buffer.clear();
    expect(buffer.size()).toBe(0);
    expect(buffer.latest()).toBeNull();
  });

  it('should return null for latest on empty buffer', () => {
    const buffer = new StreamBuffer(1000, 10);
    expect(buffer.latest()).toBeNull();
  });
});
