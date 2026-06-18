/**
 * OpenRouter API client (fetch-based, no extra SDK dependency).
 *
 * OpenRouter is an OpenAI-compatible aggregator that routes requests to
 * many providers (OpenAI, Anthropic, Meta, Google, NVIDIA, etc.) under a
 * single API key. It offers a curated set of ":free" models that are
 * 100% free forever (subject to rate limits).
 *
 * API docs: https://openrouter.ai/docs
 * Free models list: https://openrouter.ai/models?q=free
 *
 * Auth:
 *   - Set OPENROUTER_API_KEY in your environment
 *   - Send as: Authorization: Bearer <key>
 *
 * Recommended headers (optional but OpenRouter asks for them):
 *   - HTTP-Referer: your app's URL (helps OpenRouter attribute traffic)
 *   - X-Title: app name (shown in OpenRouter dashboard)
 */

const API_BASE = 'https://openrouter.ai/api/v1';

// Free models, in order of preference. We fall back through this list
// if the primary model is rate-limited (HTTP 429) or returns a provider
// error. All models here are 100% free forever on OpenRouter's free tier.
//
// Selection rationale (as of 2026-06):
//   1. openai/gpt-oss-120b:free — large 120B model, strong reasoning
//   2. nvidia/nemotron-3-nano-30b-a3b:free — 30B, fast and reliable
//   3. openai/gpt-oss-20b:free — smaller variant, last-resort fallback
const FREE_MODELS = [
  'openai/gpt-oss-120b:free',
  'nvidia/nemotron-3-nano-30b-a3b:free',
  'openai/gpt-oss-20b:free',
];

// App identification headers (OpenRouter uses these for analytics).
const APP_TITLE = process.env.OPENROUTER_APP_TITLE || 'Haanu AI Agent';
const APP_REFERER =
  process.env.OPENROUTER_APP_REFERER || 'https://github.com/teamclaw79-debug/haanu-ai';

let cachedApiKey: string | null = null;

function getApiKey(): string {
  if (cachedApiKey) return cachedApiKey;
  const apiKey =
    process.env.OPENROUTER_API_KEY ||
    process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error(
      'OPENROUTER_API_KEY environment variable is not set. Get a free key at https://openrouter.ai/keys and add it to .env.local.'
    );
  }
  cachedApiKey = apiKey;
  return apiKey;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenRouterChatOptions {
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  /** When true (default), automatically try fallback models on 429/provider errors. */
  enableFallback?: boolean;
}

interface OpenRouterResponse {
  choices: Array<{
    message: { role: string; content: string };
    finish_reason?: string;
  }>;
  model?: string;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

/**
 * Run a chat completion against OpenRouter with automatic model fallback.
 *
 * Tries each model in FREE_MODELS in order until one succeeds. Common
 * failure modes that trigger fallback:
 *   - HTTP 429 (rate limit on this model)
 *   - HTTP 503 / "Provider returned error" (upstream provider down)
 *   - 5xx server errors
 *
 * Auth errors (401) and bad-request errors (400) do NOT trigger fallback —
 * those indicate a config problem the user needs to fix.
 */
export async function openRouterChat(
  messages: ChatMessage[],
  options: OpenRouterChatOptions = {}
): Promise<{ text: string; model: string }> {
  const apiKey = getApiKey();
  const enableFallback = options.enableFallback ?? true;
  const modelList = options.model
    ? [options.model, ...FREE_MODELS.filter((m) => m !== options.model)]
    : FREE_MODELS;

  let lastError: Error | null = null;

  for (const model of modelList) {
    try {
      const response = await fetch(`${API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': APP_REFERER,
          'X-Title': APP_TITLE,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxOutputTokens ?? 2048,
        }),
      });

      // 429 and 5xx are retryable on a different model
      if (response.status === 429 || response.status >= 500) {
        const errorBody = await response.json().catch(() => ({}));
        const errMsg =
          (errorBody as { error?: { message?: string } })?.error?.message ||
          `HTTP ${response.status}`;
        console.warn(
          `[OpenRouter] ${model} failed (${errMsg}); trying next model…`
        );
        lastError = new Error(`${model}: ${errMsg}`);
        if (!enableFallback) throw lastError;
        continue;
      }

      // 4xx (except 429) are non-recoverable — propagate
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const errMsg =
          (errorBody as { error?: { message?: string } })?.error?.message ||
          `HTTP ${response.status}`;
        throw new Error(`OpenRouter API error (${response.status}): ${errMsg}`);
      }

      const data = (await response.json()) as OpenRouterResponse;
      const text =
        data.choices?.[0]?.message?.content ??
        '';

      if (!text) {
        const finishReason = data.choices?.[0]?.finish_reason;
        if (finishReason === 'content_filter') {
          throw new Error('OpenRouter declined to respond due to content filters.');
        }
        throw new Error(`OpenRouter returned no content (finish_reason: ${finishReason || 'unknown'}).`);
      }

      return { text, model };
    } catch (err) {
      // Network errors, TLS errors, etc. — try the next model
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[OpenRouter] ${model} threw: ${lastError.message}`);
      if (!enableFallback) throw lastError;
      // Continue to next model
    }
  }

  // All models failed
  throw new Error(
    `All OpenRouter models failed. Last error: ${lastError?.message || 'unknown'}. ` +
      'Free models are rate-limited; try again in a minute or add your own provider keys at https://openrouter.ai/settings/integrations.'
  );
}

/**
 * List all available models on OpenRouter (including paid ones).
 * Useful for debugging — returns the raw /models response.
 */
export async function listOpenRouterModels(): Promise<unknown> {
  const apiKey = getApiKey();
  const response = await fetch(`${API_BASE}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!response.ok) {
    throw new Error(`Failed to list models: HTTP ${response.status}`);
  }
  return response.json();
}
