import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  Search,
  Moon,
  Sun,
  Languages,
  Filter,
  ExternalLink,
  LayoutGrid,
  Table2,
} from 'lucide-react'
import type {
  ApiResponse,
  FlattenedModel,
  CapabilityKey,
  CatalogView,
  ComparisonModelIdentity,
  ModelStatusFilter,
  UrlState,
  SelectedModelIdentity,
} from '@/types'
import {
  API_URL,
  COMPARISON_FIELD_COLUMN_REM,
  COMPARISON_MODEL_COLUMN_REM,
  MAX_COMPARISON_MODELS,
  MODELS_DEV_REPO_URL,
  PAGE_SIZE,
  SESSION_CACHE_KEY,
  CAPABILITIES,
  DEFAULT_URL_STATE
} from '@/constants'
import {
  parseUrlStateFromSearch,
  buildUrlSearchFromState,
  shouldIgnoreKeydownTarget,
  flattenModels,
  extractFamilies,
  extractProviders,
  getModalityIcon,
  compareOptionalCost,
  compareOptionalNumber,
  getComparisonIdentityKey,
  normalizeComparisonIdentities,
  createSearchTextIndex,
  matchesSearchTextIndex,
  type SearchTextIndex,
  cn,
} from '@/lib/utils'
import { createModelSearchIndexes } from '@/lib/model-search'
import { ModelCard } from '@/components/ModelCard'
import { ModelDetailSheet } from '@/components/ModelDetailSheet'
import { Pagination } from '@/components/Pagination'
import { MobileFilterSheet } from '@/components/MobileFilterSheet'
import { FamilyCombobox, ProviderCombobox } from '@/components/ProviderCombobox'
import { ComparisonSelectionBar } from '@/components/ComparisonSelectionBar'
import { ModelComparisonPage } from '@/components/ModelComparisonPage'
import { ModelAnalysisTable } from '@/components/ModelAnalysisTable'
import { CatalogLoadingSkeleton } from '@/components/CatalogLoadingSkeleton'
import { Analytics } from '@vercel/analytics/react'

const SEARCH_DEBOUNCE_MS = 150
const SEARCH_INDEX_BATCH_SIZE = 120
const SEARCH_INDEX_IDLE_TIMEOUT_MS = 500

interface SearchableModelEntry {
  key: string
  searchIndexes: SearchTextIndex[]
}

interface IdleDeadlineLike {
  timeRemaining: () => number
}

type IdleCallbackWindow = Window & {
  requestIdleCallback?: (
    callback: (deadline: IdleDeadlineLike) => void,
    options?: { timeout: number },
  ) => number
  cancelIdleCallback?: (handle: number) => void
}

function scheduleSearchIndexWork(callback: (deadline?: IdleDeadlineLike) => void): () => void {
  const idleWindow = window as IdleCallbackWindow

  if (idleWindow.requestIdleCallback && idleWindow.cancelIdleCallback) {
    const handle = idleWindow.requestIdleCallback(callback, { timeout: SEARCH_INDEX_IDLE_TIMEOUT_MS })
    return () => idleWindow.cancelIdleCallback?.(handle)
  }

  const handle = window.setTimeout(() => callback(), 0)
  return () => window.clearTimeout(handle)
}

function readSessionCache(): ApiResponse | null {
  if (typeof window === 'undefined') return null
  const cached = sessionStorage.getItem(SESSION_CACHE_KEY)
  if (!cached) return null

  try {
    return JSON.parse(cached) as ApiResponse
  } catch {
    sessionStorage.removeItem(SESSION_CACHE_KEY)
    return null
  }
}

function selectedModelIdentityFromUrlState(state: UrlState): SelectedModelIdentity | null {
  if (!state.modelId) return null
  return {
    modelId: state.modelId,
    providerId: state.modelProviderId,
  }
}

