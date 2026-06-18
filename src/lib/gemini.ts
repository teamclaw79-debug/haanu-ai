/**
 * Gemini API client (fetch-based, no extra SDK dependency).
 *
 * Gemini uses a different message format than OpenAI-style chat APIs:
 *   - Roles are "user" and "model" (not "assistant")
 *   - System prompts go in a separate `systemInstruction` field
 *   - Conversation history must alternate user/model, starting with user
 *
 * Docs: https://ai.google.dev/api/rest/v1beta/models/generatecontent
 */

const DEFAULT_MODEL = 'gemini-2.0-flash';
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

let cachedApiKey: string | null = null;

function getApiKey(): string {
  if (cachedApiKey) return cachedApiKey;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY environment variable is not set. Please add it to your .env.local file.'
    );
  }
  cachedApiKey = apiKey;
  return apiKey;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GeminiChatOptions {
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

interface GeminiContentPart {
  text: string;
}

interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiContentPart[];
}

/**
 * Convert OpenAI-style messages to Gemini format.
 *
 * - System messages are concatenated into a single systemInstruction string
 *   (Gemini doesn't accept system as a role in the contents array).
 * - Assistant messages are mapped to role "model".
 * - User messages pass through unchanged.
 * - Empty / whitespace-only messages are dropped to keep the conversation
 *   well-formed (Gemini rejects empty user turns).
 *
 * Gemini requires the contents array to start with a user turn and to
 * alternate user/model/user/model... If the cleaned history starts with a
 * model turn (e.g. the conversation began with an assistant reply), we
 * prepend a minimal user turn to satisfy the contract.
 */
function convertMessages(
  messages: ChatMessage[]
): { systemInstruction: string; contents: GeminiContent[] } {
  const systemParts: string[] = [];
  const contents: GeminiContent[] = [];

  for (const msg of messages) {
    const text = (msg.content || '').trim();
    if (!text) continue;

    if (msg.role === 'system') {
      systemParts.push(text);
    } else {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text }],
      });
    }
  }

  // Ensure the conversation starts with a user turn
  if (contents.length === 0) {
    contents.push({ role: 'user', parts: [{ text: '(begin conversation)' }] });
  } else if (contents[0].role !== 'user') {
    contents.unshift({ role: 'user', parts: [{ text: '(begin conversation)' }] });
  }

  return {
    systemInstruction: systemParts.join('\n\n'),
    contents,
  };
}

/**
 * Run a single-turn chat completion against Gemini.
 *
 * Returns the generated text. Throws on HTTP errors, region restrictions,
 * quota exhaustion, or empty responses — callers should catch and surface
 * a friendly error.
 */
export async function geminiChat(
  messages: ChatMessage[],
  options: GeminiChatOptions = {}
): Promise<string> {
  const apiKey = getApiKey();
  const model = options.model || DEFAULT_MODEL;
  const { systemInstruction, contents } = convertMessages(messages);

  const url = `${API_BASE}/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`;

  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.maxOutputTokens ?? 2048,
    },
  };

  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let errorPayload: { error?: { message?: string; status?: string } } = {};
    try {
      errorPayload = await response.json();
    } catch {
      // response wasn't JSON — fall through to a generic message
    }
    const errMsg = errorPayload.error?.message || `HTTP ${response.status}`;
    const errStatus = errorPayload.error?.status;
    throw new Error(
      `Gemini API error (${response.status}${errStatus ? ` ${errStatus}` : ''}): ${errMsg}`
    );
  }

  const data = await response.json();

  // Gemini may return content in candidates[0].content.parts[*].text
  const candidate = data?.candidates?.[0];
  const textParts: string[] = candidate?.content?.parts?.map((p: { text?: string }) => p.text).filter(Boolean) || [];

  if (textParts.length === 0) {
    // Check for finish_reason that explains the empty response
    const finishReason = candidate?.finishReason;
    if (finishReason === 'SAFETY') {
      throw new Error('Gemini declined to respond due to safety filters.');
    }
    if (finishReason === 'RECITATION') {
      throw new Error('Gemini declined to respond due to recitation filters.');
    }
    throw new Error(`Gemini returned no content (finishReason: ${finishReason || 'unknown'}).`);
  }

  return textParts.join('\n');
}

/**
 * List available Gemini models. Useful for debugging region/quota issues
 * since this endpoint is subject to the same access restrictions as
 * generateContent.
 */
export async function listGeminiModels(): Promise<string[]> {
  const apiKey = getApiKey();
  const url = `${API_BASE}/models?key=${apiKey}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to list models: HTTP ${response.status}`);
  }
  const data = await response.json();
  return (data.models || []).map((m: { name: string }) => m.name);
}
