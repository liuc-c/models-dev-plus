import type { FlattenedModel } from '@/types'

export const OPENCODE_CONFIG_SCHEMA_URL = 'https://opencode.ai/config.json'

type OpenCodeModality = 'text' | 'audio' | 'image' | 'video' | 'pdf'
type OpenCodeStatus = 'alpha' | 'beta' | 'deprecated' | 'active'
type OpenCodeInterleavedField = 'reasoning' | 'reasoning_content' | 'reasoning_details'
type OpenCodeInterleaved = true | { field: OpenCodeInterleavedField }

const VALID_MODALITIES = new Set<OpenCodeModality>(['text', 'audio', 'image', 'video', 'pdf'])
const VALID_STATUSES = new Set<OpenCodeStatus>(['alpha', 'beta', 'deprecated', 'active'])
const VALID_INTERLEAVED_FIELDS = new Set<OpenCodeInterleavedField>(['reasoning', 'reasoning_content', 'reasoning_details'])

interface OpenCodeBaseCost {
  input: number
  output: number
  cache_read?: number
  cache_write?: number
}

interface OpenCodeCost extends OpenCodeBaseCost {
  context_over_200k?: OpenCodeBaseCost
}

interface OpenCodeLimit {
  context: number
  input?: number
  output: number
}

interface OpenCodeModalities {
  input?: OpenCodeModality[]
  output?: OpenCodeModality[]
}

interface OpenCodeModel {
  name?: string
  family?: string
  release_date?: string
  attachment?: boolean
  reasoning?: boolean
  temperature?: boolean
  tool_call?: boolean
  interleaved?: OpenCodeInterleaved
  cost?: OpenCodeCost
  limit?: OpenCodeLimit
  modalities?: OpenCodeModalities
  status?: OpenCodeStatus
}

interface OpenCodeProvider {
  name?: string
  env?: string[]
  npm?: string
  options?: { baseURL: string }
  models: Record<string, OpenCodeModel>
}

export interface OpenCodeConfig {
  $schema: typeof OPENCODE_CONFIG_SCHEMA_URL
  model: string
  provider: Record<string, OpenCodeProvider>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function isNonBlankString(value: unknown): value is string {
  return isString(value) && value.trim().length > 0
}

function isHttpUrl(value: unknown): value is string {
  if (!isNonBlankString(value) || value.trim() !== value) return false

  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function buildBaseCost(value: unknown): OpenCodeBaseCost | undefined {
  if (!isRecord(value) || !isFiniteNumber(value.input) || !isFiniteNumber(value.output)) return undefined

  const cost: OpenCodeBaseCost = { input: value.input, output: value.output }
  if (isFiniteNumber(value.cache_read)) cost.cache_read = value.cache_read
  if (isFiniteNumber(value.cache_write)) cost.cache_write = value.cache_write
  return cost
}

function buildCost(value: unknown): OpenCodeCost | undefined {
  const baseCost = buildBaseCost(value)
  if (!baseCost) return undefined

  const cost: OpenCodeCost = { ...baseCost }
  const contextOver200k = isRecord(value) ? buildBaseCost(value.context_over_200k) : undefined
  if (contextOver200k) cost.context_over_200k = contextOver200k
  return cost
}

function buildLimit(value: unknown): OpenCodeLimit | undefined {
  if (!isRecord(value) || !isFiniteNumber(value.context) || !isFiniteNumber(value.output)) return undefined

  const limit: OpenCodeLimit = { context: value.context, output: value.output }
  if (isFiniteNumber(value.input)) limit.input = value.input
  return limit
}

function buildModalities(value: unknown): OpenCodeModalities | undefined {
  if (!isRecord(value)) return undefined

  const modalities: OpenCodeModalities = {}
  for (const key of ['input', 'output'] as const) {
    const entries = value[key]
    if (!Array.isArray(entries)) continue

    const validEntries = entries.filter(isOpenCodeModality)
    if (validEntries.length > 0) modalities[key] = validEntries
  }

  return Object.keys(modalities).length > 0 ? modalities : undefined
}

function isOpenCodeModality(value: unknown): value is OpenCodeModality {
  return isString(value) && VALID_MODALITIES.has(value as OpenCodeModality)
}

function buildInterleaved(value: unknown): OpenCodeInterleaved | undefined {
  if (value === true) return true
  if (!isRecord(value) || !isString(value.field) || !VALID_INTERLEAVED_FIELDS.has(value.field as OpenCodeInterleavedField)) return undefined
  return { field: value.field as OpenCodeInterleavedField }
}

function buildModel(model: FlattenedModel): OpenCodeModel {
  const openCodeModel: OpenCodeModel = {}

  if (isNonBlankString(model.name)) openCodeModel.name = model.name
  if (isNonBlankString(model.family)) openCodeModel.family = model.family
  if (isNonBlankString(model.release_date)) openCodeModel.release_date = model.release_date

  for (const key of ['attachment', 'reasoning', 'temperature', 'tool_call'] as const) {
    if (typeof model[key] === 'boolean') openCodeModel[key] = model[key]
  }

  const interleaved = buildInterleaved(model.interleaved)
  if (interleaved !== undefined) openCodeModel.interleaved = interleaved

  const cost = buildCost(model.cost)
  if (cost) openCodeModel.cost = cost

  const limit = buildLimit(model.limit)
  if (limit) openCodeModel.limit = limit

  const modalities = buildModalities(model.modalities)
  if (modalities) openCodeModel.modalities = modalities

  if (isString(model.status) && VALID_STATUSES.has(model.status as OpenCodeStatus)) {
    openCodeModel.status = model.status as OpenCodeStatus
  }

  return openCodeModel
}

export function buildOpenCodeConfig(model: FlattenedModel): OpenCodeConfig {
  if (!isNonBlankString(model.providerId)) throw new Error('OpenCode config requires a non-blank providerId')
  if (!isNonBlankString(model.id)) throw new Error('OpenCode config requires a non-blank model.id')

  const provider: OpenCodeProvider = {
    models: {
      [model.id]: buildModel(model),
    },
  }

  if (isNonBlankString(model.providerName)) provider.name = model.providerName
  if (Array.isArray(model.providerEnv)) {
    const env = model.providerEnv.filter(isNonBlankString)
    if (env.length > 0) provider.env = env
  }
  if (isNonBlankString(model.providerNpm)) provider.npm = model.providerNpm
  if (isHttpUrl(model.providerApi)) provider.options = { baseURL: model.providerApi }

  return {
    $schema: OPENCODE_CONFIG_SCHEMA_URL,
    model: `${model.providerId}/${model.id}`,
    provider: {
      [model.providerId]: provider,
    },
  }
}

export function stringifyOpenCodeConfig(model: FlattenedModel): string {
  return JSON.stringify(buildOpenCodeConfig(model), null, 2)
}

function stringifyObjectMember(key: string, value: unknown): string {
  return `${JSON.stringify(key)}: ${JSON.stringify(value, null, 2)}`
}

export function stringifyOpenCodeModelFragment(model: FlattenedModel): string {
  const config = buildOpenCodeConfig(model)
  const openCodeModel = config.provider[model.providerId].models[model.id]
  return stringifyObjectMember(model.id, openCodeModel)
}

export function stringifyOpenCodeProviderFragment(model: FlattenedModel): string {
  const config = buildOpenCodeConfig(model)
  return stringifyObjectMember('provider', config.provider)
}
