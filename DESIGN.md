# Design — RIJITA Arya Food Products

A locked design system for this app. Every page redesign reads this file before emitting code. Do not regenerate per page — extend or amend this file when the system needs to grow.

## Genre
editorial

## Macrostructure family
- Storefront pages: Asymmetric Marquee Hero → Gapless Bento Grid → 4-Pillar Purity Promise → Curated Showcase → Verified Testimonials Wall → Branded Footer

## Theme
- `--color-paper`: oklch(0.985 0.008 85) (`#FAF9F5`)
- `--color-paper-2`: oklch(1 0 0) (`#FFFFFF`)
- `--color-ink`: oklch(0.18 0.008 85) (`#1C1917`)
- `--color-ink-2`: oklch(0.45 0.01 85) (`#57534E`)
- `--color-rule`: oklch(0.92 0.008 85) (`#E7E5E4`)
- `--color-accent`: oklch(0.44 0.14 140) (`#1B6E2A` — Forest Green)
- `--color-accent-gold`: oklch(0.72 0.14 85) (`#D4A545` — Warm Gold)
- `--color-focus`: oklch(0.44 0.14 140 / 0.3)

## Typography
- Display: Outfit / Sans-Serif (`font-display`), weight 800/900
- Body: Outfit / Sans-Serif (`font-body`), weight 400/500/600
- Accent: Editorial Serif (`font-serif`), weight 400 italic (`#D4A545`)
- Display tracking: `tracking-tighter` (-0.03em)
- Type scale anchor: `clamp(2.5rem, 5vw, 4.5rem)`

## Spacing
4-point named scale (8-point grid rhythm). Pages use named spacing variables and responsive fluid padding (`py-16 sm:py-24 lg:py-32`).

## Motion
- Easings: `cubic-bezier(0.16, 1, 0.3, 1)` (`--ease-out`)
- Reveal pattern: Staggered entrance, opacity fade + GPU transform translate Y
- Reduced-motion fallback: opacity-only, ≤ 150ms

## Microinteractions Stance
- Silent success for state interactions
- Immediate keyboard focus rings (0ms delay)
- Touch targets: minimum 44px height floor

## CTA Voice
- Primary CTA: Solid Forest Green (`#1B6E2A`) fill, white text, 16px radius, hover translate
- Secondary CTA: Ghost background with border, 16px radius
- Order CTA: WhatsApp emerald pill (`#25D366`)

## What pages MUST share
- The RIJITA logo & branding
- The Forest Green (`#1B6E2A`) and Warm Gold (`#D4A545`) palette
- The Outfit display font with serif italic accents
- The 100% Pure Jain dietary guarantee messaging

## What pages MAY differ on
- Content layout & section composition per route (Storefront vs Category vs Product Detail vs Contact)
