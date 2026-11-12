/** Löst einen relativen Verweis innerhalb des EPUB-Archivs auf (ohne Fragment und Query). */
export function resolvePath(baseFile: string, href: string): string {
  const withoutFragment = href.split('#')[0]?.split('?')[0] ?? '';
  let decoded = withoutFragment;
  try {
    decoded = decodeURIComponent(withoutFragment);
  } catch {
    // Ungültige Prozent-Kodierung: Pfad unverändert verwenden.
  }
  const baseParts = baseFile.split('/').slice(0, -1);
  for (const part of decoded.split('/')) {
    if (part === '..') baseParts.pop();
    else if (part !== '.' && part !== '') baseParts.push(part);
  }
  return baseParts.join('/');
}

export function fragmentOf(href: string): string | undefined {
  const index = href.indexOf('#');
  return index >= 0 ? href.slice(index + 1) : undefined;
}
