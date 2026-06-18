import { chatWithFallback } from '@/lib/chat-backend';

/**
 * Debug endpoint for diagnosing chat failures.
 *
 * Usage:
 *   GET  /api/agent/debug              — checks env var configuration
 *   POST /api/agent/debug              — runs an actual chat call
 *     body: { "message": "hi" }        — optional, defaults to "hi"
 *
 * This endpoint is intentionally verbose — it returns the full chain of
 * backend attempts so you can see exactly which one fails and why.
 * Useful when the chat UI only shows "Failed to generate AI response."
 */
export async function GET() {
  return Response.json({
    timestamp: new Date().toISOString(),
    envVars: {
      OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY
        ? `set (${process.env.OPENROUTER_API_KEY.substring(0, 15)}…${process.env.OPENROUTER_API_KEY.substring(-4)})`
        : 'NOT SET — chat will fail. Get a free key at https://openrouter.ai/keys',
      GEMINI_API_KEY: process.env.GEMINI_API_KEY
        ? `set (${process.env.GEMINI_API_KEY.substring(0, 12)}…)`
        : 'not set (optional, fallback only)',
      ZAI_API_KEY: process.env.ZAI_API_KEY
        ? `set (${process.env.ZAI_API_KEY.substring(0, 12)}…)`
        : 'not set (optional, fallback only; SDK may use /etc/.z-ai-config)',
      SARVAM_API_KEY: process.env.SARVAM_API_KEY
        ? `set (legacy alias)`
        : 'not set',
    },
    nextSteps:
      'POST to /api/agent/debug with body {"message":"hi"} to run an actual chat call.',
  });
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  let body: { message?: string } = {};
  try {
    body = await request.json();
  } catch {
    // Body is optional — fall through with default
  }
  const message = body.message?.trim() || 'hi';

  // Mirror the system prompt used by /api/agent
  const SYSTEM_PROMPT = `You are Haanu, a helpful AI assistant. Reply concisely.`;

  try {
    const result = await chatWithFallback(
      [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: message },
      ],
      { temperature: 0.7, maxOutputTokens: 256 }
    );

    return Response.json({
      ok: true,
      elapsedMs: Date.now() - startedAt,
      backend: result.backend,
      model: result.model,
      fallbackReason: result.fallbackReason || null,
      response: result.text,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    return Response.json(
      {
        ok: false,
        elapsedMs: Date.now() - startedAt,
        error: errorMessage,
        envVars: {
          OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY ? 'set' : 'NOT SET',
          GEMINI_API_KEY: process.env.GEMINI_API_KEY ? 'set' : 'not set',
          ZAI_API_KEY: process.env.ZAI_API_KEY ? 'set' : 'not set',
        },
        hint:
          'If OPENROUTER_API_KEY is NOT SET, that is the problem. Get a free key at https://openrouter.ai/keys and add it to .env.local, then restart the dev server.',
      },
      { status: 500 }
    );
  }
}
