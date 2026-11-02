import type { Metadata, Viewport } from 'next';
import { bootScript } from 'site-themes';
// The shared themes, bundled into this build: imported here, before any page's
// own stylesheet, so each page's alias block reads tokens that already exist.
import 'site-themes/themes.css';

// Each page imports its own stylesheet (the four pages have always been styled
// separately) and pages link to each other with plain anchors, so a page never
// carries another page's styles.
export const metadata: Metadata = {
  title: 'Election Atlas of India',
  icons: { icon: 'data:,' },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // suppressHydrationWarning: the boot script sets data-theme on <html> before
  // React hydrates, so the server HTML and the live element differ on purpose.
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* First in <head>: sets <html data-theme> from the shared site-theme
            choice before first paint. Inline, so nothing is fetched for it. */}
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300..600;1,6..72,300..500&family=IBM+Plex+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
