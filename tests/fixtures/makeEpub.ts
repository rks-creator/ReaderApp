import JSZip from 'jszip';

export interface FixtureChapter {
  title: string;
  body: string;
}

export interface FixtureOptions {
  title?: string;
  author?: string;
  identifier?: string;
  chapters?: FixtureChapter[];
  /** Fügt eine encryption.xml mit echtem Kopierschutz hinzu. */
  drm?: boolean;
  /** Lässt die Datei des angegebenen Kapitels im Archiv weg. */
  missingChapter?: number;
  /** Inhaltsverzeichnis als EPUB-2-NCX statt EPUB-3-Navigation. */
  ncx?: boolean;
}

const paragraph = (text: string) => `<p>${text}</p>`;

export const ALICE_CHAPTERS: FixtureChapter[] = [
  {
    title: 'Chapter I',
    body: [
      'Alice was beginning to get very tired of sitting by her sister on the bank.',
      'Once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it.',
      ...Array.from({ length: 40 }, (_, i) => `Line ${i + 1}: the white rabbit went past the house quickly, looking at his watch.`),
    ].map(paragraph).join('\n'),
  },
  { title: 'Chapter II', body: paragraph('Curiouser and curiouser! cried Alice.') },
  { title: 'Chapter III', body: paragraph('They were indeed a queer-looking party that assembled on the bank.') },
  { title: 'Chapter IV', body: paragraph('It was the White Rabbit, trotting slowly back again.') },
  { title: 'Chapter V', body: paragraph('The Caterpillar and Alice looked at each other for some time in silence.') },
];

function chapterXhtml({ title, body }: FixtureChapter): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml"><head><title>${title}</title></head>
<body><h2>${title}</h2>${body}</body></html>`;
}

/** Baut eine EPUB-Datei für Tests – ohne Binärdateien im Repository. */
export async function makeEpub(options: FixtureOptions = {}): Promise<Uint8Array> {
  const {
    title = "Alice's Adventures in Wonderland",
    author = 'Lewis Carroll',
    identifier = 'urn:test:alice',
    chapters = ALICE_CHAPTERS,
  } = options;
  const zip = new JSZip();
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
  zip.file(
    'META-INF/container.xml',
    `<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
<rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`,
  );
  if (options.drm) {
    zip.file(
      'META-INF/encryption.xml',
      `<?xml version="1.0"?><encryption xmlns="urn:oasis:names:tc:opendocument:xmlns:container" xmlns:enc="http://www.w3.org/2001/04/xmlenc#">
<enc:EncryptedData><enc:EncryptionMethod Algorithm="http://www.w3.org/2001/04/xmlenc#aes128-cbc"/>
<enc:CipherData><enc:CipherReference URI="OEBPS/ch1.xhtml"/></enc:CipherData></enc:EncryptedData></encryption>`,
    );
  }

  const items = chapters
    .map((_, i) => `<item id="ch${i + 1}" href="text/ch${i + 1}.xhtml" media-type="application/xhtml+xml"/>`)
    .join('');
  const itemrefs = chapters.map((_, i) => `<itemref idref="ch${i + 1}"/>`).join('');
  const navItem = options.ncx
    ? '<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>'
    : '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>';

  zip.file(
    'OEBPS/content.opf',
    `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:identifier id="bookid">${identifier}</dc:identifier><dc:title>${title}</dc:title>
<dc:creator>${author}</dc:creator><dc:language>en</dc:language></metadata>
<manifest>${navItem}${items}</manifest>
<spine${options.ncx ? ' toc="ncx"' : ''}>${itemrefs}</spine></package>`,
  );

  if (options.ncx) {
    const points = chapters
      .map((c, i) => `<navPoint id="p${i}"><navLabel><text>${c.title}</text></navLabel><content src="text/ch${i + 1}.xhtml"/></navPoint>`)
      .join('');
    zip.file('OEBPS/toc.ncx', `<?xml version="1.0"?><ncx xmlns="http://www.daisy.org/z3986/2005/ncx/"><navMap>${points}</navMap></ncx>`);
  } else {
    const links = chapters.map((c, i) => `<li><a href="text/ch${i + 1}.xhtml">${c.title}</a></li>`).join('');
    zip.file(
      'OEBPS/nav.xhtml',
      `<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<body><nav epub:type="toc"><ol>${links}</ol></nav></body></html>`,
    );
  }

  chapters.forEach((chapter, i) => {
    if (i !== options.missingChapter) zip.file(`OEBPS/text/ch${i + 1}.xhtml`, chapterXhtml(chapter));
  });
  return zip.generateAsync({ type: 'uint8array' });
}
