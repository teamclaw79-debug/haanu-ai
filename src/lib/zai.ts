import ZAI from 'z-ai-web-dev-sdk';

let zaiInstance: ZAI | null = null;

/**
 * Initialize and return a singleton ZAI SDK instance.
 *
 * The SDK reads its API key from the `ZAI_API_KEY` environment variable
 * automatically. We fall back to the legacy `SARVAM_API_KEY` env var for
 * backwards compatibility with existing deployments, but the recommended
 * variable is `ZAI_API_KEY`.
 */
export async function getZAI(): Promise<ZAI> {
  if (zaiInstance) return zaiInstance;

  // The SDK picks up ZAI_API_KEY automatically. We only validate here so the
  // error message is friendly if the user forgot to set it.
  const apiKey =
    process.env.ZAI_API_KEY ||
    process.env.SARVAM_API_KEY ||
    process.env.NEXT_PUBLIC_ZAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      'ZAI_API_KEY environment variable is not set. Please add it to your Vercel environment variables or .env.local file.'
    );
  }

  try {
    // The SDK reads ZAI_API_KEY from process.env internally; create() handles
    // configuration. We expose the key explicitly via env so the SDK can pick
    // it up regardless of runtime (Node, Bun, Edge).
    (process.env as Record<string, string>).ZAI_API_KEY = apiKey;
    zaiInstance = await ZAI.create();
    return zaiInstance;
  } catch (error) {
    console.error('[ZAI] Failed to initialize ZAI SDK:', error);
    throw error;
  }
}
