export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue }

export interface ModelCostFields {
  input: number
  output: number
  reasoning?: number
  cache_read?: number
  cache_write?: number
  input_audio?: number
  output_audio?: number
}

export interface ModelCostTier extends ModelCostFields {
  tier: {
    type: 'context'
    size: number
  }
}

export interface ModelCost {
  input: number
  output: number
  reasoning?: number
  cache_read?: number
  cache_write?: number
  input_audio?: number
  output_audio?: number
  context_over_200k?: ModelCostFields
  tiers?: ModelCostTier[]
}

export interface ModelLimit {
  context: number
  input?: number
  output: number
}

export type ModelModality = 'text' | 'audio' | 'image' | 'video' | 'pdf'

export interface ModelModalities {
  input: ModelModality[]
  output: ModelModality[]
}

export type ReasoningEffort = 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max' | 'default'

export type ReasoningOption =
  | { type: 'toggle' }
  | { type: 'effort'; values: Array<ReasoningEffort | null> }
  | { type: 'budget_tokens'; min?: number; max?: number }

export interface ModelProviderOverride {
  npm?: string
  api?: string
  shape?: 'responses' | 'completions'
  body?: { [key: string]: JsonValue }
  headers?: Record<string, string>
}

export interface ModelExperimentalMode {
  cost?: ModelCostFields
  provider?: ModelProviderOverride
}

export interface ModelExperimental {
  modes?: Record<string, ModelExperimentalMode>
}

export interface Model {
  id: string
  name: string
  description: string
  family?: string
  attachment: boolean
  reasoning: boolean
  reasoning_options?: ReasoningOption[]
  tool_call: boolean
  structured_output?: boolean
  interleaved?: true | { field: 'reasoning_content' | 'reasoning_details' }
  temperature?: boolean
  knowledge?: string
  release_date: string
  last_updated: string
  doc?: string
  modalities: ModelModalities
  open_weights: boolean
  cost?: ModelCost
  limit: ModelLimit
  status?: 'alpha' | 'beta' | 'deprecated'
  provider?: ModelProviderOverride
  experimental?: ModelExperimental
}

export interface Provider {
  id: string
  name: string
  env: string[]
  npm: string
  api?: string
  doc: string
  models: Record<string, Model>
}

export type ApiResponse = Record<string, Provider>

export interface FlattenedModel extends Model {
  providerId: string
  providerName: string
  providerNpm: string
  providerApi?: string
  providerDoc: string
  providerEnv: string[]
}

export type CapabilityKey = 'reasoning' | 'tool_call' | 'structured_output' | 'attachment' | 'open_weights'
export type CatalogView = 'cards' | 'table'
export type ModelStatusFilter = 'all' | 'stable' | 'alpha' | 'beta' | 'deprecated'

export interface SelectedModelIdentity {
  modelId: string
  providerId: string | null
}

export interface ComparisonModelIdentity {
  modelId: string
  providerId: string
}

export interface UrlState {
  search: string
  provider: string
  family: string
  caps: CapabilityKey[]
  inputModality: string[]
  outputModality: string[]
  sortBy: string
  view: CatalogView
  status: ModelStatusFilter
  page: number
  modelId: string | null
  modelProviderId: string | null
  compare: ComparisonModelIdentity[]
}
