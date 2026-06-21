import { useState, useCallback, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Copy,
  Check,
  Info,
  Calendar,
  Sparkles,
  Package,
  ExternalLink,
  SlidersHorizontal,
  Database,
} from 'lucide-react'
import type {
  FlattenedModel,
  ModelCostFields,
  ModelCostTier,
  ModelExperimentalMode,
  ModelProviderOverride,
} from '@/types'
import { CAPABILITIES } from '@/constants'
import { cn, formatDate, formatTokens, formatCost, stringifyCompleteModelMetadata } from '@/lib/utils'
import { ModelFamilyIcon, ModelLogo } from './ModelLogo'
import { DetailRow } from './DetailRow'

function DetailSection({
  title,
  icon,
  children,
  className,
}: {
  title: string
  icon?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('min-w-0', className)}>
      <h4 className="mb-2 flex items-center gap-2 text-sm font-medium">
        {icon}
        {title}
      </h4>
      {children}
    </section>
  )
}

function JsonBlock({ value }: { value: unknown }) {
  return (
    <ScrollArea className="max-h-64 min-w-0 rounded-lg border border-border/60 bg-muted/50">
      <pre className="min-w-0 whitespace-pre-wrap break-all p-3 font-mono text-xs">
        {JSON.stringify(value, null, 2)}
      </pre>
    </ScrollArea>
  )
}

function hasEntries(value: object | undefined): boolean {
  return value !== undefined && Object.keys(value).length > 0
}

