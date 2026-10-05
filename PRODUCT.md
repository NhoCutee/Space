# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
- **Primary Audience:** General Public & Social Scrollers seeking daily high-quality aesthetic inspiration, visual exploration, and calm discovery without aggressive engagement algorithms.
- **Creator & Curator Personas:** Visual creators, photographers, collectors, and design/craft enthusiasts (e.g. Maya Lin - curator, Kenji Sato - street photographer, Elena Vance - generative architectural artist) sharing deep niche domains.

## Product Purpose
Spaces is a Visual Commons designed to showcase, archive, and explore authentic visual culture and craft aesthetics. Success means offering users an immersive, distraction-free visual discovery experience where spaces—not influencer algorithms or clickbait metrics—serve as the central organizing principle.

## Positioning
**Space-First Visual Commons:**
- Unlike Instagram or TikTok's follower-first, algorithmic dopamine loops, Spaces organizes around shared aesthetic domains and craft themes ("Spaces").
- Transparent, explainable discovery: Every recommended Space and Drop surfaces clear, deterministic reasons for why it is shown (matched interests, joined communities, community resonance, freshness).
- True Visual Commons: Public visual artifacts ("Drops") are preserved in thematic communal archives, complemented by user-curated private/public Collections.

## Operating Context
- Web-first responsive application accessible seamlessly across mobile (375px–430px) and desktop (1024px–1920px).
- Low-latency visual browsing with masonry and grid layouts.
- Realtime communal discourse via Server-Sent Events (SSE) for comments and threaded replies on Spaces and Drops.
- Rapid universal discovery powered by a Command Palette (⌘K / Ctrl+K).

## Capabilities and Constraints
- **Core Entities:**
  - `Space`: The central organizing object with unique slug, theme color, category, cover artwork, and membership. Display names do not need to be unique; slugs enforce uniqueness at the database level.
  - `Drop`: Visual artifacts containing media images, rich markdown narrative, location metadata, reactions, comments, and saves.
  - `Collection`: User-curated sets of Drops, supporting both public sharing and private curation.
  - `Comment`: Direct comments on either a Space or a Drop, supporting nested replies, real-time sync, and edit history.
- **Unified Creation Flow:** A single `/create` route allowing users to publish a Drop and optionally create a new Space inline without losing draft data.
- **Deterministic Recommendation Engine:** Explainable recommendation scoring based strictly on user interests, joined spaces, engagement signals, and freshness—with zero black-box machine learning.
- **Technical Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, Prisma ORM, SQLite / PostgreSQL, Bun runtime.

## Brand Commitments
- **Name:** Spaces — Visual Commons.
- **Voice:** Calm, refined, intentional, and respectful of artistic craft.
- **Identity Principles:** Flat modernism, clean typography, subtle micro-interactions, unobtrusive overlays that never obstruct user photography or artwork.
- **Primary Accent:** Indigo (`#6366f1` / `indigo-600`), complemented by emerald for community/memberships and amber for trending signals.

## Evidence on Hand
- Fully functional web application with running dev server at `http://localhost:3000/`.
- Seed data featuring authentic spaces: "Tokyo Photography", "Mechanical Keyboards", "Gaming Setup", "Hanoi Coffee", "Japanese Streetwear", "AI Tools".
- Realtime comment engine with SSE test suite in `scripts/tests/test-space-comments-realtime.ts`.
- Automated test suites passing 100% across slugs, creation architecture, interactions, and discovery feeds.

## Product Principles
1. **The Space is the Anchor:** The thematic aesthetic space is the primary organizing structure. No follower-first feeds or algorithmic bait.
2. **Artwork First, Interface Second:** The UI must recede to let photography, typography, and industrial craft lead from the first viewport.
3. **Transparent & Explainable:** Users always understand why something is recommended. No black-box recommendation logic.
4. **Frictionless Creation:** Creation is unified and non-destructive. Creators should never lose drop draft state when creating a new space.
5. **Realtime Craft Discourse:** High-quality threaded discussions with live synchronization and timestamp transparency.

## Accessibility & Inclusion
- WCAG AA color contrast standards (>= 4.5:1 for body copy and >= 3:1 for large headers and badges) across both Light and Dark themes.
- Responsive accessibility supporting keyboard navigation (Command Palette ⌘K, arrow navigation, escape dismissals) and mobile touch targets >= 44px.
