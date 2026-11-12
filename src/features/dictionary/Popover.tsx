import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

const GAP = 8;
const MARGIN = 12;

interface Props {
  /** Position des angetippten bzw. markierten Textes im Viewport. */
  anchor: DOMRect;
  label: string;
  /** Ändert sich der Inhalt, wird neu positioniert. */
  contentKey: unknown;
  className?: string;
  children: ReactNode;
}

/** Schwebendes Fenster direkt beim Text: darunter, sonst darüber; immer im sichtbaren Bereich. */
export function Popover({ anchor, label, contentKey, className = '', children }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: anchor.bottom + GAP, left: anchor.left });

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const { width, height } = element.getBoundingClientRect();
    const fitsBelow = anchor.bottom + GAP + height <= window.innerHeight - MARGIN;
    const top = fitsBelow ? anchor.bottom + GAP : Math.max(MARGIN, anchor.top - GAP - height);
    const left = Math.min(Math.max(MARGIN, anchor.left + anchor.width / 2 - width / 2), window.innerWidth - width - MARGIN);
    setPosition({ top, left });
  }, [anchor, contentKey]);

  return (
    <div ref={ref} className={`popup ${className}`} role="dialog" aria-label={label} style={position}>
      {children}
    </div>
  );
}
