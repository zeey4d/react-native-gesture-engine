// ─── GestureEngine ──────────────────────────────────────────────────────────
// Main orchestrator that wires all 6 layers together via the EventBus.
//
// Responsibilities:
// 1. Creates and owns the EventBus
// 2. Instantiates providers, processors, and conflict resolver
// 3. Wires raw input → processing → recognition → conflict → action → feedback
// 4. Provides a clean API: start(), stop(), registerRecognizer(), etc.
// ─────────────────────────────────────────────────────────────────────────────

import { EventBus } from './core/EventBus';
import {
  IEventBus,
  EventChannel,
  InputEvent,
  InputType,
  ProcessedSample,
  GestureEvent,
  GestureEngineConfig,
  IRecognizer,
  IGestureAction,
  IFeedbackProvider,
  TouchData,
  SensorData,
  CardinalDirection,
  generateId,
} from './core/types';
import { TouchInputProvider } from './input/TouchInputProvider';
import { SensorInputProvider } from './input/SensorInputProvider';
import { NoiseFilter } from './processing/NoiseFilter';
import { VelocityCalculator } from './processing/VelocityCalculator';
import { AngleDetector } from './processing/AngleDetector';
import { ThresholdNormalizer } from './processing/ThresholdNormalizer';
import { StreamBuffer } from './processing/StreamBuffer';
import { ConflictResolver } from './conflict/ConflictResolver';
import { ActionDispatcher } from './actions/ActionDispatcher';

/**
 * GestureEngine is the main orchestrator for the gesture pipeline.
 *
 * It connects all 6 layers:
 * Input → Processing → Recognition → Conflict → Action → Feedback
 *
 * All communication flows through the typed EventBus.
 */
export class GestureEngine {
  // ─── Core ──────────────────────────────────────────────────────────
  readonly eventBus: IEventBus;
  private config: Required<GestureEngineConfig>;

  // ─── Layer 1: Input ────────────────────────────────────────────────
  readonly touchInput: TouchInputProvider;
  readonly sensorInput: SensorInputProvider;

  // ─── Layer 2: Processing ───────────────────────────────────────────
  private noiseFilter: NoiseFilter;
  private sensorNoiseFilter: NoiseFilter;
  private velocityCalc: VelocityCalculator;
  private angleDetector: AngleDetector;
  private normalizer: ThresholdNormalizer;
  private streamBuffer: StreamBuffer;

  // ─── Layer 3: Recognition ──────────────────────────────────────────
  private recognizers: IRecognizer[] = [];

  // ─── Layer 4: Conflict Resolution ─────────────────────────────────
  private conflictResolver: ConflictResolver;

  // ─── Layer 5: Actions ──────────────────────────────────────────────
  private actionDispatcher: ActionDispatcher;

  // ─── Layer 6: Feedback ─────────────────────────────────────────────
  private feedbackProviders: IFeedbackProvider[] = [];

  // ─── State ─────────────────────────────────────────────────────────
  private _isRunning = false;
  private inputUnsubscribe: (() => void) | null = null;
  private feedbackUnsubscribe: (() => void) | null = null;

