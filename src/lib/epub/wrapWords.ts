export const WORD_CLASS = 'w';

const SKIPPED_PARENTS = new Set(['SCRIPT', 'STYLE', 'svg', 'SVG']);

/**
 * UC-004: Legt jedes Wort im Container in ein `<span class="w">`, damit ein Antippen das
 * Wort direkt als Ziel des Ereignisses liefert. Leerzeichen und Satzzeichen bleiben Text.
 */
export function wrapWords(container: HTMLElement, locale = 'en'): void {
  const segmenter = new Intl.Segmenter(locale, { granularity: 'word' });
  const doc = container.ownerDocument;
  const walker = doc.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const parent = node.parentElement;
    if (parent && !SKIPPED_PARENTS.has(parent.tagName) && node.nodeValue?.trim()) {
      textNodes.push(node as Text);
    }
  }

  for (const textNode of textNodes) {
    const fragment = doc.createDocumentFragment();
    for (const { segment, isWordLike } of segmenter.segment(textNode.nodeValue ?? '')) {
      if (isWordLike) {
        const span = doc.createElement('span');
        span.className = WORD_CLASS;
        span.textContent = segment;
        fragment.append(span);
      } else {
        fragment.append(segment);
      }
    }
    textNode.replaceWith(fragment);
  }
}

/** Die bis zu `count` Wörter, die im Text auf `word` folgen (für Wendungen wie „give up“). */
export function followingWords(word: HTMLElement, container: HTMLElement, count: number): string[] {
  const words = Array.from(container.getElementsByClassName(WORD_CLASS));
  const index = words.indexOf(word);
  if (index < 0) return [];
  return words.slice(index + 1, index + 1 + count).map((element) => element.textContent ?? '');
}
