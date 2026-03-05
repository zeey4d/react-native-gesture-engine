/** Classification of input sources feeding into the pipeline */
declare enum InputType {
    Touch = "touch",
    Sensor = "sensor",
    Hardware = "hardware",
    Camera = "camera"
}
/** Sub-type classification for touch inputs */
declare enum TouchType {
    Pan = "pan",
    Tap = "tap",
    Pinch = "pinch",
    Rotation = "rotation"
}
/** Sub-type classification for sensor inputs */
declare enum SensorType {
    Accelerometer = "accelerometer",
    Gyroscope = "gyroscope"
}
/** Normalized touch data emitted by TouchInputProvider */
interface TouchData {
    /** Touch sub-type (pan, tap, pinch, rotation) */
    type: TouchType;
    /** Current X position in screen coordinates */
    x: number;
    /** Current Y position in screen coordinates */
    y: number;
    /** Translation from start point on X axis */
    translationX: number;
    /** Translation from start point on Y axis */
    translationY: number;
    /** Instantaneous velocity on X axis (px/ms) */
    velocityX: number;
    /** Instantaneous velocity on Y axis (px/ms) */
    velocityY: number;
    /** Scale factor for pinch gestures (1.0 = no scale) */
    scale: number;
    /** Rotation angle in radians for rotation gestures */
    rotation: number;
    /** Number of active touch points */
    numberOfPointers: number;
}
/** Sensor data emitted by SensorInputProvider */
interface SensorData {
    type: SensorType;
    x: number;
    y: number;
    z: number;
}
/** Hardware input data (e.g., volume button presses) */
interface HardwareData {
    /** Key identifier, e.g. 'volumeUp', 'volumeDown' */
    key: string;
    /** Press action: 'down' or 'up' */
    action: 'down' | 'up';
}
/**
 * Unified input event emitted by all providers on the InputRaw channel.
 * The `data` field is discriminated by `inputType`.
 */
interface InputEvent {
    /** Unique event identifier */
    id: string;
    /** Timestamp in milliseconds (performance.now or Date.now) */
    timestamp: number;
    /** Source classification */
    inputType: InputType;
    /** Payload — shape depends on inputType */
    data: TouchData | SensorData | HardwareData;
}
/** Cardinal direction classification */
declare enum CardinalDirection {
    Up = "up",
    Down = "down",
    Left = "left",
    Right = "right",
    UpLeft = "up-left",
    UpRight = "up-right",
    DownLeft = "down-left",
    DownRight = "down-right",
    None = "none"
}
/**
 * Enriched data produced by the processing layer.
 * Combines raw input with computed velocity, angle, and normalized magnitude.
 */
interface ProcessedSample {
    /** Reference to the original input event */
    inputEvent: InputEvent;
    /** Computed velocity magnitude (px/ms or g/ms) */
    velocity: number;
    /** Velocity on X axis */
    velocityX: number;
    /** Velocity on Y axis */
    velocityY: number;
    /** Direction angle in radians */
    angleRadians: number;
    /** Direction angle in degrees */
    angleDegrees: number;
    /** Cardinal direction classification */
    direction: CardinalDirection;
    /** Magnitude normalized to [0, 1] */
    normalizedMagnitude: number;
    /** Filtered data coordinates (noise-reduced) */
    filtered: {
        x: number;
        y: number;
        z: number;
    };
    /** Processing timestamp */
    timestamp: number;
}
/**
 * Recognizer state machine states.
 * Transitions: Idle → Possible → Began → Changed → Ended
 *                                       ↘ Failed / Cancelled
 */
declare enum RecognizerState {
    Idle = "idle",
    Possible = "possible",
    Began = "began",
    Changed = "changed",
    Ended = "ended",
    Failed = "failed",
    Cancelled = "cancelled"
}
/** Additional metadata attached to gesture events */
interface GestureMetadata {
    /** Translation amount for pan/swipe gestures */
    translation?: {
        x: number;
        y: number;
    };
    /** Scale factor for pinch gestures */
    scale?: number;
    /** Rotation angle for rotation gestures */
    rotation?: number;
    /** Velocity at recognition time */
    velocity?: {
        x: number;
        y: number;
    };
    /** Edge identifier for edge-swipe gestures */
    edge?: 'left' | 'right' | 'top' | 'bottom';
    /** Detected symbol name for symbol recognizer */
    symbol?: string;
    /** Confidence score [0, 1] for symbol recognizer */
    confidence?: number;
    /** Sensor magnitude for shake/tilt/flick gestures */
    magnitude?: number;
    /** Tilt angles */
    tilt?: {
        pitch: number;
        roll: number;
    };
    /** Generic key-value bag for custom recognizers */
    [key: string]: unknown;
}
/**
 * Event emitted when a recognizer transitions state.
 * This is the primary output of Layer 3, consumed by conflict resolution and actions.
 */
