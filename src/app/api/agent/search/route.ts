import { getZAI } from '@/lib/zai';
import type { SearchFunctionResultItem } from 'z-ai-web-dev-sdk';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query, num } = body as { query?: string; num?: number };

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return Response.json(
        { error: 'Query is required and must be a non-empty string.' },
        { status: 400 }
      );
    }

    // Clamp the requested result count to a sane range. The SDK accepts an
    // optional `num` field; default to 10 and never return more than 20.
    const resultCount =
      num && Number.isInteger(num) && num > 0 ? Math.min(num, 20) : 10;

    const zai = await getZAI();

    const results: SearchFunctionResultItem[] = await zai.functions.invoke(
      'web_search',
      {
        query: query.trim(),
        num: resultCount,
      }
    );

    return Response.json({ results });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred.';

    console.error('[/api/agent/search] Error:', errorMessage);

    return Response.json(
      { error: 'Failed to perform web search.', details: errorMessage },
      { status: 500 }
    );
  }
}
