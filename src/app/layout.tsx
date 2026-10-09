import type { Metadata, Viewport } from 'next';
import { ThemeProvider } from '@/components/common/ThemeProviders';
import { Toaster } from 'sonner';
import { Navbar } from '@/components/navigation/Navbar';
import { BottomNav } from '@/components/navigation/BottomNav';
import { getCurrentUser } from '@/lib/auth';
import './globals.css';

// Root layout for Spaces Visual Commons
export const metadata: Metadata = {
  title: 'Spaces — Visual Commons',
  description: 'A space-centric visual social network where topics are communities.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafafa' },
    { media: '(prefers-color-scheme: dark)', color: '#09090b' },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased min-h-screen flex flex-col bg-background text-foreground transition-colors selection:bg-foreground selection:text-background">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <Navbar user={user} />
          <main className="flex-1 pb-24 md:pb-8">{children}</main>
          <BottomNav currentUsername={user?.username} />
          <Toaster richColors position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
