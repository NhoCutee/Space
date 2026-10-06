import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { User } from '@prisma/client';

export type OAuthProvider = 'google' | 'github';

interface OAuthConfig {
  clientId?: string;
  clientSecret?: string;
  authUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scopes: string[];
}

function getOAuthConfig(provider: OAuthProvider): OAuthConfig {
  if (provider === 'google') {
    return {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      userInfoUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
      scopes: ['openid', 'email', 'profile'],
    };
  }

  if (provider === 'github') {
    return {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      authUrl: 'https://github.com/login/oauth/authorize',
      tokenUrl: 'https://github.com/login/oauth/access_token',
      userInfoUrl: 'https://api.github.com/user',
      scopes: ['read:user', 'user:email'],
    };
  }

  throw new Error(`Unsupported OAuth provider: ${provider}`);
}

function getSigningKey(): string {
  return process.env.AUTH_SECRET || 'spaces-oauth-internal-signing-secret-key-32chars';
}

function base64UrlEncode(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Generates a PKCE code_verifier and code_challenge (S256).
 */
export function generatePKCE(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = base64UrlEncode(crypto.randomBytes(32));
  const hash = crypto.createHash('sha256').update(codeVerifier).digest();
  const codeChallenge = base64UrlEncode(hash);
  return { codeVerifier, codeChallenge };
}

/**
 * Generates an HMAC-signed state parameter containing provider, timestamp, and nonce.
 */
export function generateOAuthState(provider: OAuthProvider): string {
  const timestamp = Date.now().toString();
  const nonce = crypto.randomBytes(16).toString('hex');
  const payload = `${provider}:${timestamp}:${nonce}`;
  const signature = crypto
    .createHmac('sha256', getSigningKey())
    .update(payload)
    .digest('hex');

  return Buffer.from(`${payload}:${signature}`).toString('base64url');
}

/**
 * Validates the HMAC-signed state parameter and checks expiration (10 minutes).
 */
export function verifyOAuthState(state: string, expectedProvider: OAuthProvider): boolean {
  try {
    const decoded = Buffer.from(state, 'base64url').toString('utf8');
    const [provider, timestamp, nonce, signature] = decoded.split(':');

    if (!provider || !timestamp || !nonce || !signature) return false;
    if (provider !== expectedProvider) return false;

    // Check expiration (max 10 minutes)
    const ageMs = Date.now() - parseInt(timestamp, 10);
    if (isNaN(ageMs) || ageMs < 0 || ageMs > 10 * 60 * 1000) return false;

    const payload = `${provider}:${timestamp}:${nonce}`;
    const expectedSignature = crypto
      .createHmac('sha256', getSigningKey())
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch {
    return false;
  }
}

/**
 * Constructs the authorization URL for Google or GitHub with PKCE and signed state.
 */
export function getAuthorizationUrl(
  provider: OAuthProvider,
  redirectUri: string,
  state: string,
  codeChallenge: string
): string {
  const config = getOAuthConfig(provider);
  if (!config.clientId) {
    throw new Error(`Missing OAuth client ID for ${provider}. Please configure ${provider.toUpperCase()}_CLIENT_ID.`);
  }

  const url = new URL(config.authUrl);
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', config.scopes.join(' '));
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');

  if (provider === 'google') {
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('prompt', 'select_account');
  }

  return url.toString();
}

export interface NormalizedOAuthProfile {
  providerAccountId: string;
  email: string;
  emailVerified: boolean;
  name: string;
  avatarUrl?: string;
  usernameSuggestion: string;
}

/**
 * Exchanges authorization code for access token and retrieves profile.
 */
export async function exchangeOAuthCode(
  provider: OAuthProvider,
  code: string,
  redirectUri: string,
  codeVerifier: string
): Promise<NormalizedOAuthProfile> {
  const config = getOAuthConfig(provider);
  if (!config.clientId || !config.clientSecret) {
    throw new Error(`OAuth credentials not configured for ${provider}`);
  }

  // 1. Token Exchange
  const tokenParams = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
    code_verifier: codeVerifier,
  });

  const tokenRes = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: tokenParams.toString(),
  });

  if (!tokenRes.ok) {
    const errorBody = await tokenRes.text();
    throw new Error(`Token exchange failed for ${provider}: ${errorBody}`);
  }

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;
  if (!accessToken) {
    throw new Error(`No access token returned by ${provider}`);
  }

  // 2. Fetch User Profile
  const profileRes = await fetch(config.userInfoUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': 'Spaces-Network-Auth',
      Accept: 'application/json',
    },
  });

  if (!profileRes.ok) {
    throw new Error(`Failed to fetch user profile from ${provider}`);
  }

  const profileData = await profileRes.json();

  if (provider === 'google') {
    return {
      providerAccountId: profileData.sub,
      email: profileData.email,
      emailVerified: Boolean(profileData.email_verified),
      name: profileData.name || profileData.email.split('@')[0],
      avatarUrl: profileData.picture,
      usernameSuggestion: profileData.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, ''),
    };
  }

  if (provider === 'github') {
    // If GitHub email is private, fetch from /user/emails
    let email = profileData.email;
    let emailVerified = false;

    if (!email) {
      try {
        const emailsRes = await fetch('https://api.github.com/user/emails', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'User-Agent': 'Spaces-Network-Auth',
          },
        });
        if (emailsRes.ok) {
          const emails: Array<{ email: string; primary: boolean; verified: boolean }> =
            await emailsRes.json();
          const primaryEmail = emails.find((e) => e.primary && e.verified) || emails[0];
          if (primaryEmail) {
            email = primaryEmail.email;
            emailVerified = primaryEmail.verified;
          }
        }
      } catch {
        // Fallback below
      }
    }

    if (!email) {
      email = `${profileData.login}@users.noreply.github.com`;
      emailVerified = true;
    }

    return {
      providerAccountId: String(profileData.id),
      email,
      emailVerified,
      name: profileData.name || profileData.login,
      avatarUrl: profileData.avatar_url,
      usernameSuggestion: profileData.login.toLowerCase().replace(/[^a-z0-9_]/g, ''),
    };
  }

  throw new Error(`Unsupported provider: ${provider}`);
}

