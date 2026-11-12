import DOMPurify from 'dompurify';
import { resolvePath } from './paths';
import { ChapterUnreadableError } from './types';

/** Liefert für einen Pfad im Archiv eine lokale URL (blob:) oder `undefined`. */
export type ResourceResolver = (path: string) => string | undefined;

const FORBIDDEN_TAGS = [
  'script', 'style', 'link', 'meta', 'base', 'iframe', 'frame', 'object', 'embed', 'form', 'input',
  'button', 'select', 'textarea', 'video', 'audio', 'source', 'track', 'foreignObject',
];
const FORBIDDEN_ATTRIBUTES = ['style', 'class', 'srcset', 'background', 'poster', 'formaction'];
const LOCAL_URL = /^(blob:|data:image\/)/i;

function parseChapter(xhtml: string): Document {
  const strict = new DOMParser().parseFromString(xhtml, 'application/xhtml+xml');
  if (strict.getElementsByTagName('parsererror').length === 0 && strict.body) return strict;
  // Viele EPUBs enthalten kleine XHTML-Fehler; der HTML-Parser ist nachsichtiger.
  return new DOMParser().parseFromString(xhtml, 'text/html');
}

function rewriteResources(body: Element, chapterPath: string, resolve: ResourceResolver): void {
  for (const image of Array.from(body.querySelectorAll('img'))) {
    const src = image.getAttribute('src');
    const local = src ? resolve(resolvePath(chapterPath, src)) : undefined;
    if (local) image.setAttribute('src', local);
    else image.remove();
  }
  for (const image of Array.from(body.getElementsByTagNameNS('http://www.w3.org/2000/svg', 'image'))) {
    const href = image.getAttribute('href') ?? image.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
    const local = href ? resolve(resolvePath(chapterPath, href)) : undefined;
    image.removeAttributeNS('http://www.w3.org/1999/xlink', 'href');
    if (local) image.setAttribute('href', local);
    else image.remove();
  }
  // Querverweise im Buch werden nicht unterstützt; Text bleibt, Link wird entfernt.
  for (const link of Array.from(body.querySelectorAll('a[href]'))) link.removeAttribute('href');
}

/**
 * UC-003: Bereinigt das XHTML eines Kapitels. Skripte, Event-Handler, Formulare, Styles und
 * alle nicht lokalen Ressourcen werden entfernt. Liefert das HTML des `<body>`.
 */
export function sanitizeChapter(xhtml: string, chapterPath: string, resolve: ResourceResolver): string {
  const doc = parseChapter(xhtml);
  const body = doc.body ?? doc.getElementsByTagName('body')[0];
  if (!body) throw new ChapterUnreadableError(chapterPath);
  rewriteResources(body, chapterPath, resolve);

  const html = DOMPurify.sanitize(body.innerHTML, {
    FORBID_TAGS: FORBIDDEN_TAGS,
    FORBID_ATTR: FORBIDDEN_ATTRIBUTES,
    ALLOW_DATA_ATTR: false,
    ALLOWED_URI_REGEXP: LOCAL_URL,
  });
  if (html.replace(/<[^>]*>/g, '').trim().length === 0 && !/<(img|svg)/i.test(html)) {
    throw new ChapterUnreadableError(chapterPath);
  }
  return html;
}
