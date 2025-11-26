/**
 * Simple in-memory rate limiter for API endpoints
 * 
 * Note: This is a basic implementation. For production with multiple instances,
 * consider using Redis or a distributed rate limiting solution.
 */

// Store: IP -> { count, resetTime }
const rateLimitStore = new Map();

// Cleanup interval: remove expired entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;

// Start cleanup interval
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of rateLimitStore.entries()) {
      if (value.resetTime < now) {
        rateLimitStore.delete(key);
      }
    }
  }, CLEANUP_INTERVAL);
}

/**
 * Simple rate limiter middleware
 * @param {Request} request - Next.js request object
 * @param {Object} options - Rate limit options
 * @param {number} options.maxRequests - Maximum requests per window
 * @param {number} options.windowMs - Time window in milliseconds
 * @returns {{ allowed: boolean, remaining: number, resetTime: number } | { allowed: false, response: NextResponse }}
 */
export function checkRateLimit(request, options = {}) {
  const { maxRequests = 100, windowMs = 60 * 1000 } = options;

  // Get client identifier (IP address)
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') || 'unknown';

  const now = Date.now();
  const key = `rate_limit_${ip}`;
  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetTime < now) {
    // First request or window expired - create new entry
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });

    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime: now + windowMs,
    };
  }

  // Increment count
  entry.count += 1;

  if (entry.count > maxRequests) {
    // Rate limit exceeded
    return {
      allowed: false,
      response: NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(entry.resetTime).toISOString(),
          },
        },
      ),
    };
  }

  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

