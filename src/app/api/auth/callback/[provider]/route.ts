import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  OAuthProvider,
  verifyOAuthState,
  exchangeOAuthCode,
  linkOrCreateOAuthUser,
  createSession,
  setAuthCookies,
  COOKIE_OAUTH_STATE,
  COOKIE_OAUTH_VERIFIER,
} from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (provider !== 'google' && provider !== 'github') {
    return NextResponse.redirect(`${appUrl}/?authError=unsupported_provider`);
  }

  const searchParams = req.nextUrl.searchParams;
  const error = searchParams.get('error');
  if (error) {
    return NextResponse.redirect(`${appUrl}/?authError=${encodeURIComponent(error)}`);
  }

  const code = searchParams.get('code');
  const state = searchParams.get('state');

  if (!code || !state) {
    return NextResponse.redirect(`${appUrl}/?authError=missing_code_or_state`);
  }

  const cookieStore = await cookies();
  const storedState = cookieStore.get(COOKIE_OAUTH_STATE)?.value;
  const codeVerifier = cookieStore.get(COOKIE_OAUTH_VERIFIER)?.value;

  // Clear one-time oauth handshake cookies immediately
  cookieStore.delete(COOKIE_OAUTH_STATE);
  cookieStore.delete(COOKIE_OAUTH_VERIFIER);

  if (!storedState || storedState !== state || !codeVerifier) {
    return NextResponse.redirect(`${appUrl}/?authError=csrf_state_mismatch`);
  }

  const isValidState = verifyOAuthState(state, provider as OAuthProvider);
  if (!isValidState) {
    return NextResponse.redirect(`${appUrl}/?authError=invalid_state_signature`);
  }

  try {
    const redirectUri = `${appUrl}/api/auth/callback/${provider}`;
    const profile = await exchangeOAuthCode(
      provider as OAuthProvider,
      code,
      redirectUri,
      codeVerifier
    );

    const user = await linkOrCreateOAuthUser(provider as OAuthProvider, profile);

    // Create secure database session
    const userAgent = req.headers.get('user-agent') || undefined;
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || undefined;

    const { rawRefreshToken, accessToken } = await createSession(user.id, {
      userAgent,
      ipAddress,
    });

    setAuthCookies(cookieStore, accessToken, rawRefreshToken);

    return NextResponse.redirect(`${appUrl}/?authSuccess=true`);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[OAuthCallback] Error processing ${provider} callback:`, errorMsg);
    return NextResponse.redirect(`${appUrl}/?authError=oauth_exchange_failed`);
  }
}
