/**
 * Unified chat backend with automatic fallback.
 *
 * Primary: Gemini (gemini-2.0-flash) — preferred for conversational quality.
 * Fallback: Z.AI via z-ai-web-dev-sdk — used when Gemini returns:
 *   - 429 RESOURCE_EXHAUSTED (quota exhausted, common with free-tier keys)
 *   - 400 FAILED_PRECONDITION (region not supported)
 *   - Any other transient or auth error
 *
 * The fallback is critical because:
 *   - Gemini free-tier quotas are aggressive and per-project
 *   - Gemini API is region-restricted (India is not supported without billing)
 *   - Z.AI's config at /etc/.z-ai-config or env ZAI_API_KEY always works
 *
 * Both backends accept the same OpenAI-style message format
 * ({role, content}[]) so callers don't need to care which one runs.
 */

import { geminiChat, type ChatMessage } from './gemini';
import { getZAI } from './zai';

export interface ChatOptions {
  temperature?: number;
  maxOutputTokens?: number;
  /** Force using a specific backend — skips fallback. */
  forceBackend?: 'gemini' | 'zai';
}

interface ChatResult {
  text: string;
  backend: 'gemini' | 'zai';
  fallbackReason?: string;
}

/**
 * Should we fall back to Z.AI for this Gemini error?
 *
 * Returns the fallback reason string if yes, or null if the error is
 * non-recoverable (in which case the caller should propagate it).
 */
function shouldFallback(err: unknown): string | null {
  if (!(err instanceof Error)) return 'unknown error';
  const msg = err.message.toLowerCase();

  // Quota exhausted (Gemini free-tier)
  if (msg.includes('429') || msg.includes('resource_exhausted') || msg.includes('quota')) {
    return 'Gemini quota exhausted';
  }
  // Region not supported
  if (msg.includes('400') && msg.includes('location is not supported')) {
    return 'Gemini region not supported';
  }
  if (msg.includes('failed_precondition')) {
    return 'Gemini precondition failed';
  }
  // Invalid API key — user hasn't set GEMINI_API_KEY yet
  if (msg.includes('gemini_api_key') || msg.includes('environment variable is not set')) {
    return 'GEMINI_API_KEY not configured';
  }
  // Generic API error (network, 5xx, etc.) — try Z.AI
  if (msg.includes('gemini api error')) {
    return 'Gemini API error';
  }
  // Safety filters are content-related, not infrastructure — don't fallback
  if (msg.includes('safety filters') || msg.includes('recitation filters')) {
    return null;
  }
  // Default: fallback on any other error to maximize uptime
  return `Gemini error: ${err.message}`;
}

/**
 * Run a chat completion with automatic Gemini → Z.AI fallback.
 *
 * @param messages  OpenAI-style messages, with role in {system, user, assistant}.
 * @param options   Optional tuning. forceBackend skips the fallback chain.
 */
export async function chatWithFallback(
  messages: ChatMessage[],
  options: ChatOptions = {}
): Promise<ChatResult> {
  // ── Try Gemini first (unless explicitly skipped) ──────────────────────
  if (options.forceBackend !== 'zai') {
    try {
      const text = await geminiChat(messages, {
        model: 'gemini-2.0-flash',
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxOutputTokens ?? 2048,
      });
      return { text, backend: 'gemini' };
    } catch (err) {
      const reason = shouldFallback(err);
      if (reason === null) {
        // Non-recoverable (safety/recitation) — propagate
        throw err;
      }
      if (options.forceBackend === 'gemini') {
        // User explicitly wanted Gemini — propagate
        throw err;
      }
      console.warn(`[chatWithFallback] Gemini failed (${reason}); falling back to Z.AI`);

      // ── Fall back to Z.AI ────────────────────────────────────────────
      try {
        const zai = await getZAI();
        const completion = await zai.chat.completions.create({
          messages,
          stream: false,
          thinking: { type: 'disabled' },
        });
        const text =
          completion.choices?.[0]?.message?.content ??
          'I apologize, but I was unable to generate a response. Please try again.';
        return { text, backend: 'zai', fallbackReason: reason };
      } catch (fallbackErr) {
        const fbMsg = fallbackErr instanceof Error ? fallbackErr.message : 'unknown error';
        throw new Error(
          `Both backends failed. Gemini: ${reason}. Z.AI: ${fbMsg}. ` +
            `Set GEMINI_API_KEY (with billing enabled) or ZAI_API_KEY to fix.`
        );
      }
    }
  }

  // ── Z.AI only (forceBackend === 'zai') ────────────────────────────────
  const zai = await getZAI();
  const completion = await zai.chat.completions.create({
    messages,
    stream: false,
    thinking: { type: 'disabled' },
  });
  const text =
    completion.choices?.[0]?.message?.content ??
    'I apologize, but I was unable to generate a response. Please try again.';
  return { text, backend: 'zai' };
}
