/* Page numbers under a table: prev/next at the ends, a window around the current
   page when there are many. With one page the nav stays, empty. */
import { pageList } from '@/lib/national';

export function Pager({ id, label, page, count, onPage }: {
  id?: string; label: string; page: number; count: number; onPage: (p: number) => void;
}) {
  return (
    <nav className="pager" id={id} aria-label={label}>
      {count > 1 && (
        <>
          <button type="button" aria-label="Previous page" disabled={page === 0} onClick={() => onPage(page - 1)}>‹</button>
          {pageList(page, count).map((item, i) => item === '…'
            ? <span key={`e${i}`} className="pager-ell" aria-hidden="true">…</span>
            : <button key={item} type="button" className={item === page ? 'cur' : undefined}
                aria-current={item === page ? 'page' : undefined} onClick={() => onPage(item)}>{item + 1}</button>)}
          <button type="button" aria-label="Next page" disabled={page === count - 1} onClick={() => onPage(page + 1)}>›</button>
        </>
      )}
    </nav>
  );
}
