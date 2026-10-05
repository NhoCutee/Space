---
name: Spaces
description: Visual Commons and aesthetic discovery platform for creators and enthusiasts
colors:
  primary: "#18181b"
  primary-foreground: "#fafafa"
  background: "#fafafa"
  foreground: "#09090b"
  card: "#ffffff"
  secondary: "#f4f4f5"
  muted: "#f4f4f5"
  muted-foreground: "#71717a"
  border: "#e4e4e7"
  accent-indigo: "#6366f1"
  accent-emerald: "#10b981"
  accent-amber: "#f59e0b"
  accent-rose: "#ef4444"
  dark-background: "#09090b"
  dark-foreground: "#fafafa"
  dark-card: "#121215"
  dark-secondary: "#27272a"
  dark-border: "#27272a"
  glass-border-light: "rgba(0, 0, 0, 0.08)"
  glass-border-subtle: "rgba(0, 0, 0, 0.06)"
  glass-border-dark: "rgba(255, 255, 255, 0.08)"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "clamp(1.75rem, 4vw, 2.25rem)"
    fontWeight: 900
    lineHeight: 1.2
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 800
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.35
    letterSpacing: "-0.015em"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.02em"
  caption:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "10px"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "0.02em"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  "2xl": "24px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  "2xl": "48px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.full}"
    padding: "6px 16px"
    typography: "{typography.label}"
  button-primary-hover:
    backgroundColor: "#27272a"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.full}"
    padding: "6px 16px"
  button-accent:
    backgroundColor: "{colors.accent-indigo}"
    textColor: "#ffffff"
    rounded: "{rounded.xl}"
    padding: "12px 24px"
  badge-explainable:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.muted-foreground}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  card-surface:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.xl}"
    padding: "16px"
---

# Design System: Spaces

## Overview

**Creative North Star: "The Visual Commons Atelier"**

Spaces is a distraction-free digital gallery and aesthetic commons engineered to celebrate original visual craft, photography, architecture, and design disciplines. Departing from the cluttered dopamine architecture of mainstream social feeds, the interface functions as an unobtrusive atelier: muted, architectural hairline frames recede completely into the background, leaving the uploaded media to command 100% of the viewer's emotional and visual focus.

The visual tone is defined by quiet editorial restraint, tactile hairline borders, and generous breathing room. High-contrast typography pairs with micro-radius pill geometry to provide immediate legibility while maintaining a calm, disciplined gallery rhythm. Light mode adopts a porcelain paper canvas (`#fafafa`) with deep charcoal ink typography (`#18181b`), while Dark mode shifts into an inkwell sanctuary (`#09090b` / `#121215`) where image highlights luminous aesthetics without backlight glare.

Confirmed visual anti-references: no saturated neon drop shadows, no intrusive advertising widgets, no autoplay video clutter, no aggressive gamification badges or confetti animations, and no thick heavy dividers.

**Key Characteristics:**
- **Artwork-First Neutrality:** Surfaces remain strictly achromatic neutral so vibrant photographs and artworks maintain chromatic primacy.
- **Hairline Tactility:** 1px borders (`border-border/80`) deliver crisp architectural definition without heavy elevation drops.
- **Micro-Scale Pill Affordances:** Action pills, category badges, and explainable indicators adopt full capsule geometry (`rounded-full`) for friendly, thumb-optimized touch targets.
- **Explainable Semantics:** Contextual cues (interests, joined spaces, trending) employ intentional pastel tint coding rather than noisy saturated banners.

## Colors

The palette is strictly achromatic at rest, accented by purposeful semantic pastel tints that communicate recommendation context and community actions without competing against user imagery.

