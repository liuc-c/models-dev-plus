import { useCallback, useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertCircle, Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { FlattenedModel } from '@/types'
import {
  stringifyOpenCodeConfig,
  stringifyOpenCodeModelFragment,
  stringifyOpenCodeProviderFragment,
} from '@/lib/opencode-config'
import {
  cn,
  stringifyCompleteModelMetadata,
  stringifyModelDefinition,
} from '@/lib/utils'

type CopyTarget =
  | 'modelsdev-fragment'
  | 'modelsdev-metadata'
  | 'opencode-model-fragment'
  | 'opencode-provider-fragment'
  | 'opencode-config'

type CopyStatus = 'idle' | 'copied' | 'failed'

export type ModelJsonCopyMode = 'catalog' | 'detail'

const STATUS_RESET_MS = 2000

function stopCardBubble(event: MouseEvent) {
  event.stopPropagation()
}

function buildCopyPayload(target: CopyTarget, model: FlattenedModel): string {
  switch (target) {
    case 'modelsdev-fragment':
      return stringifyModelDefinition(model)
    case 'modelsdev-metadata':
      return stringifyCompleteModelMetadata(model)
    case 'opencode-model-fragment':
      return stringifyOpenCodeModelFragment(model)
    case 'opencode-provider-fragment':
      return stringifyOpenCodeProviderFragment(model)
    case 'opencode-config':
      return stringifyOpenCodeConfig(model)
  }
}

export function ModelJsonCopyMenu({
  model,
  mode,
  className,
}: {
  model: FlattenedModel
  mode: ModelJsonCopyMode
  className?: string
}) {
  const { t } = useTranslation()
  const [status, setStatus] = useState<CopyStatus>('idle')
  const [lastTarget, setLastTarget] = useState<CopyTarget | null>(null)
  const resetTimerRef = useRef<number | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current)
      }
    }
  }, [])

  const scheduleReset = useCallback(() => {
    if (resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current)
    }
    resetTimerRef.current = window.setTimeout(() => {
      if (!mountedRef.current) return
      setStatus('idle')
      setLastTarget(null)
      resetTimerRef.current = null
    }, STATUS_RESET_MS)
  }, [])

  const copyPayload = useCallback(
    async (target: CopyTarget) => {
      try {
        const text = buildCopyPayload(target, model)
        await navigator.clipboard.writeText(text)
        if (!mountedRef.current) return
        setLastTarget(target)
        setStatus('copied')
      } catch {
        if (!mountedRef.current) return
        setLastTarget(target)
        setStatus('failed')
      }
      scheduleReset()
    },
    [model, scheduleReset],
  )

  const statusMessage = (() => {
    if (status === 'failed') return t('copyJson.failed')
    if (status !== 'copied' || !lastTarget) return ''
    switch (lastTarget) {
      case 'modelsdev-fragment':
        return t('copyJson.copiedModelsDevFragment')
      case 'modelsdev-metadata':
        return t('copyJson.copiedModelsDevMetadata')
      case 'opencode-model-fragment':
        return t('copyJson.copiedOpencodeModelFragment')
      case 'opencode-provider-fragment':
        return t('copyJson.copiedOpencodeProviderFragment')
      case 'opencode-config':
        return t('copyJson.copiedOpencodeConfig')
    }
  })()

  const isIcon = mode === 'catalog'
  const modelsDevTarget: CopyTarget =
    mode === 'catalog' ? 'modelsdev-fragment' : 'modelsdev-metadata'
  const modelsDevLabel =
    mode === 'catalog' ? t('copyJson.modelsDevFragment') : t('copyJson.modelsDevMetadata')
  const modelsDevHint =
    mode === 'catalog' ? t('copyJson.modelsDevFragmentHint') : t('copyJson.modelsDevMetadataHint')

  const idleTriggerLabel = t('copyJson.trigger')
  const triggerLabel =
    status === 'failed'
      ? t('copyJson.failedShort')
      : status === 'copied'
        ? t('common.copied')
        : idleTriggerLabel

  const triggerIcon: ReactNode =
    status === 'copied' ? (
      <Check className="text-primary" aria-hidden="true" />
    ) : status === 'failed' ? (
      <AlertCircle className="text-destructive" aria-hidden="true" />
    ) : (
      <Copy aria-hidden="true" />
    )

  const triggerButton = (
    <Button
      type="button"
      variant={isIcon ? 'ghost' : 'outline'}
      size={isIcon ? 'icon-sm' : 'sm'}
      className={cn(className)}
      aria-label={triggerLabel}
      onClick={stopCardBubble}
      onPointerDown={stopCardBubble}
    >
      {isIcon ? (
        triggerIcon
      ) : (
        <>
          {status === 'copied' ? (
            <Check data-icon="inline-start" aria-hidden="true" className="text-primary" />
          ) : status === 'failed' ? (
            <AlertCircle data-icon="inline-start" aria-hidden="true" className="text-destructive" />
          ) : (
            <Copy data-icon="inline-start" aria-hidden="true" />
          )}
          {status === 'copied'
            ? t('common.copied')
            : status === 'failed'
              ? t('copyJson.failedShort')
              : t('common.copy')}
        </>
      )}
    </Button>
  )

  return (
    <>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>{triggerButton}</DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>{triggerLabel}</TooltipContent>
        </Tooltip>

        <DropdownMenuContent
          align="end"
          className="min-w-60"
          onClick={stopCardBubble}
          onPointerDown={stopCardBubble}
        >
          <DropdownMenuGroup>
            <DropdownMenuLabel>{t('copyJson.modelsDevGroup')}</DropdownMenuLabel>
            <DropdownMenuItem
              className="flex-col items-start gap-0.5 py-1.5"
              onSelect={() => {
                void copyPayload(modelsDevTarget)
              }}
            >
              <span>{modelsDevLabel}</span>
              <span className="text-xs font-normal text-muted-foreground">{modelsDevHint}</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuGroup>
            <DropdownMenuLabel>{t('copyJson.opencodeGroup')}</DropdownMenuLabel>
            <DropdownMenuItem
              className="flex-col items-start gap-0.5 py-1.5"
              onSelect={() => {
                void copyPayload('opencode-model-fragment')
              }}
            >
              <span>{t('copyJson.opencodeModelFragment')}</span>
              <span className="text-xs font-normal text-muted-foreground">
                {t('copyJson.opencodeModelFragmentHint')}
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="flex-col items-start gap-0.5 py-1.5"
              onSelect={() => {
                void copyPayload('opencode-provider-fragment')
              }}
            >
              <span>{t('copyJson.opencodeProviderFragment')}</span>
              <span className="text-xs font-normal text-muted-foreground">
                {t('copyJson.opencodeProviderFragmentHint')}
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="flex-col items-start gap-0.5 py-1.5"
              onSelect={() => {
                void copyPayload('opencode-config')
              }}
            >
              <span>{t('copyJson.opencodeConfig')}</span>
              <span className="text-xs font-normal text-muted-foreground">
                {t('copyJson.opencodeConfigHint')}
              </span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {statusMessage}
      </span>
    </>
  )
}
