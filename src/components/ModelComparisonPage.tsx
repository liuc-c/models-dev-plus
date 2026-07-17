import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  ArrowLeft,
  Check,
  ExternalLink,
  GitCompareArrows,
  Info,
  X,
} from 'lucide-react'
import type { FlattenedModel } from '@/types'
import { CAPABILITIES, COMPARISON_FIELD_COLUMN_REM, COMPARISON_MODEL_COLUMN_REM } from '@/constants'
import {
  createReasoningOptionsLabels,
  getCapabilitySupportState,
  getInterleavedSupport,
  getSupportState,
  summarizeReasoningOptions,
  type SupportState,
} from '@/lib/model-display'
import {
  cn,
  formatCostPerMillion,
  formatDate,
  formatTokens,
  getComparisonIdentityKey,
  getModalityIcon,
} from '@/lib/utils'
import { ModelFamilyIcon, ModelLogo } from './ModelLogo'

type MetricDirection = 'min' | 'max'
type ComparisonGroupTone =
  | 'identity'
  | 'capabilities'
  | 'modalities'
  | 'limits'
  | 'pricing'
  | 'dates'
  | 'actions'

interface ComparisonMetric {
  direction: MetricDirection
  getValue: (model: FlattenedModel) => number | undefined
}

interface ComparisonRow {
  label: string
  metric?: ComparisonMetric
  render: (model: FlattenedModel) => ReactNode
}

interface ComparisonGroup {
  title: string
  tone: ComparisonGroupTone
  hideTitle?: boolean
  rows: ComparisonRow[]
}

const comparisonGroupToneStyles: Record<ComparisonGroupTone, {
  header: string
  marker: string
}> = {
  identity: {
    header: 'bg-primary/10 text-primary',
    marker: 'bg-primary',
  },
  capabilities: {
    header: 'bg-success/10 text-success',
    marker: 'bg-success',
  },
  modalities: {
    header: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
    marker: 'bg-sky-500',
  },
  limits: {
    header: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
    marker: 'bg-violet-500',
  },
  pricing: {
    header: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
    marker: 'bg-amber-500',
  },
  dates: {
    header: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
    marker: 'bg-cyan-500',
  },
  actions: {
    header: 'bg-muted text-muted-foreground',
    marker: 'bg-muted-foreground',
  },
}

function textValue(value: ReactNode) {
  return value === undefined || value === null || value === '' ? '-' : value
}

function getBestKeys(models: FlattenedModel[], metric: ComparisonMetric | undefined) {
  if (!metric) return new Set<string>()

  const values = models
    .map((model) => ({ model, value: metric.getValue(model) }))
    .filter((item): item is { model: FlattenedModel; value: number } =>
      item.value !== undefined && Number.isFinite(item.value),
    )

  if (values.length < 2) return new Set<string>()

  const bestValue =
    metric.direction === 'min'
      ? Math.min(...values.map((item) => item.value))
      : Math.max(...values.map((item) => item.value))

  return new Set(
    values
      .filter((item) => item.value === bestValue)
      .map((item) => getComparisonIdentityKey(item.model)),
  )
}

function SupportValue({
  state,
  supportedLabel,
  notSupportedLabel,
  unknownLabel,
  detail,
}: {
  state: SupportState
  supportedLabel: string
  notSupportedLabel: string
  unknownLabel: string
  detail?: string
}) {
  const label =
    state === 'supported'
      ? detail ?? supportedLabel
      : state === 'not_supported'
        ? notSupportedLabel
        : unknownLabel
  const Icon = state === 'supported' ? Check : state === 'not_supported' ? X : Info

  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium',
        state === 'supported' && 'border-success/30 bg-success/10 text-success',
        state === 'not_supported' && 'border-destructive/30 bg-destructive/10 text-destructive',
        state === 'unknown' && 'border-border bg-muted/50 text-muted-foreground',
      )}
    >
      <Icon aria-hidden="true" className="size-3 shrink-0" />
      <span className="min-w-0 truncate">{label}</span>
    </span>
  )
}