/**
 * Safely finds or creates a user and links the OAuth account.
 */
export async function linkOrCreateOAuthUser(
  provider: OAuthProvider,
  profile: NormalizedOAuthProfile
): Promise<User> {
  // 1. Check if Account already exists
  const existingAccount = await prisma.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider,
        providerAccountId: profile.providerAccountId,
      },
    },
    include: { user: true },
  });

  if (existingAccount) {
    return existingAccount.user;
  }

  // 2. Check if a User with the verified email exists
  let targetUser: User | null = null;
  if (profile.emailVerified && profile.email) {
    targetUser = await prisma.user.findUnique({
      where: { email: profile.email },
    });
  }

  if (targetUser) {
    // Link existing user to this OAuth provider
    await prisma.account.create({
      data: {
        userId: targetUser.id,
        provider,
        providerAccountId: profile.providerAccountId,
      },
    });
    return targetUser;
  }

  // 3. User does not exist, create new User and Account atomically
  // Ensure username is unique
  let candidateUsername = profile.usernameSuggestion;
  let counter = 1;
  while (await prisma.user.findUnique({ where: { username: candidateUsername } })) {
    candidateUsername = `${profile.usernameSuggestion}${counter++}`;
  }

  return await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        username: candidateUsername,
        displayName: profile.name,
        email: profile.email,
        avatarUrl: profile.avatarUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${candidateUsername}`,
        bio: 'Visual explorer & Space contributor',
        interests: JSON.stringify([]),
        role: 'MEMBER',
      },
    });

    await tx.account.create({
      data: {
        userId: newUser.id,
        provider,
        providerAccountId: profile.providerAccountId,
      },
    });

    return newUser;
  });
}
