import { useCallback, useRef, useState, type PointerEvent } from 'react';
import { useServices } from '../../app/services';
import { DictionaryUnavailableError } from '../../lib/dictionary/lookup';
import { followingWords, WORD_CLASS } from '../../lib/epub/wrapWords';
import type { PopupState } from './TranslationPopup';

/** UC-004/UC-003: kurzes Tippen übersetzt, Scrollen nicht. */
export const TAP_MAX_MS = 500;
export const TAP_MAX_MOVE_PX = 10;
const ACTIVE_CLASS = 'w--active';
const PHRASE_LOOKAHEAD = 3;

interface Tap {
  x: number;
  y: number;
  time: number;
}

export function useWordTap(container: React.RefObject<HTMLElement | null>) {
  const { dictionary } = useServices();
  const tapStart = useRef<Tap | null>(null);
  const activeWord = useRef<HTMLElement | null>(null);
  const requestId = useRef(0);
  const [popup, setPopup] = useState<{ state: PopupState; anchor: DOMRect } | null>(null);

  const close = useCallback(() => {
    activeWord.current?.classList.remove(ACTIVE_CLASS);
    activeWord.current = null;
    requestId.current++;
    setPopup(null);
  }, []);

  const translate = useCallback(
    async (word: HTMLElement) => {
      activeWord.current?.classList.remove(ACTIVE_CLASS);
      word.classList.add(ACTIVE_CLASS);
      activeWord.current = word;
      const id = ++requestId.current;
      const text = word.textContent ?? '';
      const anchor = word.getBoundingClientRect();
      setPopup({ state: { status: 'loading', word: text }, anchor });
      const next = container.current ? followingWords(word, container.current, PHRASE_LOOKAHEAD) : [];
      try {
        const result = await dictionary.lookup(text, next);
        if (id === requestId.current) setPopup({ state: { status: 'done', result }, anchor });
      } catch (error) {
        if (id !== requestId.current) return;
        if (!(error instanceof DictionaryUnavailableError)) console.error(error);
        setPopup({ state: { status: 'unavailable', word: text }, anchor });
      }
    },
    [container, dictionary],
  );

  const onPointerDown = useCallback((event: PointerEvent) => {
    tapStart.current = { x: event.clientX, y: event.clientY, time: event.timeStamp };
  }, []);

  const onPointerCancel = useCallback(() => {
    tapStart.current = null;
  }, []);

  const onPointerUp = useCallback(
    (event: PointerEvent) => {
      const start = tapStart.current;
      tapStart.current = null;
      if (!start) return;
      const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y);
      if (moved > TAP_MAX_MOVE_PX || event.timeStamp - start.time > TAP_MAX_MS) return;

      const target = event.target instanceof Element ? event.target.closest<HTMLElement>(`.${WORD_CLASS}`) : null;
      if (target && target !== activeWord.current) void translate(target);
      else close();
    },
    [translate, close],
  );

  return { popup, close, handlers: { onPointerDown, onPointerUp, onPointerCancel } };
}
