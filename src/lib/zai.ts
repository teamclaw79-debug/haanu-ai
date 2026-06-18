import ZAI from 'z-ai-web-dev-sdk';

let zaiInstance: ZAI | null = null;
let zaiInitError: Error | null = null;

/**
 * Initialize and return a singleton ZAI SDK instance.
 *
 * The SDK reads its API key from (in priority order):
 *   1. The ZAI_API_KEY environment variable (recommended for production)
 *   2. The SARVAM_API_KEY env var (legacy alias — older deployments)
 *   3. A config file at /etc/.z-ai-config or ~/.z-ai-config (auto-discovered
 *      by the SDK; useful for local dev sandboxes where the config was
 *      pre-provisioned)
 *
 * We expose the env var explicitly via process.env so the SDK picks it up
 * regardless of runtime (Node, Bun, Edge).
 */
export async function getZAI(): Promise<ZAI> {
  if (zaiInstance) return zaiInstance;
  if (zaiInitError) throw zaiInitError;

  // Surface a friendly error if no key is configured, but still try
  // ZAI.create() — the SDK may be able to load config from a file even
  // when the env var isn't set.
  const envKey =
    process.env.ZAI_API_KEY ||
    process.env.SARVAM_API_KEY ||
    process.env.NEXT_PUBLIC_ZAI_API_KEY;

  if (envKey) {
    // Make sure the SDK sees the canonical env var name
    (process.env as Record<string, string>).ZAI_API_KEY = envKey;
  }

  try {
    zaiInstance = await ZAI.create();
    return zaiInstance;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (!envKey) {
      zaiInitError = new Error(
        'ZAI_API_KEY environment variable is not set, and no config file was found at /etc/.z-ai-config or ~/.z-ai-config. ' +
          'Please set ZAI_API_KEY in your .env.local file or Vercel environment variables.'
      );
    } else {
      zaiInitError = new Error(`Failed to initialize ZAI SDK: ${msg}`);
    }
    console.error('[ZAI] Initialization failed:', zaiInitError.message);
    throw zaiInitError;
  }
}
