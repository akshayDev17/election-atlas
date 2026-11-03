import type { Metadata, Viewport } from 'next';
// The shared site theme is not bundled: in production the Worker passes each
// page through site-shell, which adds the theme's boot script and tokens right
// after <meta charset> and links the script that defines <site-theme-picker>.
// This block keeps every shared token defined (Classic Light) when no theme
// reaches the page: `next dev`, or site-shell down. Zero specificity, so the
// composed theme always wins over it.
import './site-fallback.css';
// The site path's phone sheet, kept on the screen of a phone the page overflows.
import './site-path.css';

// Each page imports its own stylesheet (the four pages have always been styled
// separately) and pages link to each other with plain anchors, so a page never
// carries another page's styles.
export const metadata: Metadata = {
  title: 'Election Atlas of India',
  icons: { icon: 'data:,' },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // suppressHydrationWarning: site-shell's boot script sets data-theme on <html>
  // before React hydrates, so the server HTML and the live element differ on
  // purpose.
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
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
