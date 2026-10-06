import { SignJWT, jwtVerify } from 'jose';

const JWT_ISSUER = 'https://spaces.network';
const JWT_AUDIENCE = 'spaces.app';
const ACCESS_TOKEN_EXPIRATION = '15m'; // 15 minutes lifetime

function getJwtSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('AUTH_SECRET must be configured and at least 32 characters long in production');
    }
    // Safe development fallback key
    return new TextEncoder().encode('spaces-development-fallback-secret-key-32chars-min');
  }
  return new TextEncoder().encode(secret);
}

export interface AccessTokenClaims {
  sub: string;       // User ID
  sessionId: string; // Server Session ID
  role: string;      // Role (MEMBER, MODERATOR, CREATOR, ADMIN)
}

/**
 * Creates and signs a compact JWT access token with HS256 algorithm.
 */
export async function signAccessToken(payload: AccessTokenClaims): Promise<string> {
  const secretKey = getJwtSecretKey();

  return await new SignJWT({
    sessionId: payload.sessionId,
    role: payload.role,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(payload.sub)
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRATION)
    .sign(secretKey);
}

/**
 * Cryptographically verifies and validates a JWT access token.
 * Validates expiration, issuer, audience, and pinned HS256 algorithm.
 */
export async function verifyAccessToken(token: string): Promise<AccessTokenClaims | null> {
  if (!token) return null;

  try {
    const secretKey = getJwtSecretKey();
    const { payload } = await jwtVerify(token, secretKey, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      algorithms: ['HS256'],
    });

    if (!payload.sub || typeof payload.sessionId !== 'string') {
      return null;
    }

    return {
      sub: payload.sub,
      sessionId: payload.sessionId as string,
      role: (payload.role as string) || 'MEMBER',
    };
  } catch {
    // Expired, invalid signature, or malformed claims
    return null;
  }
}
