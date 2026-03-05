// ─── Public API ─────────────────────────────────────────────────────────────
// Barrel export for @zeey4d/react-native-gesture-engine
// ─────────────────────────────────────────────────────────────────────────────

// ─── Core ──────────────────────────────────────────────────────────────────
export { EventBus } from './core/EventBus';
export {
  // Enums
  InputType,
  TouchType,
  SensorType,
  CardinalDirection,
  RecognizerState,
  EventChannel,
  // Types & Interfaces
  type TouchData,
  type SensorData,
  type HardwareData,
  type InputEvent,
  type ProcessedSample,
  type GestureMetadata,
  type GestureEvent,
  type EventChannelMap,
  type EventHandler,
  type IEventBus,
  type IInputProvider,
  type IRecognizer,
  type IGestureAction,
  type IFeedbackProvider,
  type GestureEngineConfig,
  type RecognizerConfig,
  type TapRecognizerConfig,
  type DoubleTapRecognizerConfig,
  type PanRecognizerConfig,
  type PinchRecognizerConfig,
  type RotationRecognizerConfig,
  type EdgeSwipeRecognizerConfig,
  type CornerRecognizerConfig,
  type ShakeRecognizerConfig,
  type TiltRecognizerConfig,
  type WristFlickRecognizerConfig,
  type SequenceRecognizerConfig,
  type SymbolRecognizerConfig,
  // Utilities
  generateId,
} from './core/types';

// ─── Input Providers ────────────────────────────────────────────────────────
export {
  TouchInputProvider,
  SensorInputProvider,
  HardwareInputProvider,
  CameraInputProvider,
} from './input';

// ─── Processing Utilities ───────────────────────────────────────────────────
export {
  NoiseFilter,
  VelocityCalculator,
  AngleDetector,
  ThresholdNormalizer,
  StreamBuffer,
} from './processing';

// ─── Gesture Recognizers ────────────────────────────────────────────────────
export {
  BaseRecognizer,
  TapRecognizer,
  DoubleTapRecognizer,
  PanRecognizer,
  PinchRecognizer,
  RotationRecognizer,
  EdgeSwipeRecognizer,
  CornerRecognizer,
  ShakeRecognizer,
  TiltRecognizer,
  WristFlickRecognizer,
  SequenceRecognizer,
  SymbolRecognizer,
} from './recognition';

// ─── Conflict Resolution ────────────────────────────────────────────────────
export {
  ConflictResolver,
  GesturePriorityQueue,
  LockManager,
} from './conflict';

// ─── Actions ────────────────────────────────────────────────────────────────
export {
  ActionDispatcher,
  NavigationAction,
  UITransformAction,
  SystemAction,
  CustomAction,
} from './actions';

// ─── Feedback ───────────────────────────────────────────────────────────────
export {
  HapticFeedback,
  VisualFeedback,
  AccessibilityFeedback,
} from './feedback';

// ─── React Hooks ────────────────────────────────────────────────────────────
export {
  useGestureEngine,
  useShakeGesture,
  useEdgeSwipe,
  useGestureSequence,
  type UseGestureEngineConfig,
  type UseGestureEngineResult,
  type UseShakeGestureConfig,
  type UseEdgeSwipeConfig,
  type UseGestureSequenceConfig,
} from './hooks';

// ─── Main Engine ────────────────────────────────────────────────────────────
export { GestureEngine } from './GestureEngine';
