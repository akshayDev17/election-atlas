/* The atlas's browser-tab icon: a ticked ballot dropping into a ballot box,
   white and site green on the navy rounded tile the site's other app icons use
   (Graph Notes), so it reads in light and dark tab strips alike. One source for
   every page head the atlas serves: the Next.js pages (app/layout.tsx) and the
   /elections country list (landing/render.mjs, under node's type stripping).
   Inline as a data URI, so no request can land behind a route or Access. */

const SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">' +
  '<rect width="32" height="32" rx="7" fill="#0F172A"/>' +
  '<rect x="10.5" y="3" width="11" height="13.5" rx="1.5" fill="#fff"/>' +
  '<path d="M13 9.5l2.2 2.2 4-4.4" fill="none" stroke="#0F172A" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>' +
  '<path d="M5.5 15v11.5h21V15M5.5 15h3M23.5 15h3" fill="none" stroke="#5BC28C" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' +
  '</svg>';

export const ICON = `data:image/svg+xml,${encodeURIComponent(SVG)}`;
