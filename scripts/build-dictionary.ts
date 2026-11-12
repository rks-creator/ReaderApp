/**
 * Erzeugt das Offline-Wörterbuch unter public/dict/ aus der Ding-Datei (Deutsch :: Englisch).
 *
 *   npm run build:dict                       Ding herunterladen und umwandeln
 *   npm run build:dict -- --source datei.txt lokale Ding-Datei verwenden
 *   npm run build:dict -- --if-missing       nichts tun, wenn das Wörterbuch schon existiert
 *   npm run build:dict -- --require-ding     abbrechen statt auf das Test-Wörterbuch auszuweichen (CI)
 *
 * Ohne Internet wird das kleine Test-Wörterbuch aus tests/fixtures/ verwendet.
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { parseDing, splitIntoShards } from '../src/lib/dictionary/ding.ts';

const DING_URL = 'https://ftp.tu-chemnitz.de/pub/Local/urz/ding/de-en/de-en.txt.gz';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'dict');
const fixture = join(root, 'tests', 'fixtures', 'ding-sample.txt');

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(name);
const option = (name: string) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};

async function loadSource(): Promise<{ text: string; origin: 'ding' | 'fixture' }> {
  const sourcePath = option('--source') ?? process.env.DING_FILE;
  if (sourcePath) {
    const raw = readFileSync(sourcePath);
    return { text: (sourcePath.endsWith('.gz') ? gunzipSync(raw) : raw).toString('utf8'), origin: 'ding' };
  }
  try {
    const response = await fetch(DING_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const raw = Buffer.from(await response.arrayBuffer());
    return { text: gunzipSync(raw).toString('utf8'), origin: 'ding' };
  } catch (error) {
    if (flag('--require-ding')) throw new Error(`Ding konnte nicht geladen werden: ${String(error)}`, { cause: error });
    console.warn(`⚠ Ding nicht erreichbar (${String(error)}) – verwende Test-Wörterbuch.`);
    return { text: readFileSync(fixture, 'utf8'), origin: 'fixture' };
  }
}

function versionOf(text: string): string {
  return text.match(/^# Version :: (.+)$/m)?.[1]?.trim() ?? 'unbekannt';
}

async function main(): Promise<void> {
  if (flag('--if-missing') && existsSync(join(outDir, 'forms.json'))) return;

  const { text, origin } = await loadSource();
  const started = Date.now();
  const { entries, forms } = parseDing(text);
  const shards = splitIntoShards(entries);

  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  let bytes = 0;
  for (const [name, shard] of Object.entries(shards)) {
    const json = JSON.stringify(shard);
    bytes += json.length;
    writeFileSync(join(outDir, `${name}.json`), json);
  }
  writeFileSync(join(outDir, 'forms.json'), JSON.stringify(forms));
  writeFileSync(
    join(outDir, 'meta.json'),
    JSON.stringify({ source: origin, version: versionOf(text), entries: Object.keys(entries).length }),
  );

  console.log(
    `Wörterbuch (${origin}, Version ${versionOf(text)}): ${Object.keys(entries).length} Einträge, ` +
      `${Object.keys(forms).length} unregelmässige Formen, ${(bytes / 1e6).toFixed(1)} MB, ${Date.now() - started} ms`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
