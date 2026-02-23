// Simple in-memory rate limiter
// In production, you'd want to use Redis or another persistent store

interface RateLimitEntry {
  count: number
  resetTime: number
}

class InMemoryRateLimit {
  private store = new Map<string, RateLimitEntry>()
  private limit: number
  private windowMs: number

  constructor(limit: number, windowMs: number) {
    this.limit = limit
    this.windowMs = windowMs
  }

  async check(identifier: string): Promise<{
    success: boolean
    remaining: number
    reset: number
    limit: number
  }> {
    const now = Date.now()
    const resetTime = now + this.windowMs

    // Clean up expired entries
    this.cleanupExpired(now)

    let entry = this.store.get(identifier)

    if (!entry || now > entry.resetTime) {
      // Create new entry or reset expired one
      entry = {
        count: 1,
        resetTime
      }
      this.store.set(identifier, entry)

      return {
        success: true,
        remaining: this.limit - 1,
        reset: resetTime,
        limit: this.limit
      }
    }

    if (entry.count >= this.limit) {
      return {
        success: false,
        remaining: 0,
        reset: entry.resetTime,
        limit: this.limit
      }
    }

    entry.count++
    this.store.set(identifier, entry)

    return {
      success: true,
      remaining: this.limit - entry.count,
      reset: entry.resetTime,
      limit: this.limit
    }
  }

  private cleanupExpired(now: number) {
    // Remove entries that have expired (simple cleanup)
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key)
      }
    }
  }

  // Get current status for monitoring
  getStats() {
    return {
      totalKeys: this.store.size,
      limit: this.limit,
      windowMs: this.windowMs
    }
  }
}

// Export rate limiter instances
export const apiRateLimit = new InMemoryRateLimit(100, 60 * 1000) // 100 per minute
export const authRateLimit = new InMemoryRateLimit(10, 5 * 60 * 1000) // 10 login attempts per 5 minutes
export const uploadRateLimit = new InMemoryRateLimit(10, 60 * 60 * 1000) // 10 per hour