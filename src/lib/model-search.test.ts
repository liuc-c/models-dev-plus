import { describe, expect, it } from 'vitest'
import { createModelSearchIndexes } from '@/lib/model-search'
import { createSearchTextIndex, matchesSearchTextIndex } from '@/lib/utils'

const model = {
  name: 'Atlas Vision',
  id: 'atlas-vision-v2',
  family: 'atlas',
  providerName: 'Example AI',
  description: 'A multimodal model for satellite image analysis.',
  raw: { internalKeyword: 'raw-only-value' },
  provider: {
    body: { internalKeyword: 'body-only-value' },
    headers: { Authorization: 'headers-only-value' },
  },
}

function modelMatchesSearch(query: string): boolean {
  const queryIndex = createSearchTextIndex(query)
  return createModelSearchIndexes(model).some((valueIndex) =>
    matchesSearchTextIndex(queryIndex, valueIndex),
  )
}

describe('createModelSearchIndexes', () => {
  it('matches model descriptions', () => {
    expect(modelMatchesSearch('satellite image')).toBe(true)
  })

  it.each(['Atlas Vision', 'atlas-vision-v2', 'atlas', 'Example AI'])(
    'continues to match existing searchable field %s',
    (query) => {
      expect(modelMatchesSearch(query)).toBe(true)
    },
  )

  it('does not index raw data or provider request metadata', () => {
    expect(modelMatchesSearch('raw-only-value')).toBe(false)
    expect(modelMatchesSearch('body-only-value')).toBe(false)
    expect(modelMatchesSearch('headers-only-value')).toBe(false)
  })
})
