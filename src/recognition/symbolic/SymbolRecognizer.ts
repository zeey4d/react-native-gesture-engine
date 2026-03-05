// ─── SymbolRecognizer ───────────────────────────────────────────────────────
// Basic $1 Unistroke Recognizer implementation for drawn shapes.
// Recognizes drawn gestures by comparing against template point patterns.
//
// $1 Algorithm steps:
// 1. Resample path to N equidistant points (default 64)
// 2. Rotate to indicative angle (align first point → centroid to 0°)
// 3. Scale to fit reference square
// 4. Compare against templates using average point distance
//
// Built-in templates: circle, triangle, check, cross, rectangle
// ─────────────────────────────────────────────────────────────────────────────

import {
  ProcessedSample, InputType, TouchType, TouchData,
  IEventBus, SymbolRecognizerConfig,
} from '../../core/types';
import { BaseRecognizer } from '../base/BaseRecognizer';

interface Point {
  x: number;
  y: number;
}

// ─── Built-in symbol templates ────────────────────────────────────────────

function generateCircleTemplate(n = 64): Point[] {
  const points: Point[] = [];
  for (let i = 0; i < n; i++) {
    const angle = (2 * Math.PI * i) / n;
    points.push({ x: Math.cos(angle), y: Math.sin(angle) });
  }
  return points;
}

function generateTriangleTemplate(): Point[] {
  const pts: Point[] = [];
  // Three sides of a triangle
  const vertices: Point[] = [
    { x: 0.5, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
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

function generateCheckTemplate(): Point[] {
  // Checkmark: down-right then up-right
  const pts: Point[] = [];
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

const DEFAULT_TEMPLATES: Record<string, Point[]> = {
  circle: generateCircleTemplate(),
  triangle: generateTriangleTemplate(),
  check: generateCheckTemplate(),
};

export class SymbolRecognizer extends BaseRecognizer {
  private templates: Record<string, Point[]>;
  private minConfidence: number;
  private currentPath: Point[] = [];
  private isDrawing = false;
  private resampleCount = 64;
  private squareSize = 250;

  constructor(eventBus: IEventBus, config: SymbolRecognizerConfig = {}) {
    super('symbol', eventBus, {
      priority: config.priority ?? 60,
      isExclusive: config.isExclusive ?? false,
      enabled: config.enabled,
    });
    this.templates = config.templates ?? DEFAULT_TEMPLATES;
    this.minConfidence = config.minConfidence ?? 0.7;
  }

  onProcessedSample(sample: ProcessedSample): void {
    if (!this.enabled) return;

    const { inputEvent } = sample;
    if (inputEvent.inputType !== InputType.Touch) return;

    const touchData = inputEvent.data as TouchData;
    if (touchData.type !== TouchType.Pan) return;

    const velocity = Math.sqrt(
      touchData.velocityX ** 2 + touchData.velocityY ** 2,
    );

    // Start tracking when finger moves
    if (!this.isDrawing) {
      this.isDrawing = true;
      this.currentPath = [];
      this.transitionToPossible();
    }

    // Record point
    this.currentPath.push({ x: touchData.x, y: touchData.y });

    // Detect end of stroke (velocity drops near zero)
    if (velocity < 0.01 && this.currentPath.length > 10) {
      this.isDrawing = false;
      this.recognize();
    }
  }

  override reset(): void {
    super.reset();
    this.currentPath = [];
    this.isDrawing = false;
  }

  /**
   * Run the $1 recognizer against collected path points.
   */
  private recognize(): void {
    if (this.currentPath.length < 10) {
      this.transitionToFailed();
      return;
    }

    // Step 1: Resample
    const resampled = this.resample(this.currentPath, this.resampleCount);

    // Step 2: Rotate to indicative angle
    const centroid = this.getCentroid(resampled);
    const angle = Math.atan2(centroid.y - resampled[0].y, centroid.x - resampled[0].x);
    const rotated = this.rotateBy(resampled, -angle);

    // Step 3: Scale to square
    const scaled = this.scaleTo(rotated, this.squareSize);

    // Step 4: Translate to origin
    const translated = this.translateToOrigin(scaled);

    // Step 5: Match against templates
    let bestMatch = '';
    let bestScore = 0;

    for (const [name, templatePoints] of Object.entries(this.templates)) {
      // Process template the same way
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
        confidence: bestScore,
      });
      this.transitionToEnded({
        symbol: bestMatch,
        confidence: bestScore,
      });
    } else {
      this.transitionToFailed();
    }

    this.currentPath = [];
  }

  // ─── $1 Unistroke helper functions ────────────────────────────────

  private resample(points: Point[], n: number): Point[] {
    const totalLength = this.pathLength(points);
    const interval = totalLength / (n - 1);
    const resampled: Point[] = [points[0]];
    let accumulated = 0;

    for (let i = 1; i < points.length; i++) {
      const d = this.distance(points[i - 1], points[i]);

      if (accumulated + d >= interval) {
        const t = (interval - accumulated) / d;
        const newPoint: Point = {
          x: points[i - 1].x + t * (points[i].x - points[i - 1].x),
          y: points[i - 1].y + t * (points[i].y - points[i - 1].y),
        };
        resampled.push(newPoint);
        points.splice(i, 0, newPoint);
        accumulated = 0;
      } else {
        accumulated += d;
      }
    }

    // Pad to n points if needed
    while (resampled.length < n) {
      resampled.push(points[points.length - 1]);
    }

    return resampled.slice(0, n);
  }

  private getCentroid(points: Point[]): Point {
    let sumX = 0, sumY = 0;
    for (const p of points) {
      sumX += p.x;
      sumY += p.y;
    }
    return { x: sumX / points.length, y: sumY / points.length };
  }

  private rotateBy(points: Point[], angle: number): Point[] {
    const centroid = this.getCentroid(points);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return points.map((p) => ({
      x: (p.x - centroid.x) * cos - (p.y - centroid.y) * sin + centroid.x,
      y: (p.x - centroid.x) * sin + (p.y - centroid.y) * cos + centroid.y,
    }));
  }

  private scaleTo(points: Point[], size: number): Point[] {
    const bb = this.boundingBox(points);
    const w = bb.maxX - bb.minX;
    const h = bb.maxY - bb.minY;
    if (w === 0 || h === 0) return points;
    return points.map((p) => ({
      x: (p.x * size) / w,
      y: (p.y * size) / h,
    }));
  }

  private translateToOrigin(points: Point[]): Point[] {
    const centroid = this.getCentroid(points);
    return points.map((p) => ({
      x: p.x - centroid.x,
      y: p.y - centroid.y,
    }));
  }

  private boundingBox(points: Point[]) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of points) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
    return { minX, minY, maxX, maxY };
  }

  private pathDistance(a: Point[], b: Point[]): number {
    const len = Math.min(a.length, b.length);
    let total = 0;
    for (let i = 0; i < len; i++) {
      total += this.distance(a[i], b[i]);
    }
    return total / len;
  }

  private pathLength(points: Point[]): number {
    let total = 0;
    for (let i = 1; i < points.length; i++) {
      total += this.distance(points[i - 1], points[i]);
    }
    return total;
  }

  private distance(a: Point, b: Point): number {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  }
}
