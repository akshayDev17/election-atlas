/* The site path: akshayprabhakant.com / the apps / this page's crumbs. The page
   only places <site-slot name="site-path">; site-shell's compose() fills it from
   the shared app list (akshayDev17/site-themes, shell/nav.ts) as the Worker
   serves the page, with the atlas marked as the current app.

   `tail` is the page's own crumbs after the app name, as compose() reads them
   from data-tail; the last one is the current page. A page's HTML is the same
   file for every query, so the state and seat pages carry placeholder labels
   here, and the Worker writes the real names into data-tail before compose()
   reads it (backend/src/sitepath.js).

   `fallback` is the markup shown when compose() does not run (site-shell down,
   or `next dev`): the page's own back link. It is set once as raw HTML and never
   changes, and the element skips hydration checks, so React neither reports nor
   replaces the path compose() put there. The {__html} object is kept across
   renders on purpose: React compares a custom element's props by identity, so a
   new object on a re-render would rewrite the slot and wipe the path. */
import { type Ref, useMemo } from 'react';

export type Crumb = { label: string; href?: string };

export function SitePath({ tail, fallback, ref }: { tail: Crumb[]; fallback: string; ref?: Ref<HTMLElement> }) {
  const html = useMemo(() => ({ __html: fallback }), [fallback]);
  return (
    <site-slot
      ref={ref}
      name="site-path"
      data-tail={JSON.stringify(tail)}
      dangerouslySetInnerHTML={html}
      suppressHydrationWarning
    />
  );
}
