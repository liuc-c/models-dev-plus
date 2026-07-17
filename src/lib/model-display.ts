import type { CapabilityKey, ReasoningOption } from '@/types'

export type SupportState = 'supported' | 'not_supported' | 'unknown'

/** Capability keys that may be omitted in models.dev data. */
export const OPTIONAL_CAPABILITY_KEYS = new Set<CapabilityKey>(['structured_output'])

export function getSupportState(
  value: boolean | undefined,
  mode: 'required' | 'optional' = 'optional',
): SupportState {
  if (value === true) return 'supported'
  if (value === false) return 'not_supported'
  return mode === 'optional' ? 'unknown' : 'not_supported'
}

export function getCapabilitySupportState(
  key: CapabilityKey,
  value: boolean | undefined,
): SupportState {
  return getSupportState(
    value,
    OPTIONAL_CAPABILITY_KEYS.has(key) ? 'optional' : 'required',
  )
}

export function getInterleavedSupport(
  interleaved: true | { field: string } | undefined,
): { state: SupportState; detail?: string } {
  if (interleaved === undefined) return { state: 'unknown' }
  if (interleaved === true) return { state: 'supported' }
  return { state: 'supported', detail: interleaved.field }
}

export type ReasoningOptionsSummaryKind =
  | 'not_applicable'
  | 'unknown'
  | 'empty'
  | 'configured'

export interface ReasoningOptionsLabels {
  notApplicable: string
  unknown: string
  empty: string
  toggle: string
  effort: string
  /** Display for effort value `null` (none / 无). */
  effortNone: string
  /** Display for effort literal `"default"` (default / 默认). */
  effortDefault: string
  budget: string
  budgetRange: string
  budgetMin: string
  budgetMax: string
  partSeparator: string
  valueSeparator: string
}

export interface ReasoningOptionsSummary {
  kind: ReasoningOptionsSummaryKind
  /** Grounded display text for all kinds (never raw JSON). */
  text: string
}

function formatEffortValue(
  value: string | null,
  labels: ReasoningOptionsLabels,
): string {
  if (value === null) return labels.effortNone
  if (value === 'default') return labels.effortDefault
  return value
}

function formatEffortValues(
  values: Array<string | null>,
  labels: ReasoningOptionsLabels,
): string {
  return values.map((value) => formatEffortValue(value, labels)).join(labels.valueSeparator)
}

function formatBudgetPart(
  option: Extract<ReasoningOption, { type: 'budget_tokens' }>,
  labels: ReasoningOptionsLabels,
): string {
  const { min, max } = option
  if (min !== undefined && max !== undefined) {
    return `${labels.budget}: ${labels.budgetRange
      .replace('{{min}}', String(min))
      .replace('{{max}}', String(max))}`
  }
  if (min !== undefined) {
    return `${labels.budget}: ${labels.budgetMin.replace('{{value}}', String(min))}`
  }
  if (max !== undefined) {
    return `${labels.budget}: ${labels.budgetMax.replace('{{value}}', String(max))}`
  }
  return labels.budget
}

function formatConfiguredOption(
  option: ReasoningOption,
  labels: ReasoningOptionsLabels,
): string {
  switch (option.type) {
    case 'toggle':
      return labels.toggle
    case 'effort':
      return `${labels.effort}: ${formatEffortValues(option.values, labels)}`
    case 'budget_tokens':
      return formatBudgetPart(option, labels)
  }
}

/**
 * Summarize reasoning_options for UI copy, grounded by the `reasoning` flag.
 * - reasoning=false + undefined options → not applicable
 * - reasoning=true + undefined options → unknown / not provided
 * - [] → present but no configurable options
 * - non-empty → compact grounded summary (toggle / effort / budget)
 */
export function summarizeReasoningOptions(
  options: ReasoningOption[] | undefined,
  labels: ReasoningOptionsLabels,
  reasoning: boolean,
): ReasoningOptionsSummary {
  if (options === undefined) {
    if (!reasoning) {
      return { kind: 'not_applicable', text: labels.notApplicable }
    }
    return { kind: 'unknown', text: labels.unknown }
  }
  if (options.length === 0) {
    return { kind: 'empty', text: labels.empty }
  }
  return {
    kind: 'configured',
    text: options.map((option) => formatConfiguredOption(option, labels)).join(labels.partSeparator),
  }
}

export function createReasoningOptionsLabels(t: (key: string) => string): ReasoningOptionsLabels {
  return {
    notApplicable: t('detail.reasoningOptionsNotApplicable'),
    unknown: t('detail.reasoningOptionsUnknown'),
    empty: t('detail.reasoningOptionsEmpty'),
    toggle: t('detail.reasoningToggle'),
    effort: t('detail.reasoningEffort'),
    effortNone: t('detail.reasoningEffortNone'),
    effortDefault: t('detail.reasoningEffortDefault'),
    budget: t('detail.reasoningBudget'),
    budgetRange: t('detail.reasoningBudgetRange'),
    budgetMin: t('detail.reasoningBudgetMin'),
    budgetMax: t('detail.reasoningBudgetMax'),
    partSeparator: t('detail.reasoningPartSeparator'),
    valueSeparator: t('detail.reasoningValueSeparator'),
  }
}
