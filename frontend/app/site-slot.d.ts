// <site-slot>: a place site-shell's compose() fills as the page is served
// (akshayDev17/site-themes, shell/). The element stays; only its content is
// replaced. Without site-shell it keeps the content the page put in it.
import type { DetailedHTMLProps, HTMLAttributes } from 'react';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'site-slot': DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        name: string;
        'data-tail'?: string;
      };
    }
  }
}
