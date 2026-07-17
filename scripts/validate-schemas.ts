import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'
import type { AnySchema } from 'ajv'
import {
  buildOpenCodeConfig,
  stringifyOpenCodeModelFragment,
  stringifyOpenCodeProviderFragment,
} from '../src/lib/opencode-config.ts'
import {
  INVALID_AND_MISSING_MODEL,
  KIMI_K3_MODEL,
  SLASH_ID_MODEL,
} from '../src/lib/opencode-config.fixtures.ts'

const OPENCODE_SCHEMA_URL = 'https://opencode.ai/config.json'
const MODELS_SCHEMA_URL = 'https://models.dev/model-schema.json'

async function fetchSchema(url: string): Promise<AnySchema> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`)
  return response.json() as Promise<AnySchema>
}

const [openCodeSchema, modelsSchema] = await Promise.all([
  fetchSchema(OPENCODE_SCHEMA_URL),
  fetchSchema(MODELS_SCHEMA_URL),
])

const ajv = new Ajv2020({
  allErrors: true,
  strict: false,
  loadSchema: async (uri) => {
    if (uri === MODELS_SCHEMA_URL) return modelsSchema
    throw new Error(`Unexpected external schema reference: ${uri}`)
  },
})
addFormats(ajv)
ajv.addSchema(modelsSchema, MODELS_SCHEMA_URL)

const validate = await ajv.compileAsync(openCodeSchema)
const samples = [
  ['moonshotai/kimi-k3', KIMI_K3_MODEL],
  ['moonshotai/kimi-k3 (single-sided modalities)', INVALID_AND_MISSING_MODEL],
  ['vercel/moonshotai/kimi-k3', SLASH_ID_MODEL],
] as const

function parseObjectMember(fragment: string): Record<string, unknown> {
  return JSON.parse(`{${fragment}}`) as Record<string, unknown>
}

function assertValid(config: unknown, identity: string, format: string) {
  if (!validate(config)) {
    throw new Error(
      `Schema validation failed for ${identity} (${format}): ${ajv.errorsText(validate.errors)}`,
    )
  }
}

for (const [identity, model] of samples) {
  const config = buildOpenCodeConfig(model)
  assertValid(config, identity, 'full config')

  const providerMember = parseObjectMember(stringifyOpenCodeProviderFragment(model))
  assertValid(
    {
      $schema: config.$schema,
      model: config.model,
      ...providerMember,
    },
    identity,
    'provider fragment',
  )

  const modelMember = parseObjectMember(stringifyOpenCodeModelFragment(model))
  const configWithModelFragment = structuredClone(config)
  configWithModelFragment.provider[model.providerId].models = modelMember
  assertValid(configWithModelFragment, identity, 'model fragment')
}

console.log(`Schema validation passed on ${new Date().toISOString().slice(0, 10)}`)
console.log(`OpenCode: ${OPENCODE_SCHEMA_URL}`)
console.log(`models.dev: ${MODELS_SCHEMA_URL}`)
console.log(`Samples: ${samples.map(([identity]) => identity).join(', ')}`)
console.log('Formats: full config, provider fragment, model fragment')
