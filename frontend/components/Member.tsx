/* A member as the atlas shows them: initials on their party's colour, and a link
   to their official page on sansad.in, where the photograph is published. The
   atlas stores no portraits. */
import type { CSSProperties } from 'react';
import { inkOn, initials, sansadMemberURL } from '@/lib/atlas';

export function Monogram({ name, colour }: { name: string | undefined; colour?: string }) {
  const ink = inkOn(colour);
  const style = ink ? ({ '--mono-bg': colour, '--mono-ink': ink } as CSSProperties) : undefined;
  return <span className="monogram" aria-hidden="true" style={style}>{initials(name)}</span>;
}

/* Nothing when no official page is known: the link is left out rather than
   pointed at a guess. */
export function OfficialPhotoLink({ house, mpsno }: { house?: string; mpsno?: number | string }) {
  const href = sansadMemberURL(house, mpsno);
  if (!href) return null;
  return (
    <span className="photo-link">
      <a href={href} target="_blank" rel="noopener">View official photo on sansad.in ↗</a>
    </span>
  );
}

/* A party colour square. */
export function Swatch({ colour }: { colour: string }) {
  return <i className="sw" style={{ '--c': colour } as CSSProperties} />;
}
