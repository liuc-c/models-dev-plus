import type { FlattenedModel } from '@/types'
import { createSearchTextIndexes, type SearchTextIndex } from '@/lib/utils'

type ModelSearchFields = Pick<
  FlattenedModel,
  'name' | 'id' | 'family' | 'providerName' | 'description'
>

export function createModelSearchIndexes(model: ModelSearchFields): SearchTextIndex[] {
  return createSearchTextIndexes([
    model.name,
    model.id,
    model.family,
    model.providerName,
    model.description,
  ])
}
