import { getZAI } from '@/lib/zai';
import { randomUUID } from 'crypto';

const SYSTEM_PROMPT = `You are Haanu, a helpful and intelligent AI assistant. You are conversational, knowledgeable, and friendly. You help users with a wide range of tasks including answering questions, brainstorming ideas, providing explanations, and having meaningful conversations. Be concise but thorough in your responses.`;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, sessionId } = body as { message?: string; sessionId?: string };

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return Response.json(
        { error: 'Message is required and must be a non-empty string.' },
        { status: 400 }
      );
    }

    const zai = await getZAI();

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: message.trim() },
      ],
      stream: false,
    });

    const responseText =
      completion.choices?.[0]?.message?.content ??
      'I apologize, but I was unable to generate a response. Please try again.';

    const newSessionId = sessionId || randomUUID();

    return Response.json({
      response: responseText,
      sessionId: newSessionId,
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
