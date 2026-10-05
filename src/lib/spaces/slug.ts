import { prisma } from '@/lib/prisma';
import { slugify } from '@/lib/utils';

type SlugClient = Pick<typeof prisma, 'space'>;

/**
 * Normalizes a requested name/slug into a base slug.
 * Display names are NOT unique; only the slug is (DB-level @unique).
 */
export function buildBaseSlug(nameOrSlug: string): string {
  const base = slugify(nameOrSlug || '');
  if (!base || base.length < 2) return `space-${Date.now().toString(36)}`;
  return base;
}

/**
 * Returns the first free slug: base, base-2, base-3, ...
 * This is a best-effort pre-check; the DB unique index remains the source of truth
 * (see isSlugConflict + retry in callers).
 */
export async function resolveUniqueSlug(
  baseSlug: string,
  client: SlugClient = prisma,
  skip = 0
): Promise<string> {
  const rows = await client.space.findMany({
    where: { OR: [{ slug: baseSlug }, { slug: { startsWith: `${baseSlug}-` } }] },
    select: { slug: true },
  });
  const taken = new Set(rows.map((r) => r.slug));
  if (!taken.has(baseSlug) && skip === 0) return baseSlug;

  let n = 2 + skip;
  while (taken.has(`${baseSlug}-${n}`)) n++;
  return `${baseSlug}-${n}`;
}

/** True when the error is a unique-constraint violation on Space.slug (Prisma P2002). */
export function isSlugConflict(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const e = err as { code?: string; meta?: { target?: unknown } };
  if (e.code !== 'P2002') return false;
  const target = e.meta?.target;
  if (target === undefined) return true;
  return String(Array.isArray(target) ? target.join(',') : target).includes('slug');
}

export const MAX_SLUG_ATTEMPTS = 6;

/**
 * Runs `attempt(slug)` with a unique slug candidate. If a concurrent request grabs the
 * same slug first, the DB unique index raises P2002 and we retry with the next free suffix.
 * `attempt` should perform its writes inside ONE transaction so a retry never leaves partial data.
 */
export async function withUniqueSlug<T>(
  baseSlug: string,
  attempt: (slug: string) => Promise<T>
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < MAX_SLUG_ATTEMPTS; i++) {
    const slug = await resolveUniqueSlug(baseSlug, prisma, i);
    try {
      return await attempt(slug);
    } catch (err) {
      if (!isSlugConflict(err)) throw err;
      lastErr = err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Could not allocate a unique Space slug.');
}

interface SpaceRecordInput {
  name: string;
  description: string;
  category: string;
  coverImageUrl: string;
  themeColor?: string;
  guidelines?: string;
}

/**
 * The single place that inserts a Space and its CREATOR membership.
 * Must be called with a transaction client.
 */
export async function insertSpaceWithCreator(
  tx: Pick<typeof prisma, 'space' | 'spaceMember'>,
  userId: string,
  input: SpaceRecordInput,
  slug: string
) {
  const space = await tx.space.create({
    data: {
      slug,
      name: input.name.trim(),
      description: input.description.trim(),
      category: input.category.trim(),
      coverImageUrl: input.coverImageUrl.trim(),
      themeColor: input.themeColor?.trim() || '#18181b',
      guidelines: input.guidelines?.trim() || null,
      membersCount: 1,
      dropsCount: 0,
    },
  });
  await tx.spaceMember.create({
    data: { spaceId: space.id, userId, role: 'CREATOR' },
  });
  return space;
}
