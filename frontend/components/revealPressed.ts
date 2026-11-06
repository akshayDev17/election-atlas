/**
 * Scrolls a strip of toggle buttons sideways, inside its own box, so its
 * pressed button is in view. On a phone a year strip is wider than the screen
 * and scrolls (see the stylesheets), and the chosen year is usually the latest,
 * at the far end. Where the strip fits nothing can scroll, so this does nothing;
 * it never moves the page itself.
 */
export function revealPressed(strip: HTMLElement | null): void {
  const pressed = strip?.querySelector<HTMLElement>('[aria-pressed="true"]');
  if (!strip || !pressed) return;
  const box = strip.getBoundingClientRect();
  const button = pressed.getBoundingClientRect();
  if (button.left < box.left) strip.scrollLeft += button.left - box.left;
  else if (button.right > box.right) strip.scrollLeft += button.right - box.right;
}
