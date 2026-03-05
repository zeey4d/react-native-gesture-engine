// ─── LockManager ────────────────────────────────────────────────────────────
// Manages exclusive gesture locks. When an exclusive gesture activates,
// it acquires a lock that blocks competing gestures at equal or lower priority.
// ─────────────────────────────────────────────────────────────────────────────

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
export class LockManager {
  /** Active locks: gestureName → priority */
  private locks = new Map<string, number>();

  /**
   * Acquire an exclusive lock for a gesture.
   *
   * @param gestureName - The gesture acquiring the lock
   * @param priority - The priority level of the lock (lower = higher priority)
   * @returns true if the lock was acquired
   */
  acquireLock(gestureName: string, priority: number): boolean {
    this.locks.set(gestureName, priority);
    return true;
  }

  /**
   * Release the lock held by a gesture.
   */
  releaseLock(gestureName: string): void {
    this.locks.delete(gestureName);
  }

  /**
   * Check if a gesture with the given priority is blocked by any active lock.
   * A gesture is blocked if an active lock has higher or equal priority
   * (lower or equal priority number) and is not the same gesture.
   *
   * @param gestureName - The gesture to check
   * @param priority - The priority of the gesture to check
   * @returns true if the gesture is blocked
   */
  isLocked(gestureName: string, priority: number): boolean {
    for (const [lockName, lockPriority] of this.locks) {
      if (lockName !== gestureName && lockPriority <= priority) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if a specific gesture holds a lock.
   */
  hasLock(gestureName: string): boolean {
    return this.locks.has(gestureName);
  }

  /**
   * Clear all locks. Called during engine reset.
   */
  clearAll(): void {
    this.locks.clear();
  }

  /**
   * Get the number of active locks.
   */
  get activeLockCount(): number {
    return this.locks.size;
  }
}
