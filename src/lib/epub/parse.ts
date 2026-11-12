import JSZip from 'jszip';
import { resolvePath } from './paths';
import {
  ChapterUnreadableError,
  DrmProtectedError,
  InvalidEpubError,
  type BookMetadata,
  type SpineItem,
  type TocEntry,
} from './types';

/** Schriftarten-Verschleierung ist kein Kopierschutz – solche Bücher lassen sich lesen. */
const FONT_OBFUSCATION = ['http://www.idpf.org/2008/embedding', 'http://ns.adobe.com/pdf/enc#RC'];

export interface EpubBook {
  metadata: BookMetadata;
  spine: SpineItem[];
  toc: TocEntry[];
  cover?: Blob;
  /** Liefert das Roh-XHTML eines Kapitels. */
  chapterText(index: number): Promise<string>;
  /** Liefert eine eingebettete Datei (z. B. ein Bild) als Blob. */
  resource(path: string): Promise<Blob | undefined>;
}

function parseXml(text: string, what: string): Document {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) {
    throw new InvalidEpubError(`${what} ist fehlerhaft.`);
  }
  return doc;
}

function elements(parent: Document | Element, localName: string): Element[] {
  return Array.from(parent.getElementsByTagNameNS('*', localName));
}

function firstText(doc: Document, localName: string): string {
  return elements(doc, localName)[0]?.textContent?.trim() ?? '';
}

async function readText(zip: JSZip, path: string): Promise<string | undefined> {
  return zip.file(path)?.async('string');
}

async function assertNotDrmProtected(zip: JSZip): Promise<void> {
  const encryption = await readText(zip, 'META-INF/encryption.xml');
  if (!encryption) return;
  const doc = new DOMParser().parseFromString(encryption, 'application/xml');
  const methods = elements(doc, 'EncryptionMethod').map((method) => method.getAttribute('Algorithm') ?? '');
  if (methods.some((algorithm) => !FONT_OBFUSCATION.includes(algorithm))) {
    throw new DrmProtectedError();
  }
}

interface ManifestItem {
  path: string;
  mediaType: string;
  properties: string;
}

function readManifest(opf: Document, opfPath: string): Map<string, ManifestItem> {
  const manifest = new Map<string, ManifestItem>();
  for (const item of elements(opf, 'item')) {
    const id = item.getAttribute('id');
    const href = item.getAttribute('href');
    if (!id || !href) continue;
    manifest.set(id, {
      path: resolvePath(opfPath, href),
      mediaType: item.getAttribute('media-type') ?? '',
      properties: item.getAttribute('properties') ?? '',
    });
  }
  return manifest;
}

function readMetadata(opf: Document): BookMetadata {
  const uniqueId = opf.documentElement.getAttribute('unique-identifier');
  const identifiers = elements(opf, 'identifier');
  const identifier =
    identifiers.find((element) => uniqueId && element.getAttribute('id') === uniqueId) ?? identifiers[0];
  return {
    title: firstText(opf, 'title') || 'Ohne Titel',
    author: elements(opf, 'creator')
      .map((creator) => creator.textContent?.trim() ?? '')
      .filter(Boolean)
      .join(', '),
    language: firstText(opf, 'language'),
    identifier: identifier?.textContent?.trim() ?? '',
  };
}

function coverPath(opf: Document, manifest: Map<string, ManifestItem>): string | undefined {
  for (const item of manifest.values()) {
    if (item.properties.split(/\s+/).includes('cover-image')) return item.path;
  }
  const coverMeta = elements(opf, 'meta').find((meta) => meta.getAttribute('name') === 'cover');
  const coverId = coverMeta?.getAttribute('content');
  return coverId ? manifest.get(coverId)?.path : undefined;
}

function chapterIndexOf(spine: SpineItem[], path: string): number {
  return spine.findIndex((item) => item.path === path);
}

