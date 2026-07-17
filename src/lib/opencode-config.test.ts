import { describe, expect, it } from 'vitest'
import {
  buildOpenCodeConfig,
  stringifyOpenCodeConfig,
  stringifyOpenCodeModelFragment,
  stringifyOpenCodeProviderFragment,
} from '@/lib/opencode-config'
import {
  EXTENDED_PRICING_MODEL,
  EMPTY_REASONING_OPTIONS_MODEL,
  INVALID_AND_MISSING_MODEL,
  KIMI_K3_MODEL,
  NULL_EFFORT_OPTIONS_MODEL,
  PROVIDER_OVERRIDE_MODEL,
  SLASH_ID_MODEL,
} from '@/lib/opencode-config.fixtures'
import { flattenModels, stringifyCompleteModelMetadata, stringifyModelDefinition } from '@/lib/utils'

describe('buildOpenCodeConfig', () => {
  it('builds a parseable, whitelisted Kimi K3 configuration without mutating its input', () => {
    const before = structuredClone(KIMI_K3_MODEL)
    const config = buildOpenCodeConfig(KIMI_K3_MODEL)
    const parsed = JSON.parse(stringifyOpenCodeConfig(KIMI_K3_MODEL))
    const model = config.provider.moonshotai.models['kimi-k3']

    expect(KIMI_K3_MODEL).toEqual(before)
    expect(parsed).toEqual(config)
    expect(config).toMatchObject({
      $schema: 'https://opencode.ai/config.json',
      model: 'moonshotai/kimi-k3',
      provider: {
        moonshotai: {
          name: 'Moonshot AI',
          env: ['MOONSHOT_API_KEY'],
          npm: '@ai-sdk/openai-compatible',
          options: { baseURL: 'https://api.moonshot.ai/v1' },
        },
      },
    })
    expect(Object.keys(model)).toEqual([
      'name', 'family', 'release_date', 'attachment', 'reasoning', 'temperature', 'tool_call',
      'interleaved', 'cost', 'limit', 'modalities',
    ])
    expect(model).not.toHaveProperty('id')
    expect(model).not.toHaveProperty('description')
    expect(model).not.toHaveProperty('reasoning_options')
    expect(model).not.toHaveProperty('structured_output')
    expect(model).not.toHaveProperty('open_weights')
    expect(model).not.toHaveProperty('last_updated')
    expect(model).not.toHaveProperty('provider')
  })

  it('preserves false and zero while dropping unsupported extended pricing fields', () => {
    const model = buildOpenCodeConfig(EXTENDED_PRICING_MODEL).provider.moonshotai.models['extended-pricing']

    expect(model).toMatchObject({
      attachment: false,
      reasoning: true,
      temperature: false,
      tool_call: false,
      cost: {
        input: 0,
        output: 0,
        cache_read: 0,
        cache_write: 0,
        context_over_200k: { input: 12, output: 13, cache_read: 14, cache_write: 15 },
      },
      limit: { context: 0, input: 0, output: 0 },
    })
    expect(model.cost).not.toHaveProperty('reasoning')
    expect(model.cost).not.toHaveProperty('input_audio')
    expect(model.cost).not.toHaveProperty('tiers')
    expect(model.cost?.context_over_200k).not.toHaveProperty('reasoning')
    expect(model).not.toHaveProperty('reasoning_options')
  })

  it('uses the flattened provider API and never leaks override credentials or transport metadata', () => {
    const config = buildOpenCodeConfig(PROVIDER_OVERRIDE_MODEL)
    const provider = config.provider.moonshotai
    const metadata = JSON.parse(stringifyCompleteModelMetadata(PROVIDER_OVERRIDE_MODEL))

    expect(provider.options).toEqual({ baseURL: 'https://override.example.test/v1/responses' })
    expect(provider.npm).toBe('@override/provider')
    expect(provider).not.toHaveProperty('api')
    expect(provider.models['override-model']).not.toHaveProperty('provider')
    expect(provider.models['override-model']).not.toHaveProperty('headers')
    expect(metadata.model.provider).toEqual(PROVIDER_OVERRIDE_MODEL.provider)
  })

  it('drops invalid and incomplete values without emitting empty objects', () => {
    const model = buildOpenCodeConfig(INVALID_AND_MISSING_MODEL).provider.moonshotai.models['kimi-k3']
    const provider = buildOpenCodeConfig(INVALID_AND_MISSING_MODEL).provider.moonshotai

    expect(provider).not.toHaveProperty('options')
    expect(provider).not.toHaveProperty('env')
    expect(model.modalities).toEqual({ input: ['text'] })
    expect(model).not.toHaveProperty('interleaved')
    expect(model).not.toHaveProperty('cost')
    expect(model).not.toHaveProperty('limit')
    expect(model).not.toHaveProperty('status')
  })

  it('keeps slash model IDs as one model key and one complete top-level reference', () => {
    const config = buildOpenCodeConfig(SLASH_ID_MODEL)

    expect(config.model).toBe('vercel/moonshotai/kimi-k3')
    expect(Object.keys(config.provider.vercel.models)).toEqual(['moonshotai/kimi-k3'])
  })

  it('rejects blank provider and model IDs without rewriting non-blank IDs', () => {
    expect(() => buildOpenCodeConfig({ ...KIMI_K3_MODEL, id: '  ' })).toThrow('model.id')
    expect(() => buildOpenCodeConfig({ ...KIMI_K3_MODEL, providerId: '\t' })).toThrow('providerId')
  })

  it('omits optional pure-whitespace strings without rewriting non-blank values', () => {
    const config = buildOpenCodeConfig({
      ...KIMI_K3_MODEL,
      name: ' ',
      family: '\t',
      release_date: '  ',
      providerName: ' ',
      providerNpm: '\n',
      providerEnv: [' ', 'MODEL_API_KEY'],
    })
    const provider = config.provider.moonshotai
    const model = provider.models['kimi-k3']

    expect(config.model).toBe('moonshotai/kimi-k3')
    expect(provider.env).toEqual(['MODEL_API_KEY'])
    expect(provider).not.toHaveProperty('name')
    expect(provider).not.toHaveProperty('npm')
    expect(model).not.toHaveProperty('name')
    expect(model).not.toHaveProperty('family')
    expect(model).not.toHaveProperty('release_date')
  })

  it('uses model provider npm and API overrides when flattening', () => {
    const [flattened] = flattenModels({
      moonshotai: {
        id: 'moonshotai',
        name: 'Moonshot AI',
        env: ['MOONSHOT_API_KEY'],
        npm: '@base/provider',
        api: 'https://base.example.test/v1',
        doc: 'https://base.example.test/docs',
        models: { 'override-model': PROVIDER_OVERRIDE_MODEL },
      },
    })

    expect(flattened.providerNpm).toBe('@override/provider')
    expect(flattened.providerApi).toBe('https://ignored.example.test/v1')
  })
})

