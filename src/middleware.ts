import { NextResponse } from 'next/server';

export function middleware() {
  const response = NextResponse.next();

  // 1. Content Security Policy (CSP) tailored for Next.js, Cloudinary, DiceBear, and Unsplash
  const cspHeader = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
    "style-src 'self' 'unsafe-inline' https:",
    "img-src 'self' data: blob: https://res.cloudinary.com https://images.unsplash.com https://api.dicebear.com https://*.googleusercontent.com https://avatars.githubusercontent.com",
    "font-src 'self' data: https:",
    "connect-src 'self' https: ws: wss:",
    "media-src 'self' https://res.cloudinary.com blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://accounts.google.com https://github.com",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join('; ');

  response.headers.set('Content-Security-Policy', cspHeader);

  // 2. Clickjacking Protection
  response.headers.set('X-Frame-Options', 'DENY');

  // 3. MIME Sniffing Defense
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // 4. Referrer Policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // 5. Restrict Dangerous Browser Features
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
  );

  // 6. HTTP Strict Transport Security (HSTS)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  // 7. DNS Prefetch Control
  response.headers.set('X-DNS-Prefetch-Control', 'on');

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - static files with extensions (e.g. .html, .svg, .png, .jpg, .txt)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|html|txt)$).*)',
  ],
};
