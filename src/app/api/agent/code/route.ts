import { getZAI } from '@/lib/zai';

const CODE_SYSTEM_PROMPT = `You are Haanu, an expert software engineer and coding assistant. When the user describes what they want to build or a coding problem, you respond ONLY with the code solution. Follow these rules:

1. Return clean, well-structured, and production-quality code.
2. Include brief inline comments for complex logic.
3. If the user specifies a programming language, use it. Otherwise, choose the most appropriate language.
4. Wrap the code in a markdown code block with the language identifier (e.g., \`\`\`python or \`\`\`typescript).
5. Do NOT include explanations outside the code block unless the user asks for them.
6. If the request is ambiguous, make reasonable assumptions and note them in a comment at the top of the code.`;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { description, language } = body as { description?: string; language?: string };

    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return Response.json(
        { error: 'Description is required and must be a non-empty string.' },
        { status: 400 }
      );
    }

    const userMessage = language
      ? `Write ${language} code for the following: ${description.trim()}`
      : `Write code for the following: ${description.trim()}`;

    const zai = await getZAI();

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: CODE_SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      stream: false,
      thinking: { type: 'disabled' },
    });

    const code =
      completion.choices?.[0]?.message?.content ??
      '// Unable to generate code. Please try again.';

    // Try to detect the language from the markdown code fence in the response.
    const detectedLanguage = extractLanguageFromCode(code) || language || 'text';

    return Response.json({
      code,
      language: detectedLanguage,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred.';

    console.error('[/api/agent/code] Error:', errorMessage);

    return Response.json(
      { error: 'Failed to generate code.', details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * Extracts the language identifier from a markdown code block.
 * e.g., "```python" -> "python"
 */
function extractLanguageFromCode(code: string): string | null {
  const match = code.match(/^```(\w+)/m);
  return match ? match[1] : null;
}
