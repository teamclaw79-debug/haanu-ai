import { getZAI } from '@/lib/zai';
import { randomUUID } from 'crypto';

const SYSTEM_PROMPT = `You are Haanu, an advanced autonomous AI agent that can actually DO tasks — not just talk about them. You are conversational, knowledgeable, and friendly. Help users with a wide range of tasks including answering questions, brainstorming ideas, providing explanations, and having meaningful conversations. Be concise but thorough in your responses.`;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, sessionId, messages } = body as { 
      message?: string
      sessionId?: string
      messages?: Array<{ role: string; content: string }>
    };

    if (!message && !messages) {
      return Response.json(
        { error: 'Message or messages array is required.' },
        { status: 400 }
      );
    }

    const zai = await getZAI();

    // Build conversation history
    const conversationMessages = messages || [];
    
    // Add current message if provided separately
    if (message && typeof message === 'string' && message.trim().length > 0) {
      conversationMessages.push({ role: 'user', content: message.trim() });
    }

    // Ensure system prompt is first
    const allMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...conversationMessages
    ];

    const completion = await zai.chat.completions.create({
      messages: allMessages as any,
      stream: false,
    });

    const responseText =
      completion.choices?.[0]?.message?.content ??
      'I apologize, but I was unable to generate a response. Please try again.';

    const newSessionId = sessionId || randomUUID();

    return Response.json({
      response: responseText,
      sessionId: newSessionId,
      messages: [
        ...conversationMessages,
        { role: 'assistant', content: responseText }
      ]
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred.';

    console.error('[/api/agent] Error:', errorMessage);

    return Response.json(
      { error: 'Failed to generate AI response.', details: errorMessage },
      { status: 500 }
    );
  }
}