interface GestureEvent {
    /** Unique event identifier */
    id: string;
    /** Human-readable gesture name, e.g. 'tap', 'shake', 'edge-swipe-left' */
    name: string;
    /** Current recognizer state */
    state: RecognizerState;
    /** Recognizer priority (lower = higher priority) */
    priority: number;
    /** Whether this gesture is exclusive (blocks others) */
    isExclusive: boolean;
    /** Event timestamp */
    timestamp: number;
    /** Gesture-specific metadata */
    metadata: GestureMetadata;
}
/** Named channels for the typed pub/sub EventBus */
declare enum EventChannel {
    /** Raw input data from providers */
    InputRaw = "input:raw",
    /** Processed samples with velocity, angle, normalization */
    ProcessingSample = "processing:sample",
    /** Gesture recognition events (state transitions) */
    RecognitionGesture = "recognition:gesture",
    /** Events that survived conflict resolution */
    ConflictResolved = "conflict:resolved",
    /** Events after action dispatch */
    ActionDispatched = "action:dispatched"
}
/** Compile-time mapping from channel to payload type */
interface EventChannelMap {
    [EventChannel.InputRaw]: InputEvent;
    [EventChannel.ProcessingSample]: ProcessedSample;
    [EventChannel.RecognitionGesture]: GestureEvent;
    [EventChannel.ConflictResolved]: GestureEvent;
    [EventChannel.ActionDispatched]: GestureEvent;
}
/** Typed event handler */
type EventHandler<C extends EventChannel> = (data: EventChannelMap[C]) => void;
/** EventBus interface */
interface IEventBus {
    on<C extends EventChannel>(channel: C, handler: EventHandler<C>): () => void;
    emit<C extends EventChannel>(channel: C, data: EventChannelMap[C]): void;
    off<C extends EventChannel>(channel: C, handler: EventHandler<C>): void;
    clear(): void;
}
/** Interface for all input providers (Layer 1) */
interface IInputProvider {
    /** Start emitting input events */
    start(): void;
    /** Stop emitting input events and clean up subscriptions */
    stop(): void;
    /** Whether the provider is currently active */
    readonly isActive: boolean;
}
/** Interface for all gesture recognizers (Layer 3) */
interface IRecognizer {
    /** Unique recognizer identifier */
    readonly id: string;
    /** Human-readable name matching the GestureEvent.name field */
    readonly name: string;
    /** Priority: lower number = higher priority */
    readonly priority: number;
    /** If true, activating this gesture blocks lower-priority gestures */
    readonly isExclusive: boolean;
    /** Current state machine state */
    readonly state: RecognizerState;
    /** Enable/disable the recognizer at runtime */
    enabled: boolean;
    /** Feed a processed sample into the recognizer for evaluation */
    onProcessedSample(sample: ProcessedSample): void;
    /** Reset the recognizer to Idle state */
    reset(): void;
    /** Clean up resources */
    dispose(): void;
}
/** Interface for gesture actions (Layer 5) */
interface IGestureAction {
    /** Unique action identifier */
    readonly actionId: string;
    /** Execute the action in response to a resolved gesture */
    execute(event: GestureEvent): void;
}
/** Interface for feedback providers (Layer 6) */
interface IFeedbackProvider {
    /** Trigger feedback in response to a resolved gesture */
    trigger(event: GestureEvent): void;
    /** Whether this feedback type is supported on the current device */
    readonly isSupported: boolean;
}
/** Configuration for the GestureEngine orchestrator */
interface GestureEngineConfig {
    /** Sensor polling interval in ms (default 100 = 10Hz). Max 16 (~60Hz). */
    sensorInterval?: number;
    /** Enable haptic feedback (requires expo-haptics) */
    hapticEnabled?: boolean;
    /** Enable debug logging */
    debug?: boolean;
    /** Screen dimensions for edge detection */
    screenWidth?: number;
    /** Screen dimensions for edge detection */
    screenHeight?: number;
}
/** Configuration for recognizers */
interface RecognizerConfig {
    /** Override the default priority */
    priority?: number;
    /** Override the default exclusive setting */
    isExclusive?: boolean;
    /** Whether the recognizer starts enabled */
    enabled?: boolean;
}
/** Tap recognizer specific config */
interface TapRecognizerConfig extends RecognizerConfig {
    /** Maximum duration for a tap in ms (default 300) */
    maxDuration?: number;
    /** Maximum movement threshold in px (default 10) */
    maxDistance?: number;
}
/** Double-tap recognizer specific config */
interface DoubleTapRecognizerConfig extends RecognizerConfig {
    /** Maximum time between taps in ms (default 300) */
    maxInterval?: number;
    /** Maximum movement between taps in px (default 30) */
    maxDistance?: number;
}
/** Pan recognizer specific config */
interface PanRecognizerConfig extends RecognizerConfig {
    /** Minimum distance to activate in px (default 10) */
    minDistance?: number;
}
/** Pinch recognizer specific config */
interface PinchRecognizerConfig extends RecognizerConfig {
    /** Minimum scale change to activate (default 0.05) */
    minScale?: number;
}
/** Rotation recognizer specific config */
interface RotationRecognizerConfig extends RecognizerConfig {
    /** Minimum rotation in radians to activate (default 0.05) */
    minRotation?: number;
}
/** Edge-swipe recognizer specific config */
interface EdgeSwipeRecognizerConfig extends RecognizerConfig {
    /** Edge to detect: 'left', 'right', 'top', 'bottom' */
    edge: 'left' | 'right' | 'top' | 'bottom';
    /** Width of the edge detection zone in px (default 30) */
    edgeZoneWidth?: number;
    /** Minimum swipe distance in px (default 50) */
    minDistance?: number;
    /** Minimum velocity in px/ms (default 0.3) */
    minVelocity?: number;
    /** Screen width in px */
    screenWidth?: number;
    /** Screen height in px */
    screenHeight?: number;
}
/** Corner recognizer specific config */
interface CornerRecognizerConfig extends RecognizerConfig {
    /** Corner to detect */
    corner: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    /** Size of the corner zone in px (default 50) */
    cornerZoneSize?: number;
    /** Minimum swipe distance in px (default 40) */
    minDistance?: number;
    /** Screen width in px */
    screenWidth?: number;
    /** Screen height in px */
    screenHeight?: number;
}
/** Shake recognizer specific config */
interface ShakeRecognizerConfig extends RecognizerConfig {
    /** Acceleration threshold in g (default 1.5) */
    threshold?: number;
    /** Consecutive samples above threshold to trigger (default 2) */
    consecutiveSamples?: number;
    /** Cooldown period in ms (default 1000) */
    cooldownMs?: number;
}
/** Tilt recognizer specific config */
interface TiltRecognizerConfig extends RecognizerConfig {
    /** Tilt angle threshold in degrees (default 30) */
    tiltThreshold?: number;
    /** Cooldown period in ms (default 500) */
    cooldownMs?: number;
}
/** Wrist-flick recognizer specific config */
interface WristFlickRecognizerConfig extends RecognizerConfig {
    /** Angular velocity threshold in deg/s (default 150) */
    angularVelocityThreshold?: number;
    /** Cooldown in ms (default 800) */
    cooldownMs?: number;
}
/** Sequence recognizer specific config */
interface SequenceRecognizerConfig extends RecognizerConfig {
    /** Ordered gesture names to match */
    sequence: string[];
    /** Max time between steps in ms (default 800) */
    timeoutMs?: number;
}
/** Symbol recognizer specific config */
interface SymbolRecognizerConfig extends RecognizerConfig {
    /** Templates to match against: name → point array */
    templates?: Record<string, Array<{
        x: number;
        y: number;
    }>>;
    /** Minimum confidence score to accept (default 0.7) */
    minConfidence?: number;
}
/** Utility type to generate unique IDs */
type UniqueId = string;
/** Helper to create a unique ID */
declare function generateId(): UniqueId;

