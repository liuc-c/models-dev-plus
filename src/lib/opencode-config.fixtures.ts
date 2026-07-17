import type { FlattenedModel } from '@/types'

export const KIMI_K3_MODEL: FlattenedModel = {
  id: 'kimi-k3',
  name: 'Kimi K3',
  description: 'Multimodal Kimi model with 1M context and toggleable max-effort thinking.',
  family: 'kimi-k3',
  attachment: true,
  reasoning: true,
  reasoning_options: [
    { type: 'toggle' },
    { type: 'effort', values: ['max'] },
  ],
  tool_call: true,
  interleaved: { field: 'reasoning_content' },
  structured_output: true,
  temperature: true,
  release_date: '2026-07-16',
  last_updated: '2026-07-16',
  modalities: { input: ['text', 'image', 'video'], output: ['text'] },
  open_weights: true,
  limit: { context: 1_048_576, output: 131_072 },
  cost: { input: 3, output: 15, cache_read: 0.3 },
  providerId: 'moonshotai',
  providerName: 'Moonshot AI',
  providerNpm: '@ai-sdk/openai-compatible',
  providerApi: 'https://api.moonshot.ai/v1',
  providerDoc: 'https://platform.moonshot.ai/docs/api/chat',
  providerEnv: ['MOONSHOT_API_KEY'],
}

export const EXTENDED_PRICING_MODEL: FlattenedModel = {
  ...KIMI_K3_MODEL,
  id: 'extended-pricing',
  cost: {
    input: 0,
    output: 0,
    cache_read: 0,
    cache_write: 0,
    reasoning: 7,
    input_audio: 8,
    output_audio: 9,
    tiers: [{ input: 10, output: 11, tier: { type: 'context', size: 200_001 } }],
    context_over_200k: {
      input: 12,
      output: 13,
      cache_read: 14,
      cache_write: 15,
      reasoning: 16,
    },
  },
  limit: { context: 0, input: 0, output: 0 },
  attachment: false,
  temperature: false,
  tool_call: false,
}

export const NULL_EFFORT_OPTIONS_MODEL: FlattenedModel = {
  ...KIMI_K3_MODEL,
  id: 'null-effort-options',
  reasoning_options: [{ type: 'effort', values: [null, 'low'] }],
}

export const EMPTY_REASONING_OPTIONS_MODEL: FlattenedModel = {
  ...KIMI_K3_MODEL,
  id: 'empty-reasoning-options',
  reasoning_options: [],
}

export const PROVIDER_OVERRIDE_MODEL: FlattenedModel = {
  ...KIMI_K3_MODEL,
  id: 'override-model',
  providerNpm: '@override/provider',
  providerApi: 'https://override.example.test/v1/responses',
  provider: {
    npm: '@override/provider',
    api: 'https://ignored.example.test/v1',
    shape: 'responses',
    body: { store: false },
    headers: { Authorization: 'Bearer should-not-leak' },
  },
}

export const INVALID_AND_MISSING_MODEL = {
  ...KIMI_K3_MODEL,
  providerApi: 'ftp://invalid.example.test',
  providerEnv: undefined,
  interleaved: { field: 'not-supported' },
  modalities: { input: ['text', 'binary'], output: ['invalid'] },
  cost: {
    input: Number.NaN,
    output: 15,
    cache_read: 0,
    context_over_200k: { input: 1, output: 2, context_over_200k: { input: 3, output: 4 } },
    tiers: [{ input: 1, output: 2 }],
  },
  limit: { context: Number.POSITIVE_INFINITY, input: Number.NaN, output: 0 },
  status: 'unknown',
} as unknown as FlattenedModel

export const SLASH_ID_MODEL: FlattenedModel = {
  ...KIMI_K3_MODEL,
  id: 'moonshotai/kimi-k3',
  providerId: 'vercel',
  providerName: 'Vercel AI Gateway',
}