  constructor(config: GestureEngineConfig = {}) {
    // Merge with defaults
    this.config = {
      sensorInterval: Math.max(16, config.sensorInterval ?? 100),
      hapticEnabled: config.hapticEnabled ?? true,
      debug: config.debug ?? false,
      screenWidth: config.screenWidth ?? 400,
      screenHeight: config.screenHeight ?? 800,
    };

    // ─── Initialize core ──────────────────────────────────────────────
    this.eventBus = new EventBus();

    // ─── Initialize Layer 1: Input providers ──────────────────────────
    this.touchInput = new TouchInputProvider(this.eventBus);
    this.sensorInput = new SensorInputProvider(
      this.eventBus,
      this.config.sensorInterval,
    );

    // ─── Initialize Layer 2: Processing ───────────────────────────────
    this.noiseFilter = new NoiseFilter(0.8);
    this.sensorNoiseFilter = new NoiseFilter(0.2); // Lower alpha for high-pass on sensors
    this.velocityCalc = new VelocityCalculator();
    this.angleDetector = new AngleDetector();
    this.normalizer = new ThresholdNormalizer(0, 10);
    this.streamBuffer = new StreamBuffer(400, 64);

    // ─── Initialize Layer 4: Conflict Resolution ──────────────────────
    this.conflictResolver = new ConflictResolver(this.eventBus);

    // ─── Initialize Layer 5: Action Dispatcher ────────────────────────
    this.actionDispatcher = new ActionDispatcher(this.eventBus);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Public API
  // ═══════════════════════════════════════════════════════════════════════

  get isRunning(): boolean {
    return this._isRunning;
  }

  /**
   * Start the gesture engine. Activates all providers and wires the pipeline.
   */
  start(): void {
    if (this._isRunning) return;
    this._isRunning = true;

    // Wire Layer 1 → Layer 2 → Layer 3: raw input → processing → recognition
    this.inputUnsubscribe = this.eventBus.on(
      EventChannel.InputRaw,
      (event: InputEvent) => this.processInput(event),
    );

    // Wire Layer 6: feedback on action dispatch
    this.feedbackUnsubscribe = this.eventBus.on(
      EventChannel.ActionDispatched,
      (event: GestureEvent) => {
        for (const provider of this.feedbackProviders) {
          if (provider.isSupported) {
            provider.trigger(event);
          }
        }
      },
    );

    // Start all infrastructure
    this.touchInput.start();
    this.sensorInput.start();
    this.conflictResolver.start();
    this.actionDispatcher.start();

    if (this.config.debug) {
      console.log('[GestureEngine] Started with config:', this.config);
    }
  }

  /**
   * Stop the gesture engine. Cleans up all subscriptions and providers.
   */
  stop(): void {
    if (!this._isRunning) return;
    this._isRunning = false;

    // Stop providers
    this.touchInput.stop();
    this.sensorInput.stop();
    this.conflictResolver.stop();
    this.actionDispatcher.stop();

    // Unsubscribe pipeline wiring
    this.inputUnsubscribe?.();
    this.feedbackUnsubscribe?.();
    this.inputUnsubscribe = null;
    this.feedbackUnsubscribe = null;

    // Reset processors
    this.noiseFilter.reset();
    this.sensorNoiseFilter.reset();
    this.velocityCalc.reset();
    this.streamBuffer.clear();

    // Reset recognizers
    for (const recognizer of this.recognizers) {
      recognizer.reset();
    }

    if (this.config.debug) {
      console.log('[GestureEngine] Stopped');
    }
  }

  /**
   * Register a gesture recognizer with the engine.
   */
  registerRecognizer(recognizer: IRecognizer): void {
    this.recognizers.push(recognizer);
    if (this.config.debug) {
      console.log(`[GestureEngine] Registered recognizer: ${recognizer.name}`);
    }
  }

  /**
   * Unregister a recognizer by its ID.
   */
  unregisterRecognizer(recognizerId: string): void {
    const index = this.recognizers.findIndex((r) => r.id === recognizerId);
    if (index !== -1) {
      const [removed] = this.recognizers.splice(index, 1);
      removed.dispose();
    }
  }

  /**
   * Register an action for a gesture name.
   */
  registerAction(gestureName: string, action: IGestureAction): void {
    this.actionDispatcher.registerAction(gestureName, action);
  }

  /**
   * Register a feedback provider.
   */
  registerFeedback(provider: IFeedbackProvider): void {
    this.feedbackProviders.push(provider);
  }

  /**
   * Get all registered recognizers.
   */
  getRecognizers(): IRecognizer[] {
    return [...this.recognizers];
  }

  /**
   * Dispose the engine and clean up all resources.
   */
  dispose(): void {
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
  private processInput(event: InputEvent): void {
    let filtered: { x: number; y: number; z: number };
    let velocityResult: { velocityX: number; velocityY: number; velocity: number };

    if (event.inputType === InputType.Touch) {
      const touch = event.data as TouchData;
      // Apply low-pass filter to touch coordinates
      filtered = this.noiseFilter.lowPass(touch.x, touch.y, 0);
      velocityResult = this.velocityCalc.calculate(
        touch.x,
        touch.y,
        event.timestamp,
      );
    } else if (event.inputType === InputType.Sensor) {
      const sensor = event.data as SensorData;
      // Apply high-pass filter to sensor data (remove gravity)
      filtered = this.sensorNoiseFilter.highPass(sensor.x, sensor.y, sensor.z);
      const magnitude = Math.sqrt(
        filtered.x ** 2 + filtered.y ** 2 + filtered.z ** 2,
      );
      velocityResult = { velocityX: filtered.x, velocityY: filtered.y, velocity: magnitude };
    } else {
      // Hardware/Camera — pass through
      filtered = { x: 0, y: 0, z: 0 };
      velocityResult = { velocityX: 0, velocityY: 0, velocity: 0 };
    }

    // Compute angle
    const angle = this.angleDetector.calculate(
      velocityResult.velocityX,
      velocityResult.velocityY,
    );

    // Normalize magnitude
    const normalizedMagnitude = this.normalizer.normalize(velocityResult.velocity);

    // Build processed sample
    const sample: ProcessedSample = {
      inputEvent: event,
      velocity: velocityResult.velocity,
      velocityX: velocityResult.velocityX,
      velocityY: velocityResult.velocityY,
      angleRadians: angle.angleRadians,
      angleDegrees: angle.angleDegrees,
      direction: angle.direction,
      normalizedMagnitude,
      filtered,
      timestamp: event.timestamp,
    };

    // Store in stream buffer
    this.streamBuffer.push(sample);

    // Emit on processing channel
    this.eventBus.emit(EventChannel.ProcessingSample, sample);

    // Feed into all recognizers (Layer 3)
    for (const recognizer of this.recognizers) {
      if (recognizer.enabled) {
        recognizer.onProcessedSample(sample);
      }
    }
  }
}
