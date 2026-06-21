import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { CatalogView } from '@/types'

function FilterSkeleton() {
  return (
    <div className="sticky top-0 z-10 -mx-4 mb-6 border-b bg-background/95 px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3 backdrop-blur sm:py-4">
      <div className="flex flex-col gap-3 sm:hidden">
        <div className="flex items-center gap-2">
          <Skeleton className="h-11 min-w-0 flex-1" />
          <Skeleton className="size-11 shrink-0" />
        </div>
        <Skeleton className="h-5 w-44" />
      </div>

      <div className="hidden flex-col gap-3 sm:flex">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-[320px]" />
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-9 w-44" />
          <Skeleton className="h-9 w-40" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-8 w-24" />
        </div>
        <Skeleton className="h-5 w-56" />
      </div>
    </div>
  )
}

function CardGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 9 }, (_, index) => (
        <Card key={index} size="sm">
          <CardHeader>
            <div className="flex items-start gap-3">
              <Skeleton className="size-10 shrink-0 rounded-lg" />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <Skeleton className="h-6 w-16" />
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-16" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl bg-card text-card-foreground ring-1 ring-foreground/10">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-24" />
      </div>
      <Table className="min-w-[1180px] text-xs">
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            {Array.from({ length: 11 }, (_, index) => (
              <TableHead key={index} className="h-8 px-2 py-1">
                <Skeleton className="h-4 w-20" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 12 }, (_, rowIndex) => (
            <TableRow key={rowIndex} className="h-11">
              {Array.from({ length: 11 }, (_, cellIndex) => (
                <TableCell key={cellIndex} className="px-2 py-1.5">
                  <Skeleton className="h-4 w-full min-w-12" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export function CatalogLoadingSkeleton({
  view,
  label,
}: {
  view: CatalogView
  label: string
}) {
  return (
    <div className="min-h-screen bg-background" aria-busy="true" aria-label={label}>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
        <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex items-center gap-2">
              <Skeleton className="size-10 rounded-lg" />
              <Skeleton className="h-8 w-56" />
              <Skeleton className="h-7 w-28" />
            </div>
            <Skeleton className="h-5 w-full max-w-lg" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="size-9" />
          </div>
        </header>

        <FilterSkeleton />
        {view === 'table' ? <TableSkeleton /> : <CardGridSkeleton />}
      </div>
    </div>
  )
}
