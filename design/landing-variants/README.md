# Landing Page Variant Archive

Use this folder to keep snapshots of landing page design versions so you can compare and roll back safely.

## Saved variants

1. `v1-2026-02-11-framer-cohere`
   - Files:
     - `page.tsx` (from `app/(preview)/landing/page.tsx`)
     - `globals.css` (from `app/globals.css`)
   - Notes: First redesigned direction inspired by Framer/Cohere references, including updated hero, floating nav, and widened "How it works" layout.

2. `v2-2026-02-11-pre-new-advice`
   - Files:
     - `page.tsx` (from `app/(preview)/landing/page.tsx`)
     - `globals.css` (from `app/globals.css`)
   - Notes: Snapshot saved before creating `/landing-v2` experiment based on copy and conversion advice (clarity-first hero, above-the-fold proof, primary CTA focus).

3. `v3-2026-02-11-pre-v3-merge`
   - Files:
     - `page.tsx` (from `app/(preview)/landing/page.tsx`)
     - `globals.css` (from `app/globals.css`)
   - Notes: Snapshot saved before creating `/landing-v3`, which keeps v1 colors/copy and merges selected v2 elements (how-it-works layout and "explore first" path), plus Pricing/About/FAQ links.

4. `v4-2026-02-11-pre-promote-v3`
   - Files:
     - `page.tsx` (from `app/(preview)/landing/page.tsx`)
     - `globals.css` (from `app/globals.css`)
   - Notes: Snapshot saved immediately before promoting `/landing-v3` as the main `/landing` route.

## How to create a new variant

1. Create a new folder with the next version name, for example: `v2-2026-02-12-copy-pass`.
2. Copy:
   - `app/(preview)/landing/page.tsx`
   - `app/globals.css`
3. Add a short note for what changed.

## How to restore a variant

From `complyeur/`:

```bash
cp design/landing-variants/v1-2026-02-11-framer-cohere/page.tsx app/\(preview\)/landing/page.tsx
cp design/landing-variants/v1-2026-02-11-framer-cohere/globals.css app/globals.css
```
