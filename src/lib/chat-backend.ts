/**
 * Unified chat backend with automatic fallback.
 *
 * Tries backends in this order:
 *   1. OpenRouter (free models — 100% free forever, no billing required)
 *   2. Gemini (gemini-2.0-flash — preferred for quality if you have billing)
 *   3. Z.AI (via z-ai-web-dev-sdk — uses /etc/.z-ai-config or ZAI_API_KEY)
 *
 * Why OpenRouter is first:
 *   - 100% free forever (subject to rate limits, no credit card needed)
 *   - Works in all regions (unlike Gemini which is region-blocked)
 *   - Has working free-tier quota (unlike the user's current Gemini key)
 *
 * Why Gemini is second:
 *   - Higher quality output when it works
 *   - User has it configured already
 *
 * Why Z.AI is last:
 *   - Requires pre-provisioned config file (sandbox) or paid quota (prod)
 *   - Useful as a last-resort fallback in sandbox environments
 *
 * Both OpenRouter and Gemini accept the same OpenAI-style message format
 * ({role, content}[]) so callers don't need to care which one runs.
 */

import { openRouterChat } from './openrouter';
import { geminiChat, type ChatMessage } from './gemini';
import { getZAI } from './zai';

export interface ChatOptions {
  temperature?: number;
  maxOutputTokens?: number;
  /** Force using a specific backend — skips fallback. */
  forceBackend?: 'openrouter' | 'gemini' | 'zai';
}

interface ChatResult {
  text: string;
  backend: 'openrouter' | 'gemini' | 'zai';
  model?: string;
  fallbackReason?: string;
}

/**
 * Should we fall back from Gemini to the next backend for this error?
 */
function shouldFallbackFromGemini(err: unknown): string | null {
  if (!(err instanceof Error)) return 'unknown error';
  const msg = err.message.toLowerCase();
  if (msg.includes('429') || msg.includes('resource_exhausted') || msg.includes('quota')) {
    return 'Gemini quota exhausted';
  }
  if (msg.includes('400') && msg.includes('location is not supported')) {
    return 'Gemini region not supported';
  }
  if (msg.includes('failed_precondition')) {
    return 'Gemini precondition failed';
  }
  if (msg.includes('gemini_api_key') || msg.includes('environment variable is not set')) {
    return 'GEMINI_API_KEY not configured';
  }
  if (msg.includes('gemini api error')) {
    return 'Gemini API error';
  }
  // Safety filters are content-related, not infrastructure — don't fallback
  if (msg.includes('safety filters') || msg.includes('recitation filters')) {
    return null;
  }
  return `Gemini error: ${err.message}`;
}

/**
 * Should we fall back from OpenRouter to the next backend for this error?
 */
function shouldFallbackFromOpenRouter(err: unknown): string | null {
  if (!(err instanceof Error)) return 'unknown error';
  const msg = err.message.toLowerCase();
  // All free models rate-limited
  if (msg.includes('rate-limited') || msg.includes('all openrouter models failed')) {
    return 'All OpenRouter free models rate-limited';
  }
  if (msg.includes('openrouter_api_key') || msg.includes('environment variable is not set')) {
    return 'OPENROUTER_API_KEY not configured';
  }
  if (msg.includes('openrouter api error')) {
    return 'OpenRouter API error';
  }
  // Content filter — don't fallback, the request itself is the problem
  if (msg.includes('content filters')) {
    return null;
  }
  return `OpenRouter error: ${err.message}`;
}

/**
 * Run a chat completion with automatic multi-backend fallback.
 *
 * @param messages  OpenAI-style messages, role in {system, user, assistant}.
 * @param options   Optional tuning. forceBackend skips the fallback chain.
 */
export async function chatWithFallback(
  messages: ChatMessage[],
  options: ChatOptions = {}
): Promise<ChatResult> {
  // ── Try OpenRouter first (free, region-agnostic, no billing needed) ──
  if (options.forceBackend !== 'gemini' && options.forceBackend !== 'zai') {
    try {
      const result = await openRouterChat(messages, {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxOutputTokens ?? 2048,
      });
      return { text: result.text, backend: 'openrouter', model: result.model };
    } catch (err) {
      const reason = shouldFallbackFromOpenRouter(err);
      if (reason === null) throw err; // Non-recoverable (content filter)
      if (options.forceBackend === 'openrouter') throw err;
      console.warn(`[chatWithFallback] OpenRouter failed (${reason}); trying Gemini`);

      // ── Try Gemini ────────────────────────────────────────────────
      try {
        const text = await geminiChat(messages, {
          model: 'gemini-2.0-flash',
          temperature: options.temperature ?? 0.7,
          maxOutputTokens: options.maxOutputTokens ?? 2048,
        });
        return {
          text,
          backend: 'gemini',
          fallbackReason: `OpenRouter: ${reason}`,
        };
      } catch (geminiErr) {
        const geminiReason = shouldFallbackFromGemini(geminiErr);
        if (geminiReason === null) throw geminiErr;
        console.warn(
          `[chatWithFallback] Gemini also failed (${geminiReason}); falling back to Z.AI`
        );

        // ── Last resort: Z.AI ──────────────────────────────────────
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
          return {
            text,
            backend: 'zai',
            fallbackReason: `OpenRouter: ${reason}; Gemini: ${geminiReason}`,
          };
        } catch (zaiErr) {
          const zaiMsg = zaiErr instanceof Error ? zaiErr.message : 'unknown error';
          throw new Error(
            `All backends failed. OpenRouter: ${reason}. Gemini: ${geminiReason}. Z.AI: ${zaiMsg}. ` +
              'Set OPENROUTER_API_KEY (free at https://openrouter.ai/keys) for reliable free chat.'
          );
        }
      }
    }
  }

  // ── Gemini forced ─────────────────────────────────────────────────
  if (options.forceBackend === 'gemini') {
    const text = await geminiChat(messages, {
      model: 'gemini-2.0-flash',
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.maxOutputTokens ?? 2048,
    });
    return { text, backend: 'gemini' };
  }

  // ── Z.AI forced ───────────────────────────────────────────────────
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
