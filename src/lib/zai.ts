import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';
import os from 'os';

let zaiInstance: ZAI | null = null;
let zaiInitError: Error | null = null;

/**
 * Initialize and return a singleton ZAI SDK instance.
 *
 * The z-ai-web-dev-sdk loads config from files ONLY (it ignores env vars).
 * The SDK searches for `.z-ai-config` in this order:
 *   1. process.cwd()/.z-ai-config
 *   2. ~/.z-ai-config (os.homedir())
 *   3. /etc/.z-ai-config
 *
 * To make the SDK respect the ZAI_API_KEY env var (the standard way to
 * configure credentials in production deployments like Vercel), we write
 * a `.z-ai-config` file to the user's home directory containing the
 * env-var-provided key. The home dir is used (not process.cwd()) to
 * avoid accidentally committing secrets into the repo.
 *
 * If no env var is set, the SDK falls back to auto-discovery of any
 * pre-existing /etc/.z-ai-config or ~/.z-ai-config file (useful in dev
 * sandboxes where the config is pre-provisioned).
 */
export async function getZAI(): Promise<ZAI> {
  if (zaiInstance) return zaiInstance;
  if (zaiInitError) throw zaiInitError;

  const envKey =
    process.env.ZAI_API_KEY ||
    process.env.SARVAM_API_KEY ||
    process.env.NEXT_PUBLIC_ZAI_API_KEY;

  // If an env-var key is set, materialize a config file from it so the
  // SDK actually uses the user's key (instead of silently falling back
  // to /etc/.z-ai-config, which is what was happening before).
  if (envKey) {
    const configPath = path.join(os.homedir(), '.z-ai-config');
    const config = {
      baseUrl: process.env.ZAI_BASE_URL || 'https://api.z.ai/api/paas/v4',
      apiKey: envKey,
    };
    try {
      fs.writeFileSync(configPath, JSON.stringify(config), { mode: 0o600 });
      console.log('[ZAI] Wrote config to', configPath, 'using env-var API key');
    } catch (err) {
      console.warn('[ZAI] Could not write config file:', err);
      // Continue — the SDK may still find /etc/.z-ai-config
    }
  }

  try {
    zaiInstance = await ZAI.create();
    return zaiInstance;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (envKey) {
      zaiInitError = new Error(
        `Failed to initialize ZAI SDK with ZAI_API_KEY from env var: ${msg}. ` +
          'Verify the key is valid and has available model quota at https://open.bigmodel.cn/usercenter/apikeys.'
      );
    } else {
      zaiInitError = new Error(
        'ZAI_API_KEY environment variable is not set, and no config file was found at /etc/.z-ai-config or ~/.z-ai-config. ' +
          'Please set ZAI_API_KEY in your .env.local file or Vercel environment variables.'
      );
    }
    console.error('[ZAI] Initialization failed:', zaiInitError.message);
    throw zaiInitError;
  }
}