describe('OpenCode configuration fragments', () => {
  it('serializes the exact filtered model as an object-member fragment', () => {
    const before = structuredClone(KIMI_K3_MODEL)
    const config = buildOpenCodeConfig(KIMI_K3_MODEL)
    const fragment = stringifyOpenCodeModelFragment(KIMI_K3_MODEL)
    const wrapped = JSON.parse(`{${fragment}}`)

    expect(KIMI_K3_MODEL).toEqual(before)
    expect(Object.keys(wrapped)).toEqual(['kimi-k3'])
    expect(wrapped['kimi-k3']).toEqual(config.provider.moonshotai.models['kimi-k3'])
  })

  it('serializes the exact provider, including the selected model, as a top-level member fragment', () => {
    const config = buildOpenCodeConfig(KIMI_K3_MODEL)
    const fragment = stringifyOpenCodeProviderFragment(KIMI_K3_MODEL)
    const wrapped = JSON.parse(`{${fragment}}`)

    expect(Object.keys(wrapped)).toEqual(['provider'])
    expect(wrapped.provider).toEqual(config.provider)
    expect(wrapped).not.toHaveProperty('$schema')
    expect(wrapped).not.toHaveProperty('model')
    expect(wrapped.provider.moonshotai.models).toHaveProperty('kimi-k3')
  })

  it('keeps slash model IDs as one fragment key', () => {
    const fragment = stringifyOpenCodeModelFragment(SLASH_ID_MODEL)
    const wrapped = JSON.parse(`{${fragment}}`)

    expect(Object.keys(wrapped)).toEqual(['moonshotai/kimi-k3'])
  })

  it('keeps false, zero, and filtering identical across fragments and full config', () => {
    const config = buildOpenCodeConfig(EXTENDED_PRICING_MODEL)
    const modelFragment = JSON.parse(`{${stringifyOpenCodeModelFragment(EXTENDED_PRICING_MODEL)}}`)
    const providerFragment = JSON.parse(`{${stringifyOpenCodeProviderFragment(EXTENDED_PRICING_MODEL)}}`)

    expect(modelFragment['extended-pricing']).toEqual(
      config.provider.moonshotai.models['extended-pricing'],
    )
    expect(providerFragment.provider).toEqual(config.provider)
    expect(modelFragment['extended-pricing']).toMatchObject({
      attachment: false,
      temperature: false,
      tool_call: false,
      cost: { input: 0, output: 0, cache_read: 0, cache_write: 0 },
      limit: { context: 0, input: 0, output: 0 },
    })
  })
})

describe('existing models.dev serializers', () => {
  it('keeps the model definition as an object member fragment', () => {
    const definition = stringifyModelDefinition(EMPTY_REASONING_OPTIONS_MODEL)
    const parsed = JSON.parse(`{${definition}}`)

    expect(parsed['empty-reasoning-options'].reasoning_options).toEqual([])
    expect(parsed['empty-reasoning-options']).not.toHaveProperty('providerId')
  })

  it('preserves null reasoning effort values in models.dev metadata', () => {
    const definition = stringifyModelDefinition(NULL_EFFORT_OPTIONS_MODEL)
    const parsed = JSON.parse(`{${definition}}`)

    expect(parsed['null-effort-options'].reasoning_options).toEqual([
      { type: 'effort', values: [null, 'low'] },
    ])
  })

  it('keeps the complete metadata structure and provider override unchanged', () => {
    const metadata = JSON.parse(stringifyCompleteModelMetadata(PROVIDER_OVERRIDE_MODEL))

    expect(Object.keys(metadata)).toEqual(['provider', 'model'])
    expect(metadata.provider).toMatchObject({ id: 'moonshotai', name: 'Moonshot AI' })
    expect(metadata.model.provider).toEqual(PROVIDER_OVERRIDE_MODEL.provider)
  })
})
