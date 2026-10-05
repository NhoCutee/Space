import { prisma } from '@/lib/prisma';
import { buildBaseSlug, withUniqueSlug, insertSpaceWithCreator } from '@/lib/spaces/slug';

/**
 * Space name uniqueness checks (display name is NOT unique, slug IS).
 * Uses the same shared allocator as createSpace/createDrop; runs without an HTTP session.
 */
async function main() {
  const user = await prisma.user.findFirst();
  if (!user) throw new Error('No user to own test spaces');

  const tag = Date.now().toString(36);
  const name = `ABC ${tag}`;
  const base = buildBaseSlug(name);
  const mk = (slug: string) =>
    prisma.$transaction((tx) =>
      insertSpaceWithCreator(
        tx,
        user.id,
        { name, description: 'duplicate name test space', category: 'Test', coverImageUrl: 'https://example.com/c.jpg' },
        slug
      )
    );
  const create = () => withUniqueSlug(base, mk);

  const created: { id: string; slug: string; name: string }[] = [];
  try {
    // 1. Sequential duplicates -> abc, abc-2, abc-3
    for (let i = 0; i < 3; i++) created.push(await create());
    const seq = created.map((s) => s.slug);
    console.log('sequential slugs:', seq);
    if (seq[0] !== base || seq[1] !== `${base}-2` || seq[2] !== `${base}-3`) throw new Error('Unexpected suffix sequence');
    if (new Set(created.map((s) => s.name)).size !== 1) throw new Error('Names should be identical');
    console.log('✓ same display name allowed, slugs unique & suffixed from -2');

    // 2. Concurrent creation -> all unique, none fail
    const burst = await Promise.all(Array.from({ length: 5 }, () => create()));
    created.push(...burst);
    const all = created.map((s) => s.slug);
    console.log('concurrent slugs:', burst.map((s) => s.slug));
    if (new Set(all).size !== all.length) throw new Error('Duplicate slug produced under concurrency');
    console.log('✓ concurrent creation produced unique slugs (DB unique index enforced)');

    // 3. DB rejects a raw duplicate slug
    let rejected = false;
    try {
      await mk(created[0].slug);
    } catch {
      rejected = true;
    }
    if (!rejected) throw new Error('DB accepted duplicate slug');
    console.log('✓ DB unique index rejects duplicate slug directly');
  } finally {
    await prisma.space.deleteMany({ where: { id: { in: created.map((s) => s.id) } } });
  }
  console.log('ALL SPACE-UNIQUENESS CHECKS PASSED');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
