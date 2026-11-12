import { WORD_CLASS } from '../../lib/epub/wrapWords';

/** Das erste Wort, das im Scrollbereich (teilweise) sichtbar ist – per binärer Suche. */
export function firstVisibleWord(scroller: HTMLElement): HTMLElement | undefined {
  const words = scroller.getElementsByClassName(WORD_CLASS);
  const top = scroller.getBoundingClientRect().top;
  let low = 0;
  let high = words.length - 1;
  let found: HTMLElement | undefined;
  while (low <= high) {
    const middle = (low + high) >> 1;
    const word = words[middle] as HTMLElement;
    if (word.getBoundingClientRect().bottom > top) {
      found = word;
      high = middle - 1;
    } else {
      low = middle + 1;
    }
  }
  return found;
}

/** Scrollt so, dass `element` oben im Scrollbereich steht. */
export function scrollToElement(scroller: HTMLElement, element: HTMLElement): void {
  const offset = element.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
  scroller.scrollTop += offset;
}

/** Scrollposition als Anteil 0–1. */
export function scrollFraction(scroller: HTMLElement): number {
  const max = scroller.scrollHeight - scroller.clientHeight;
  return max > 0 ? Math.min(1, Math.max(0, scroller.scrollTop / max)) : 1;
}

export function scrollToFraction(scroller: HTMLElement, fraction: number): void {
  scroller.scrollTop = fraction * Math.max(0, scroller.scrollHeight - scroller.clientHeight);
}
