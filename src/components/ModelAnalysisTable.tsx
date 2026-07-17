import { useCallback, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ArrowUpDown, Check, Copy, GitCompareArrows, Info } from 'lucide-react'
import type { FlattenedModel } from '@/types'
import { CAPABILITIES } from '@/constants'
import {
  cn,
  formatCostPerMillion,
  formatTokens,
  getComparisonIdentityKey,
  getModalityIcon,
} from '@/lib/utils'
import { ModelFamilyIcon, ModelLogo } from './ModelLogo'
import { ModelJsonCopyMenu } from './ModelJsonCopyMenu'

interface TableColumn {
  key: string
  label: string
  sortKeys?: {
    asc: string
    desc: string
    defaultDirection: 'asc' | 'desc'
  }
  align?: 'left' | 'right' | 'center'
  className?: string
  render: (model: FlattenedModel) => ReactNode
}

function cellValue(value: ReactNode) {
  return value === undefined || value === null || value === '' ? '-' : value
}

function getNextSortKey(column: TableColumn, sortBy: string) {
  if (!column.sortKeys) return null
  if (sortBy === column.sortKeys.asc) return column.sortKeys.desc
  if (sortBy === column.sortKeys.desc) return column.sortKeys.asc
  return column.sortKeys.defaultDirection === 'asc' ? column.sortKeys.asc : column.sortKeys.desc
}

function SortableHeader({
  column,
  sortBy,
  onSortChange,
}: {
  column: TableColumn
  sortBy: string
  onSortChange: (sort: string) => void
}) {
  const nextSortKey = getNextSortKey(column, sortBy)
  const sortKeys = column.sortKeys

  if (!nextSortKey || !sortKeys) {
    return (
      <span className="block max-w-full truncate text-xs font-medium text-muted-foreground" title={column.label}>
        {column.label}
      </span>
    )
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      className={cn(
        '-ml-2 max-w-full text-xs text-muted-foreground',
        column.align === 'right' && 'ml-auto -mr-2',
      )}
      onClick={() => onSortChange(nextSortKey)}
      aria-pressed={sortKeys.asc === sortBy || sortKeys.desc === sortBy}
      title={column.label}
    >
      <span className="min-w-0 truncate">{column.label}</span>
      <ArrowUpDown data-icon="inline-end" aria-hidden="true" />
    </Button>
  )
}

