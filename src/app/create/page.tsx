import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { DropComposer } from '@/components/drops';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create | Spaces',
  description: 'Publish authentic visual craft, equipment specs, and context into your chosen Space.',
};

export const dynamic = 'force-dynamic';

interface CreatePageProps {
  searchParams: Promise<{
    space?: string;
  }>;
}

export default async function CreatePage({ searchParams }: CreatePageProps) {
  const user = await getCurrentUser();
  const { space: spaceSlug } = await searchParams;

  // Retrieve all active spaces for the selector (with context to tell duplicate names apart)
  const rows = await prisma.space.findMany({
    orderBy: [{ membersCount: 'desc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      slug: true,
      name: true,
      category: true,
      coverImageUrl: true,
      membersCount: true,
      members: {
        where: { role: 'CREATOR' },
        take: 1,
        select: { user: { select: { username: true, displayName: true } } },
      },
    },
  });

  const spaces = rows.map((s) => ({
    id: s.id,
    slug: s.slug,
    name: s.name,
    category: s.category,
    coverImageUrl: s.coverImageUrl,
    membersCount: s.membersCount,
    ownerName: s.members[0]?.user.displayName || s.members[0]?.user.username,
  }));

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
