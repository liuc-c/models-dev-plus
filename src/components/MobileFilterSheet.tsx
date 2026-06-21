import { useTranslation } from 'react-i18next'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { LayoutGrid, Table2 } from 'lucide-react'
import type { CapabilityKey, CatalogView, ModelStatusFilter } from '@/types'
import { CAPABILITIES } from '@/constants'
import { FamilyCombobox, ProviderCombobox } from './ProviderCombobox'

import { getModalityIcon } from '@/lib/utils'

export function MobileFilterSheet({
  open,
  onOpenChange,
  selectedProvider,
  onProviderChange,
  providers,
  selectedFamily,
  onFamilyChange,
  families,
  sortBy,
  onSortChange,
  catalogView,
  onCatalogViewChange,
  selectedStatus,
  onStatusChange,
  selectedCapabilities,
  onCapabilitiesChange,
  selectedInputModality,
  selectedOutputModality,
  onInputModalitiesChange,
  onOutputModalitiesChange,
  inputModalities,
  outputModalities,
  resultCount,
  onReset,
  hasActiveFilters,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedProvider: string
  onProviderChange: (provider: string) => void
  providers: { id: string; name: string }[]
  selectedFamily: string
  onFamilyChange: (family: string) => void
  families: string[]
  sortBy: string
  onSortChange: (sort: string) => void
  catalogView: CatalogView
  onCatalogViewChange: (view: CatalogView) => void
  selectedStatus: ModelStatusFilter
  onStatusChange: (status: ModelStatusFilter) => void
  selectedCapabilities: CapabilityKey[]
  onCapabilitiesChange: (capabilities: string[]) => void
  selectedInputModality: string[]
  selectedOutputModality: string[]
  onInputModalitiesChange: (modalities: string[]) => void
  onOutputModalitiesChange: (modalities: string[]) => void
  inputModalities: string[]
  outputModalities: string[]
  resultCount: number
  onReset: () => void
  hasActiveFilters: boolean
}) {
  const { t } = useTranslation()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-xl px-0 flex flex-col">
        <SheetHeader className="shrink-0 px-6 pb-4">
          <SheetTitle>{t('filter.title')}</SheetTitle>
          <SheetDescription>{t('filter.description')}</SheetDescription>
        </SheetHeader>
        <Separator />

        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-8 px-6 py-6">
          <div className="flex flex-col gap-3">
            <div className="text-sm font-medium">{t('filter.provider')}</div>
            <ProviderCombobox
              value={selectedProvider}
              onValueChange={onProviderChange}
              providers={providers}
              triggerClassName="h-12"
            />
          </div>

          <div className="flex flex-col gap-3">
            <div className="text-sm font-medium">{t('filter.family')}</div>
            <FamilyCombobox
              value={selectedFamily}
              onValueChange={onFamilyChange}
              families={families}
              triggerClassName="h-12"
            />
          </div>

          <div className="flex flex-col gap-3">
            <div className="text-sm font-medium">{t('filter.sortBy')}</div>
            <Select value={sortBy} onValueChange={onSortChange}>
              <SelectTrigger className="w-full h-12">
                <SelectValue placeholder={t('filter.sortBy')} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="lastUpdated" className="h-10">{t('sort.lastUpdated')}</SelectItem>
                  <SelectItem value="lastUpdatedAsc" className="h-10">{t('sort.lastUpdatedAsc')}</SelectItem>
                  <SelectItem value="releaseDate" className="h-10">{t('sort.releaseDate')}</SelectItem>
                  <SelectItem value="releaseDateAsc" className="h-10">{t('sort.releaseDateAsc')}</SelectItem>
                  <SelectItem value="name" className="h-10">{t('sort.name')}</SelectItem>
                  <SelectItem value="nameDesc" className="h-10">{t('sort.nameDesc')}</SelectItem>
                  <SelectItem value="contextSize" className="h-10">{t('sort.contextSize')}</SelectItem>
                  <SelectItem value="contextSizeAsc" className="h-10">{t('sort.contextSizeAsc')}</SelectItem>
                  <SelectItem value="outputLimit" className="h-10">{t('sort.outputLimit')}</SelectItem>
                  <SelectItem value="outputLimitAsc" className="h-10">{t('sort.outputLimitAsc')}</SelectItem>
                  <SelectItem value="inputCost" className="h-10">{t('sort.inputCost')}</SelectItem>
                  <SelectItem value="inputCostDesc" className="h-10">{t('sort.inputCostDesc')}</SelectItem>
                  <SelectItem value="outputCost" className="h-10">{t('sort.outputCost')}</SelectItem>
                  <SelectItem value="outputCostDesc" className="h-10">{t('sort.outputCostDesc')}</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-3">
            <div className="text-sm font-medium">{t('analysis.status')}</div>
            <Select value={selectedStatus} onValueChange={(value) => onStatusChange(value as ModelStatusFilter)}>
              <SelectTrigger className="w-full h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all" className="h-10">{t('analysis.statusAll')}</SelectItem>
                  <SelectItem value="stable" className="h-10">{t('analysis.statusStable')}</SelectItem>
                  <SelectItem value="alpha" className="h-10">{t('card.status.alpha')}</SelectItem>
                  <SelectItem value="beta" className="h-10">{t('card.status.beta')}</SelectItem>
                  <SelectItem value="deprecated" className="h-10">{t('card.status.deprecated')}</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-3">
            <div className="text-sm font-medium">{t('view.title')}</div>
            <ToggleGroup
              type="single"
              value={catalogView}
              onValueChange={(value) => {
                if (value) onCatalogViewChange(value as CatalogView)
              }}
              variant="outline"
              size="lg"
              spacing={1}
              className="grid w-full grid-cols-2"
              aria-label={t('view.title')}
            >
              <ToggleGroupItem value="cards" aria-label={t('view.cards')}>
                <LayoutGrid data-icon="inline-start" aria-hidden="true" />
                {t('view.cards')}
              </ToggleGroupItem>
              <ToggleGroupItem value="table" aria-label={t('view.table')}>
                <Table2 data-icon="inline-start" aria-hidden="true" />
                {t('view.table')}
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="flex flex-col gap-3">
            <div className="text-sm font-medium">{t('filter.inputType')}</div>
            <ToggleGroup
              type="multiple"
              value={selectedInputModality}
              onValueChange={onInputModalitiesChange}
              variant="outline"
              size="lg"
              spacing={1}
              className="flex-wrap justify-start"
              aria-label={t('filter.inputType')}
            >
              {inputModalities.map((modality) => {
                const Icon = getModalityIcon(modality)
                return (
                  <ToggleGroupItem key={modality} value={modality} aria-label={modality}>
                    <Icon data-icon="inline-start" aria-hidden="true" />
                    {modality}
                  </ToggleGroupItem>
                )
              })}
            </ToggleGroup>
          </div>

          <div className="flex flex-col gap-3">
            <div className="text-sm font-medium">{t('filter.outputType')}</div>
            <ToggleGroup
              type="multiple"
              value={selectedOutputModality}
              onValueChange={onOutputModalitiesChange}
              variant="outline"
              size="lg"
              spacing={1}
              className="flex-wrap justify-start"
              aria-label={t('filter.outputType')}
            >
              {outputModalities.map((modality) => {
                const Icon = getModalityIcon(modality)
                return (
                  <ToggleGroupItem key={modality} value={modality} aria-label={modality}>
                    <Icon data-icon="inline-start" aria-hidden="true" />
                    {modality}
                  </ToggleGroupItem>
                )
              })}
            </ToggleGroup>
          </div>

          <div className="flex flex-col gap-3">
            <div className="text-sm font-medium">{t('detail.capabilities')}</div>
            <ToggleGroup
              type="multiple"
              value={selectedCapabilities}
              onValueChange={onCapabilitiesChange}
              variant="outline"
              size="lg"
              spacing={1}
              className="flex-wrap justify-start"
              aria-label={t('detail.capabilities')}
            >
              {CAPABILITIES.map(({ key, icon: Icon }) => (
                <ToggleGroupItem key={key} value={key} aria-label={t(`capabilities.${key}`)}>
                  <Icon data-icon="inline-start" aria-hidden="true" />
                  {t(`capabilities.${key}`)}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
          </div>
        </ScrollArea>

        <Separator />
        <div className="shrink-0 bg-background p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-12 flex-1"
              onClick={onReset}
              disabled={!hasActiveFilters}
            >
              {t('common.reset')}
            </Button>
            <Button
              type="button"
              className="h-12 flex-1 text-base"
              onClick={() => onOpenChange(false)}
            >
              {t('filter.showResults', { count: resultCount })}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
