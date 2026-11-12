/**
 * UC-007: Legt die Übersetzungs-Engine (Bergamot) und das Modell Englisch → Deutsch unter public/mt/ ab.
 *
 *   npm run build:mt                  Modell herunterladen (Prüfsummen werden kontrolliert)
 *   npm run build:mt -- --if-missing  nichts tun, wenn das Modell schon vorhanden ist
 *   npm run build:mt -- --require     abbrechen statt ohne Satzübersetzung weiterzumachen (CI)
 *
 * Ohne Internet wird nur die Engine kopiert; die App meldet dann, dass die Satzübersetzung fehlt.
 */
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const MODEL_BASE = 'https://bergamot.s3.amazonaws.com/models/ende';

/** Dateien und Prüfsummen aus der offiziellen Bergamot-Registry (index.json, Modell „ende“). */
export const MODEL_FILES = {
  model: {
    name: 'model.ende.intgemm.alphas.bin',
    size: 17140835,
    expectedSha256Hash: 'b3e980d6602ab0bdfe8d9315cb5fc282a16bb1c8dccf38e70945c584551c4318',
  },
  lex: {
    name: 'lex.50.50.ende.s2t.bin',
    size: 3943644,
    expectedSha256Hash: 'f03eb8245042feb7a5800815b8d0dc215d7a60691632405b65c461d250cedbe6',
  },
  vocab: {
    name: 'vocab.deen.spm',
    size: 784269,
    expectedSha256Hash: '417668f2ed297970febafb5b079a9d5ebc4ed0b3550ac8386d67a90473a09bd7',
  },
} as const;

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'mt');
const engineSource = join(root, 'node_modules', '@browsermt', 'bergamot-translator');
const ENGINE_FILES = [
  'translator.js',
  'worker/translator-worker.js',
  'worker/bergamot-translator-worker.js',
  'worker/bergamot-translator-worker.wasm',
];

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(name);

function sha256(data: Uint8Array): string {
  return createHash('sha256').update(data).digest('hex');
}

function copyEngine(): void {
  for (const file of ENGINE_FILES) {
    const target = join(outDir, 'engine', file);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(join(engineSource, file), target);
  }
}

async function downloadModel(): Promise<void> {
  mkdirSync(join(outDir, 'ende'), { recursive: true });
  for (const file of Object.values(MODEL_FILES)) {
    const target = join(outDir, 'ende', file.name);
    if (existsSync(target) && sha256(readFileSync(target)) === file.expectedSha256Hash) continue;
    const response = await fetch(`${MODEL_BASE}/${file.name}`);
    if (!response.ok) throw new Error(`HTTP ${response.status} für ${file.name}`);
    const data = new Uint8Array(await response.arrayBuffer());
    if (sha256(data) !== file.expectedSha256Hash) throw new Error(`Prüfsumme von ${file.name} stimmt nicht`);
    writeFileSync(target, data);
  }
  // Pfade relativ zu mt/; die App macht daraus zur Laufzeit absolute URLs.
  const files = Object.fromEntries(
    Object.entries(MODEL_FILES).map(([part, file]) => [part, { ...file, name: `ende/${file.name}` }]),
  );
  writeFileSync(join(outDir, 'models.json'), JSON.stringify({ ende: files }));
}

async function main(): Promise<void> {
  if (flag('--if-missing') && existsSync(join(outDir, 'models.json'))) return;
  copyEngine();
  try {
    await downloadModel();
    console.log('Satzübersetzung: Engine und Modell Englisch → Deutsch bereit.');
  } catch (error) {
    if (flag('--require')) throw new Error(`Modell konnte nicht geladen werden: ${String(error)}`, { cause: error });
    console.warn(`⚠ Modell nicht verfügbar (${String(error)}) – App ohne Satzübersetzung.`);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
