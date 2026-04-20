type CacheEntry<T> = {
  value: T
  expiresAt: number
}

/**
 * Simple in-memory TTL cache.
 * Items expire after `ttlMs` milliseconds (default 10 minutes).
 */
export function createTtlCache<T>(ttlMs = 10 * 60 * 1000): {
  get: (key: string) => T | undefined
  set: (key: string, value: T) => void
  invalidate: (key: string) => void
  clear: () => void
  entries: () => Array<[string, T]>
} {
  const entries = new Map<string, CacheEntry<T>>()

  return {
    get(key: string): T | undefined {
      const entry = entries.get(key)
      if (entry == null) return undefined
      if (Date.now() > entry.expiresAt) {
        entries.delete(key)
        return undefined
      }
      return entry.value
    },
    set(key: string, value: T): void {
      entries.set(key, { value, expiresAt: Date.now() + ttlMs })
    },
    invalidate(key: string): void {
      entries.delete(key)
    },
    clear(): void {
      entries.clear()
    },
    /** Returns all non-expired entries as `[key, value]` pairs. */
    entries(): Array<[string, T]> {
      const now = Date.now()
      const result: Array<[string, T]> = []
      for (const [key, entry] of entries) {
        if (now > entry.expiresAt) {
          entries.delete(key)
        } else {
          result.push([key, entry.value])
        }
      }
      return result
    }
  }
}
