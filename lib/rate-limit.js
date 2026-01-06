/**
 * Simple in-memory rate limiter
 * For production, consider using Redis or a dedicated service
 */

const rateLimitStore = new Map()

/**
 * Rate limit check
 * @param {string} identifier - IP address or user ID
 * @param {number} maxRequests - Maximum requests allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Object} { allowed: boolean, remaining: number, resetAt: Date }
 */
export function checkRateLimit(identifier, maxRequests = 5, windowMs = 60000) {
  const now = Date.now()
  const key = identifier
  const record = rateLimitStore.get(key)

  // Clean up old records (older than 1 hour)
  if (rateLimitStore.size > 10000) {
    const oneHourAgo = now - 3600000
    for (const [k, v] of rateLimitStore.entries()) {
      if (v.resetAt < oneHourAgo) {
        rateLimitStore.delete(k)
      }
    }
  }

  if (!record || record.resetAt < now) {
    // Create new record or reset expired one
    const resetAt = now + windowMs
    rateLimitStore.set(key, {
      count: 1,
      resetAt,
      firstRequest: now
    })
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt: new Date(resetAt)
    }
  }

  // Increment count
  record.count++

  if (record.count > maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(record.resetAt)
    }
  }

  rateLimitStore.set(key, record)

  return {
    allowed: true,
    remaining: maxRequests - record.count,
    resetAt: new Date(record.resetAt)
  }
}

/**
 * Get client identifier from request
 * @param {Request} request - Next.js request object
 * @returns {string} Client identifier (IP address)
 */
export function getClientIdentifier(request) {
  // Try to get IP from various headers (for proxies/load balancers)
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfConnectingIp = request.headers.get('cf-connecting-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  if (realIp) {
    return realIp
  }
  if (cfConnectingIp) {
    return cfConnectingIp
  }
  
  // Fallback to a default identifier
  return 'unknown'
}

/**
 * Rate limit middleware for API routes
 * @param {Request} request - Next.js request object
 * @param {number} maxRequests - Maximum requests allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Object|null} Rate limit response or null if allowed
 */
export function rateLimitMiddleware(request, maxRequests = 5, windowMs = 60000) {
  const identifier = getClientIdentifier(request)
  const result = checkRateLimit(identifier, maxRequests, windowMs)

  if (!result.allowed) {
    return {
      error: 'Too many requests',
      message: `Has excedido el límite de solicitudes. Intenta de nuevo en ${Math.ceil((result.resetAt - Date.now()) / 1000)} segundos.`,
      resetAt: result.resetAt,
      status: 429
    }
  }

  return null
}



