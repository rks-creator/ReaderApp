/**
 * Traceability:
 *   UC: UC-001 (Buch importieren), UC-003 (Buch lesen)
 *   TCs: TC-001, TC-002, TC-003, TC-011
 */
import { describe, expect, it } from 'vitest';
import { makeEpub } from '../../../tests/fixtures/makeEpub';
import { openEpub } from './parse';
import { sanitizeChapter } from './sanitize';
import { ChapterUnreadableError, DrmProtectedError, InvalidEpubError } from './types';
import { followingWords, wrapWords } from './wrapWords';

describe('EPUB öffnen', () => {
  it('TC-001 – liest Metadaten, Kapitel und Inhaltsverzeichnis (EPUB 3)', async () => {
    const book = await openEpub(await makeEpub());
    expect(book.metadata).toEqual({
      title: "Alice's Adventures in Wonderland",
      author: 'Lewis Carroll',
      language: 'en',
      identifier: 'urn:test:alice',
    });
    expect(book.spine).toHaveLength(5);
    expect(book.toc.map((entry) => entry.title)).toEqual(['Chapter I', 'Chapter II', 'Chapter III', 'Chapter IV', 'Chapter V']);
    expect(book.toc[4]?.chapterIndex).toBe(4);
    expect(await book.chapterText(1)).toContain('Curiouser and curiouser!');
  });

  it('TC-001 – liest das Inhaltsverzeichnis aus einer NCX-Datei (EPUB 2)', async () => {
    const book = await openEpub(await makeEpub({ ncx: true }));
    expect(book.toc.map((entry) => entry.chapterIndex)).toEqual([0, 1, 2, 3, 4]);
  });

  it('TC-002 – lehnt Dateien ab, die kein EPUB sind', async () => {
    await expect(openEpub(new TextEncoder().encode('kein zip'))).rejects.toBeInstanceOf(InvalidEpubError);
  });

  it('TC-003 – erkennt kopiergeschützte Bücher', async () => {
    await expect(openEpub(await makeEpub({ drm: true }))).rejects.toBeInstanceOf(DrmProtectedError);
  });

  it('UC-003 E1 – meldet ein fehlendes Kapitel', async () => {
    const book = await openEpub(await makeEpub({ missingChapter: 2 }));
    await expect(book.chapterText(2)).rejects.toBeInstanceOf(ChapterUnreadableError);
  });
});

describe('Kapitel bereinigen', () => {
  const resolve = (path: string) => (path === 'OEBPS/images/a.png' ? 'blob:local-image' : undefined);

  it('TC-011 – entfernt Skripte, Event-Handler, Styles und externe Ressourcen', () => {
    const xhtml = `<html xmlns="http://www.w3.org/1999/xhtml"><head><style>p{}</style></head><body>
      <p onclick="alert(1)" style="color:red">Text</p><script>alert(2)</script>
      <img src="../images/a.png" onerror="alert(3)"/><img src="https://evil.example/x.png"/>
      <a href="https://evil.example">Link</a><iframe src="https://evil.example"></iframe></body></html>`;
    const html = sanitizeChapter(xhtml, 'OEBPS/text/ch1.xhtml', resolve);
    expect(html).not.toMatch(/script|onclick|onerror|style|iframe|evil\.example/);
    expect(html).toContain('src="blob:local-image"');
    expect(html).toContain('Link');
  });

  it('UC-003 E1 – meldet ein leeres Kapitel als nicht lesbar', () => {
    expect(() => sanitizeChapter('<html><body>   </body></html>', 'x.xhtml', resolve)).toThrow(ChapterUnreadableError);
  });
});

describe('Wörter antippbar machen', () => {
  it('UC-004 – legt jedes Wort in ein eigenes Element, Satzzeichen bleiben Text', () => {
    const container = document.createElement('div');
    container.innerHTML = '<p>Alice was <em>very</em> tired, wasn’t she?</p>';
    wrapWords(container);
    const words = Array.from(container.querySelectorAll('span.w')).map((span) => span.textContent);
    expect(words).toEqual(['Alice', 'was', 'very', 'tired', 'wasn’t', 'she']);
    expect(container.textContent).toBe('Alice was very tired, wasn’t she?');
  });

  it('UC-004 A2 – liefert die folgenden Wörter für Wendungen', () => {
    const container = document.createElement('div');
    container.innerHTML = '<p>Never give up the dream.</p>';
    wrapWords(container);
    const give = container.querySelectorAll<HTMLElement>('span.w')[1]!;
    expect(followingWords(give, container, 2)).toEqual(['up', 'the']);
  });
});