### Primary
- **Obsidian Ink / Paper White** (#18181b in Light / #fafafa in Dark): The high-contrast anchor used for primary call-to-actions, active filter pills, brand monograms, and decisive navigation states.

### Secondary
- **Aesthetic Indigo** (#6366f1): Primary accent reserved exclusively for active exploratory discovery, onboarding pathways, and high-signal recommendation tags.
- **Communal Emerald** (#10b981): Applied exclusively to indicate joined communal spaces and live activity pulse indicators.
- **Velocity Amber** (#f59e0b): Reserved for trending velocity and real-time community engagement spikes.

### Neutral
- **Gallery Canvas** (#fafafa Light / #09090b Dark): The base ambient background. Calm, glare-free, and neutral.
- **Atelier Card Surface** (#ffffff Light / #121215 Dark): Elevated container surface for Spaces and Drops cards.
- **Hairline Border** (#e4e4e7 Light / #27272a Dark): 1px structural framing for cards, inputs, and section boundaries.
- **Secondary Fill** (#f4f4f5 Light / #27272a Dark): Subdued background for unselected segmented buttons, search fields, and hover fills.
- **Stone Caption Text** (#71717a Light / #a1a1aa Dark): Metadata, timestamps, and secondary captions meeting WCAG AA contrast standards.

### Named Rules
**The Artwork Supremacy Rule.** Accent colors are forbidden from occupying more than 5% of any content viewport. The vibrant color space belongs solely to user-contributed media; UI chromas serve only navigation and semantic status.
**The Ghost Border Fallback Rule.** When a card or media container sits on an identically colored surface, separation must be achieved through a 1px border (`border-border/70`), never through artificial drop-shadow dropoffs.

## Typography

**Display Font:** -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif
**Body Font:** -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif
**Label/Mono Font:** ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace

**Character:** A high-precision humanist system stack optimized for 0ms font layout shift, instantaneous load times, and crisp editorial legibility across retina displays.

### Hierarchy
- **Display** (Font Weight 900, clamp(1.75rem, 4vw, 2.25rem), Line Height 1.2): Space headlines, landing page mastheads, and major section intros.
- **Headline** (Font Weight 800, 1.5rem / 24px, Line Height 1.25): Card titles, modal headers, and category titles.
- **Title** (Font Weight 700, 1.125rem / 18px, Line Height 1.35): Space card titles, drop titles, and section subheadings.
- **Body** (Font Weight 400, 0.875rem / 14px, Line Height 1.5): Space descriptions, drop annotations, creator manifestos, and commentary text (optimal line length: 55–70ch).
- **Label** (Font Weight 600, 0.6875rem–0.75rem / 11px–12px, Letter Spacing 0.02em): Pill buttons, category tags, explainable badges, and keyboard shortcuts (`⌘K`).

### Named Rules
**The Zero Font Shift Rule.** System sans-serif stacks eliminate webfont flicker and layout shifts (CLS = 0), ensuring that visual browsing begins immediately upon initial packet arrival.
**The Tight Header Tracking Rule.** Large headings (`text-xl` and above) must use negative letter spacing (`tracking-tight` / -0.025em) to preserve typographic density and prevent headline sprawl.

## Layout

The spatial model uses an 8pt rhythmic grid anchored by a 4px base increment. 
- **Application Shell:** Responsive container capped at `max-w-7xl` (1280px) with fluid guttering (`px-4` on mobile 375px–640px, scaling to `px-6` on desktop 1024px–1920px).
- **Creator Focus Pages:** Single-column creation flows (`/s/new`, `/drop/new`) are constrained to `max-w-3xl` (768px) or two-column split (`lg:grid-cols-12`) to eliminate eye travel fatigue.
- **Adaptive Feed Grid:** 
  - On mobile (<640px): 1-column continuous vertical feed.
  - On tablet (640px–1024px): 2-column balanced masonry.
  - On desktop (>1024px): 3 to 4 column dynamic aspect-ratio masonry.
- **Spacing Scale:** Standard token increments: 4px (`xs`), 8px (`sm`), 16px (`md`), 24px (`lg`), 32px (`xl`), 48px (`2xl`).

## Elevation & Depth

Spaces is strictly flat-by-default, utilizing crisp tonal layers and hairline borders (`1px solid var(--border)`) rather than ambient blur shadows to convey depth and structure.

### Shadow Vocabulary
- **Rest State** (`box-shadow: none`): Cards, controls, and content containers rest directly on the canvas without elevation.
- **Hover Micro-Lift** (`box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)`): Interactive cards subtly lift on mouse enter alongside a `-translate-y-1` transform.
- **Elevated Modal / Command Palette** (`box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25)`): Modals and the `⌘K` search palette float over an 80% opacity backdrop with 16px blur.
- **Glass Navbar** (`backdrop-filter: blur(16px)`): Sticky top navigation uses 85% translucent background with 1px border divider.

### Named Rules
**The Flat-By-Default Rule.** Surfaces possess zero drop-shadow at rest. Shadows appear strictly as interactive affordances (hover state) or modal depth layers.
**The Hairline Boundary Rule.** All visual separation between adjacent functional surfaces must be achieved with a 1px border at 60%–80% opacity, never heavy gradients or drop shadows.

## Shapes

- **Capsule / Pill Geometry (`rounded-full` / 9999px):** Applied to all interactive chips, tags, action buttons (`Join Space`, `Filter`), search triggers, and author avatars. Pill geometry signals instant interactivity.
- **Rounded Surface Geometry (`rounded-2xl` / 16px):** Standard corner radius for cards (`SpaceCard`, `DropCard`), image preview frames, and onboarding hero modules.
- **Compact Control Geometry (`rounded-xl` / 12px):** Applied to segmented control containers, brand icon tiles, and form input elements.
- **Media Preservation:** Image corners match the container (`rounded-2xl` on standalone cards, `rounded-xl` in multi-image previews) with zero artificial edge vignetting.

## Components

### Buttons
- **Shape:** Full capsule (`rounded-full`, 9999px) or rounded rectangle (`rounded-xl` for form submissions).
- **Primary:** Obsidian ink background (`bg-foreground`), paper white text (`text-background`), `px-4 py-1.5 text-xs font-semibold`. Scales on click (`active:scale-95`).
- **Secondary / Joined Toggle:** Muted background (`bg-secondary`), bordered by `border-border/80`, text `text-foreground`. Transitions smoothly to `hover:bg-destructive/10 hover:text-destructive` when hovered in joined state.
- **Accent CTA:** Indigo background (`bg-indigo-600 hover:bg-indigo-700`), white text, `px-6 py-2.5 rounded-full font-bold`.

### Chips
- **ExplainableBadge:** Micro-capsule (`rounded-full`, `px-2.5 py-0.5 text-[11px] font-medium border`). Renders contextual icons (Sparkles for interests, Users for joined, Flame for trending, Heart for popular) with corresponding pastel tints.
- **Category Filter Pill:** Capsule button (`px-3 py-1.5 rounded-full text-xs font-semibold`). Active state flips to `bg-foreground text-background`.
- **Segmented Control:** Enclosed container (`p-1 rounded-xl bg-secondary/70 border border-border/70`) with active segment sliding to `bg-background text-foreground shadow-xs`.

### Cards / Containers
- **Corner Style:** `rounded-2xl` (16px) with `overflow-hidden`.
- **Background:** `bg-card` (`#ffffff` Light / `#121215` Dark).
- **Border:** 1px hairline (`border border-border/70`, transitioning to `hover:border-foreground/30`).
- **Internal Padding:** 16px (`p-4`) on content containers; 0px around primary media.
- **Image Behavior:** Media preserves native or 16:9 aspect ratio (`aspect-[16/9]`), smooth zoom on hover (`group-hover:scale-105 transition-transform duration-500`).

### Inputs / Fields
- **Style:** `bg-secondary/40` with `border border-border/80 rounded-2xl px-4 py-2.5 text-sm text-foreground`.
- **Focus State:** 2px ring with `focus:ring-2 focus:ring-indigo-500/50` or `focus:border-foreground/40`.
- **Command Palette Search:** Borderless inner input with leading search icon and trailing `ESC` / `⌘K` micro-kbd badge.

### Navigation
- **Top Bar:** Sticky glass container (`sticky top-0 z-30 h-16 glass border-b border-border/60`).
- **Brand Mark:** Black square tile (`w-8 h-8 rounded-xl bg-foreground text-background`) with pulsing emerald live indicator dot.
- **Nav Links:** Capsule pill items with active highlight (`bg-foreground text-background shadow-sm`).
- **Mobile Bottom Nav:** Persistent bottom navigation pill with icon-and-label layout.

### ExplainableBadge (Signature Component)
The signature component for the Spaces Visual Commons. Surfaces deterministic recommendation reasons (Interest match, Joined community, Trending velocity, Community popularity) using tailored micro-icons and calibrated opacity tints, providing total transparency into content discovery.

## Do's and Don'ts

### Do:
- **Do** preserve the natural aspect ratio of user drops in masonry canvas feeds (`aspectRatio` inline styling).
- **Do** use hairline borders (`border border-border/80`) for structural definition between adjacent card elements.
- **Do** maintain strict achromatic neutrality across navigation and structural cards to honor user artwork.
- **Do** use `ExplainableBadge` on every algorithmically recommended space and drop to explain why it appears.
- **Do** provide smooth micro-interactions (`active:scale-95`, `transition-all duration-200`) on touch targets.

### Don't:
- **Don't** apply heavy, saturated drop-shadows under cards at rest.
- **Don't** use decorative primary color fills on large card backgrounds.
- **Don't** introduce external web fonts that cause layout shift or delay initial visual presentation.
- **Don't** crop user artworks into arbitrary circular or distorted aspect ratios without user consent.
- **Don't** hide recommendation rationale behind opaque algorithm feeds.
