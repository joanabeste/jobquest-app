/**
 * AI Provider abstraction — switch between OpenAI and Anthropic via AI_PROVIDER env var.
 *
 * Usage:
 *   const text = await aiChat({ system, user, temperature, json: true });
 *
 * Environment variables:
 *   AI_PROVIDER        — "anthropic" (default) or "openai"
 *   ANTHROPIC_API_KEY  — required when provider is "anthropic"
 *   OPENAI_API_KEY     — required when provider is "openai"
 */

type Provider = 'openai' | 'anthropic';

interface AiChatOptions {
  system: string;
  user: string | Array<{ type: string; [key: string]: unknown }>;
  temperature?: number;
  /** Request JSON output. OpenAI uses response_format; Anthropic relies on prompt instruction. */
  json?: boolean;
  /** Override the default model for this call. */
  model?: string;
}

function getProvider(): Provider {
  const env = (process.env.AI_PROVIDER ?? 'anthropic').toLowerCase();
  if (env === 'openai') return 'openai';
  return 'anthropic';
}

function getApiKey(provider: Provider): string {
  if (provider === 'anthropic') {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error('ANTHROPIC_API_KEY nicht konfiguriert');
    return key;
  }
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY nicht konfiguriert');
  return key;
}

function defaultModel(provider: Provider, options: AiChatOptions): string {
  if (options.model) return options.model;
  if (provider === 'anthropic') return 'claude-sonnet-4-6';
  return 'gpt-4o';
}

async function chatOpenAI(options: AiChatOptions): Promise<string> {
  const apiKey = getApiKey('openai');
  const model = defaultModel('openai', options);

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: options.temperature ?? 0.7,
      ...(options.json ? { response_format: { type: 'json_object' } } : {}),
      messages: [
        { role: 'system', content: options.system },
        { role: 'user', content: options.user },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('[ai-provider:openai] error:', res.status, errText);
    throw new Error(`OpenAI API error: ${res.status}`);
  }

  const data = await res.json() as { choices?: Array<{ message: { content: string } }> };
  return data.choices?.[0]?.message?.content ?? '';
}

async function chatAnthropic(options: AiChatOptions): Promise<string> {
  const apiKey = getApiKey('anthropic');
  const model = defaultModel('anthropic', options);

  // Anthropic uses a different message format:
  // - system is a top-level field (not a message)
  // - user content can be text or multimodal blocks
  const userContent = typeof options.user === 'string'
    ? options.user
    : options.user.map((block) => {
        // Convert OpenAI image_url format to Anthropic image format
        if (block.type === 'image_url') {
          const imageUrl = (block.image_url as { url: string })?.url;
          return {
            type: 'image' as const,
            source: { type: 'url' as const, url: imageUrl },
          };
        }
        return block;
      });

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 64000,
      temperature: options.temperature ?? 0.7,
      system: options.system,
      messages: [
        { role: 'user', content: userContent },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('[ai-provider:anthropic] error:', res.status, errText);
    throw new Error(`Anthropic API error: ${res.status}`);
  }

  const data = await res.json() as {
    content?: Array<{ type: string; text?: string }>;
    stop_reason?: string;
  };

  if (data.stop_reason === 'max_tokens') {
    console.warn('[ai-provider:anthropic] response truncated (max_tokens reached)');
  }

  return data.content?.find((c) => c.type === 'text')?.text ?? '';
}

/**
 * Send a chat completion request to the configured AI provider.
 * Returns the raw text response.
 */
export async function aiChat(options: AiChatOptions): Promise<string> {
  const provider = getProvider();
  if (provider === 'openai') return chatOpenAI(options);
  return chatAnthropic(options);
}

/** Check if the AI provider is configured (has API key). */
export function isAiConfigured(): boolean {
  const provider = getProvider();
  if (provider === 'anthropic') return !!process.env.ANTHROPIC_API_KEY;
  return !!process.env.OPENAI_API_KEY;
}