export default function App() {
  const { t, i18n } = useTranslation()

  const initialUrlState = useMemo(() => {
    if (typeof window === 'undefined') return DEFAULT_URL_STATE
    return parseUrlStateFromSearch(window.location.search)
  }, [])

  const initialRoutePath = useMemo(() => {
    if (typeof window === 'undefined') return '/'
    return window.location.pathname === '/compare' ? '/compare' : '/'
  }, [])

  const initialCachedData = useMemo(() => readSessionCache(), [])

  const [data, setData] = useState<ApiResponse | null>(initialCachedData)
  const [loading, setLoading] = useState(() => initialCachedData === null)
  const [error, setError] = useState<string | null>(null)

  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme')
      if (stored) return stored === 'dark'
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return false
  })

  const [search, setSearch] = useState(() => initialUrlState.search)
  const [debouncedSearch, setDebouncedSearch] = useState(() => initialUrlState.search)
  const [searchableModelEntries, setSearchableModelEntries] = useState<SearchableModelEntry[]>([])
  const [selectedProvider, setSelectedProvider] = useState<string>(() => initialUrlState.provider)
  const [selectedFamily, setSelectedFamily] = useState<string>(() => initialUrlState.family)
  const [selectedCapabilities, setSelectedCapabilities] = useState<CapabilityKey[]>(() => initialUrlState.caps)
  const [selectedInputModality, setSelectedInputModality] = useState<string[]>(() => initialUrlState.inputModality)
  const [selectedOutputModality, setSelectedOutputModality] = useState<string[]>(() => initialUrlState.outputModality)
  const [sortBy, setSortBy] = useState<string>(() => initialUrlState.sortBy)
  const [catalogView, setCatalogView] = useState<CatalogView>(() => initialUrlState.view)
  const [selectedStatus, setSelectedStatus] = useState<ModelStatusFilter>(() => initialUrlState.status)

  const [currentPage, setCurrentPage] = useState(() => initialUrlState.page)
  const [routePath, setRoutePath] = useState(() => initialRoutePath)
  const [comparisonSelection, setComparisonSelection] = useState<ComparisonModelIdentity[]>(
    () => initialUrlState.compare,
  )

  const [selectedModelIdentity, setSelectedModelIdentity] = useState<SelectedModelIdentity | null>(
    () => selectedModelIdentityFromUrlState(initialUrlState),
  )
  const [sheetOpen, setSheetOpen] = useState(() => initialUrlState.modelId !== null)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [comparisonLimitNoticeVisible, setComparisonLimitNoticeVisible] = useState(false)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const skipNextUrlWriteRef = useRef(false)
  const lastUrlStateRef = useRef<UrlState | null>(null)
  const comparisonLimitNoticeTimerRef = useRef<number | null>(null)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
  }, [isDark])

  useEffect(() => {
    const delay = search.trim() ? SEARCH_DEBOUNCE_MS : 0
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(search)
    }, delay)

    return () => window.clearTimeout(timeoutId)
  }, [search])

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => !prev)
  }, [])

  const focusSearch = useCallback(() => {
    const el = searchInputRef.current
    if (!el) return
    el.focus()
    el.select()
  }, [])

  useEffect(() => {
    if (data) return

    fetch(API_URL)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch data')
        return res.json()
      })
      .then((json) => {
        try {
          sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(json))
        } catch {
          // Ignore quota errors
        }
        setData(json)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [data])

  const providers = useMemo(() => {
    if (!data) return []
    return extractProviders(data)
  }, [data])

  const effectiveSelectedProvider = useMemo(() => {
    if (selectedProvider === 'all') return 'all'
    return providers.some((p) => p.id === selectedProvider) ? selectedProvider : 'all'
  }, [providers, selectedProvider])

  const allModels = useMemo(() => {
    if (!data) return []
    return flattenModels(data)
  }, [data])

  useEffect(() => {
    let cancelled = false
    let cancelScheduledWork = () => {}
    let currentIndex = 0
    const entries: SearchableModelEntry[] = []

    const processBatch = (deadline?: IdleDeadlineLike) => {
      if (cancelled) return

      const batchStartIndex = currentIndex
      while (currentIndex < allModels.length) {
        const model = allModels[currentIndex]
        entries.push({
          key: getComparisonIdentityKey(model),
          searchIndexes: createModelSearchIndexes(model),
        })
        currentIndex += 1

        const processedCount = currentIndex - batchStartIndex
        if (processedCount >= SEARCH_INDEX_BATCH_SIZE) break
        if (deadline && deadline.timeRemaining() <= 1) break
      }

      if (currentIndex < allModels.length) {
        cancelScheduledWork = scheduleSearchIndexWork(processBatch)
        return
      }

      setSearchableModelEntries(entries)
    }

    cancelScheduledWork = scheduleSearchIndexWork(processBatch)

    return () => {
      cancelled = true
      cancelScheduledWork()
    }
  }, [allModels])

  const modelSearchIndexesByKey = useMemo(() => new Map(
    searchableModelEntries.map((entry) => [entry.key, entry.searchIndexes]),
  ), [searchableModelEntries])

  const searchIndexesReady = searchableModelEntries.length === allModels.length

  const families = useMemo(() => extractFamilies(allModels), [allModels])

  const effectiveSelectedFamily = useMemo(() => {
    if (selectedFamily === 'all') return 'all'
    return families.includes(selectedFamily) ? selectedFamily : 'all'
  }, [families, selectedFamily])

  const inputModalities = useMemo(() => {
    const items = new Set<string>()
    for (const model of allModels) {
      for (const modality of model.modalities?.input ?? []) {
        items.add(modality)
      }
    }
    return Array.from(items).sort((a, b) => a.localeCompare(b))
  }, [allModels])

  const outputModalities = useMemo(() => {
    const items = new Set<string>()
    for (const model of allModels) {
      for (const modality of model.modalities?.output ?? []) {
        items.add(modality)
      }
    }
    return Array.from(items).sort((a, b) => a.localeCompare(b))
  }, [allModels])

  const effectiveSelectedInputModality = useMemo(
    () => selectedInputModality.filter((m) => inputModalities.includes(m)),
    [selectedInputModality, inputModalities],
  )

  const effectiveSelectedOutputModality = useMemo(
    () => selectedOutputModality.filter((m) => outputModalities.includes(m)),
    [selectedOutputModality, outputModalities],
  )

  const selectedModel = useMemo(() => {
    if (!selectedModelIdentity) return null
    const { modelId, providerId } = selectedModelIdentity

    if (providerId) {
      return allModels.find((m) => m.id === modelId && m.providerId === providerId) || null
    }

    if (effectiveSelectedProvider !== 'all') {
      const providerScopedMatch = allModels.find(
        (m) => m.id === modelId && m.providerId === effectiveSelectedProvider,
      )
      if (providerScopedMatch) return providerScopedMatch
    }

    return allModels.find((m) => m.id === modelId) || null
  }, [allModels, selectedModelIdentity, effectiveSelectedProvider])

  const comparisonSelectionKeys = useMemo(
    () => new Set(comparisonSelection.map((identity) => getComparisonIdentityKey(identity))),
    [comparisonSelection],
  )

  const selectedComparisonModels = useMemo(() => {
    const modelByIdentity = new Map(
      allModels.map((model) => [getComparisonIdentityKey(model), model]),
    )

    return comparisonSelection
      .map((identity) => modelByIdentity.get(getComparisonIdentityKey(identity)))
      .filter((model): model is FlattenedModel => model !== undefined)
  }, [allModels, comparisonSelection])

  const isComparisonRoute = routePath === '/compare'

  const filteredModels = useMemo(() => {
    const searchIndex = createSearchTextIndex(debouncedSearch.trim())

    const result = allModels
      .filter((model) => {
        if (searchIndex.normalized) {
          if (!searchIndexesReady) return true
          const searchIndexes = modelSearchIndexesByKey.get(getComparisonIdentityKey(model)) ?? []
          const matchesSearch = searchIndexes.some((valueIndex) =>
            matchesSearchTextIndex(searchIndex, valueIndex),
          )
          if (!matchesSearch) return false
        }

        if (effectiveSelectedProvider !== 'all' && model.providerId !== effectiveSelectedProvider) {
          return false
        }

        if (effectiveSelectedFamily !== 'all' && model.family !== effectiveSelectedFamily) {
          return false
        }

        if (selectedCapabilities.length > 0) {
          const hasAllCapabilities = selectedCapabilities.every((cap) => model[cap])
          if (!hasAllCapabilities) return false
        }

        if (effectiveSelectedInputModality.length > 0) {
          const supportsInput = effectiveSelectedInputModality.every((m) =>
            model.modalities?.input?.some((item) => item === m),
          )
          if (!supportsInput) return false
        }

        if (effectiveSelectedOutputModality.length > 0) {
          const supportsOutput = effectiveSelectedOutputModality.every((m) =>
            model.modalities?.output?.some((item) => item === m),
          )
          if (!supportsOutput) return false
        }

        if (selectedStatus !== 'all') {
          if (selectedStatus === 'stable') {
            if (model.status !== undefined) return false
          } else if (model.status !== selectedStatus) {
            return false
          }
        }

        return true
      })

    result.sort((a, b) => {
      switch (sortBy) {
        case 'lastUpdated':
          return (b.last_updated || '').localeCompare(a.last_updated || '')
        case 'lastUpdatedAsc':
          return (a.last_updated || '').localeCompare(b.last_updated || '')
        case 'releaseDate':
          return (b.release_date || '').localeCompare(a.release_date || '')
        case 'releaseDateAsc':
          return (a.release_date || '').localeCompare(b.release_date || '')
        case 'name':
          return a.name.localeCompare(b.name)
        case 'nameDesc':
          return b.name.localeCompare(a.name)
        case 'contextSize':
          return compareOptionalNumber(a.limit?.context, b.limit?.context, 'desc')
        case 'contextSizeAsc':
          return compareOptionalNumber(a.limit?.context, b.limit?.context, 'asc')
        case 'outputLimit':
          return compareOptionalNumber(a.limit?.output, b.limit?.output, 'desc')
        case 'outputLimitAsc':
          return compareOptionalNumber(a.limit?.output, b.limit?.output, 'asc')
        case 'inputCost':
          return compareOptionalCost(a.cost?.input, b.cost?.input, 'asc')
        case 'inputCostDesc':
          return compareOptionalCost(a.cost?.input, b.cost?.input, 'desc')
        case 'outputCost':
          return compareOptionalCost(a.cost?.output, b.cost?.output, 'asc')
        case 'outputCostDesc':
          return compareOptionalCost(a.cost?.output, b.cost?.output, 'desc')
        default:
          return 0
      }
    })

    return result
  }, [
    allModels,
    modelSearchIndexesByKey,
    searchIndexesReady,
    debouncedSearch,
    effectiveSelectedProvider,
    effectiveSelectedFamily,
    selectedCapabilities,
    effectiveSelectedInputModality,
    effectiveSelectedOutputModality,
    selectedStatus,
    sortBy,
  ])

  const totalPages = Math.max(1, Math.ceil(filteredModels.length / PAGE_SIZE))
  const activePage = Math.min(currentPage, totalPages)

  const paginatedModels = useMemo(() => {
    const start = (activePage - 1) * PAGE_SIZE
    return filteredModels.slice(start, start + PAGE_SIZE)
  }, [filteredModels, activePage])

  const handleCapabilitiesChange = useCallback((values: string[]) => {
    const capabilityKeys = new Set<CapabilityKey>(CAPABILITIES.map((capability) => capability.key))
    setCurrentPage(1)
    setSelectedCapabilities(
      values.filter((value): value is CapabilityKey => capabilityKeys.has(value as CapabilityKey)),
    )
  }, [])

  const handleProviderChange = useCallback((provider: string) => {
    setSelectedProvider(provider)
    setCurrentPage(1)
  }, [])

  const handleFamilyChange = useCallback((family: string) => {
    setSelectedFamily(family)
    setCurrentPage(1)
  }, [])

  const handleSortChange = useCallback((nextSort: string) => {
    setSortBy(nextSort)
    setCurrentPage(1)
  }, [])

  const handleCatalogViewChange = useCallback((view: CatalogView) => {
    setCatalogView(view)
    setCurrentPage(1)
  }, [])

  const handleStatusChange = useCallback((status: ModelStatusFilter) => {
    setSelectedStatus(status)
    setCurrentPage(1)
  }, [])

  const handleInputModalitiesChange = useCallback((modalities: string[]) => {
    setCurrentPage(1)
    setSelectedInputModality(modalities)
  }, [])

  const handleOutputModalitiesChange = useCallback((modalities: string[]) => {
    setCurrentPage(1)
    setSelectedOutputModality(modalities)
  }, [])

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
    setCurrentPage(1)
  }, [])

  const showComparisonLimitNotice = useCallback(() => {
    if (comparisonLimitNoticeTimerRef.current !== null) {
      window.clearTimeout(comparisonLimitNoticeTimerRef.current)
    }

    setComparisonLimitNoticeVisible(true)
    comparisonLimitNoticeTimerRef.current = window.setTimeout(() => {
      setComparisonLimitNoticeVisible(false)
      comparisonLimitNoticeTimerRef.current = null
    }, 2200)
  }, [])

  const handleComparisonToggle = useCallback((model: FlattenedModel) => {
    const identity: ComparisonModelIdentity = {
      providerId: model.providerId,
      modelId: model.id,
    }
    const identityKey = getComparisonIdentityKey(identity)
    const availableKeys = new Set(allModels.map((availableModel) => getComparisonIdentityKey(availableModel)))

    setComparisonSelection((prev) => {
      const effectivePrev = prev.filter((item) => availableKeys.has(getComparisonIdentityKey(item)))

      if (effectivePrev.some((item) => getComparisonIdentityKey(item) === identityKey)) {
        return effectivePrev.filter((item) => getComparisonIdentityKey(item) !== identityKey)
      }

      if (effectivePrev.length >= MAX_COMPARISON_MODELS) {
        showComparisonLimitNotice()
        return effectivePrev
      }
      return normalizeComparisonIdentities([...effectivePrev, identity])
    })
  }, [allModels, showComparisonLimitNotice])

  const handleRemoveComparisonModel = useCallback((model: FlattenedModel) => {
    const identityKey = getComparisonIdentityKey(model)
    setComparisonSelection((prev) =>
      prev.filter((item) => getComparisonIdentityKey(item) !== identityKey),
    )
  }, [])

  const handleClearComparison = useCallback(() => {
    setComparisonSelection([])
  }, [])

  const handleOpenComparison = useCallback(() => {
    setRoutePath('/compare')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const handleBackToCatalog = useCallback(() => {
    setRoutePath('/')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const resetFilters = useCallback(() => {
    setSearch('')
    setSelectedProvider('all')
    setSelectedFamily('all')
    setSelectedCapabilities([])
    setSelectedInputModality([])
    setSelectedOutputModality([])
    setSortBy('lastUpdated')
    setSelectedStatus('all')
    setCurrentPage(1)
  }, [])

  const hasActiveFilters =
    search.trim().length > 0 ||
    selectedCapabilities.length > 0 ||
    effectiveSelectedProvider !== 'all' ||
    effectiveSelectedFamily !== 'all' ||
    effectiveSelectedInputModality.length > 0 ||
    effectiveSelectedOutputModality.length > 0 ||
    selectedStatus !== 'all' ||
    sortBy !== 'lastUpdated'

  const handleViewDetails = useCallback((model: FlattenedModel) => {
    setSelectedModelIdentity({
      modelId: model.id,
      providerId: model.providerId,
    })
    setSheetOpen(true)
  }, [])

  const handleSheetOpenChange = useCallback((open: boolean) => {
    setSheetOpen(open)
    if (!open) {
      setSelectedModelIdentity(null)
    }
  }, [])

  const handlePageChange = useCallback((page: number) => {
    const nextPage = Math.max(1, Math.min(page, totalPages))
    setCurrentPage(nextPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [totalPages])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handlePopState = () => {
      skipNextUrlWriteRef.current = true
      const next = parseUrlStateFromSearch(window.location.search)
      setRoutePath(window.location.pathname === '/compare' ? '/compare' : '/')
      setSearch(next.search)
      setSelectedProvider(next.provider)
      setSelectedFamily(next.family)
      setSelectedCapabilities(next.caps)
      setSelectedInputModality(next.inputModality)
      setSelectedOutputModality(next.outputModality)
      setSortBy(next.sortBy)
      setCatalogView(next.view)
      setSelectedStatus(next.status)
      setCurrentPage(next.page)
      setComparisonSelection(next.compare)
      setSelectedModelIdentity(selectedModelIdentityFromUrlState(next))

      if (!next.modelId) {
        setSheetOpen(false)
      } else {
        setSheetOpen(true)
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (skipNextUrlWriteRef.current) {
      skipNextUrlWriteRef.current = false
      lastUrlStateRef.current = {
        search,
        provider: effectiveSelectedProvider,
        family: effectiveSelectedFamily,
        caps: selectedCapabilities,
        inputModality: effectiveSelectedInputModality,
        outputModality: effectiveSelectedOutputModality,
        sortBy,
        view: catalogView,
        status: selectedStatus,
        page: activePage,
        modelId: sheetOpen ? selectedModelIdentity?.modelId ?? null : null,
        modelProviderId: sheetOpen ? selectedModel?.providerId ?? selectedModelIdentity?.providerId ?? null : null,
        compare: comparisonSelection,
      }
      return
    }

    const capsInStableOrder = CAPABILITIES
      .map((c) => c.key)
      .filter((key) => selectedCapabilities.includes(key))

    const nextState: UrlState = {
      search,
      provider: effectiveSelectedProvider,
      family: effectiveSelectedFamily,
      caps: capsInStableOrder,
      inputModality: effectiveSelectedInputModality,
      outputModality: effectiveSelectedOutputModality,
      sortBy,
      view: catalogView,
      status: selectedStatus,
      page: activePage,
      modelId: sheetOpen ? selectedModelIdentity?.modelId ?? null : null,
      modelProviderId: sheetOpen ? selectedModel?.providerId ?? selectedModelIdentity?.providerId ?? null : null,
      compare: comparisonSelection,
    }

    const nextSearch = buildUrlSearchFromState(nextState)
    const nextUrl = `${routePath}${nextSearch}${window.location.hash}`
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`
    if (nextUrl === currentUrl) {
      lastUrlStateRef.current = nextState
      return
    }

    const prev = lastUrlStateRef.current
    const shouldReplace = !prev || prev.search !== nextState.search
    if (shouldReplace) {
      window.history.replaceState(null, '', nextUrl)
    } else {
      window.history.pushState(null, '', nextUrl)
    }

    lastUrlStateRef.current = nextState
  }, [
    search,
    effectiveSelectedProvider,
    effectiveSelectedFamily,
    selectedCapabilities,
    effectiveSelectedInputModality,
    effectiveSelectedOutputModality,
    sortBy,
    catalogView,
    selectedStatus,
    activePage,
    routePath,
    sheetOpen,
    selectedModel,
    selectedModelIdentity,
    comparisonSelection,
  ])

  useEffect(() => {
    return () => {
      if (comparisonLimitNoticeTimerRef.current !== null) {
        window.clearTimeout(comparisonLimitNoticeTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return

      const key = e.key
      const metaOrCtrl = e.metaKey || e.ctrlKey
      const isSearchTarget = e.target === searchInputRef.current

      if (metaOrCtrl && key.toLowerCase() === 'k') {
        e.preventDefault()
        focusSearch()
        return
      }

      if (key === '/' && !shouldIgnoreKeydownTarget(e.target)) {
        e.preventDefault()
        focusSearch()
        return
      }

      if (key === 'Escape') {
        if (sheetOpen) {
          handleSheetOpenChange(false)
          return
        }
        const canHandleEscape = isSearchTarget || !shouldIgnoreKeydownTarget(e.target)
        if (search && canHandleEscape) {
          handleSearchChange('')
          focusSearch()
        }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [focusSearch, handleSearchChange, handleSheetOpenChange, search, sheetOpen])

  if (loading) {
    return <CatalogLoadingSkeleton view={catalogView} label={t('common.loading')} />
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-destructive">{t('common.error')}: {error}</div>
      </div>
    )
  }

  const alignHeaderToComparisonTable = isComparisonRoute && selectedComparisonModels.length >= 2
  const comparisonTableWidth = `${COMPARISON_FIELD_COLUMN_REM + Math.max(selectedComparisonModels.length, 1) * COMPARISON_MODEL_COLUMN_REM}rem`

  return (
    <div
      className={cn(
        'min-h-screen bg-background pb-[env(safe-area-inset-bottom)]',
        selectedComparisonModels.length > 0 && !isComparisonRoute && 'pb-40 sm:pb-32',
      )}
    >
      <div
        className={cn(
          isComparisonRoute && selectedComparisonModels.length >= 6
            ? 'w-full px-4 py-6 sm:py-8'
            : 'mx-auto max-w-7xl px-4 py-6 sm:py-8',
        )}
      >
        <header
          className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-start sm:justify-between"
          style={alignHeaderToComparisonTable ? { width: comparisonTableWidth, maxWidth: '100%', marginInline: 'auto' } : undefined}
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <img
                src="/models-dev-plus-icon.png"
                alt=""
                aria-hidden="true"
                className="size-9 shrink-0 rounded-lg border border-border object-cover sm:size-10"
              />
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('header.title')}</h1>
              <a
                href={MODELS_DEV_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {t('header.dataSource')}
                <ExternalLink className="size-3" aria-hidden="true" />
              </a>
            </div>
            <p className="text-muted-foreground mt-1">
              {t('header.subtitle', { modelCount: allModels.length, providerCount: providers.length })}
            </p>
          </div>
          <div className="flex items-center gap-2 self-start">
            <Select value={i18n.language} onValueChange={(lang) => {
              i18n.changeLanguage(lang)
              localStorage.setItem('language', lang)
            }}>
              <SelectTrigger className="w-32">
                <Languages className="size-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="en">{t('language.en')}</SelectItem>
                  <SelectItem value="zh">{t('language.zh')}</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={toggleTheme}>
                  {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isDark ? t('common.lightMode') : t('common.darkMode')}</TooltipContent>
            </Tooltip>
          </div>
        </header>

        {isComparisonRoute ? (
          <ModelComparisonPage
            models={selectedComparisonModels}
            onBackToCatalog={handleBackToCatalog}
            onRemove={handleRemoveComparisonModel}
            onViewDetails={handleViewDetails}
          />
        ) : (
          <>
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur mb-6 -mx-4 px-4 border-b pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3 sm:py-4">
          <div className="flex items-center gap-2 sm:hidden">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder={t('filter.searchPlaceholder')}
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9 h-11"
                ref={searchInputRef}
              />
            </div>

            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0 sm:hidden size-11 relative"
              onClick={() => setMobileFiltersOpen(true)}
              aria-label={t('filter.title')}
            >
              <Filter className="size-4" />
              {hasActiveFilters && (
                <span
                  className="absolute -top-1 -right-1 size-2.5 bg-primary rounded-full border-2 border-background"
                  aria-hidden="true"
                />
              )}
            </Button>
          </div>

          <div className="hidden sm:flex sm:flex-col sm:gap-3">
            <div className="flex items-center gap-3">
              <div className="relative w-[320px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder={t('filter.searchPlaceholder')}
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-9 h-9"
                  ref={searchInputRef}
                />
              </div>

              <ToggleGroup
                type="single"
                value={catalogView}
                onValueChange={(value) => {
                  if (value) handleCatalogViewChange(value as CatalogView)
                }}
                variant="outline"
                size="sm"
                spacing={0}
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

              <div className="flex items-center gap-3">
                <ProviderCombobox
                  value={selectedProvider}
                  onValueChange={handleProviderChange}
                  providers={providers}
                  className="w-48"
                />

                <FamilyCombobox
                  value={selectedFamily}
                  onValueChange={handleFamilyChange}
                  families={families}
                  className="w-48"
                />

                <Select value={sortBy} onValueChange={handleSortChange}>
                  <SelectTrigger
                    className={cn(
                      'w-56',
                      sortBy !== DEFAULT_URL_STATE.sortBy
                        && 'border-primary/50 bg-primary/5 text-primary hover:bg-primary/10',
                    )}
                  >
                    <SelectValue placeholder={t('filter.sortBy')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="lastUpdated">{t('sort.lastUpdated')}</SelectItem>
                      <SelectItem value="lastUpdatedAsc">{t('sort.lastUpdatedAsc')}</SelectItem>
                      <SelectItem value="releaseDate">{t('sort.releaseDate')}</SelectItem>
                      <SelectItem value="releaseDateAsc">{t('sort.releaseDateAsc')}</SelectItem>
                      <SelectItem value="name">{t('sort.name')}</SelectItem>
                      <SelectItem value="nameDesc">{t('sort.nameDesc')}</SelectItem>
                      <SelectItem value="contextSize">{t('sort.contextSize')}</SelectItem>
                      <SelectItem value="contextSizeAsc">{t('sort.contextSizeAsc')}</SelectItem>
                      <SelectItem value="outputLimit">{t('sort.outputLimit')}</SelectItem>
                      <SelectItem value="outputLimitAsc">{t('sort.outputLimitAsc')}</SelectItem>
                      <SelectItem value="inputCost">{t('sort.inputCost')}</SelectItem>
                      <SelectItem value="inputCostDesc">{t('sort.inputCostDesc')}</SelectItem>
                      <SelectItem value="outputCost">{t('sort.outputCost')}</SelectItem>
                      <SelectItem value="outputCostDesc">{t('sort.outputCostDesc')}</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>

                <Select value={selectedStatus} onValueChange={(value) => handleStatusChange(value as ModelStatusFilter)}>
                  <SelectTrigger
                    className={cn(
                      'w-40',
                      selectedStatus !== DEFAULT_URL_STATE.status
                        && 'border-primary/50 bg-primary/5 text-primary hover:bg-primary/10',
                    )}
                  >
                    <SelectValue placeholder={t('analysis.status')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="all">{t('analysis.statusAll')}</SelectItem>
                      <SelectItem value="stable">{t('analysis.statusStable')}</SelectItem>
                      <SelectItem value="alpha">{t('card.status.alpha')}</SelectItem>
                      <SelectItem value="beta">{t('card.status.beta')}</SelectItem>
                      <SelectItem value="deprecated">{t('card.status.deprecated')}</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pb-1">
              <span className="text-sm font-medium text-muted-foreground">{t('detail.capabilities')}:</span>
              <ToggleGroup
                type="multiple"
                value={selectedCapabilities}
                onValueChange={handleCapabilitiesChange}
                variant="outline"
                size="sm"
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

            <div className="flex flex-wrap items-start gap-4 pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">{t('filter.inputType')}:</span>
                  <ToggleGroup
                    type="multiple"
                    value={selectedInputModality}
                    onValueChange={handleInputModalitiesChange}
                    variant="outline"
                    size="sm"
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

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">{t('filter.outputType')}:</span>
                  <ToggleGroup
                    type="multiple"
                    value={selectedOutputModality}
                    onValueChange={handleOutputModalitiesChange}
                    variant="outline"
                    size="sm"
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
            </div>

          </div>

          <div className="text-sm text-muted-foreground mt-3">
            {t('filter.showingResults', {
              start: filteredModels.length > 0
                ? ((activePage - 1) * PAGE_SIZE) + 1
                : 0,
              end: Math.min(activePage * PAGE_SIZE, filteredModels.length),
              total: filteredModels.length
            })}
          </div>
        </div>

        <ComparisonSelectionBar
          models={selectedComparisonModels}
          onOpenComparison={handleOpenComparison}
          onRemove={handleRemoveComparisonModel}
          onClear={handleClearComparison}
        />

        {comparisonLimitNoticeVisible && (
          <div
            role="status"
            aria-live="polite"
            className="fixed left-1/2 top-[calc(env(safe-area-inset-top)+1rem)] z-50 -translate-x-1/2 rounded-lg border border-primary/30 bg-popover px-4 py-2 text-sm font-medium text-primary shadow-lg"
          >
            {t('compare.maxSelectionNotice', { max: MAX_COMPARISON_MODELS })}
          </div>
        )}

        {filteredModels.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            {t('filter.noResults')}
          </div>
        ) : catalogView === 'table' ? (
          <>
            <ModelAnalysisTable
              models={paginatedModels}
              sortBy={sortBy}
              onSortChange={handleSortChange}
              onViewDetails={handleViewDetails}
              comparisonSelectionKeys={comparisonSelectionKeys}
              isComparisonDisabled={selectedComparisonModels.length >= MAX_COMPARISON_MODELS}
              onComparisonToggle={handleComparisonToggle}
            />

            <Pagination
              currentPage={activePage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {paginatedModels.map((model) => (
                <ModelCard
                  key={`${model.providerId}-${model.id}`}
                  model={model}
                  onViewDetails={handleViewDetails}
                  isInComparison={comparisonSelectionKeys.has(getComparisonIdentityKey(model))}
                  isComparisonDisabled={selectedComparisonModels.length >= MAX_COMPARISON_MODELS}
                  onComparisonToggle={handleComparisonToggle}
                />
              ))}
            </div>

            <Pagination
              currentPage={activePage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </>
        )}
          </>
        )}
      </div>

      <ModelDetailSheet
        model={selectedModel}
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
      />

      <MobileFilterSheet
        open={mobileFiltersOpen}
        onOpenChange={setMobileFiltersOpen}
        selectedProvider={selectedProvider}
        onProviderChange={handleProviderChange}
        providers={providers}
        selectedFamily={selectedFamily}
        onFamilyChange={handleFamilyChange}
        families={families}
        sortBy={sortBy}
        onSortChange={handleSortChange}
        catalogView={catalogView}
        onCatalogViewChange={handleCatalogViewChange}
        selectedStatus={selectedStatus}
        onStatusChange={handleStatusChange}
        selectedCapabilities={selectedCapabilities}
        onCapabilitiesChange={handleCapabilitiesChange}
        selectedInputModality={selectedInputModality}
        selectedOutputModality={selectedOutputModality}
        onInputModalitiesChange={handleInputModalitiesChange}
        onOutputModalitiesChange={handleOutputModalitiesChange}
        inputModalities={inputModalities}
        outputModalities={outputModalities}
        resultCount={filteredModels.length}
        onReset={resetFilters}
        hasActiveFilters={hasActiveFilters}
      />
      <Analytics />
    </div>
  )
}
