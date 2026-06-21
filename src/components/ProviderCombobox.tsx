import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn, createSearchTextIndex, matchesSearchTextIndex, type SearchTextIndex } from '@/lib/utils'
import { FamilyIcon, ProviderLogo } from './ModelLogo'

interface ComboboxOption {
  value: string
  label: string
  searchIndex: SearchTextIndex
  icon?: ReactNode
}

function SearchableFilterCombobox({
  value,
  onValueChange,
  options,
  allLabel,
  searchPlaceholder,
  emptyLabel,
  className = '',
  triggerClassName = '',
}: {
  value: string
  onValueChange: (value: string) => void
  options: ComboboxOption[]
  allLabel: string
  searchPlaceholder: string
  emptyLabel: string
  className?: string
  triggerClassName?: string
}) {
  const [open, setOpen] = useState(false)
  const isActive = value !== 'all'

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value],
  )

  const allOptionSearchIndex = useMemo(() => createSearchTextIndex(allLabel), [allLabel])

  const chooseOption = useCallback((optionValue: string) => {
    onValueChange(optionValue)
    setOpen(false)
  }, [onValueChange])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between',
            isActive && 'border-primary/50 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary',
            className,
            triggerClassName,
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            {selectedOption ? (
              <>
                {selectedOption.icon}
                <span className="truncate">{selectedOption.label}</span>
              </>
            ) : (
              <span className="truncate">{allLabel}</span>
            )}
          </span>
          <ChevronsUpDown className={cn('opacity-50', isActive && 'text-primary opacity-100')} aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] min-w-64 p-0">
        <Command filter={(optionValue, search) => {
          const option = optionValue === 'all'
            ? { searchIndex: allOptionSearchIndex }
            : options.find((item) => item.value === optionValue)
          if (!option) return 0
          return matchesSearchTextIndex(createSearchTextIndex(search), option.searchIndex) ? 1 : 0
        }}>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyLabel}</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="all"
                data-checked={value === 'all'}
                className="data-[checked=true]:bg-primary/10 data-[checked=true]:text-primary data-[checked=true]:[&_svg]:text-primary"
                onSelect={() => chooseOption('all')}
              >
                <span>{allLabel}</span>
              </CommandItem>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  data-checked={value === option.value}
                  className="data-[checked=true]:bg-primary/10 data-[checked=true]:text-primary data-[checked=true]:[&_svg]:text-primary"
                  onSelect={() => chooseOption(option.value)}
                >
                  {option.icon}
                  <span className="min-w-0 truncate">{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export function ProviderCombobox({
  value,
  onValueChange,
  providers,
  className = '',
  triggerClassName = '',
}: {
  value: string
  onValueChange: (provider: string) => void
  providers: { id: string; name: string }[]
  className?: string
  triggerClassName?: string
}) {
  const { t } = useTranslation()
  const options = useMemo(
    () => providers.map((provider) => ({
      value: provider.id,
      label: provider.name,
      searchIndex: createSearchTextIndex(`${provider.name} ${provider.id}`),
      icon: <ProviderLogo providerId={provider.id} className="size-4 shrink-0" />,
    })),
    [providers],
  )

  return (
    <SearchableFilterCombobox
      value={value}
      onValueChange={onValueChange}
      options={options}
      allLabel={t('filter.allProviders')}
      searchPlaceholder={t('filter.searchProviders')}
      emptyLabel={t('filter.noProviders')}
      className={className}
      triggerClassName={triggerClassName}
    />
  )
}

export function FamilyCombobox({
  value,
  onValueChange,
  families,
  className = '',
  triggerClassName = '',
}: {
  value: string
  onValueChange: (family: string) => void
  families: string[]
  className?: string
  triggerClassName?: string
}) {
  const { t } = useTranslation()
  const options = useMemo(
    () => families.map((family) => ({
      value: family,
      label: family,
      searchIndex: createSearchTextIndex(family),
      icon: <FamilyIcon family={family} className="size-4 shrink-0" />,
    })),
    [families],
  )

  return (
    <SearchableFilterCombobox
      value={value}
      onValueChange={onValueChange}
      options={options}
      allLabel={t('filter.allFamilies')}
      searchPlaceholder={t('filter.searchFamilies')}
      emptyLabel={t('filter.noFamilies')}
      className={className}
      triggerClassName={triggerClassName}
    />
  )
}
