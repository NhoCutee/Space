import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface NewDropPageProps {
  searchParams: Promise<{
    space?: string;
  }>;
}

export default async function NewDropPage({ searchParams }: NewDropPageProps) {
  const { space } = await searchParams;
  if (space) {
    redirect(`/create?space=${encodeURIComponent(space)}`);
  }
  redirect('/create');
}
