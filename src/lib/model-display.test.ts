import { describe, expect, it } from 'vitest'
import {
  getCapabilitySupportState,
  getInterleavedSupport,
  getSupportState,
  summarizeReasoningOptions,
  type ReasoningOptionsLabels,
} from '@/lib/model-display'

const labels: ReasoningOptionsLabels = {
  notApplicable: 'Not applicable',
  unknown: 'Not provided',
  empty: 'No configurable options',
  toggle: 'Toggle',
  effort: 'Effort',
  effortNone: 'none',
  effortDefault: 'default',
  budget: 'Budget tokens',
  budgetRange: '{{min}}–{{max}}',
  budgetMin: 'min {{value}}',
  budgetMax: 'max {{value}}',
  partSeparator: ' · ',
  valueSeparator: ', ',
}

describe('getSupportState', () => {
  it('maps true/false/undefined for optional fields', () => {
    expect(getSupportState(true, 'optional')).toBe('supported')
    expect(getSupportState(false, 'optional')).toBe('not_supported')
    expect(getSupportState(undefined, 'optional')).toBe('unknown')
  })

  it('treats undefined as not supported for required fields', () => {
    expect(getSupportState(true, 'required')).toBe('supported')
    expect(getSupportState(false, 'required')).toBe('not_supported')
    expect(getSupportState(undefined, 'required')).toBe('not_supported')
  })

  it('defaults to optional mode', () => {
    expect(getSupportState(undefined)).toBe('unknown')
  })
})

describe('getCapabilitySupportState', () => {
  it('uses three-state only for optional capabilities like structured_output', () => {
    expect(getCapabilitySupportState('structured_output', undefined)).toBe('unknown')
    expect(getCapabilitySupportState('structured_output', false)).toBe('not_supported')
    expect(getCapabilitySupportState('structured_output', true)).toBe('supported')
  })

  it('keeps required capability false as not supported', () => {
    expect(getCapabilitySupportState('reasoning', false)).toBe('not_supported')
    expect(getCapabilitySupportState('open_weights', false)).toBe('not_supported')
    expect(getCapabilitySupportState('tool_call', true)).toBe('supported')
    expect(getCapabilitySupportState('attachment', undefined)).toBe('not_supported')
  })
})

describe('getInterleavedSupport', () => {
  it('treats missing interleaved as unknown, not unsupported', () => {
    expect(getInterleavedSupport(undefined)).toEqual({ state: 'unknown' })
  })

  it('surfaces boolean true and field detail', () => {
    expect(getInterleavedSupport(true)).toEqual({ state: 'supported' })
    expect(getInterleavedSupport({ field: 'reasoning_content' })).toEqual({
      state: 'supported',
      detail: 'reasoning_content',
    })
  })
})

describe('summarizeReasoningOptions', () => {
  it('maps reasoning=false + undefined options to not applicable', () => {
    expect(summarizeReasoningOptions(undefined, labels, false)).toEqual({
      kind: 'not_applicable',
      text: 'Not applicable',
    })
  })

  it('maps reasoning=true + undefined options to unknown / not provided', () => {
    expect(summarizeReasoningOptions(undefined, labels, true)).toEqual({
      kind: 'unknown',
      text: 'Not provided',
    })
  })

  it('keeps empty array as no configurable options regardless of reasoning', () => {
    expect(summarizeReasoningOptions([], labels, true)).toEqual({
      kind: 'empty',
      text: 'No configurable options',
    })
    expect(summarizeReasoningOptions([], labels, false)).toEqual({
      kind: 'empty',
      text: 'No configurable options',
    })
  })

  it('formats toggle options without raw JSON', () => {
    expect(summarizeReasoningOptions([{ type: 'toggle' }], labels, true)).toEqual({
      kind: 'configured',
      text: 'Toggle',
    })
  })

  it('maps effort null to none and literal default to default (never merged)', () => {
    expect(
      summarizeReasoningOptions(
        [{ type: 'effort', values: [null, 'default', 'low', 'high'] }],
        labels,
        true,
      ),
    ).toEqual({
      kind: 'configured',
      text: 'Effort: none, default, low, high',
    })
  })

  it('formats budget token ranges and partial bounds', () => {
    expect(
      summarizeReasoningOptions(
        [{ type: 'budget_tokens', min: 1024, max: 8192 }],
        labels,
        true,
      ),
    ).toEqual({
      kind: 'configured',
      text: 'Budget tokens: 1024–8192',
    })
    expect(
      summarizeReasoningOptions([{ type: 'budget_tokens', min: 512 }], labels, true),
    ).toEqual({
      kind: 'configured',
      text: 'Budget tokens: min 512',
    })
    expect(
      summarizeReasoningOptions([{ type: 'budget_tokens', max: 4096 }], labels, true),
    ).toEqual({
      kind: 'configured',
      text: 'Budget tokens: max 4096',
    })
    expect(
      summarizeReasoningOptions([{ type: 'budget_tokens' }], labels, true),
    ).toEqual({
      kind: 'configured',
      text: 'Budget tokens',
    })
  })

  it('joins mixed toggle, effort, and budget options compactly', () => {
    expect(
      summarizeReasoningOptions(
        [
          { type: 'toggle' },
          { type: 'effort', values: [null, 'max'] },
          { type: 'budget_tokens', min: 1000, max: 5000 },
        ],
        labels,
        true,
      ),
    ).toEqual({
      kind: 'configured',
      text: 'Toggle · Effort: none, max · Budget tokens: 1000–5000',
    })
  })
})