export function ModelAnalysisTable({
  models,
  sortBy,
  onSortChange,
  onViewDetails,
  comparisonSelectionKeys,
  isComparisonDisabled,
  onComparisonToggle,
}: {
  models: FlattenedModel[]
  sortBy: string
  onSortChange: (sort: string) => void
  onViewDetails: (model: FlattenedModel) => void
  comparisonSelectionKeys: Set<string>
  isComparisonDisabled: boolean
  onComparisonToggle: (model: FlattenedModel) => void
}) {
  const { t } = useTranslation()
  const [copiedIdKey, setCopiedIdKey] = useState<string | null>(null)
  const costLabels = { free: t('common.free'), unknown: t('common.unknown') }

  const handleIdCopy = useCallback((model: FlattenedModel) => {
    const key = `${model.providerId}:${model.id}`
    navigator.clipboard.writeText(model.id)
    setCopiedIdKey(key)
    setTimeout(() => setCopiedIdKey(null), 2000)
  }, [])

  const columns: TableColumn[] = [
    {
      key: 'model',
      label: t('analysis.columns.model'),
      sortKeys: { asc: 'name', desc: 'nameDesc', defaultDirection: 'asc' },
      className: 'w-[18%]',
      render: (model) => {
        const copyKey = `${model.providerId}:${model.id}`
        return (
        <div className="flex min-w-0 items-center gap-2">
          <ModelLogo model={model} className="size-7 shrink-0" />
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-1.5 font-medium">
              <ModelFamilyIcon model={model} className="size-[1em] shrink-0" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="min-w-0 truncate">{model.name}</span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">{model.name}</TooltipContent>
              </Tooltip>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  className="-ml-1 h-auto max-w-full justify-start px-1 py-0 font-mono text-xs text-primary hover:text-primary"
                  onClick={() => handleIdCopy(model)}
                >
                  {copiedIdKey === copyKey ? (
                    <Check data-icon="inline-start" aria-hidden="true" />
                  ) : (
                    <Copy data-icon="inline-start" aria-hidden="true" />
                  )}
                  <span className="min-w-0 truncate">{model.id}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>{copiedIdKey === copyKey ? t('common.copied') : t('card.copyModelId')}</TooltipContent>
            </Tooltip>
          </div>
        </div>
        )
      },
    },
    {
      key: 'source',
      label: t('detail.provider'),
      className: 'w-[10%]',
      render: (model) => (
        <div className="flex min-w-0 flex-col gap-1 text-xs">
          <span className="truncate font-medium" title={model.providerName}>{model.providerName}</span>
          <span className="truncate text-muted-foreground" title={model.family ?? undefined}>{model.family ?? '-'}</span>
        </div>
      ),
    },
    {
      key: 'capabilities',
      label: t('detail.capabilities'),
      className: 'w-[8%]',
      render: (model) => (
        <div className="flex min-w-0 flex-wrap gap-1">
          {CAPABILITIES.filter(({ key }) => model[key]).map(({ key, icon: Icon }) => (
            <Badge
              key={key}
              variant="outline"
              className="px-1.5"
              title={t(`capabilities.${key}`)}
              aria-label={t(`capabilities.${key}`)}
            >
              <Icon aria-hidden="true" />
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: 'modalities',
      label: t('detail.modalities'),
      className: 'w-[8%]',
      render: (model) => (
        <div className="flex min-w-0 flex-col gap-1 text-xs text-muted-foreground">
          {model.modalities?.input && model.modalities.input.length > 0 && (
            <div className="flex items-center gap-1">
              <span className="font-medium text-foreground">{t('card.in')}</span>
              {model.modalities.input.map((modality) => {
                const Icon = getModalityIcon(modality)
                return <Icon key={modality} className="size-3.5" aria-label={modality} />
              })}
            </div>
          )}
          {model.modalities?.output && model.modalities.output.length > 0 && (
            <div className="flex items-center gap-1">
              <span className="font-medium text-foreground">{t('card.out')}</span>
              {model.modalities.output.map((modality) => {
                const Icon = getModalityIcon(modality)
                return <Icon key={modality} className="size-3.5" aria-label={modality} />
              })}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'context',
      label: t('card.context'),
      sortKeys: { asc: 'contextSizeAsc', desc: 'contextSize', defaultDirection: 'desc' },
      align: 'right',
      className: 'w-[7%]',
      render: (model) => formatTokens(model.limit?.context),
    },
    {
      key: 'output',
      label: t('card.output'),
      sortKeys: { asc: 'outputLimitAsc', desc: 'outputLimit', defaultDirection: 'desc' },
      align: 'right',
      className: 'w-[7%]',
      render: (model) => formatTokens(model.limit?.output),
    },
    {
      key: 'inputCost',
      label: t('card.inputCost'),
      sortKeys: { asc: 'inputCost', desc: 'inputCostDesc', defaultDirection: 'asc' },
      align: 'right',
      className: 'w-[9%]',
      render: (model) => formatCostPerMillion(model.cost?.input, costLabels),
    },
    {
      key: 'outputCost',
      label: t('card.outputCost'),
      sortKeys: { asc: 'outputCost', desc: 'outputCostDesc', defaultDirection: 'asc' },
      align: 'right',
      className: 'w-[9%]',
      render: (model) => formatCostPerMillion(model.cost?.output, costLabels),
    },
    {
      key: 'release',
      label: t('card.releaseDate'),
      sortKeys: { asc: 'releaseDateAsc', desc: 'releaseDate', defaultDirection: 'desc' },
      className: 'w-[8%]',
      render: (model) => model.release_date,
    },
    {
      key: 'actions',
      label: t('analysis.columns.actions'),
      align: 'center',
      className: 'w-[8%]',
      render: (model) => {
        const comparisonSelected = comparisonSelectionKeys.has(getComparisonIdentityKey(model))
        const comparisonBlocked = isComparisonDisabled && !comparisonSelected

        return (
          <div className="flex items-center justify-end gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className={cn(
                    comparisonSelected && 'bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary',
                    comparisonBlocked && 'cursor-not-allowed opacity-45',
                  )}
                  onClick={() => onComparisonToggle(model)}
                  aria-pressed={comparisonSelected}
                  data-limit-blocked={comparisonBlocked ? 'true' : undefined}
                >
                  <GitCompareArrows aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {comparisonSelected
                  ? t('compare.remove')
                  : comparisonBlocked
                    ? t('compare.maxReached')
                    : t('compare.add')}
              </TooltipContent>
            </Tooltip>

            <ModelJsonCopyMenu model={model} mode="catalog" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => onViewDetails(model)}>
                  <Info aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('compare.details')}</TooltipContent>
            </Tooltip>
          </div>
        )
      },
    },
  ]

  return (
    <div className="overflow-hidden rounded-lg border bg-card text-card-foreground">
      <Table className="w-full table-fixed text-xs">
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            {columns.map((column) => (
              <TableHead
                key={column.key}
                className={cn(
                  'h-8 px-2 py-1',
                  column.className,
                  column.align === 'right' && 'text-right',
                  column.align === 'center' && 'text-center',
                )}
              >
                <SortableHeader column={column} sortBy={sortBy} onSortChange={onSortChange} />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {models.map((model) => (
            <TableRow key={`${model.providerId}:${model.id}`} className="h-11">
              {columns.map((column) => (
                <TableCell
                  key={`${model.providerId}:${model.id}:${column.key}`}
                  className={cn(
                    'px-2 py-1.5 align-middle',
                    column.className,
                    column.align === 'right' && 'text-right font-mono text-xs',
                    column.align === 'center' && 'text-center',
                  )}
                >
                  {cellValue(column.render(model))}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
