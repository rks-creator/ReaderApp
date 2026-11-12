import { useCallback, useEffect, useRef, useState, type PointerEvent, type RefObject } from 'react';
import { useServices } from '../../app/services';
import type { SelectionLookup } from '../../lib/dictionary/lookup';
import { WORD_CLASS } from '../../lib/epub/wrapWords';
import { ModelUnavailableError, TranslationSupersededError } from '../../lib/translation/translator';

/** UC-007: so lange muss der Finger ruhig liegen, bevor markiert wird. */
export const LONG_PRESS_MS = 500;
export const MOVE_TOLERANCE_PX = 10;
/** UC-007, A1 */
export const MAX_SELECTION_WORDS = 60;
const SELECTED_CLASS = 'w--selected';

export type DictionaryPart = { status: 'loading' } | { status: 'done'; result: SelectionLookup } | { status: 'unavailable' };
export type TranslationPart =
  | { status: 'loading-model' }
  | { status: 'translating' }
  | { status: 'done'; text: string }
  | { status: 'unavailable' }
  | { status: 'failed' };

export interface SelectionPopupState {
  text: string;
  anchor: DOMRect;
  dictionary: DictionaryPart;
  translation: TranslationPart;
}

interface Press {
  x: number;
  y: number;
  word: HTMLElement;
  timer: number;
}

interface ActiveSelection {
  words: HTMLElement[];
  indexOf: Map<Element, number>;
  start: number;
  end: number;
}

function wordAt(target: EventTarget | null): HTMLElement | null {
  return target instanceof Element ? target.closest<HTMLElement>(`.${WORD_CLASS}`) : null;
}

function rangeOf({ start, end }: { start: number; end: number }): [number, number] {
  return start <= end ? [start, end] : [end, start];
}

function anchorOf(first: HTMLElement, last: HTMLElement): DOMRect {
  const a = first.getBoundingClientRect();
  const b = last.getBoundingClientRect();
  const left = Math.min(a.left, b.left);
  const right = Math.max(a.right, b.right);
  return new DOMRect(left, a.top, right - left, b.bottom - a.top);
}

function textBetween(first: HTMLElement, last: HTMLElement): string {
  const range = document.createRange();
  range.setStartBefore(first);
  range.setEndAfter(last);
  return range.toString().replace(/\s+/g, ' ').trim();
}

interface Options {
  /** Wird aufgerufen, sobald markiert wird (z. B. um das Wort-Popup zu schliessen). */
  onBegin: () => void;
  /** UC-007, A2: Langes Drücken ohne Ziehen übersetzt nur dieses Wort. */
  onSingleWord: (word: HTMLElement) => void;
}

