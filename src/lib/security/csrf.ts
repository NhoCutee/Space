import { NextRequest } from 'next/server';

/**
 * Validates the Origin and Referer headers on state-changing API requests
 * to prevent Cross-Site Request Forgery (CSRF).
 */
export function validateRequestOrigin(req: NextRequest): { valid: boolean; reason?: string } {
  // Allow safe idempotent methods without origin checks
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return { valid: true };
  }

  const originHeader = req.headers.get('origin');
  const refererHeader = req.headers.get('referer');

  const allowedOrigins = new Set<string>();

  // Add the application's actual URL
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    try {
      allowedOrigins.add(new URL(appUrl).origin);
    } catch {}
  }

  // Add current request origin
  allowedOrigins.add(req.nextUrl.origin);

  // If Origin header is provided, it must match
  if (originHeader) {
    try {
      const originUrl = new URL(originHeader).origin;
      if (allowedOrigins.has(originUrl)) {
        return { valid: true };
      }
      return { valid: false, reason: `Origin ${originUrl} is not permitted` };
    } catch {
      return { valid: false, reason: 'Malformed Origin header' };
    }
  }

  // If Referer header is provided instead, verify its origin
  if (refererHeader) {
    try {
      const refererUrl = new URL(refererHeader).origin;
      if (allowedOrigins.has(refererUrl)) {
        return { valid: true };
      }
      return { valid: false, reason: `Referer ${refererUrl} is not permitted` };
    } catch {
      return { valid: false, reason: 'Malformed Referer header' };
    }
  }

  // In production, require either Origin or Referer for state-changing requests
  if (process.env.NODE_ENV === 'production') {
    return { valid: false, reason: 'Missing Origin or Referer header on state-changing request' };
  }

  return { valid: true };
}
