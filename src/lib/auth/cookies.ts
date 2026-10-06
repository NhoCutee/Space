import { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies';

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

/**
 * Sets secure authentication cookies for access and refresh tokens.
 */
export function setAuthCookies(
  cookieStore: { set: (...args: any[]) => void },
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
export function clearAuthCookies(cookieStore: { delete: (...args: any[]) => void }) {
  const baseOptions = getBaseCookieOptions();
  cookieStore.delete(COOKIE_ACCESS_TOKEN, baseOptions);
  cookieStore.delete(COOKIE_REFRESH_TOKEN, baseOptions);
  // Also clear legacy cookie if present
  cookieStore.delete('spaces_user_id', baseOptions);
}
