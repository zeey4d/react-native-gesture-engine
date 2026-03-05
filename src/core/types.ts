// ─── Core Types ─────────────────────────────────────────────────────────────
// All interfaces, enums, and type aliases for the gesture engine pipeline.
// Each layer consumes and produces typed data objects connected via EventBus.
// ─────────────────────────────────────────────────────────────────────────────

// ═══════════════════════════════════════════════════════════════════════════════
// Section 1: Input Data Types
// ═══════════════════════════════════════════════════════════════════════════════

/** Classification of input sources feeding into the pipeline */
export enum InputType {
  Touch = 'touch',
  Sensor = 'sensor',
  Hardware = 'hardware',
  Camera = 'camera',
}

/** Sub-type classification for touch inputs */
export enum TouchType {
  Pan = 'pan',
  Tap = 'tap',
  Pinch = 'pinch',
  Rotation = 'rotation',
}

/** Sub-type classification for sensor inputs */
export enum SensorType {
  Accelerometer = 'accelerometer',
  Gyroscope = 'gyroscope',
}

/** Normalized touch data emitted by TouchInputProvider */
export interface TouchData {
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
export interface SensorData {
  type: SensorType;
  x: number;
  y: number;
  z: number;
}

/** Hardware input data (e.g., volume button presses) */
export interface HardwareData {
  /** Key identifier, e.g. 'volumeUp', 'volumeDown' */
  key: string;
  /** Press action: 'down' or 'up' */
  action: 'down' | 'up';
}

/**
 * Unified input event emitted by all providers on the InputRaw channel.
 * The `data` field is discriminated by `inputType`.
 */
export interface InputEvent {
  /** Unique event identifier */
  id: string;
  /** Timestamp in milliseconds (performance.now or Date.now) */
  timestamp: number;
  /** Source classification */
  inputType: InputType;
  /** Payload — shape depends on inputType */
  data: TouchData | SensorData | HardwareData;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Section 2: Processing Data Types
// ═══════════════════════════════════════════════════════════════════════════════

/** Cardinal direction classification */
export enum CardinalDirection {
  Up = 'up',
  Down = 'down',
  Left = 'left',
  Right = 'right',
  UpLeft = 'up-left',
  UpRight = 'up-right',
  DownLeft = 'down-left',
  DownRight = 'down-right',
  None = 'none',
}

/**
 * Enriched data produced by the processing layer.
 * Combines raw input with computed velocity, angle, and normalized magnitude.
 */
export interface ProcessedSample {
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
  filtered: { x: number; y: number; z: number };
  /** Processing timestamp */
  timestamp: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Section 3: Recognition Data Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Recognizer state machine states.
 * Transitions: Idle → Possible → Began → Changed → Ended
 *                                       ↘ Failed / Cancelled
 */
export enum RecognizerState {
  Idle = 'idle',
  Possible = 'possible',
  Began = 'began',
  Changed = 'changed',
  Ended = 'ended',
  Failed = 'failed',
  Cancelled = 'cancelled',
}

/** Additional metadata attached to gesture events */
export interface GestureMetadata {
  /** Translation amount for pan/swipe gestures */
  translation?: { x: number; y: number };
  /** Scale factor for pinch gestures */
  scale?: number;
  /** Rotation angle for rotation gestures */
  rotation?: number;
  /** Velocity at recognition time */
  velocity?: { x: number; y: number };
  /** Edge identifier for edge-swipe gestures */
  edge?: 'left' | 'right' | 'top' | 'bottom';
  /** Detected symbol name for symbol recognizer */
  symbol?: string;
  /** Confidence score [0, 1] for symbol recognizer */
  confidence?: number;
  /** Sensor magnitude for shake/tilt/flick gestures */
  magnitude?: number;
  /** Tilt angles */
  tilt?: { pitch: number; roll: number };
  /** Generic key-value bag for custom recognizers */
  [key: string]: unknown;
}

/**
 * Event emitted when a recognizer transitions state.
 * This is the primary output of Layer 3, consumed by conflict resolution and actions.
 */
export interface GestureEvent {
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

// ═══════════════════════════════════════════════════════════════════════════════
// Section 4: EventBus Types
// ═══════════════════════════════════════════════════════════════════════════════

/** Named channels for the typed pub/sub EventBus */
export enum EventChannel {
  /** Raw input data from providers */
  InputRaw = 'input:raw',
  /** Processed samples with velocity, angle, normalization */
  ProcessingSample = 'processing:sample',
  /** Gesture recognition events (state transitions) */
  RecognitionGesture = 'recognition:gesture',
  /** Events that survived conflict resolution */
  ConflictResolved = 'conflict:resolved',
  /** Events after action dispatch */
  ActionDispatched = 'action:dispatched',
}

/** Compile-time mapping from channel to payload type */
export interface EventChannelMap {
  [EventChannel.InputRaw]: InputEvent;
  [EventChannel.ProcessingSample]: ProcessedSample;
  [EventChannel.RecognitionGesture]: GestureEvent;
  [EventChannel.ConflictResolved]: GestureEvent;
  [EventChannel.ActionDispatched]: GestureEvent;
}

/** Typed event handler */
export type EventHandler<C extends EventChannel> = (data: EventChannelMap[C]) => void;

/** EventBus interface */
export interface IEventBus {
  on<C extends EventChannel>(channel: C, handler: EventHandler<C>): () => void;
  emit<C extends EventChannel>(channel: C, data: EventChannelMap[C]): void;
  off<C extends EventChannel>(channel: C, handler: EventHandler<C>): void;
  clear(): void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Section 5: Layer Interfaces
// ═══════════════════════════════════════════════════════════════════════════════

/** Interface for all input providers (Layer 1) */
export interface IInputProvider {
  /** Start emitting input events */
  start(): void;
  /** Stop emitting input events and clean up subscriptions */
  stop(): void;
  /** Whether the provider is currently active */
  readonly isActive: boolean;
}

/** Interface for all gesture recognizers (Layer 3) */
export interface IRecognizer {
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
export interface IGestureAction {
  /** Unique action identifier */
  readonly actionId: string;
  /** Execute the action in response to a resolved gesture */
  execute(event: GestureEvent): void;
}

/** Interface for feedback providers (Layer 6) */
export interface IFeedbackProvider {
  /** Trigger feedback in response to a resolved gesture */
  trigger(event: GestureEvent): void;
  /** Whether this feedback type is supported on the current device */
  readonly isSupported: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Section 6: Configuration Types
// ═══════════════════════════════════════════════════════════════════════════════

/** Configuration for the GestureEngine orchestrator */
export interface GestureEngineConfig {
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
export interface RecognizerConfig {
  /** Override the default priority */
  priority?: number;
  /** Override the default exclusive setting */
  isExclusive?: boolean;
  /** Whether the recognizer starts enabled */
  enabled?: boolean;
}

/** Tap recognizer specific config */
export interface TapRecognizerConfig extends RecognizerConfig {
  /** Maximum duration for a tap in ms (default 300) */
  maxDuration?: number;
  /** Maximum movement threshold in px (default 10) */
  maxDistance?: number;
}

/** Double-tap recognizer specific config */
export interface DoubleTapRecognizerConfig extends RecognizerConfig {
  /** Maximum time between taps in ms (default 300) */
  maxInterval?: number;
  /** Maximum movement between taps in px (default 30) */
  maxDistance?: number;
}

/** Pan recognizer specific config */
export interface PanRecognizerConfig extends RecognizerConfig {
  /** Minimum distance to activate in px (default 10) */
  minDistance?: number;
}

/** Pinch recognizer specific config */
export interface PinchRecognizerConfig extends RecognizerConfig {
  /** Minimum scale change to activate (default 0.05) */
  minScale?: number;
}

/** Rotation recognizer specific config */
export interface RotationRecognizerConfig extends RecognizerConfig {
  /** Minimum rotation in radians to activate (default 0.05) */
  minRotation?: number;
}

/** Edge-swipe recognizer specific config */
export interface EdgeSwipeRecognizerConfig extends RecognizerConfig {
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
export interface CornerRecognizerConfig extends RecognizerConfig {
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
export interface ShakeRecognizerConfig extends RecognizerConfig {
  /** Acceleration threshold in g (default 1.5) */
  threshold?: number;
  /** Consecutive samples above threshold to trigger (default 2) */
  consecutiveSamples?: number;
  /** Cooldown period in ms (default 1000) */
  cooldownMs?: number;
}

/** Tilt recognizer specific config */
export interface TiltRecognizerConfig extends RecognizerConfig {
  /** Tilt angle threshold in degrees (default 30) */
  tiltThreshold?: number;
  /** Cooldown period in ms (default 500) */
  cooldownMs?: number;
}

/** Wrist-flick recognizer specific config */
export interface WristFlickRecognizerConfig extends RecognizerConfig {
  /** Angular velocity threshold in deg/s (default 150) */
  angularVelocityThreshold?: number;
  /** Cooldown in ms (default 800) */
  cooldownMs?: number;
}

/** Sequence recognizer specific config */
export interface SequenceRecognizerConfig extends RecognizerConfig {
  /** Ordered gesture names to match */
  sequence: string[];
  /** Max time between steps in ms (default 800) */
  timeoutMs?: number;
}

/** Symbol recognizer specific config */
export interface SymbolRecognizerConfig extends RecognizerConfig {
  /** Templates to match against: name → point array */
  templates?: Record<string, Array<{ x: number; y: number }>>;
  /** Minimum confidence score to accept (default 0.7) */
  minConfidence?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Section 7: Utility Types
// ═══════════════════════════════════════════════════════════════════════════════

/** Utility type to generate unique IDs */
export type UniqueId = string;

/** Helper to create a unique ID */
export function generateId(): UniqueId {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
