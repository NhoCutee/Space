export function GET() {
  return new Response('google-site-verification: google77428aa5b3658310.html', {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
