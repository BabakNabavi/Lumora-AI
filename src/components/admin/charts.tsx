import { cn } from '@/lib/utils'

/**
 * Small, dependency-free charts.
 *
 * The admin panel needs two shapes — a daily volume bar chart and a share
 * breakdown — and both are a few divs. Adding a charting library for this would
 * be more code shipped to the browser than the whole page.
 */

export function VolumeChart({
  data,
  className,
}: {
  data: { date: string; total: number; failed: number }[]
  className?: string
}) {
  const max = Math.max(1, ...data.map((d) => d.total))

  return (
    <figure className={cn('rounded-lg border border-line bg-surface p-6', className)}>
      <figcaption className="flex items-baseline justify-between gap-4">
        <span className="eyebrow">Generations per day</span>
        <span className="text-xs text-ink-faint">last {data.length} days</span>
      </figcaption>

      <div className="mt-7 flex h-40 items-end gap-1.5" role="img" aria-label="Daily generation volume">
        {data.map((day) => {
          const succeeded = day.total - day.failed
          return (
            <div
              key={day.date}
              className="group relative flex flex-1 flex-col justify-end gap-px"
              title={`${day.date}: ${day.total} generation${day.total === 1 ? '' : 's'}${day.failed ? `, ${day.failed} failed` : ''}`}
            >
              {day.failed > 0 && (
                <div
                  className="w-full rounded-t-sm bg-danger/45"
                  style={{ height: `${(day.failed / max) * 100}%` }}
                />
              )}
              <div
                className={cn(
                  'w-full bg-ink/85 transition-colors group-hover:bg-accent',
                  day.failed === 0 && 'rounded-t-sm',
                )}
                style={{
                  height: `${(succeeded / max) * 100}%`,
                  minHeight: day.total > 0 ? '2px' : '0',
                }}
              />
              <div className="h-px w-full bg-line" />
            </div>
          )
        })}
      </div>

      <div className="mt-4 flex items-center gap-5 text-[0.6875rem] text-ink-faint">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-sm bg-ink/85" aria-hidden />
          Completed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-sm bg-danger/45" aria-hidden />
          Failed
        </span>
      </div>
    </figure>
  )
}

export function ShareList({
  title,
  rows,
  className,
}: {
  title: string
  rows: { id: string; label: string; count: number; share: number }[]
  className?: string
}) {
  return (
    <figure className={cn('rounded-lg border border-line bg-surface p-6', className)}>
      <figcaption className="eyebrow">{title}</figcaption>

      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-ink-faint">No data yet.</p>
      ) : (
        <ul className="mt-6 space-y-3.5">
          {rows.map((row) => (
            <li key={row.id}>
              <div className="flex items-baseline justify-between gap-3 text-[0.8125rem]">
                <span className="text-ink-body">{row.label}</span>
                <span className="tabular-nums text-ink-faint">
                  {row.count} · {row.share}%
                </span>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-line-faint">
                <div
                  className="h-full rounded-full bg-ink/75"
                  style={{ width: `${Math.max(2, row.share)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </figure>
  )
}
