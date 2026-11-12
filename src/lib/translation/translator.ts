/** UC-007 Stufe 2: maschinelle Übersetzung Englisch → Deutsch, komplett auf dem Gerät. */
export interface SentenceTranslator {
  /** `true`, wenn das Modell bereits auf dem Gerät gespeichert ist (kein Download nötig). */
  isModelStored(): Promise<boolean>;
  translate(text: string): Promise<string>;
}

/** Das Modell ist nicht gespeichert und kann ohne Internet nicht geladen werden (UC-007, E1). */
export class ModelUnavailableError extends Error {
  constructor(cause?: unknown) {
    super('Die Satzübersetzung ist noch nicht auf diesem Gerät.', { cause });
    this.name = 'ModelUnavailableError';
  }
}

export class TranslationFailedError extends Error {
  constructor(cause?: unknown) {
    super('Die Satzübersetzung ist fehlgeschlagen.', { cause });
    this.name = 'TranslationFailedError';
  }
}

/** Eine neuere Anfrage hat diese ersetzt; das Ergebnis wird nicht mehr gebraucht. */
export class TranslationSupersededError extends Error {
  constructor() {
    super('Übersetzung durch neuere Anfrage ersetzt.');
    this.name = 'TranslationSupersededError';
  }
}

interface ModelFile {
  name: string;
  size: number;
  expectedSha256Hash: string;
}
type ModelRegistry = Record<string, Record<string, ModelFile>>;

/** Die Teile von `@browsermt/bergamot-translator/translator.js`, die wir verwenden. */
interface BergamotModule {
  LatencyOptimisedTranslator: new (options: Record<string, unknown>) => {
    translate(request: { from: string; to: string; text: string; html: boolean }): Promise<{ target: { text: string } }>;
  };
  SupersededError: new () => Error;
  CancelledError: new () => Error;
}

const MODEL_CACHE_PART = 'model';
const DOWNLOAD_TIMEOUT_MS = 180_000;

function absolute(baseUrl: string, path: string): string {
  return new URL(`${baseUrl}mt/${path}`, globalThis.location?.href ?? 'http://localhost/').href;
}

/** Bergamot-Engine aus `<base>mt/` (siehe scripts/fetch-translation-model.ts). */
export function createBergamotTranslator(baseUrl: string): SentenceTranslator {
  let engine: Promise<{ module: BergamotModule; translator: InstanceType<BergamotModule['LatencyOptimisedTranslator']> }> | undefined;
  let modelUrl: string | undefined;

  const registry = async (): Promise<ModelRegistry> => {
    const response = await fetch(absolute(baseUrl, 'models.json'));
    if (!response.ok) throw new Error(`models.json: HTTP ${response.status}`);
    const raw = (await response.json()) as ModelRegistry;
    // Die Engine lädt die Dateien über ihre Namen; deshalb absolute URLs eintragen.
    for (const files of Object.values(raw)) {
      for (const file of Object.values(files)) file.name = absolute(baseUrl, file.name);
    }
    modelUrl = raw.ende?.[MODEL_CACHE_PART]?.name;
    return raw;
  };

  const start = async () => {
    const models = await registry();
    const registryUrl = URL.createObjectURL(new Blob([JSON.stringify(models)], { type: 'application/json' }));
    const module = (await import(/* @vite-ignore */ absolute(baseUrl, 'engine/translator.js'))) as BergamotModule;
    const translator = new module.LatencyOptimisedTranslator({
      registryUrl,
      pivotLanguage: null,
      downloadTimeout: DOWNLOAD_TIMEOUT_MS,
    });
    return { module, translator };
  };

  const isModelStored = async (): Promise<boolean> => {
    if (typeof caches === 'undefined') return false;
    try {
      if (!modelUrl) await registry();
      return modelUrl !== undefined && (await caches.match(modelUrl)) !== undefined;
    } catch {
      return false;
    }
  };

  return {
    isModelStored,
    async translate(text: string): Promise<string> {
      try {
        engine ??= start();
        const { module, translator } = await engine;
        try {
          const response = await translator.translate({ from: 'en', to: 'de', text, html: false });
          return response.target.text;
        } catch (error) {
          if (error instanceof module.SupersededError || error instanceof module.CancelledError) {
            throw new TranslationSupersededError();
          }
          throw error;
        }
      } catch (error) {
        if (error instanceof TranslationSupersededError) throw error;
        engine = undefined;
        const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
        if (offline && !(await isModelStored())) throw new ModelUnavailableError(error);
        throw new TranslationFailedError(error);
      }
    },
  };
}
