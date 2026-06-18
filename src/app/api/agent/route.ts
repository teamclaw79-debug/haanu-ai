import { getZAI } from '@/lib/zai';

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

    const zai = await getZAI();

    // Build conversation history. The client may send either a single
    // `message` or a pre-built `messages` array (or both — in that case we
    // append the new message to the history).
    const conversationMessages: Array<{ role: string; content: string }> = (
      messages || []
    ).filter((m) => m && typeof m.content === 'string');

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
      { role: 'system', content: SYSTEM_PROMPT },
      ...conversationMessages,
    ];

    const completion = await zai.chat.completions.create({
      messages: allMessages as Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
      stream: false,
      thinking: { type: 'disabled' },
    });

    const responseText =
      completion.choices?.[0]?.message?.content ??
      'I apologize, but I was unable to generate a response. Please try again.';

    const newSessionId = sessionId || generateId();

    return Response.json({
      response: responseText,
      sessionId: newSessionId,
      messages: [
        ...conversationMessages,
        { role: 'assistant', content: responseText },
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