/**
 * Typed EventBus implementation.
 *
 * Design decisions:
 * - Lives outside the React tree to avoid unnecessary re-renders.
 * - Uses Map<channel, Set<handler>> for O(1) subscribe/unsubscribe.
 * - Generic channel parameter ensures type-safe emit/subscribe at compile time.
 * - `on()` returns an unsubscribe function for easy cleanup in useEffect.
 */
declare class EventBus implements IEventBus {
    private listeners;
    /**
     * Subscribe to a channel. Returns an unsubscribe function.
     *
     * @example
     * const unsub = bus.on(EventChannel.InputRaw, (event) => { ... });
     * // later:
     * unsub();
     */
    on<C extends EventChannel>(channel: C, handler: EventHandler<C>): () => void;
    /**
     * Emit data on a channel. All registered handlers are called synchronously.
     * The generic parameter ensures the data type matches the channel.
     */
    emit<C extends EventChannel>(channel: C, data: EventChannelMap[C]): void;
    /**
     * Remove a specific handler from a channel.
     */
    off<C extends EventChannel>(channel: C, handler: EventHandler<C>): void;
    /**
     * Remove all handlers from all channels. Called during engine teardown.
     */
    clear(): void;
}

/**
 * TouchInputProvider wraps RNGH pan/tap/pinch/rotation gestures
 * and normalizes their data into InputEvent objects.
 *
 * Usage:
 * - Call `start()` to enable event emission
 * - Use the gesture handler callbacks (onPan, onTap, etc.) inside
 *   GestureDetector components
 * - Call `stop()` to disable emission
 */