function ModalityValues({ values }: { values: string[] | undefined }) {
  if (!values || values.length === 0) return undefined

  return (
    <div className="flex min-w-0 flex-wrap gap-1">
      {values.map((modality) => {
        const Icon = getModalityIcon(modality)
        return (
          <span
            key={modality}
            className="inline-flex min-w-0 items-center gap-1 rounded-md border border-border bg-muted/40 px-1.5 py-0.5 text-xs"
            title={modality}
          >
            <Icon aria-hidden="true" className="size-3 shrink-0" />
            <span className="truncate">{modality}</span>
          </span>
        )
      })}
    </div>
  )
}

export function ModelComparisonPage({
  models,
  onBackToCatalog,
  onRemove,
  onViewDetails,
}: {
  models: FlattenedModel[]
  onBackToCatalog: () => void
  onRemove: (model: FlattenedModel) => void
  onViewDetails: (model: FlattenedModel) => void
}) {
  const { t } = useTranslation()
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const comparisonTableWidth = `${COMPARISON_FIELD_COLUMN_REM + Math.max(models.length, 1) * COMPARISON_MODEL_COLUMN_REM}rem`
  const gridTemplateColumns = `${COMPARISON_FIELD_COLUMN_REM}rem repeat(${Math.max(models.length, 1)}, ${COMPARISON_MODEL_COLUMN_REM}rem)`

  const handleCopyValue = useCallback((key: string, value: string) => {
    navigator.clipboard.writeText(value)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }, [])

  const groups = useMemo<ComparisonGroup[]>(() => {
    const supported = t('detail.supported')
    const notSupported = t('detail.notSupported')
    const unknownSupport = t('detail.unknownSupport')
    const reasoningLabels = createReasoningOptionsLabels(t)
    const costLabels = { free: t('common.free'), unknown: t('common.unknown') }
    const formatPrice = (value: number | undefined) => formatCostPerMillion(value, costLabels)

    return [
      {
        title: t('compare.groups.identity'),
        tone: 'identity',
        rows: [
          { label: t('detail.provider'), render: (model) => model.providerName },
          { label: t('detail.name'), render: (model) => model.name },
          {
            label: t('detail.modelId'),
            render: (model) => {
              const key = `id:${model.providerId}:${model.id}`
              const copied = copiedKey === key

              return (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        'inline-block max-w-full truncate border-0 bg-transparent p-0 text-left align-baseline font-mono text-xs text-foreground underline-offset-2 transition-colors hover:text-primary hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
                        copied && 'text-primary',
                      )}
                      onClick={() => handleCopyValue(key, model.id)}
                      aria-label={copied ? t('common.copied') : t('compare.copyModelId')}
                    >
                      {model.id}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{copied ? t('common.copied') : t('compare.copyModelId')}</TooltipContent>
                </Tooltip>
              )
            },
          },
          { label: t('detail.family'), render: (model) => model.family },
          { label: t('detail.status'), render: (model) => model.status ? t(`card.status.${model.status}`) : undefined },
        ],
      },
      {
        title: t('compare.groups.capabilities'),
        tone: 'capabilities',
        rows: [
          ...CAPABILITIES.map(({ key }) => ({
            label: t(`capabilities.${key}`),
            render: (model: FlattenedModel) => (
              <SupportValue
                state={getCapabilitySupportState(key, model[key])}
                supportedLabel={supported}
                notSupportedLabel={notSupported}
                unknownLabel={unknownSupport}
              />
            ),
          })),
          {
            label: t('detail.temperature'),
            render: (model) => (
              <SupportValue
                state={getSupportState(model.temperature, 'optional')}
                supportedLabel={supported}
                notSupportedLabel={notSupported}
                unknownLabel={unknownSupport}
              />
            ),
          },
          {
            label: t('detail.interleaved'),
            render: (model) => {
              const interleaved = getInterleavedSupport(model.interleaved)
              return (
                <SupportValue
                  state={interleaved.state}
                  supportedLabel={supported}
                  notSupportedLabel={notSupported}
                  unknownLabel={unknownSupport}
                  detail={interleaved.detail}
                />
              )
            },
          },
          {
            label: t('detail.reasoningOptions'),
            render: (model) => {
              const summary = summarizeReasoningOptions(
                model.reasoning_options,
                reasoningLabels,
                model.reasoning,
              )
              return (
                <span
                  className="min-w-0 truncate text-xs text-muted-foreground"
                  title={summary.text}
                >
                  {summary.text}
                </span>
              )
            },
          },
        ],
      },

      {
        title: t('compare.groups.modalities'),
        tone: 'modalities',
        rows: [
          { label: t('detail.input'), render: (model) => <ModalityValues values={model.modalities?.input} /> },
          { label: t('card.output'), render: (model) => <ModalityValues values={model.modalities?.output} /> },
        ],
      },
      {
        title: t('compare.groups.limits'),
        tone: 'limits',
        rows: [
          {
            label: t('detail.contextWindow'),
            metric: { direction: 'max', getValue: (model) => model.limit?.context },
            render: (model) => formatTokens(model.limit?.context),
          },
          {
            label: t('detail.maxInput'),
            metric: { direction: 'max', getValue: (model) => model.limit?.input },
            render: (model) => formatTokens(model.limit?.input),
          },
          {
            label: t('detail.maxOutput'),
            metric: { direction: 'max', getValue: (model) => model.limit?.output },
            render: (model) => formatTokens(model.limit?.output),
          },
        ],
      },
      {
        title: t('compare.groups.pricing'),
        tone: 'pricing',
        rows: [
          {
            label: t('detail.input'),
            metric: { direction: 'min', getValue: (model) => model.cost?.input },
            render: (model) => formatPrice(model.cost?.input),
          },
          {
            label: t('card.output'),
            metric: { direction: 'min', getValue: (model) => model.cost?.output },
            render: (model) => formatPrice(model.cost?.output),
          },
          {
            label: t('detail.reasoningPrice'),
            metric: { direction: 'min', getValue: (model) => model.cost?.reasoning },
            render: (model) => formatPrice(model.cost?.reasoning),
          },
          {
            label: t('detail.cacheRead'),
            metric: { direction: 'min', getValue: (model) => model.cost?.cache_read },
            render: (model) => formatPrice(model.cost?.cache_read),
          },
          {
            label: t('detail.cacheWrite'),
            metric: { direction: 'min', getValue: (model) => model.cost?.cache_write },
            render: (model) => formatPrice(model.cost?.cache_write),
          },
          {
            label: t('detail.audioInput'),
            metric: { direction: 'min', getValue: (model) => model.cost?.input_audio },
            render: (model) => formatPrice(model.cost?.input_audio),
          },
          {
            label: t('detail.audioOutput'),
            metric: { direction: 'min', getValue: (model) => model.cost?.output_audio },
            render: (model) => formatPrice(model.cost?.output_audio),
          },
          {
            label: t('compare.contextOver200kInput'),
            metric: { direction: 'min', getValue: (model) => model.cost?.context_over_200k?.input },
            render: (model) => formatPrice(model.cost?.context_over_200k?.input),
          },
          {
            label: t('compare.contextOver200kOutput'),
            metric: { direction: 'min', getValue: (model) => model.cost?.context_over_200k?.output },
            render: (model) => formatPrice(model.cost?.context_over_200k?.output),
          },
          {
            label: t('detail.tieredPricing'),
            render: (model) =>
              model.cost?.tiers && model.cost.tiers.length > 0
                ? t('compare.priceTierCount', { count: model.cost.tiers.length })
                : undefined,
          },
        ],
      },
      {
        title: t('compare.groups.dates'),
        tone: 'dates',
        rows: [
          { label: t('detail.releaseDate'), render: (model) => formatDate(model.release_date) },
          { label: t('detail.lastUpdated'), render: (model) => formatDate(model.last_updated) },
          { label: t('detail.knowledgeCutoff'), render: (model) => formatDate(model.knowledge) },
        ],
      },
      {
        title: t('compare.groups.actions'),
        tone: 'actions',
        hideTitle: true,
        rows: [
          {
            label: t('compare.groups.actions'),
            render: (model) => {
              const documentationUrl = model.doc ?? model.providerDoc

              return (
                <div className="flex min-w-0 items-center gap-1">
                  {documentationUrl && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon-sm" asChild>
                          <a
                            href={documentationUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={t('detail.documentation')}
                          >
                            <ExternalLink aria-hidden="true" />
                          </a>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{t('detail.documentation')}</TooltipContent>
                    </Tooltip>
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onViewDetails(model)}
                        aria-label={t('compare.details')}
                      >
                        <Info aria-hidden="true" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('compare.details')}</TooltipContent>
                  </Tooltip>
                </div>
              )
            },
          },
        ],
      },
    ]
  }, [copiedKey, handleCopyValue, onViewDetails, t])

  if (models.length < 2) {
    return (
      <main className="flex flex-col gap-6">
        <Button type="button" variant="outline" onClick={onBackToCatalog}>
          <ArrowLeft data-icon="inline-start" aria-hidden="true" />
          {t('compare.backToCatalog')}
        </Button>
        <Card>
          <CardContent className="flex flex-col items-center gap-2 px-4 py-12 text-center">
            <GitCompareArrows className="size-8 text-muted-foreground" aria-hidden="true" />
            <h2 className="text-lg font-semibold">{t('compare.emptyTitle')}</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              {t('compare.emptyDescription')}
            </p>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main
      className={cn(
        'mx-auto flex w-full flex-col gap-5',
        models.length < 6 && 'max-w-7xl',
      )}
    >
      <div
        className="mx-auto flex max-w-full flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
        style={{ width: comparisonTableWidth }}
      >
        <div className="min-w-0">
          <Button type="button" variant="outline" onClick={onBackToCatalog} className="mb-3">
            <ArrowLeft data-icon="inline-start" aria-hidden="true" />
            {t('compare.backToCatalog')}
          </Button>
          <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <GitCompareArrows className="size-6" aria-hidden="true" />
            {t('compare.title')}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('compare.description')}</p>
        </div>
      </div>

      <div
        className="mx-auto max-w-full overflow-x-auto rounded-lg border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ width: comparisonTableWidth }}
      >
        <div className="grid" style={{ gridTemplateColumns, width: comparisonTableWidth }}>
          <div className="border-b bg-muted px-2 py-1.5 text-xs font-semibold uppercase text-muted-foreground">
            {t('compare.field')}
          </div>
          {models.map((model) => (
            <div key={`${model.providerId}:${model.id}`} className="min-w-0 border-b bg-muted px-2 py-1.5">
              <div className="flex items-start gap-1.5">
                <ModelLogo model={model} className="size-7 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-1.5 text-[13px] font-medium leading-4">
                    <ModelFamilyIcon model={model} className="size-[1em] shrink-0" />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="min-w-0 truncate">{model.name}</span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">{model.name}</TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="mt-0.5 truncate font-mono text-[11px] leading-3 text-muted-foreground" title={model.id}>
                    {model.id}
                  </div>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-6 shrink-0"
                      onClick={() => onRemove(model)}
                      aria-label={t('compare.removeModel', { name: model.name })}
                    >
                      <X aria-hidden="true" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('compare.remove')}</TooltipContent>
                </Tooltip>
              </div>
            </div>
          ))}

          {groups.map((group) => (
            <div key={group.title} className="contents">
              {!group.hideTitle && (
                <div
                  className={cn(
                    'flex items-center gap-2 border-b px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide',
                    comparisonGroupToneStyles[group.tone].header,
                  )}
                  style={{ gridColumn: '1 / -1' }}
                >
                  <span
                    aria-hidden="true"
                    className={cn('h-3.5 w-1 rounded-full', comparisonGroupToneStyles[group.tone].marker)}
                  />
                  {group.title}
                </div>
              )}
              {group.rows.map((row) => {
                const bestKeys = getBestKeys(models, row.metric)
                return (
                  <div key={`${group.title}:${row.label}`} className="contents group/compare-row">
                    <div className="min-w-0 whitespace-nowrap border-b bg-background px-2.5 py-2 text-xs text-muted-foreground transition-colors group-hover/compare-row:bg-muted/40">
                      {row.label}
                    </div>
                    {models.map((model) => {
                      const identityKey = getComparisonIdentityKey(model)
                      const isBest = bestKeys.has(identityKey)
                      const value = textValue(row.render(model))
                      const title = typeof value === 'string' || typeof value === 'number'
                        ? String(value)
                        : undefined
                      const isPrimitiveValue = title !== undefined
                      return (
                        <div
                          key={`${row.label}:${identityKey}`}
                          className={cn(
                            'min-w-0 border-b bg-background px-2.5 py-2 text-xs transition-colors group-hover/compare-row:bg-muted/40',
                            isBest && 'font-semibold text-success',
                          )}
                        >
                          <div className="flex min-w-0 items-center">
                            <div className={cn('min-w-0', isPrimitiveValue && 'truncate')} title={title}>{value}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
