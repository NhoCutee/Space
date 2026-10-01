import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { DropComposer } from '@/components/drops/DropComposer';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface NewDropPageProps {
  searchParams: Promise<{
    space?: string;
  }>;
}

export default async function NewDropPage({ searchParams }: NewDropPageProps) {
  const user = await getCurrentUser();
  const { space: spaceSlug } = await searchParams;

  // Retrieve all active spaces for the selector
  const spaces = await prisma.space.findMany({
    orderBy: { membersCount: 'desc' },
    select: {
      id: true,
      slug: true,
      name: true,
      category: true,
      coverImageUrl: true,
    },
  });

  return (
    <div className="min-h-screen py-4">
      <DropComposer
        spaces={spaces}
        defaultSpaceSlug={spaceSlug}
        currentUsername={user?.username}
      />
    </div>
  );
}