export function useTextSelection(container: RefObject<HTMLElement | null>, { onBegin, onSingleWord }: Options) {
  const { dictionary, translator } = useServices();
  const press = useRef<Press | null>(null);
  const active = useRef<ActiveSelection | null>(null);
  const highlighted = useRef<HTMLElement[]>([]);
  const requestId = useRef(0);
  const [popup, setPopup] = useState<SelectionPopupState | null>(null);

  const highlight = (words: HTMLElement[]) => {
    highlighted.current.forEach((word) => word.classList.remove(SELECTED_CLASS));
    words.forEach((word) => word.classList.add(SELECTED_CLASS));
    highlighted.current = words;
  };

  const close = useCallback(() => {
    if (press.current) window.clearTimeout(press.current.timer);
    press.current = null;
    active.current = null;
    requestId.current++;
    highlight([]);
    setPopup(null);
  }, []);

  // Während markiert wird, darf der Text nicht scrollen (nur mit nicht-passivem Listener möglich).
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const blockScroll = (event: TouchEvent) => {
      if (active.current) event.preventDefault();
    };
    element.addEventListener('touchmove', blockScroll, { passive: false });
    return () => element.removeEventListener('touchmove', blockScroll);
  }, [container]);

  const update = (id: number, change: Partial<SelectionPopupState>) => {
    if (id === requestId.current) setPopup((current) => (current ? { ...current, ...change } : current));
  };

  const translateSelection = async (words: HTMLElement[]) => {
    const first = words[0];
    const last = words[words.length - 1];
    if (!first || !last) return;
    const id = ++requestId.current;
    const text = textBetween(first, last);
    setPopup({
      text,
      anchor: anchorOf(first, last),
      dictionary: { status: 'loading' },
      translation: { status: 'translating' },
    });

    dictionary
      .lookupSelection(words.map((word) => word.textContent ?? ''))
      .then((result) => update(id, { dictionary: { status: 'done', result } }))
      .catch(() => update(id, { dictionary: { status: 'unavailable' } }));

    if (!(await translator.isModelStored())) update(id, { translation: { status: 'loading-model' } });
    try {
      const translated = await translator.translate(text);
      update(id, { translation: { status: 'done', text: translated } });
    } catch (error) {
      if (error instanceof TranslationSupersededError) return;
      if (!(error instanceof ModelUnavailableError)) console.error(error);
      update(id, { translation: { status: error instanceof ModelUnavailableError ? 'unavailable' : 'failed' } });
    }
  };

  const begin = (startWord: HTMLElement) => {
    const element = container.current;
    if (!element) return;
    const words = Array.from(element.getElementsByClassName(WORD_CLASS)) as HTMLElement[];
    const start = words.indexOf(startWord);
    if (start < 0) return;
    onBegin();
    requestId.current++;
    setPopup(null);
    active.current = { words, indexOf: new Map(words.map((word, index) => [word, index])), start, end: start };
    highlight([startWord]);
  };

  const onPointerDown = useCallback(
    (event: PointerEvent) => {
      const word = wordAt(event.target);
      if (press.current) window.clearTimeout(press.current.timer);
      press.current = null;
      if (!word) return;
      const timer = window.setTimeout(() => begin(word), LONG_PRESS_MS);
      press.current = { x: event.clientX, y: event.clientY, word, timer };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- begin liest nur Refs und stabile Callbacks
    [],
  );

  const onPointerMove = useCallback((event: PointerEvent) => {
    const selection = active.current;
    if (!selection) {
      const start = press.current;
      if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > MOVE_TOLERANCE_PX) {
        // UC-007: Bewegung vor Ablauf der Wartezeit ist Scrollen, keine Markierung.
        window.clearTimeout(start.timer);
        press.current = null;
      }
      return;
    }
    const word = wordAt(document.elementFromPoint(event.clientX, event.clientY));
    const index = word ? selection.indexOf.get(word) : undefined;
    if (index === undefined) return;
    const limit = MAX_SELECTION_WORDS - 1;
    selection.end = Math.min(selection.start + limit, Math.max(selection.start - limit, index));
    const [from, to] = rangeOf(selection);
    highlight(selection.words.slice(from, to + 1));
  }, []);

  /** Liefert `true`, wenn das Ereignis eine Markierung beendet hat (dann kein Wort-Tippen auswerten). */
  const onPointerUp = useCallback(
    (): boolean => {
      if (press.current) window.clearTimeout(press.current.timer);
      press.current = null;
      const selection = active.current;
      if (!selection) return false;
      active.current = null;
      const [from, to] = rangeOf(selection);
      const words = selection.words.slice(from, to + 1);
      if (words.length === 1 && words[0]) {
        highlight([]);
        onSingleWord(words[0]);
      } else {
        void translateSelection(words);
      }
      return true;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- translateSelection nutzt nur Refs und Services
    [onSingleWord],
  );

  useEffect(() => () => {
    if (press.current) window.clearTimeout(press.current.timer);
  }, []);

  return { popup, close, isSelecting: () => active.current !== null, handlers: { onPointerDown, onPointerMove, onPointerUp } };
}
