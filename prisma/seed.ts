import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Space-Centric database...');

  // Clean existing data
  await prisma.notification.deleteMany();
  await prisma.collectionItem.deleteMany();
  await prisma.collection.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.reaction.deleteMany();
  await prisma.dropMedia.deleteMany();
  await prisma.drop.deleteMany();
  await prisma.spaceMember.deleteMany();
  await prisma.space.deleteMany();
  await prisma.user.deleteMany();

  // Pre-hashed bcrypt string for 'SpacesPassword2026!' (cost 12)
  const defaultPasswordHash = '$2b$12$Nq9v7.E5u7YqV81u0.5g/Onv6V.sX3/g1iK7Cj4X3z1Jt.JzQdIeq';

  // 1. Create Users
  const maya = await prisma.user.create({
    data: {
      username: 'maya_curates',
      email: 'maya@spaces.network',
      displayName: 'Maya Lin',
      passwordHash: defaultPasswordHash,
      role: 'CREATOR',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      bio: 'Aesthetic curator, specialty coffee seeker & interior design enthusiast. Living between Hanoi & Kyoto.',
      interests: JSON.stringify(['Coffee', 'Interior', 'Photography', 'Travel']),
    },
  });

  const kenji = await prisma.user.create({
    data: {
      username: 'kenji_shoots',
      email: 'kenji@spaces.network',
      displayName: 'Kenji Sato',
      passwordHash: defaultPasswordHash,
      role: 'CREATOR',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
      bio: 'Street photographer & tech architect. Capturing neon nights and mechanical keyboard craftsmanship.',
      interests: JSON.stringify(['Photography', 'Streetwear', 'Tech', 'Keyboards']),
    },
  });

  const elena = await prisma.user.create({
    data: {
      username: 'elena_builds',
      email: 'elena@spaces.network',
      displayName: 'Elena Vance',
      passwordHash: defaultPasswordHash,
      role: 'CREATOR',
      avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
      bio: 'Workspace builder, minimal desk setups & creative coder. Obsessed with tactile switches & lighting.',
      interests: JSON.stringify(['Gaming', 'Keyboards', 'Interior', 'AI']),
    },
  });

  // 2. Create Spaces
  const spacesData = [
    {
      slug: 'hanoi-coffee',
      name: 'Hanoi Coffee',
      category: 'Coffee & Lifestyle',
      description: 'Hidden old quarter cafes, roasted robusta & arabica blends, tranquil courtyards, and slow morning brew aesthetics.',
      coverImageUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=80',
      themeColor: '#78350f',
      guidelines: 'Share authentic coffee houses, egg coffee rituals, roaster notes, and serene cafe corners in Hanoi.',
      curator: maya,
    },
    {
      slug: 'mechanical-keyboards',
      name: 'Mechanical Keyboards',
      category: 'Tech & Craft',
      description: 'Custom CNC aluminum builds, hand-lubed switches, GMK keycaps, acoustic foam mods, and artisan keycap showcases.',
      coverImageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=1200&q=80',
      themeColor: '#4f46e5',
      guidelines: 'List your specs: case, plate, switches, keycaps, and typing angle. Sound tests and high-res macro photography welcome.',
      curator: elena,
    },
    {
      slug: 'tokyo-photography',
      name: 'Tokyo Photography',
      category: 'Photography',
      description: 'Shinjuku neon rains, vintage alleys of Golden Gai, Shibuya crossing motion, and cinematic 35mm captures.',
      coverImageUrl: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1200&q=80',
      themeColor: '#0284c7',
      guidelines: 'Specify camera body, lens focal length, aperture, and time of day. Respect subject privacy.',
      curator: kenji,
    },
    {
      slug: 'gaming-setup',
      name: 'Gaming Setup',
      category: 'Tech & Workspaces',
      description: 'Immersive battlestations, ultrawide OLED monitors, custom water cooling, ambient backlighting, and acoustic wall panels.',
      coverImageUrl: 'https://images.unsplash.com/photo-1616588589676-62b3bd4ff6d2?auto=format&fit=crop&w=1200&q=80',
      themeColor: '#7c3aed',
      guidelines: 'Zero visible cables, clean geometry, and high-fidelity lighting setups.',
      curator: elena,
    },
    {
      slug: 'japanese-streetwear',
      name: 'Japanese Streetwear',
      category: 'Fashion & Style',
      description: 'Tokyo silhouette mastery: oversized silhouettes, denim craftsmanship, technical outerwear, and archival vintage fits.',
      coverImageUrl: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=1200&q=80',
      themeColor: '#059669',
      guidelines: 'Share lookbooks, breakdown garment materials and labels, and document seasonal layers.',
      curator: kenji,
    },
    {
      slug: 'apartment-makeover',
      name: 'Apartment Makeover',
      category: 'Interior & Architecture',
      description: 'Japandi minimalism, warm wood textures, smart micro-loft layouts, linen textiles, and lush interior greenery.',
      coverImageUrl: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80',
      themeColor: '#d97706',
      guidelines: 'Share before & after journeys, color palettes, lighting selections, and spatial storage solutions.',
      curator: maya,
    },
    {
      slug: 'ai-tools',
      name: 'AI Tools',
      category: 'Design & Tech',
      description: 'Explorations in generative visual synthesis, next-gen interfaces, creative agents, and WebGL neural shaders.',
      coverImageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
      themeColor: '#ec4899',
      guidelines: 'Document prompts, tool stacks, shader parameters, and creative process behind synthetic visuals.',
      curator: elena,
    },
    {
      slug: 'travel-japan',
      name: 'Travel Japan',
      category: 'Travel & Culture',
      description: 'Hidden hot spring ryokans in Hakone, Kyoto temple gardens, misty Hokkaido peaks, and neighborhood izakaya discoveries.',
      coverImageUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80',
      themeColor: '#e11d48',
      guidelines: 'Exact train routes, local etiquette tips, and seasonal itinerary recommendations.',
      curator: kenji,
    },
  ];

  const spacesMap = new Map();

  for (const s of spacesData) {
    const space = await prisma.space.create({
      data: {
        slug: s.slug,
        name: s.name,
        category: s.category,
        description: s.description,
        coverImageUrl: s.coverImageUrl,
        themeColor: s.themeColor,
        guidelines: s.guidelines,
        membersCount: 12 + Math.floor(Math.random() * 80),
        dropsCount: 0,
      },
    });
    spacesMap.set(s.slug, space);

    // Curator joined as CREATOR
    await prisma.spaceMember.create({
      data: {
        spaceId: space.id,
        userId: s.curator.id,
        role: 'CREATOR',
      },
    });

    // Cross-join other members
    const otherUsers = [maya, kenji, elena].filter((u) => u.id !== s.curator.id);
    for (const u of otherUsers) {
      await prisma.spaceMember.create({
        data: {
          spaceId: space.id,
          userId: u.id,
          role: 'MEMBER',
        },
      });
    }
  }

  // 3. Create Drops with Rich Media, Specs, and Aspect Ratios
  const dropsData = [
    {
      spaceSlug: 'hanoi-coffee',
      user: maya,
      title: 'Hidden courtyard morning at Yen Cafe, Quan Thanh',
      content: 'Tucked behind a quiet colonial alley, this cafe brews the smoothest cold drip over fresh milk with notes of roasted hazelnut.',
      locationName: 'Quan Thanh, Ba Dinh, Hanoi',
      specs: JSON.stringify({ Beans: 'Fine Robusta Lam Dong', Method: 'Phin Filter Drip', Milk: 'Condensed + Oat' }),
      palette: JSON.stringify(['#3e2723', '#8d6e63', '#d7ccc8', '#efebe9', '#4e342e']),
      isCurated: true,
      media: [
        {
          url: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=80',
          width: 1200,
          height: 800,
          aspectRatio: 1.5,
        },
      ],
    },
    {
      spaceSlug: 'hanoi-coffee',
      user: kenji,
      title: 'Golden hour egg coffee at Cafe Giang',
      content: 'The legendary egg yolk whipped with condensed milk and dark robusta. A rich, custard-like texture that warms the rainy Hanoi evening.',
      locationName: 'Nguyen Huu Huan, Old Quarter, Hanoi',
      specs: JSON.stringify({ Signature: 'Hot Egg Coffee', Temperature: 'Hot water bath', Pair: 'Sunflower seeds' }),
      palette: JSON.stringify(['#f59e0b', '#78350f', '#451a03', '#fef3c7']),
      isCurated: false,
      media: [
        {
          url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80',
          width: 800,
          height: 1200,
          aspectRatio: 0.667,
        },
      ],
    },
    {
      spaceSlug: 'mechanical-keyboards',
      user: elena,
      title: 'Mode Sonnet with copper accent & GMK Botanical',
      content: 'Finally completed this endgame build. Top-mount configuration with aluminum plate gives a crisp, clacky bottom out.',
      locationName: 'Home Lab',
      specs: JSON.stringify({ Case: 'Mode Sonnet (Navy/Copper)', Plate: 'Alu Half-Plate', Switches: 'Gateron Oil Kings (lubed Krytox 205g0)', Keycaps: 'GMK Botanical R2' }),
      palette: JSON.stringify(['#1e293b', '#b45309', '#065f46', '#e2e8f0']),
      isCurated: true,
      media: [
        {
          url: 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?auto=format&fit=crop&w=1200&q=80',
          width: 1200,
          height: 800,
          aspectRatio: 1.5,
        },
      ],
    },
    {
      spaceSlug: 'mechanical-keyboards',
      user: kenji,
      title: 'Monokei Kei v2 in Royal Purple with brass bottom',
      content: 'O-ring gasket mounted 60%. The sound signature is deep, creamy, and remarkably consistent across all rows.',
      locationName: 'Tokyo Studio',
      specs: JSON.stringify({ Case: 'Monokei Kei v2', Switches: 'Cherry MX Hyperglide Black with 62g TX springs', Keycaps: 'PBTfans Purpurite' }),
      palette: JSON.stringify(['#581c87', '#d97706', '#1e1b4b', '#f3e8ff']),
      isCurated: false,
      media: [
        {
          url: 'https://images.unsplash.com/photo-1595225476474-87563907a212?auto=format&fit=crop&w=800&q=80',
          width: 800,
          height: 1000,
          aspectRatio: 0.8,
        },
      ],
    },
    {
      spaceSlug: 'tokyo-photography',
      user: kenji,
      title: 'Rain reflections in Omoide Yokocho',
      content: 'Caught the steam rising from the yakitori grills mingling with neon blue signage under a sudden autumn downpour.',
      locationName: 'Shinjuku, Tokyo',
      specs: JSON.stringify({ Camera: 'Leica M11', Lens: 'Summicron 35mm f/2 ASPH', Settings: '1/125s • f/2.0 • ISO 800' }),
      palette: JSON.stringify(['#0f172a', '#38bdf8', '#fb7185', '#fbbf24']),
      isCurated: true,
      media: [
        {
          url: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?auto=format&fit=crop&w=800&q=80',
          width: 800,
          height: 1200,
          aspectRatio: 0.667,
        },
      ],
    },
    {
      spaceSlug: 'tokyo-photography',
      user: maya,
      title: 'Quiet residential dusk in Yanaka Ginza',
      content: 'The old town of Tokyo where stray cats rest on traditional wooden roof tiles and lanterns flicker on as the sun sets over the cemetery.',
      locationName: 'Yanaka, Taito, Tokyo',
      specs: JSON.stringify({ Camera: 'Fujifilm X-T5', Lens: 'XF 23mm f/1.4', FilmSim: 'Classic Chrome' }),
      palette: JSON.stringify(['#475569', '#ea580c', '#fef08a', '#1e293b']),
      isCurated: false,
      media: [
        {
          url: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1200&q=80',
          width: 1200,
          height: 800,
          aspectRatio: 1.5,
        },
      ],
    },
    {
      spaceSlug: 'gaming-setup',
      user: elena,
      title: 'Nordic Walnut & Matte Black Battlestation',
      content: 'Custom solid walnut butcher block on a motorized standing frame. Ultrawide OLED with hidden under-desk cable raceway.',
      locationName: 'Copenhagen Studio',
      specs: JSON.stringify({ Monitor: 'LG 45” OLED 240Hz', Desk: 'Karlby Walnut Custom', Speakers: 'Audioengine A2+ Wireless', Lighting: 'BenQ ScreenBar Pro' }),
      palette: JSON.stringify(['#292524', '#78350f', '#e7e5e4', '#0c0a09']),
      isCurated: true,
      media: [
        {
          url: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=1200&q=80',
          width: 1200,
          height: 750,
          aspectRatio: 1.6,
        },
      ],
    },
    {
      spaceSlug: 'japanese-streetwear',
      user: kenji,
      title: 'Monochrome drape & Kapital sashiko boro jacket',
      content: 'Pairing the distressed indigo sashiko jacket with wide-leg Yohji Yamamoto wool trousers and Maison Margiela tabi boots.',
      locationName: 'Omotesando, Tokyo',
      specs: JSON.stringify({ Jacket: 'Kapital Century Denim Kountry', Pants: 'Yohji Yamamoto Pour Homme', Footwear: 'Margiela Leather Tabi' }),
      palette: JSON.stringify(['#1e1b4b', '#18181b', '#94a3b8', '#312e81']),
      isCurated: true,
      media: [
        {
          url: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=800&q=80',
          width: 800,
          height: 1200,
          aspectRatio: 0.667,
        },
      ],
    },
    {
      spaceSlug: 'apartment-makeover',
      user: maya,
      title: 'Sunlit living room with Noguchi lamp & linen textures',
      content: 'Replaced the heavy blackout drapes with sheer oatmeal linen. Added a vintage mid-century sideboard to store ceramics and records.',
      locationName: 'Tay Ho Loft, Hanoi',
      specs: JSON.stringify({ Lighting: 'Akari 10A Noguchi', Rug: 'Handwoven Moroccan Wool', Plant: 'Ficus Elastica Robusta' }),
      palette: JSON.stringify(['#fef3c7', '#78350f', '#14532d', '#f3f4f6']),
      isCurated: true,
      media: [
        {
          url: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80',
          width: 1200,
          height: 800,
          aspectRatio: 1.5,
        },
      ],
    },
    {
      spaceSlug: 'ai-tools',
      user: elena,
      title: 'Generative architectural topography via WebGL shaders',
      content: 'Real-time raymarched SDF terrain with dynamic lighting uniforms responding to cursor coordinates.',
      locationName: 'Interactive Lab',
      specs: JSON.stringify({ Shader: 'Raymarching SDF', Stack: 'Three.js / React Three Fiber', FPS: '120fps on M3 Max' }),
      palette: JSON.stringify(['#ec4899', '#8b5cf6', '#06b6d4', '#09090b']),
      isCurated: true,
      media: [
        {
          url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80',
          width: 1000,
          height: 1000,
          aspectRatio: 1.0,
        },
      ],
    },
    {
      spaceSlug: 'travel-japan',
      user: kenji,
      title: 'Dawn mist over Arashiyama Bamboo Grove',
      content: 'Arrived at 5:30 AM before the tour crowds. The silence of the rustling bamboo stalks and the gentle morning drizzle was spiritual.',
      locationName: 'Arashiyama, Kyoto',
      specs: JSON.stringify({ Timing: '05:30 AM Sunrise', Transport: 'Keifuku Electric Railroad', Season: 'Late November Autumn' }),
      palette: JSON.stringify(['#14532d', '#166534', '#bbf7d0', '#052e16']),
      isCurated: true,
      media: [
        {
          url: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80',
          width: 1200,
          height: 800,
          aspectRatio: 1.5,
        },
      ],
    },
  ];

  const createdDrops = [];

  for (const d of dropsData) {
    const space = spacesMap.get(d.spaceSlug);
    if (!space) continue;

    const drop = await prisma.drop.create({
      data: {
        spaceId: space.id,
        userId: d.user.id,
        title: d.title,
        content: d.content,
        locationName: d.locationName,
        specs: d.specs,
        palette: d.palette,
        isCurated: d.isCurated,
        reactionsCount: 8 + Math.floor(Math.random() * 35),
        commentsCount: 2 + Math.floor(Math.random() * 10),
        savesCount: 4 + Math.floor(Math.random() * 18),
        media: {
          create: d.media.map((m, idx) => ({
            url: m.url,
            width: m.width,
            height: m.height,
            aspectRatio: m.aspectRatio,
            sortOrder: idx,
          })),
        },
      },
    });

    createdDrops.push(drop);

    // Update space count
    await prisma.space.update({
      where: { id: space.id },
      data: { dropsCount: { increment: 1 } },
    });

    // Add reactions
    await prisma.reaction.create({
      data: {
        dropId: drop.id,
        userId: maya.id,
        type: 'AESTHETIC',
      },
    });

    await prisma.reaction.create({
      data: {
        dropId: drop.id,
        userId: kenji.id,
        type: 'INSPIRED',
      },
    });

    // Add comment
    await prisma.comment.create({
      data: {
        dropId: drop.id,
        userId: elena.id,
        content: 'The lighting and color grading here is immaculate! Beautiful share.',
      },
    });
  }

  // 4. Create Collections
  const collection1 = await prisma.collection.create({
    data: {
      userId: maya.id,
      title: 'Cozy Urban Mornings',
      description: 'Quiet coffee spaces, architectural interiors, and morning natural light inspiration.',
      itemsCount: 3,
    },
  });

  if (createdDrops[0] && createdDrops[1] && createdDrops[8]) {
    await prisma.collectionItem.create({ data: { collectionId: collection1.id, dropId: createdDrops[0].id, position: 0 } });
    await prisma.collectionItem.create({ data: { collectionId: collection1.id, dropId: createdDrops[1].id, position: 1 } });
    await prisma.collectionItem.create({ data: { collectionId: collection1.id, dropId: createdDrops[8].id, position: 2 } });
  }

  const collection2 = await prisma.collection.create({
    data: {
      userId: kenji.id,
      title: 'Tokyo Night Moodboard',
      description: 'Neon alleys, street photography angles, and urban textures.',
      itemsCount: 2,
    },
  });

  if (createdDrops[4] && createdDrops[7]) {
    await prisma.collectionItem.create({ data: { collectionId: collection2.id, dropId: createdDrops[4].id, position: 0 } });
    await prisma.collectionItem.create({ data: { collectionId: collection2.id, dropId: createdDrops[7].id, position: 1 } });
  }

  console.log(`Database seeded successfully! Created ${spacesData.length} Spaces, ${createdDrops.length} Drops, and initial Collections.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
