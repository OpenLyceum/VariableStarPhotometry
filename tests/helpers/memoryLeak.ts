/**
 * Fleet-standard memory-leak harness — template-owned, identical across the fleet.
 *
 * Sim-specific leak tests call forceGC() after disposing WeakRef targets.
 * V8 requires a function boundary (not merely a block scope) so local strong
 * references die when the helper returns.
 */

/**
 * Force garbage collection with multiple passes, returning as soon as every given
 * reference is confirmed collected. The setTimeout(0) yield after a live deref()
 * avoids the WeakRef macrotask-liveness pin. Without refs the loop always runs all
 * passes, which on a slow gc() can exceed the Vitest testTimeout — pass refs when
 * you have them.
 *
 * @public
 */
export async function forceGC(earlyExitRefs?: WeakRef<object> | readonly WeakRef<object>[]): Promise<void> {
  const refs = earlyExitRefs === undefined ? [] : Array.isArray(earlyExitRefs) ? earlyExitRefs : [earlyExitRefs];
  for (let i = 0; i < 15; i++) {
    globalThis.gc?.();
    await new Promise<void>((r) => setTimeout(r, 50));
    if (refs.length > 0 && refs.every((ref) => ref.deref() === undefined)) {
      return;
    }
    if (refs.length > 0) {
      await new Promise<void>((r) => setTimeout(r, 0));
    }
  }
}
