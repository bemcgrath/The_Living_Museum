/**
 * Provider-agnostic AI image generation, used for the weekly personalized email (see
 * api/cron/weekly-art.ts). The procedural ArtGenerator (src/utils/ArtGenerator.ts) stays the
 * free, always-on in-app experience — this is only for the paid weekly email.
 *
 * Defaults to xAI's Grok Imagine mid/"quality" tier (~$0.05/image), matching the cost model this
 * was scoped against (weekly cadence + personalized + mid tier — see the project chat history).
 * Set IMAGE_PROVIDER=openai to use OpenAI's gpt-image-1 medium tier (~$0.07/image) instead.
 *
 * Endpoint shapes verified against each provider's docs as of Sep 2026 (docs.x.ai,
 * platform.openai.com) — re-check before going live, these APIs evolve.
 */

export interface GeneratedImage {
  /** Either a hosted URL or a base64-encoded PNG/JPEG, depending on provider response_format. */
  url?: string;
  base64?: string;
}

export async function generateArtworkImage(prompt: string): Promise<GeneratedImage> {
  const provider = (process.env.IMAGE_PROVIDER ?? 'xai').toLowerCase();
  if (provider === 'openai') return generateWithOpenAI(prompt);
  return generateWithXai(prompt);
}

async function generateWithXai(prompt: string): Promise<GeneratedImage> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error('XAI_API_KEY must be set (see .env.example).');

  const response = await fetch('https://api.x.ai/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      // "-quality" is the ~$0.05/image mid tier — see docs.x.ai/developers/pricing.
      model: 'grok-imagine-image-quality',
      prompt,
    }),
  });
  if (!response.ok) {
    throw new Error(`xAI image generation failed: ${response.status} ${await safeText(response)}`);
  }
  const data = (await response.json()) as { data?: Array<{ url?: string; b64_json?: string }> };
  const first = data.data?.[0];
  if (!first) throw new Error('xAI image generation returned no image.');
  return { url: first.url, base64: first.b64_json };
}

async function generateWithOpenAI(prompt: string): Promise<GeneratedImage> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY must be set (see .env.example).');

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-image-1',
      prompt,
      size: '1024x1024',
      quality: 'medium', // ~$0.07/image — see developers.openai.com/api/docs/pricing
      n: 1,
    }),
  });
  if (!response.ok) {
    throw new Error(`OpenAI image generation failed: ${response.status} ${await safeText(response)}`);
  }
  const data = (await response.json()) as { data?: Array<{ url?: string; b64_json?: string }> };
  const first = data.data?.[0];
  if (!first) throw new Error('OpenAI image generation returned no image.');
  return { url: first.url, base64: first.b64_json };
}

/**
 * Normalizes a provider result (which may be a hosted URL or already-base64 data) into base64 —
 * so the caller can always send it as an email attachment (see api/cron/weekly-art.ts) without
 * caring which provider produced it or needing separate image hosting.
 */
export async function toBase64(image: GeneratedImage): Promise<string> {
  if (image.base64) return image.base64;
  if (!image.url) throw new Error('Image result had neither a url nor base64 data.');
  const response = await fetch(image.url);
  if (!response.ok) throw new Error(`Failed to download generated image: ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  return buffer.toString('base64');
}

async function safeText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return '<no body>';
  }
}
