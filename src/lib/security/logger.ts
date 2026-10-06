import crypto from 'crypto';

export type SecurityEventType =
  | 'AUTH_LOGIN_SUCCESS'
  | 'AUTH_LOGIN_FAILURE'
  | 'AUTH_REGISTER_SUCCESS'
  | 'AUTH_SESSION_REVOKED'
  | 'AUTH_SESSION_REUSE_DETECTED'
  | 'AUTH_UNAUTHORIZED_ACCESS'
  | 'RATE_LIMIT_EXCEEDED'
  | 'MEDIA_UPLOAD_SUCCESS'
  | 'MEDIA_UPLOAD_REJECTED'
  | 'CSRF_VIOLATION';

export interface SecurityLogPayload {
  event: SecurityEventType;
  userId?: string | null;
  identifier?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
  severity?: 'INFO' | 'WARN' | 'ALERT';
}

function hashIp(ip?: string): string | undefined {
  if (!ip) return undefined;
  return crypto.createHash('sha256').update(ip).digest('hex').slice(0, 12);
}

/**
 * Structured Security Logger.
 * Strictly redacts passwords, tokens, secrets, and sensitive credentials.
 */
export function logSecurityEvent(payload: SecurityLogPayload): void {
  const sanitizedDetails = { ...payload.details };

  // Redact any accidental credential leak in details
  const sensitiveKeys = ['password', 'token', 'secret', 'hash', 'cookie', 'authorization'];
  for (const key of Object.keys(sanitizedDetails)) {
    if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
      sanitizedDetails[key] = '[REDACTED]';
    }
  }

  const logEntry = {
    timestamp: new Date().toISOString(),
    event: payload.event,
    severity: payload.severity || 'INFO',
    userId: payload.userId || undefined,
    identifier: payload.identifier ? payload.identifier.slice(0, 50) : undefined,
    ipHash: hashIp(payload.ipAddress),
    userAgent: payload.userAgent ? payload.userAgent.slice(0, 150) : undefined,
    details: Object.keys(sanitizedDetails).length > 0 ? sanitizedDetails : undefined,
  };

  const formatted = `[SECURITY_AUDIT] ${JSON.stringify(logEntry)}`;

  if (payload.severity === 'ALERT') {
    console.error(formatted);
  } else if (payload.severity === 'WARN') {
    console.warn(formatted);
  } else {
    console.log(formatted);
  }
}
