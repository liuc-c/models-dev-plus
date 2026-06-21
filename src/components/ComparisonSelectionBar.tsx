import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { GitCompareArrows, X } from 'lucide-react'
import type { FlattenedModel } from '@/types'
import { MAX_COMPARISON_MODELS } from '@/constants'
import { ModelLogo } from './ModelLogo'

export function ComparisonSelectionBar({
  models,
  onOpenComparison,
  onRemove,
  onClear,
}: {
  models: FlattenedModel[]
  onOpenComparison: () => void
  onRemove: (model: FlattenedModel) => void
  onClear: () => void
}) {
  const { t } = useTranslation()
  if (models.length === 0) return null

  const canCompare = models.length >= 2

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+1rem)] z-40 px-3">
      <div className="pointer-events-auto mx-auto flex w-full max-w-5xl flex-col gap-3 rounded-xl border bg-popover/95 p-3 text-popover-foreground shadow-lg backdrop-blur supports-[backdrop-filter]:bg-popover/85 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <GitCompareArrows data-icon="inline-start" aria-hidden="true" />
            <span>{t('compare.selectionTitle', { count: models.length, max: MAX_COMPARISON_MODELS })}</span>
          </div>
          <ScrollArea className="max-h-20 w-full">
            <div className="flex flex-wrap gap-1.5 pr-2">
              {models.map((model) => (
                <Badge
                  key={`${model.providerId}:${model.id}`}
                  variant="secondary"
                  className="max-w-full gap-1.5 rounded-lg px-1.5 py-1 text-xs"
                >
                  <ModelLogo model={model} className="size-4 shrink-0 rounded" />
                  <span className="min-w-0 truncate">
                    {model.providerName} · {model.name}
                  </span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        className="-mr-1 text-muted-foreground hover:text-foreground"
                        onClick={() => onRemove(model)}
                        aria-label={t('compare.removeModel', { name: model.name })}
                      >
                        <X aria-hidden="true" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('compare.remove')}</TooltipContent>
                  </Tooltip>
                </Badge>
              ))}
            </div>
          </ScrollArea>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
          {!canCompare && (
            <div className="text-xs text-muted-foreground">
              {t('compare.selectMore')}
            </div>
          )}
          <Button type="button" variant="outline" onClick={onClear}>
            {t('compare.clear')}
          </Button>
          <Button type="button" onClick={onOpenComparison} disabled={!canCompare}>
            <GitCompareArrows data-icon="inline-start" aria-hidden="true" />
            {t('compare.open')}
          </Button>
        </div>
      </div>
    </div>
  )
}