declare class TouchInputProvider implements IInputProvider {
    private eventBus;
    private _isActive;
    constructor(eventBus: IEventBus);
    get isActive(): boolean;
    start(): void;
    stop(): void;
    /**
     * Called from RNGH Pan gesture callbacks.
     * Emits normalized TouchData with translation and velocity.
     */
    onPan(data: {
        x: number;
        y: number;
        translationX: number;
        translationY: number;
        velocityX: number;
        velocityY: number;
        numberOfPointers: number;
    }): void;
    /**
     * Called from RNGH Tap gesture callbacks.
     */
    onTap(data: {
        x: number;
        y: number;
        numberOfPointers: number;
    }): void;
    /**
     * Called from RNGH Pinch gesture callbacks.
     */
    onPinch(data: {
        scale: number;
        focalX: number;
        focalY: number;
        velocity: number;
        numberOfPointers: number;
    }): void;
    /**
     * Called from RNGH Rotation gesture callbacks.
     */
    onRotation(data: {
        rotation: number;
        anchorX: number;
        anchorY: number;
        velocity: number;
        numberOfPointers: number;
    }): void;
    /** Emit a normalized InputEvent onto the EventBus */
    private emitInput;
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
declare class SensorInputProvider implements IInputProvider {
    private eventBus;
    private _isActive;
    private accelSubscription;
    private gyroSubscription;
    private updateIntervalMs;
    constructor(eventBus: IEventBus, updateIntervalMs?: number);
    get isActive(): boolean;
    start(): void;
    stop(): void;
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
declare class HardwareInputProvider implements IInputProvider {
    private eventBus;
    private _isActive;
    private subscription;
    private eventName;
    constructor(eventBus: IEventBus, eventName?: string);
    get isActive(): boolean;
    start(): void;
    stop(): void;
}

/**
 * CameraInputProvider is a future-ready stub for camera-based gesture input.
 *
 * When implemented, this would:
 * - Subscribe to a camera frame processing pipeline
 * - Run hand/pose detection models
 * - Emit InputEvents with detected gesture landmarks
 *
 * Currently a no-op — calling start()/stop() has no effect.
 */
declare class CameraInputProvider implements IInputProvider {
    private eventBus;
    private _isActive;
    constructor(eventBus: IEventBus);
    get isActive(): boolean;
    start(): void;
    stop(): void;
}

/**
 * First-order IIR noise filter with both low-pass and high-pass modes.
 *
 * Low-pass: output = α * input + (1 - α) * previousOutput
 *   - Smooths noisy signals (e.g., touch jitter)
 *   - Higher alpha = more responsive but noisier
 *
 * High-pass: output = input - lowPass(input)
 *   - Removes slowly-changing components (e.g., gravity from accelerometer)
 *   - Isolates sudden movements (shakes, flicks)
 */
declare class NoiseFilter {
    private lowPassState;
    private alpha;
    /**
     * @param alpha - Filter coefficient [0, 1]. Default 0.8.
     *  - For low-pass: 0.1 = very smooth, 0.9 = barely filtered
     *  - For high-pass: same alpha applied to the underlying low-pass
     */
    constructor(alpha?: number);
    /**
     * Apply low-pass filter. Removes high-frequency jitter.
     */
    lowPass(x: number, y: number, z: number): {
        x: number;
        y: number;
        z: number;
    };
    /**
     * Apply high-pass filter. Removes low-frequency components (gravity).
     * Returns only the dynamic/transient part of the signal.
     */
    highPass(x: number, y: number, z: number): {
        x: number;
        y: number;
        z: number;
    };
    /**
     * Reset filter state. Call when starting a new gesture or after a pause.
     */
    reset(): void;
    /**
     * Update alpha dynamically (e.g., for adaptive filtering).
     */
    setAlpha(alpha: number): void;
}

/**
 * Computes velocity from sequential position/time samples.
 * Velocity = (currentPosition - previousPosition) / (currentTime - previousTime)
 */
declare class VelocityCalculator {
    private prevX;
    private prevY;
    private prevTimestamp;
    /**
     * Calculate velocity from a new position sample.
     *
     * @param x - Current X position
     * @param y - Current Y position
     * @param timestamp - Current timestamp in milliseconds
     * @returns Velocity components and magnitude
     */
    calculate(x: number, y: number, timestamp: number): {
        velocityX: number;
        velocityY: number;
        velocity: number;
    };
    /**
     * Reset state. Call when starting a new gesture.
     */
    reset(): void;
}

/**
 * Detects direction angle and classifies into cardinal directions.
 *
 * Coordinate system:
 * - 0° / 0 rad = right
 * - 90° / π/2 rad = down (screen coordinates, Y grows downward)
 * - 180° / π rad = left
 * - -90° / -π/2 rad = up
 */
declare class AngleDetector {
    /**
     * Calculate angle from X/Y deltas.
     *
     * @param dx - Change in X (positive = right)
     * @param dy - Change in Y (positive = down in screen coords)
     * @returns Angle in radians, degrees, and cardinal direction
     */
    calculate(dx: number, dy: number): {
        angleRadians: number;
        angleDegrees: number;
        direction: CardinalDirection;
    };
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
    private classifyDirection;
}

/**
 * Maps raw magnitudes to a normalized [0, 1] range with clamping.
 *
 * Formula: normalized = clamp((value - min) / (max - min), 0, 1)
 *
 * This is useful for turning raw sensor values (e.g., acceleration in g,
 * velocity in px/ms) into intensity values that can be used for feedback
 * or threshold comparison.
 */
declare class ThresholdNormalizer {
    private min;
    private max;
    /**
     * @param min - Minimum threshold. Values at or below this map to 0.
     * @param max - Maximum threshold. Values at or above this map to 1.
     */
    constructor(min?: number, max?: number);
    /**
     * Normalize a raw value to [0, 1].
     */
    normalize(value: number): number;
    /**
     * Update thresholds dynamically.
     */
    setRange(min: number, max: number): void;
    /**
     * Get current min threshold.
     */
    getMin(): number;
    /**
     * Get current max threshold.
     */
    getMax(): number;
}

/**
 * Fixed-size ring buffer with time-based eviction.
 *
 * Design decisions:
 * - Uses a pre-allocated array with head/tail pointers for O(1) push.
 * - Evicts entries older than windowMs on each push (amortized O(1)).
 * - Capacity is generously sized (default 64) to handle burst input at 60Hz.
 * - getAll() returns samples in chronological order.
 */
declare class StreamBuffer {
    private buffer;
    private head;
    private count;
    private capacity;
    private windowMs;
    /**
     * @param windowMs - Time window in ms. Samples older than this are evicted. Default 400.
     * @param capacity - Maximum buffer size. Default 64 (~1 sec at 60Hz).
     */
    constructor(windowMs?: number, capacity?: number);
    /**
     * Push a new sample. Automatically evicts stale samples.
     * O(1) amortized.
     */
    push(sample: ProcessedSample): void;
    /**
     * Get all non-stale samples in chronological order.
     */
    getAll(): ProcessedSample[];
    /**
     * Get the most recent sample, or null if buffer is empty.
     */
    latest(): ProcessedSample | null;
    /**
     * Get the number of samples currently in the buffer.
     */
    size(): number;
    /**
     * Clear the buffer.
     */
    clear(): void;
    /**
     * Remove samples older than windowMs from the head.
     */
    private evictStale;
}

/**
 * Abstract base class for all gesture recognizers.
 *
 * Subclasses must implement:
 * - `onProcessedSample(sample)`: evaluate the sample and call transition methods
 *
 * The base class provides:
 * - State machine with validated transitions
 * - Automatic GestureEvent emission on state changes
 * - EventBus integration
 * - reset() and dispose() lifecycle methods
 */
declare abstract class BaseRecognizer implements IRecognizer {
    readonly id: string;
    readonly name: string;
    readonly priority: number;
    readonly isExclusive: boolean;
    enabled: boolean;
    private _state;
    protected eventBus: IEventBus;
    constructor(name: string, eventBus: IEventBus, options?: {
        priority?: number;
        isExclusive?: boolean;
        enabled?: boolean;
    });
    get state(): RecognizerState;
    /**
     * Must be implemented by subclasses.
     * Evaluate the incoming processed sample and trigger state transitions.
     */
    abstract onProcessedSample(sample: ProcessedSample): void;
    /**
     * Reset the recognizer to Idle state.
     */
    reset(): void;
    /**
     * Clean up resources. Override in subclasses for custom cleanup.
     */
    dispose(): void;
    /**
     * Transition to Possible state (gesture might be starting).
     */
    protected transitionToPossible(): void;
    /**
     * Transition to Began state and emit gesture event.
     * Only valid from Possible state.
     */
    protected transitionToBegan(metadata?: GestureMetadata): void;
    /**
     * Transition to Changed state and emit gesture event.
     * Only valid from Began or Changed state (continuous gestures).
     */
    protected transitionToChanged(metadata?: GestureMetadata): void;
    /**
     * Transition to Ended state and emit gesture event.
     * Valid from Began, Changed, or Possible states.
     */
    protected transitionToEnded(metadata?: GestureMetadata): void;
    /**
     * Transition to Failed state (gesture didn't match criteria).
     * Auto-resets to Idle.
     */
    protected transitionToFailed(): void;
    /**
     * Transition to Cancelled state (gesture was interrupted).
     * Auto-resets to Idle.
     */
    protected transitionToCancelled(): void;
    /**
     * Emit a GestureEvent on the RecognitionGesture channel.
     */
    private emitGestureEvent;
}

declare class TapRecognizer extends BaseRecognizer {
    private maxDuration;
    private maxDistance;
    private startTime;
    private startX;
    private startY;
    constructor(eventBus: IEventBus, config?: TapRecognizerConfig);
    onProcessedSample(sample: ProcessedSample): void;
    reset(): void;
    private resetState;
}

declare class DoubleTapRecognizer extends BaseRecognizer {
    private maxInterval;
    private maxDistance;
    private firstTapTime;
    private firstTapX;
    private firstTapY;
    private tapCount;
    constructor(eventBus: IEventBus, config?: DoubleTapRecognizerConfig);
    onProcessedSample(sample: ProcessedSample): void;
    reset(): void;
    private resetState;
}

declare class PanRecognizer extends BaseRecognizer {
    private minDistance;
    constructor(eventBus: IEventBus, config?: PanRecognizerConfig);
    onProcessedSample(sample: ProcessedSample): void;
}

declare class PinchRecognizer extends BaseRecognizer {
    private minScale;
    constructor(eventBus: IEventBus, config?: PinchRecognizerConfig);
    onProcessedSample(sample: ProcessedSample): void;
}

declare class RotationRecognizer extends BaseRecognizer {
    private minRotation;
    constructor(eventBus: IEventBus, config?: RotationRecognizerConfig);
    onProcessedSample(sample: ProcessedSample): void;
}

declare class EdgeSwipeRecognizer extends BaseRecognizer {
    private edge;
    private edgeZoneWidth;
    private minDistance;
    private minVelocity;
    private screenWidth;
    private screenHeight;
    private startedInEdge;
    private startX;
    private startY;
    constructor(eventBus: IEventBus, config: EdgeSwipeRecognizerConfig);
    onProcessedSample(sample: ProcessedSample): void;
    reset(): void;
    /**
     * Check if a point is within the configured edge zone.
     */
    private isInEdgeZone;
    /**
     * Get the swipe distance along the expected axis.
     * Left/right edges → horizontal distance, top/bottom → vertical.
     */
    private getSwipeDistance;
    /**
     * Get the swipe velocity along the expected axis.
     */
    private getSwipeVelocity;
    private resetState;
}

declare class CornerRecognizer extends BaseRecognizer {
    private corner;
    private cornerZoneSize;
    private minDistance;
    private screenWidth;
    private screenHeight;
    private startedInCorner;
    private startX;
    private startY;
    constructor(eventBus: IEventBus, config: CornerRecognizerConfig);
    onProcessedSample(sample: ProcessedSample): void;
    reset(): void;
    private isInCornerZone;
    private resetState;
}

declare class ShakeRecognizer extends BaseRecognizer {
    private threshold;
    private consecutiveSamples;
    private cooldownMs;
    private aboveThresholdCount;
    private lastTriggerTime;
    constructor(eventBus: IEventBus, config?: ShakeRecognizerConfig);
    onProcessedSample(sample: ProcessedSample): void;
    reset(): void;
}

declare class TiltRecognizer extends BaseRecognizer {
    private tiltThreshold;
    private cooldownMs;
    private lastTriggerTime;
    constructor(eventBus: IEventBus, config?: TiltRecognizerConfig);
    onProcessedSample(sample: ProcessedSample): void;
}

declare class WristFlickRecognizer extends BaseRecognizer {
    private angularVelocityThreshold;
    private cooldownMs;
    private lastTriggerTime;
    constructor(eventBus: IEventBus, config?: WristFlickRecognizerConfig);
    onProcessedSample(sample: ProcessedSample): void;
}

declare class SequenceRecognizer extends BaseRecognizer {
    private sequence;
    private timeoutMs;
    private currentIndex;
    private lastStepTime;
    private unsubscribe;
    constructor(eventBus: IEventBus, config: SequenceRecognizerConfig);
    /**
     * SequenceRecognizer doesn't use ProcessedSample — it listens
     * to GestureEvent objects on the EventBus instead.
     */
    onProcessedSample(_sample: ProcessedSample): void;
    reset(): void;
    dispose(): void;
    /**
     * Subscribe to the RecognitionGesture channel to listen for
     * completed gestures and advance the sequence.
     */
    private subscribeToGestures;
}

declare class SymbolRecognizer extends BaseRecognizer {
    private templates;
    private minConfidence;
    private currentPath;
    private isDrawing;
    private resampleCount;
    private squareSize;
    constructor(eventBus: IEventBus, config?: SymbolRecognizerConfig);
    onProcessedSample(sample: ProcessedSample): void;
    reset(): void;
    /**
     * Run the $1 recognizer against collected path points.
     */
    private recognize;
    private resample;
    private getCentroid;
    private rotateBy;
    private scaleTo;
    private translateToOrigin;
    private boundingBox;
    private pathDistance;
    private pathLength;
    private distance;
}

/**
 * LockManager tracks which gestures currently hold exclusive locks.
 *
 * When an exclusive gesture fires:
 * 1. It calls acquireLock(name, priority)
 * 2. The ConflictResolver checks isLocked(name, priority) before allowing
 *    other gestures to pass through
 * 3. Once the gesture ends, releaseLock(name) frees the slot
 *
 * Multiple locks can coexist (e.g., a high-priority lock + unrelated gestures).
 * A gesture is blocked if ANY active lock has higher or equal priority.
 */
declare class LockManager {
    /** Active locks: gestureName → priority */
    private locks;
    /**
     * Acquire an exclusive lock for a gesture.
     *
     * @param gestureName - The gesture acquiring the lock
     * @param priority - The priority level of the lock (lower = higher priority)
     * @returns true if the lock was acquired
     */
    acquireLock(gestureName: string, priority: number): boolean;
    /**
     * Release the lock held by a gesture.
     */
    releaseLock(gestureName: string): void;
    /**
     * Check if a gesture with the given priority is blocked by any active lock.
     * A gesture is blocked if an active lock has higher or equal priority
     * (lower or equal priority number) and is not the same gesture.
     *
     * @param gestureName - The gesture to check
     * @param priority - The priority of the gesture to check
     * @returns true if the gesture is blocked
     */
    isLocked(gestureName: string, priority: number): boolean;
    /**
     * Check if a specific gesture holds a lock.
     */
    hasLock(gestureName: string): boolean;
    /**
     * Clear all locks. Called during engine reset.
     */
    clearAll(): void;
    /**
     * Get the number of active locks.
     */
    get activeLockCount(): number;
}

/**
 * ConflictResolver processes gesture events through priority ordering
 * and exclusive locking to determine which gestures should be dispatched.
 *
 * Rules:
 * 1. Events are queued and processed in priority order (lower = first)
 * 2. If an exclusive gesture fires (Began state), it acquires a lock
 * 3. Locked gestures of equal or lower priority are blocked
 * 4. When an exclusive gesture ends, its lock is released
 * 5. Non-exclusive gestures pass through if not blocked
 */
declare class ConflictResolver {
    private priorityQueue;
    private lockManager;
    private eventBus;
    private unsubscribe;
    private pendingEvents;
    private processingScheduled;
    constructor(eventBus: IEventBus);
    /**
     * Start listening for gesture events and resolving conflicts.
     */
    start(): void;
    /**
     * Stop listening and clear all state.
     */
    stop(): void;
    /**
     * Schedule conflict resolution for the next microtask.
     * This batches events that arrive in the same tick.
     */
    private scheduleProcessing;
    /**
     * Process all pending events through priority queue and lock rules.
     */
    private processEvents;
    /** Expose lock manager for testing */
    getLockManager(): LockManager;
}

/**
 * Min-heap priority queue for GestureEvents.
 * Lower priority number = higher priority = processed first.
 *
 * Operations:
 * - insert: O(log n)
 * - extractMin: O(log n)
 * - peek: O(1)
 */
declare class GesturePriorityQueue {
    private heap;
    get size(): number;
    isEmpty(): boolean;
    /** Insert a gesture event into the queue. O(log n). */
    insert(event: GestureEvent): void;
    /** Extract and return the highest-priority (lowest priority number) event. O(log n). */
    extractMin(): GestureEvent | null;
    /** Peek at the highest-priority event without removing it. O(1). */
    peek(): GestureEvent | null;
    /** Remove all events from the queue. */
    clear(): void;
    /** Drain the queue, returning all events in priority order. */
    drainAll(): GestureEvent[];
    private bubbleUp;
    private bubbleDown;
}

/**
 * ActionDispatcher receives resolved gesture events and dispatches them
 * to registered action handlers.
 *
 * Actions are registered by gesture name. Multiple actions can be registered
 * for a single gesture (they all execute in registration order).
 */
declare class ActionDispatcher {
    private actionMap;
    private eventBus;
    private unsubscribe;
    constructor(eventBus: IEventBus);
    /**
     * Start listening for resolved gesture events.
     */
    start(): void;
    /**
     * Stop listening.
     */
    stop(): void;
    /**
     * Register an action for a gesture name.
     */
    registerAction(gestureName: string, action: IGestureAction): void;
    /**
     * Unregister a specific action from a gesture.
     */
    unregisterAction(gestureName: string, actionId: string): void;
    /**
     * Clear all registered actions.
     */
    clearActions(): void;
    /**
     * Dispatch a gesture event to all matching registered actions.
     */
    private dispatch;
}

/**
 * NavigationAction triggers navigation when a gesture is recognized.
 * Accepts a callback that receives the gesture event and can perform
 * any navigation logic (e.g., navigation.goBack()).
 */
declare class NavigationAction implements IGestureAction {
    readonly actionId: string;
    private callback;
    constructor(actionId: string, callback: (event: GestureEvent) => void);
    execute(event: GestureEvent): void;
}

/**
 * UITransformAction applies Reanimated transformations when a gesture fires.
 *
 * Accepts a callback where you can update shared values:
 * ```typescript
 * new UITransformAction('scale-on-pinch', (event) => {
 *   scale.value = withSpring(event.metadata.scale ?? 1);
 * });
 * ```
 */
declare class UITransformAction implements IGestureAction {
    readonly actionId: string;
    private transform;
    constructor(actionId: string, transform: (event: GestureEvent) => void);
    execute(event: GestureEvent): void;
}

/**
 * SystemAction performs system-level operations when a gesture fires.
 */
declare class SystemAction implements IGestureAction {
    readonly actionId: string;
    private callback;
    constructor(actionId: string, callback: (event: GestureEvent) => void);
    execute(event: GestureEvent): void;
}

/**
 * CustomAction wraps a user-defined callback.
 *
 * @example
 * ```typescript
 * const logAction = new CustomAction('log-shake', (event) => {
 *   analytics.track('shake_gesture', { magnitude: event.metadata.magnitude });
 * });
 * ```
 */
declare class CustomAction implements IGestureAction {
    readonly actionId: string;
    private callback;
    constructor(actionId: string, callback: (event: GestureEvent) => void);
    execute(event: GestureEvent): void;
}

/**
 * HapticFeedback triggers haptic responses when gestures are recognized.
 *
 * Supports three haptic types (via expo-haptics):
 * - Impact: for gesture activations (tap, swipe)
 * - Notification: for important events (shake, sequence complete)
 * - Selection: for continuous feedback (pan, rotation)
 *
 * Falls back to react-native Vibration API when expo-haptics is not installed.
 */
declare class HapticFeedback implements IFeedbackProvider {
    private _isSupported;
    private useVibrationFallback;
    private enabled;
    constructor(enabled?: boolean);
    get isSupported(): boolean;
    trigger(event: GestureEvent): void;
    setEnabled(enabled: boolean): void;
}

/**
 * VisualFeedback invokes registered callbacks to trigger visual animations
 * when gestures are recognized.
 *
 * Typical usage: update Reanimated shared values in the callback.
 *
 * @example
 * ```typescript
 * const visual = new VisualFeedback((event) => {
 *   opacity.value = withTiming(0.5, { duration: 100 });
 *   scale.value = withSpring(0.95);
 * });
 * ```
 */
declare class VisualFeedback implements IFeedbackProvider {
    private _isSupported;
    private callback;
    constructor(callback?: (event: GestureEvent) => void);
    get isSupported(): boolean;
    trigger(event: GestureEvent): void;
    /**
     * Update the visual feedback callback at runtime.
     */
    setCallback(callback: (event: GestureEvent) => void): void;
}

/**
 * AccessibilityFeedback announces gesture events for screen reader users.
 *
 * Automatically generates human-readable announcements based on gesture names.
 * Custom announcement builders can be provided via setAnnouncementBuilder().
 */
declare class AccessibilityFeedback implements IFeedbackProvider {
    private _isSupported;
    private announcementBuilder;
    constructor();
    get isSupported(): boolean;
    trigger(event: GestureEvent): void;
    /**
     * Set a custom function to build announcement strings.
     */
    setAnnouncementBuilder(builder: (event: GestureEvent) => string): void;
    /**
     * Generate a default human-readable announcement based on gesture name.
     */
    private defaultAnnouncement;
}

/**
 * GestureEngine is the main orchestrator for the gesture pipeline.
 *
 * It connects all 6 layers:
 * Input → Processing → Recognition → Conflict → Action → Feedback
 *
 * All communication flows through the typed EventBus.
 */
declare class GestureEngine {
    readonly eventBus: IEventBus;
    private config;
    readonly touchInput: TouchInputProvider;
    readonly sensorInput: SensorInputProvider;
    private noiseFilter;
    private sensorNoiseFilter;
    private velocityCalc;
    private angleDetector;
    private normalizer;
    private streamBuffer;
    private recognizers;
    private conflictResolver;
    private actionDispatcher;
    private feedbackProviders;
    private _isRunning;
    private inputUnsubscribe;
    private feedbackUnsubscribe;
    constructor(config?: GestureEngineConfig);
    get isRunning(): boolean;
    /**
     * Start the gesture engine. Activates all providers and wires the pipeline.
     */
    start(): void;
    /**
     * Stop the gesture engine. Cleans up all subscriptions and providers.
     */
    stop(): void;
    /**
     * Register a gesture recognizer with the engine.
     */
    registerRecognizer(recognizer: IRecognizer): void;
    /**
     * Unregister a recognizer by its ID.
     */
    unregisterRecognizer(recognizerId: string): void;
    /**
     * Register an action for a gesture name.
     */
    registerAction(gestureName: string, action: IGestureAction): void;
    /**
     * Register a feedback provider.
     */
    registerFeedback(provider: IFeedbackProvider): void;
    /**
     * Get all registered recognizers.
     */
    getRecognizers(): IRecognizer[];
    /**
     * Dispose the engine and clean up all resources.
     */
    dispose(): void;
    /**
     * Process a raw input event through Layer 2 (processing) and feed
     * the resulting ProcessedSample into Layer 3 (recognition).
     */
    private processInput;
}

interface UseGestureEngineConfig extends GestureEngineConfig {
    /**
     * Recognizer instances to register with the engine.
     * These are created outside the hook and passed in.
     */
    recognizers?: IRecognizer[];
    /**
     * Action mappings: gestureName → array of actions
     */
    actions?: Record<string, IGestureAction[]>;
    /**
     * Feedback providers to register
     */
    feedback?: IFeedbackProvider[];
}
interface UseGestureEngineResult {
    /** The GestureEngine instance */
    engine: GestureEngine | null;
    /** Whether the engine is initialized and running */
    isReady: boolean;
}
/**
 * React hook that creates, configures, and manages a GestureEngine lifecycle.
 *
 * The engine is created once on mount and disposed on unmount.
 * Uses useRef to keep the engine outside the React render cycle.
 *
 * @example
 * ```tsx
 * const { engine, isReady } = useGestureEngine({
 *   sensorInterval: 100,
 *   hapticEnabled: true,
 *   recognizers: [shakeRecognizer, edgeSwipeRecognizer],
 *   actions: { 'shake': [myShakeAction] },
 * });
 * ```
 */
declare function useGestureEngine(config?: UseGestureEngineConfig): UseGestureEngineResult;

interface UseShakeGestureConfig {
    /** Acceleration threshold in g (default 1.5) */
    threshold?: number;
    /** Cooldown in ms (default 1000) */
    cooldownMs?: number;
    /** Callback when shake is detected */
    onShake: () => void;
    /** Enable haptic feedback (default true) */
    hapticEnabled?: boolean;
    /** Sensor polling interval in ms (default 100) */
    sensorInterval?: number;
}
/**
 * Convenience hook for shake gesture detection.
 *
 * Creates a minimal GestureEngine with just a ShakeRecognizer.
 * Ideal for simple use cases where you just need shake detection.
 *
 * @example
 * ```tsx
 * useShakeGesture({
 *   threshold: 1.5,
 *   cooldownMs: 1000,
 *   onShake: () => console.log('Device shaken!'),
 * });
 * ```
 */
declare function useShakeGesture(config: UseShakeGestureConfig): void;

interface UseEdgeSwipeConfig {
    /** Edge to detect: 'left', 'right', 'top', 'bottom' */
    edge: 'left' | 'right' | 'top' | 'bottom';
    /** Minimum swipe distance in px (default 50) */
    minDistance?: number;
    /** Edge zone width in px (default 30) */
    edgeZoneWidth?: number;
    /** Minimum velocity in px/ms (default 0.3) */
    minVelocity?: number;
    /** Screen width in px */
    screenWidth?: number;
    /** Screen height in px */
    screenHeight?: number;
    /** Callback when edge swipe is detected */
    onSwipe: (event: GestureEvent) => void;
    /** Enable haptic feedback (default true) */
    hapticEnabled?: boolean;
}
/**
 * Convenience hook for edge swipe detection.
 *
 * @example
 * ```tsx
 * useEdgeSwipe({
 *   edge: 'left',
 *   minDistance: 50,
 *   onSwipe: (event) => navigation.goBack(),
 * });
 * ```
 */
declare function useEdgeSwipe(config: UseEdgeSwipeConfig): void;

interface UseGestureSequenceConfig {
    /** Ordered gesture names to match */
    sequence: string[];
    /** Max time between steps in ms (default 800) */
    timeoutMs?: number;
    /** Callback when sequence is completed */
    onComplete: () => void;
    /** Enable haptic feedback (default true) */
    hapticEnabled?: boolean;
}
/**
 * Convenience hook for gesture sequence detection.
 *
 * @example
 * ```tsx
 * useGestureSequence({
 *   sequence: ['tap', 'tap', 'edge-swipe-right'],
 *   timeoutMs: 800,
 *   onComplete: () => console.log('Secret gesture unlocked!'),
 * });
 * ```
 */
declare function useGestureSequence(config: UseGestureSequenceConfig): void;

export { AccessibilityFeedback, ActionDispatcher, AngleDetector, BaseRecognizer, CameraInputProvider, CardinalDirection, ConflictResolver, CornerRecognizer, type CornerRecognizerConfig, CustomAction, DoubleTapRecognizer, type DoubleTapRecognizerConfig, EdgeSwipeRecognizer, type EdgeSwipeRecognizerConfig, EventBus, EventChannel, type EventChannelMap, type EventHandler, GestureEngine, type GestureEngineConfig, type GestureEvent, type GestureMetadata, GesturePriorityQueue, HapticFeedback, type HardwareData, HardwareInputProvider, type IEventBus, type IFeedbackProvider, type IGestureAction, type IInputProvider, type IRecognizer, type InputEvent, InputType, LockManager, NavigationAction, NoiseFilter, PanRecognizer, type PanRecognizerConfig, PinchRecognizer, type PinchRecognizerConfig, type ProcessedSample, type RecognizerConfig, RecognizerState, RotationRecognizer, type RotationRecognizerConfig, type SensorData, SensorInputProvider, SensorType, SequenceRecognizer, type SequenceRecognizerConfig, ShakeRecognizer, type ShakeRecognizerConfig, StreamBuffer, SymbolRecognizer, type SymbolRecognizerConfig, SystemAction, TapRecognizer, type TapRecognizerConfig, ThresholdNormalizer, TiltRecognizer, type TiltRecognizerConfig, type TouchData, TouchInputProvider, TouchType, UITransformAction, type UseEdgeSwipeConfig, type UseGestureEngineConfig, type UseGestureEngineResult, type UseGestureSequenceConfig, type UseShakeGestureConfig, VelocityCalculator, VisualFeedback, WristFlickRecognizer, type WristFlickRecognizerConfig, generateId, useEdgeSwipe, useGestureEngine, useGestureSequence, useShakeGesture };
