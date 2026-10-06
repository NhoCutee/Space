export const COOKIE_ACCESS_TOKEN = 'spaces_access_token';
export const COOKIE_REFRESH_TOKEN = 'spaces_refresh_token';
export const COOKIE_OAUTH_STATE = 'spaces_oauth_state';
export const COOKIE_OAUTH_VERIFIER = 'spaces_oauth_verifier';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

export function getBaseCookieOptions() {
  return {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: 'lax' as const,
    path: '/',
  };
}

export interface CookieStoreWriter {
  set(name: string, value: string, options?: Record<string, unknown>): void;
  delete(name: string): void;
}

/**
 * Sets secure authentication cookies for access and refresh tokens.
 */
export function setAuthCookies(
  cookieStore: CookieStoreWriter,
  accessToken: string,
  refreshToken: string
) {
  const baseOptions = getBaseCookieOptions();

  cookieStore.set(COOKIE_ACCESS_TOKEN, accessToken, {
    ...baseOptions,
    maxAge: 15 * 60, // 15 minutes
  });

  cookieStore.set(COOKIE_REFRESH_TOKEN, refreshToken, {
    ...baseOptions,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });
}

/**
 * Clears all authentication cookies.
 */
export function clearAuthCookies(cookieStore: CookieStoreWriter) {
  cookieStore.delete(COOKIE_ACCESS_TOKEN);
  cookieStore.delete(COOKIE_REFRESH_TOKEN);
  // Also clear legacy cookie if present
  cookieStore.delete('spaces_user_id');
}
