import { redirect } from 'next/navigation';
import { getSafeRedirectUrl } from '@/lib/security/validation';

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const resolved = await searchParams;
  const safeRedirect = getSafeRedirectUrl(resolved.redirect, '/');
  redirect(`/login?mode=register&redirect=${encodeURIComponent(safeRedirect)}`);
}
