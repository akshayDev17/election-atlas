// <site-theme-picker>: the shared theme picker. site-shell's composed <head>
// links the script that defines it (akshayDev17/site-themes, shell/); without
// site-shell it stays an empty, unstyled element.
import type { DetailedHTMLProps, HTMLAttributes } from 'react';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'site-theme-picker': DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        'hide-label'?: '';
        label?: string;
      };
    }
  }
}
