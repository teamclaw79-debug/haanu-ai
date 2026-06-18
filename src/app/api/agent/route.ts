import { chatWithFallback } from '@/lib/chat-backend';

// Simple UUID generator
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

const SYSTEM_PROMPT = `You are Haanu, an advanced AI agent that can actually DO tasks — not just talk about them. You are conversational, knowledgeable, and friendly. Help users with a wide range of tasks including answering questions, brainstorming ideas, providing explanations, writing code, and having meaningful conversations.

When a user asks you to perform a task that requires tools (such as browsing a website, generating an image, or running a web search), let them know what you would do and guide them on how to use the dedicated buttons in the UI. For pure conversation, questions, and explanations, respond directly with a clear, well-structured answer.

Be concise but thorough. Use Markdown formatting (headings, lists, code blocks) when it improves readability. Do not fabricate facts — if you are unsure, say so.`;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, sessionId, messages } = body as {
      message?: string;
      sessionId?: string;
      messages?: Array<{ role: string; content: string }>;
    };

    if (!message && !messages) {
      return Response.json(
        { error: 'Message or messages array is required.' },
        { status: 400 }
      );
    }

    console.log('[/api/agent] Received message:', message?.substring(0, 50));

    // Build conversation history. The client may send either a single
    // `message` or a pre-built `messages` array (or both — in that case we
    // append the new message to the history).
    const conversationMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = (
      messages || []
    )
      .filter((m) => m && typeof m.content === 'string')
      .map((m) => ({
        role: (m.role === 'assistant' ? 'assistant' : m.role === 'system' ? 'system' : 'user') as
          | 'system'
          | 'user'
          | 'assistant',
        content: m.content,
      }));

    if (message && typeof message === 'string' && message.trim().length > 0) {
      conversationMessages.push({ role: 'user', content: message.trim() });
    }

    if (conversationMessages.length === 0) {
      return Response.json(
        { error: 'No user message provided.' },
        { status: 400 }
      );
    }

    // Ensure the system prompt is the first message the model sees.
    const allMessages = [
      { role: 'system' as const, content: SYSTEM_PROMPT },
      ...conversationMessages,
    ];

    // Try Gemini first, fall back to Z.AI on quota/region errors.
    // This keeps chat working even when Gemini's free-tier quota is 0
    // (the user's current situation) — Z.AI picks up automatically.
    const result = await chatWithFallback(allMessages, {
      temperature: 0.7,
      maxOutputTokens: 2048,
    });

    if (result.fallbackReason) {
      console.warn(
        `[/api/agent] Used ${result.backend} (fallback reason: ${result.fallbackReason})`
      );
    } else {
      console.log(`[/api/agent] Used ${result.backend}`);
    }

    const newSessionId = sessionId || generateId();

    return Response.json({
      response: result.text,
      sessionId: newSessionId,
      backend: result.backend,
      messages: [
        ...conversationMessages,
        { role: 'assistant', content: result.text },
      ],
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred.';

    console.error('[/api/agent] Error:', errorMessage);
    console.error('[/api/agent] Full error:', error);

    return Response.json(
      {
        error: 'Failed to generate AI response.',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