export function ModelDetailSheet({ 
  model, 
  open, 
  onOpenChange 
}: { 
  model: FlattenedModel | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  
  const handleCopyJson = useCallback(() => {
    if (!model) return
    navigator.clipboard.writeText(stringifyCompleteModelMetadata(model))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [model])
  
  if (!model) return null

  const costLabels = { free: t('common.free'), unknown: t('common.unknown') }
  const formatModelCost = (cost: number | null | undefined) => formatCost(cost, costLabels)
  const jsonOutput = stringifyCompleteModelMetadata(model)
  const providerOverride = model.provider
  const experimentalModes = Object.entries(model.experimental?.modes ?? {})

  const renderCostRows = (cost: ModelCostFields | undefined, showUnknownBase = false) => (
    <>
      {(showUnknownBase || cost?.input !== undefined) && (
        <DetailRow label={t('detail.input')} value={formatModelCost(cost?.input)} />
      )}
      {(showUnknownBase || cost?.output !== undefined) && (
        <DetailRow label={t('card.output')} value={formatModelCost(cost?.output)} />
      )}
      {cost?.reasoning !== undefined && (
        <DetailRow label={t('detail.reasoningPrice')} value={formatModelCost(cost.reasoning)} />
      )}
      {cost?.cache_read !== undefined && (
        <DetailRow label={t('detail.cacheRead')} value={formatModelCost(cost.cache_read)} />
      )}
      {cost?.cache_write !== undefined && (
        <DetailRow label={t('detail.cacheWrite')} value={formatModelCost(cost.cache_write)} />
      )}
      {cost?.input_audio !== undefined && (
        <DetailRow label={t('detail.audioInput')} value={formatModelCost(cost.input_audio)} />
      )}
      {cost?.output_audio !== undefined && (
        <DetailRow label={t('detail.audioOutput')} value={formatModelCost(cost.output_audio)} />
      )}
    </>
  )

  const renderProviderOverrideRows = (provider: ModelProviderOverride) => (
    <>
      <DetailRow label={t('detail.npmPackage')} value={provider.npm} mono />
      <DetailRow label={t('detail.apiEndpoint')} value={provider.api} mono />
      <DetailRow label={t('detail.shape')} value={provider.shape} mono />
      {provider.body && (
        <div className="py-2 border-b border-border/50 last:border-0">
          <div className="text-muted-foreground text-sm mb-2">{t('detail.requestBody')}</div>
          <JsonBlock value={provider.body} />
        </div>
      )}
      {provider.headers && (
        <div className="py-2 border-b border-border/50 last:border-0">
          <div className="text-muted-foreground text-sm mb-2">{t('detail.requestHeaders')}</div>
          <JsonBlock value={provider.headers} />
        </div>
      )}
    </>
  )

  const renderPriceTier = (tier: ModelCostTier, index: number) => (
    <div key={index} className="rounded-lg border border-border/60 px-3 py-2">
      <div className="text-xs font-medium mb-1">
        {t('detail.priceTier', { number: index + 1 })}
      </div>
      <DetailRow label={t('detail.tierType')} value={tier.tier?.type} />
      <DetailRow label={t('detail.tierSize')} value={formatTokens(tier.tier?.size)} />
      {renderCostRows(tier)}
    </div>
  )

  const renderExperimentalMode = ([modeName, mode]: [string, ModelExperimentalMode]) => (
    <div key={modeName} className="rounded-lg border border-border/60 px-3 py-2 space-y-3">
      <div className="text-xs font-medium">
        {t('detail.mode')}: <code className="bg-muted px-1 rounded">{modeName}</code>
      </div>
      {mode.cost && (
        <div>
          <div className="text-xs text-muted-foreground mb-1">{t('detail.costOverrides')}</div>
          <div className="bg-muted/30 rounded-lg px-3">
            {renderCostRows(mode.cost)}
          </div>
        </div>
      )}
      {mode.provider && (
        <div>
          <div className="text-xs text-muted-foreground mb-1">{t('detail.providerSettings')}</div>
          <div className="bg-muted/30 rounded-lg px-3">
            {renderProviderOverrideRows(mode.provider)}
          </div>
        </div>
      )}
    </div>
  )
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="!w-[92vw] !max-w-[92vw] gap-0 p-0 sm:!w-[50vw] sm:!max-w-[50vw]">
        <SheetHeader className="shrink-0 p-5 pr-12">
          <div className="flex items-start gap-3">
            <ModelLogo model={model} className="size-12 shrink-0 rounded-md" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <SheetTitle className="min-w-0 break-words">
                  <span className="inline-flex min-w-0 items-center gap-2 align-bottom">
                    <ModelFamilyIcon model={model} className="size-[1em] shrink-0" />
                    <span>{model.name}</span>
                  </span>
                </SheetTitle>
                {model.status && (
                  <Badge 
                    variant={model.status === 'deprecated' ? 'destructive' : 'secondary'}
                    className="uppercase"
                  >
                    {t(`card.status.${model.status}`)}
                  </Badge>
                )}
              </div>
              <SheetDescription className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <span>{model.providerName}</span>
                <span className="min-w-0 max-w-full truncate rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
                  {model.id}
                </span>
                {model.family && <span>{model.family}</span>}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>
        <Separator />

        <ScrollArea className="min-h-0 flex-1">
        <div className="grid grid-cols-1 gap-5 p-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] xl:grid-cols-2">
          <DetailSection title={t('detail.basicInfo')} icon={<Info className="size-4" />}>
            <div className="bg-muted/30 rounded-lg px-3">
              <DetailRow label={t('detail.name')} value={model.name} />
              <DetailRow label={t('detail.modelId')} value={model.id} mono />
              <DetailRow label={t('detail.family')} value={model.family} />
              <DetailRow label={t('detail.status')} value={model.status ? t(`card.status.${model.status}`) : undefined} />
              <DetailRow label={t('detail.openWeights')} value={model.open_weights ? t('detail.yes') : t('detail.no')} />
              <DetailRow label={t('detail.temperature')} value={model.temperature ? t('detail.supported') : t('detail.notSupported')} />
            </div>
          </DetailSection>
          
          <DetailSection title={t('detail.dates')} icon={<Calendar className="size-4" />}>
            <div className="bg-muted/30 rounded-lg px-3">
              <DetailRow label={t('detail.releaseDate')} value={formatDate(model.release_date)} />
              <DetailRow label={t('detail.lastUpdated')} value={formatDate(model.last_updated)} />
              <DetailRow label={t('detail.knowledgeCutoff')} value={formatDate(model.knowledge)} />
            </div>
          </DetailSection>
          
          <DetailSection title={t('detail.capabilities')} icon={<Sparkles className="size-4" />}>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {CAPABILITIES.map(({ key, icon: Icon }) => (
                <div 
                  key={key} 
                  className={cn(
                    'flex items-center gap-2 rounded-lg p-2 text-sm',
                    model[key] ? 'bg-success/10 text-success' : 'bg-muted/30 opacity-50',
                  )}
                >
                  <Icon className="size-4" />
                  <span>{t(`capabilities.${key}`)}</span>
                  {model[key] && <Check className="ml-auto size-3" />}
                </div>
              ))}
            </div>
            <div className="bg-muted/30 rounded-lg px-3 mt-2">
              <DetailRow label={t('detail.interleaved')} value={
                model.interleaved
                  ? model.interleaved === true
                    ? t('detail.supported')
                    : model.interleaved.field
                  : t('detail.notSupported')
              } />
            </div>
          </DetailSection>
          
          {model.modalities && (
            <DetailSection title={t('detail.modalities')}>
              <div className="bg-muted/30 rounded-lg px-3">
                <DetailRow 
                  label={t('detail.input')} 
                  value={model.modalities.input?.join(', ') || '-'} 
                />
                <DetailRow 
                  label={t('card.output')} 
                  value={model.modalities.output?.join(', ') || '-'} 
                />
              </div>
            </DetailSection>
          )}
          
          <DetailSection title={t('detail.tokenLimits')}>
            <div className="bg-muted/30 rounded-lg px-3">
              <DetailRow label={t('detail.contextWindow')} value={formatTokens(model.limit?.context)} />
              <DetailRow label={t('detail.maxInput')} value={formatTokens(model.limit?.input)} />
              <DetailRow label={t('detail.maxOutput')} value={formatTokens(model.limit?.output)} />
            </div>
          </DetailSection>
          
          <DetailSection title={t('detail.pricing')}>
            <div className="flex flex-col gap-3">
              <div className="bg-muted/30 rounded-lg px-3">
                {renderCostRows(model.cost, true)}
              </div>
              {model.cost?.context_over_200k && (
                <div className="rounded-lg border border-border/60 px-3 py-2">
                  <div className="text-xs font-medium mb-1">{t('detail.contextOver200k')}</div>
                  <div className="bg-muted/30 rounded-lg px-3">
                    {renderCostRows(model.cost.context_over_200k)}
                  </div>
                </div>
              )}
              {model.cost?.tiers && model.cost.tiers.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">{t('detail.tieredPricing')}</div>
                  {model.cost.tiers.map(renderPriceTier)}
                </div>
              )}
            </div>
          </DetailSection>
          
          <DetailSection title={t('detail.provider')} icon={<Package className="size-4" />}>
            <div className="bg-muted/30 rounded-lg px-3">
              <DetailRow label={t('detail.name')} value={model.providerName} />
              <DetailRow label={t('detail.npmPackage')} value={model.providerNpm} mono />
              <DetailRow label={t('detail.apiEndpoint')} value={model.providerApi} mono />
              <DetailRow label={t('detail.envVariables')} value={model.providerEnv?.join(', ')} mono />
            </div>
            {model.providerDoc && (
              <Button variant="link" size="sm" className="mt-2 px-0" asChild>
                <a
                  href={model.providerDoc}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink data-icon="inline-start" aria-hidden="true" />
                  {t('detail.documentation')}
                </a>
              </Button>
            )}
          </DetailSection>

          {providerOverride && hasEntries(providerOverride) && (
            <DetailSection
              title={t('detail.providerOverride')}
              icon={<SlidersHorizontal className="size-4" />}
              className="xl:col-span-2"
            >
              <div className="bg-muted/30 rounded-lg px-3">
                {renderProviderOverrideRows(providerOverride)}
              </div>
            </DetailSection>
          )}

          {experimentalModes.length > 0 && (
            <DetailSection
              title={t('detail.experimental')}
              icon={<Database className="size-4" />}
              className="xl:col-span-2"
            >
              <div className="space-y-2">
                {experimentalModes.map(renderExperimentalMode)}
              </div>
            </DetailSection>
          )}
          
          <DetailSection title={t('detail.rawJson')} className="xl:col-span-2">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="text-xs text-muted-foreground">{t('detail.completeRawJson')}</div>
              <Button variant="outline" size="sm" onClick={handleCopyJson}>
                {copied ? <Check data-icon="inline-start" aria-hidden="true" /> : <Copy data-icon="inline-start" aria-hidden="true" />}
                {copied ? t('common.copied') : t('common.copy')}
              </Button>
            </div>
            <ScrollArea className="max-h-64 min-w-0 rounded-lg border border-border/60 bg-muted/50">
              <pre className="min-w-0 whitespace-pre-wrap break-all p-3 font-mono text-xs">
                {jsonOutput}
              </pre>
            </ScrollArea>
          </DetailSection>
        </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
