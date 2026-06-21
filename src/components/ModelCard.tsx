import { useCallback, useState, type MouseEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Check, Copy, FileText, GitCompareArrows, Package, RefreshCw, Rocket } from 'lucide-react'
import type { FlattenedModel } from '@/types'
import { CAPABILITIES } from '@/constants'
import {
  cn,
  formatCostPerMillion,
  formatTokens,
  getModalityIcon,
  stringifyModelDefinition,
} from '@/lib/utils'
import { ModelFamilyIcon, ModelLogo } from './ModelLogo'

export function ModelCard({
  model,
  onCopy,
  onViewDetails,
  isInComparison,
  isComparisonDisabled,
  onComparisonToggle,
}: {
  model: FlattenedModel
  onCopy: (model: FlattenedModel) => void
  onViewDetails: (model: FlattenedModel) => void
  isInComparison: boolean
  isComparisonDisabled: boolean
  onComparisonToggle: (model: FlattenedModel) => void
}) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const [npmCopied, setNpmCopied] = useState(false)
  const [idCopied, setIdCopied] = useState(false)
  const costLabels = { free: t('common.free'), unknown: t('common.unknown') }
  const documentationUrl = model.doc ?? model.providerDoc
  const comparisonBlocked = isComparisonDisabled && !isInComparison

  const handleCopy = useCallback((event: MouseEvent) => {
    event.stopPropagation()
    navigator.clipboard.writeText(stringifyModelDefinition(model))
    setCopied(true)
    onCopy(model)
    setTimeout(() => setCopied(false), 2000)
  }, [model, onCopy])

  const handleNpmCopy = useCallback((event: MouseEvent) => {
    event.stopPropagation()
    if (!model.providerNpm) return
    navigator.clipboard.writeText(model.providerNpm)
    setNpmCopied(true)
    setTimeout(() => setNpmCopied(false), 2000)
  }, [model.providerNpm])

  const handleIdCopy = useCallback((event: MouseEvent) => {
    event.stopPropagation()
    navigator.clipboard.writeText(model.id)
    setIdCopied(true)
    setTimeout(() => setIdCopied(false), 2000)
  }, [model.id])

  const handleDocumentationOpen = useCallback((event: MouseEvent<HTMLAnchorElement>) => {
    event.stopPropagation()
  }, [])

  const handleComparisonToggle = useCallback((event: MouseEvent) => {
    event.stopPropagation()
    onComparisonToggle(model)
  }, [model, onComparisonToggle])

  const metrics = [
    { label: t('card.context'), value: formatTokens(model.limit?.context) },
    { label: t('card.output'), value: formatTokens(model.limit?.output) },
    { label: t('card.inputCost'), value: formatCostPerMillion(model.cost?.input, costLabels) },
    { label: t('card.outputCost'), value: formatCostPerMillion(model.cost?.output, costLabels) },
  ]

  return (
    <Card
      size="sm"
      className="min-w-0 cursor-pointer transition-[box-shadow,background-color] duration-200 ease-out hover:bg-card/95 hover:shadow-lg hover:shadow-foreground/5"
      onClick={() => onViewDetails(model)}
    >
      <CardHeader>
        <div className="flex min-w-0 items-start gap-2.5">
          <ModelLogo model={model} className="size-9 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-1.5">
              <ModelFamilyIcon model={model} className="size-[1em] shrink-0" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <CardTitle className="min-w-0 truncate">{model.name}</CardTitle>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">{model.name}</TooltipContent>
              </Tooltip>
              {model.status && (
                <Badge variant={model.status === 'deprecated' ? 'destructive' : 'secondary'} className="uppercase">
                  {t(`card.status.${model.status}`)}
                </Badge>
              )}
            </div>
            <CardDescription className="mt-1 flex min-w-0 items-center gap-1.5 text-xs">
              <span className="truncate">{model.providerName}</span>
              {model.providerNpm && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={handleNpmCopy}
                      aria-label={model.providerNpm}
                    >
                      {npmCopied ? <Check className="text-primary" /> : <Package />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="flex items-center gap-2">
                      <code className="text-xs">{model.providerNpm}</code>
                      <span className="text-xs text-muted-foreground">{t('common.clickToCopy')}</span>
                    </div>
                  </TooltipContent>
                </Tooltip>
              )}
              {model.family && <span className="truncate text-muted-foreground">· {model.family}</span>}
            </CardDescription>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className={cn(
                    isInComparison && 'bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary',
                    comparisonBlocked && 'cursor-not-allowed opacity-45',
                  )}
                  onClick={handleComparisonToggle}
                  aria-pressed={isInComparison}
                  data-limit-blocked={comparisonBlocked ? 'true' : undefined}
                >
                  <GitCompareArrows aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isInComparison
                  ? t('compare.remove')
                  : isComparisonDisabled
                    ? t('compare.maxReached')
                    : t('compare.add')}
              </TooltipContent>
            </Tooltip>
            {documentationUrl && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon-sm" asChild>
                    <a
                      href={documentationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={t('detail.documentation')}
                      onClick={handleDocumentationOpen}
                    >
                      <FileText aria-hidden="true" />
                    </a>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('detail.documentation')}</TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="button" variant="ghost" size="icon-sm" onClick={handleCopy}>
                  {copied ? <Check className="text-primary" /> : <Copy />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('card.copyModelJson')}</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-1.5">
          {CAPABILITIES.map(({ key, icon: Icon }) => {
            const isEnabled = model[key]
            return (
              <Tooltip key={key}>
                <TooltipTrigger asChild>
                  <Badge
                    variant={isEnabled ? 'outline' : 'ghost'}
                    className={cn(
                      isEnabled && 'border-success/30 bg-success/10 text-success',
                      !isEnabled && 'opacity-35',
                    )}
                  >
                    <Icon aria-hidden="true" />
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  {t(`capabilities.${key}`)}{isEnabled ? '' : ` ${t('capabilities.notSupported')}`}
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>

        {model.modalities && (
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {model.modalities.input && model.modalities.input.length > 0 && (
              <div className="flex items-center gap-1">
                <span className="font-medium text-foreground">{t('card.in')}</span>
                {model.modalities.input.map((modality) => {
                  const Icon = getModalityIcon(modality)
                  return (
                    <Tooltip key={modality}>
                      <TooltipTrigger asChild>
                        <Icon className="size-3.5" aria-label={modality} />
                      </TooltipTrigger>
                      <TooltipContent>{modality}</TooltipContent>
                    </Tooltip>
                  )
                })}
              </div>
            )}
            {model.modalities.output && model.modalities.output.length > 0 && (
              <div className="flex items-center gap-1">
                <span className="font-medium text-foreground">{t('card.out')}</span>
                {model.modalities.output.map((modality) => {
                  const Icon = getModalityIcon(modality)
                  return (
                    <Tooltip key={modality}>
                      <TooltipTrigger asChild>
                        <Icon className="size-3.5" aria-label={modality} />
                      </TooltipTrigger>
                      <TooltipContent>{modality}</TooltipContent>
                    </Tooltip>
                  )
                })}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-1.5 text-xs">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-lg bg-muted/40 px-2 py-1.5">
              <div className="text-muted-foreground">{metric.label}</div>
              <div className="truncate font-medium">{metric.value}</div>
            </div>
          ))}
        </div>

        <Separator />

        <div className="flex min-w-0 items-center justify-between gap-2 text-xs text-muted-foreground">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="min-w-0 justify-start px-0 font-mono text-primary hover:text-primary"
                onClick={handleIdCopy}
              >
                {idCopied ? <Check data-icon="inline-start" aria-hidden="true" /> : <Copy data-icon="inline-start" aria-hidden="true" />}
                <span className="truncate">{model.id}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('card.copyModelId')}</TooltipContent>
          </Tooltip>
          <div className="flex shrink-0 items-center gap-2">
            {model.release_date && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center gap-1">
                    <Rocket className="size-3" aria-hidden="true" />
                    <span className="hidden sm:inline">{model.release_date}</span>
                  </span>
                </TooltipTrigger>
                <TooltipContent>{t('card.releaseDate')}</TooltipContent>
              </Tooltip>
            )}
            {model.last_updated && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center gap-1">
                    <RefreshCw className="size-3" aria-hidden="true" />
                    <span className="hidden sm:inline">{model.last_updated}</span>
                  </span>
                </TooltipTrigger>
                <TooltipContent>{t('card.lastUpdated')}</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
