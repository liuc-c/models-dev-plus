import React from 'react'

export function DetailRow({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  if (value === undefined || value === null || value === '' || value === '-') return null
  return (
    <div className="grid grid-cols-[minmax(5.5rem,0.42fr)_minmax(0,1fr)] items-start gap-3 border-b border-border/50 py-2 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`min-w-0 break-words text-right text-sm ${mono ? 'break-all font-mono text-xs' : ''}`}>{value}</span>
    </div>
  )
}