async function readNavToc(zip: JSZip, navPath: string, spine: SpineItem[]): Promise<TocEntry[]> {
  const text = await readText(zip, navPath);
  if (!text) return [];
  const doc = new DOMParser().parseFromString(text, 'application/xhtml+xml');
  const nav =
    elements(doc, 'nav').find((element) => element.getAttributeNS('http://www.idpf.org/2007/ops', 'type') === 'toc') ??
    elements(doc, 'nav')[0];
  if (!nav) return [];
  const entries: TocEntry[] = [];
  for (const link of elements(nav, 'a')) {
    const href = link.getAttribute('href');
    if (!href) continue;
    let depth = 0;
    for (let parent = link.parentElement; parent && parent !== nav; parent = parent.parentElement) {
      if (parent.localName === 'ol') depth++;
    }
    const chapterIndex = chapterIndexOf(spine, resolvePath(navPath, href));
    const title = link.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    if (chapterIndex >= 0 && title) entries.push({ title, chapterIndex, depth: Math.max(0, depth - 1) });
  }
  return entries;
}

async function readNcxToc(zip: JSZip, ncxPath: string, spine: SpineItem[]): Promise<TocEntry[]> {
  const text = await readText(zip, ncxPath);
  if (!text) return [];
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  const entries: TocEntry[] = [];
  for (const point of elements(doc, 'navPoint')) {
    const src = elements(point, 'content')[0]?.getAttribute('src');
    const title = elements(point, 'text')[0]?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    if (!src || !title) continue;
    let depth = 0;
    for (let parent = point.parentElement; parent?.localName === 'navPoint'; parent = parent.parentElement) depth++;
    const chapterIndex = chapterIndexOf(spine, resolvePath(ncxPath, src));
    if (chapterIndex >= 0) entries.push({ title, chapterIndex, depth });
  }
  return entries;
}

/** Öffnet eine EPUB-Datei (UC-001). Wirft `InvalidEpubError` oder `DrmProtectedError`. */
export async function openEpub(data: Blob | ArrayBuffer | Uint8Array): Promise<EpubBook> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(data);
  } catch {
    throw new InvalidEpubError();
  }

  const container = await readText(zip, 'META-INF/container.xml');
  if (!container) throw new InvalidEpubError();
  const opfPath = elements(parseXml(container, 'container.xml'), 'rootfile')[0]?.getAttribute('full-path');
  const opfText = opfPath ? await readText(zip, opfPath) : undefined;
  if (!opfPath || !opfText) throw new InvalidEpubError();

  await assertNotDrmProtected(zip);

  const opf = parseXml(opfText, 'Paketdokument');
  const manifest = readManifest(opf, opfPath);
  const spine: SpineItem[] = elements(opf, 'itemref')
    .filter((ref) => ref.getAttribute('linear') !== 'no')
    .map((ref) => manifest.get(ref.getAttribute('idref') ?? ''))
    .filter((item): item is ManifestItem => item !== undefined)
    .map(({ path, mediaType }) => ({ path, mediaType }));
  if (spine.length === 0) throw new InvalidEpubError('Das Buch enthält keine Kapitel.');

  const navItem = [...manifest.values()].find((item) => item.properties.split(/\s+/).includes('nav'));
  const ncxId = elements(opf, 'spine')[0]?.getAttribute('toc');
  const ncxItem = ncxId ? manifest.get(ncxId) : undefined;
  let toc = navItem ? await readNavToc(zip, navItem.path, spine) : [];
  if (toc.length === 0 && ncxItem) toc = await readNcxToc(zip, ncxItem.path, spine);

  const cover = coverPath(opf, manifest);
  const coverBlob = cover ? await zip.file(cover)?.async('blob') : undefined;

  return {
    metadata: readMetadata(opf),
    spine,
    toc,
    cover: coverBlob,
    async chapterText(index: number): Promise<string> {
      const item = spine[index];
      if (!item) throw new ChapterUnreadableError(`#${index}`);
      const text = await readText(zip, item.path);
      if (text === undefined) throw new ChapterUnreadableError(item.path);
      return text;
    },
    async resource(path: string): Promise<Blob | undefined> {
      return zip.file(path)?.async('blob');
    },
  };
}

