import { getZAI } from '@/lib/zai';
import type { CreateImageGenerationBody } from 'z-ai-web-dev-sdk';

const VALID_SIZES: CreateImageGenerationBody['size'][] = [
  '1024x1024',
  '768x1344',
  '864x1152',
  '1344x768',
  '1152x864',
  '1440x720',
  '720x1440',
];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt, size } = body as { prompt?: string; size?: string };

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return Response.json(
        { error: 'Prompt is required and must be a non-empty string.' },
        { status: 400 }
      );
    }

    const validatedSize: CreateImageGenerationBody['size'] =
      size && VALID_SIZES.includes(size as CreateImageGenerationBody['size'])
        ? (size as CreateImageGenerationBody['size'])
        : '1024x1024';

    const zai = await getZAI();

    const response = await zai.images.generations.create({
      prompt: prompt.trim(),
      size: validatedSize,
    });

    const base64 = response.data?.[0]?.base64;

    if (!base64) {
      return Response.json(
        { error: 'Image generation succeeded but no image data was returned.' },
        { status: 500 }
      );
    }

    return Response.json({
      base64,
      prompt: prompt.trim(),
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred.';

    console.error('[/api/agent/image] Error:', errorMessage);

    return Response.json(
      { error: 'Failed to generate image.', details: errorMessage },
      { status: 500 }
    );
  }
}
