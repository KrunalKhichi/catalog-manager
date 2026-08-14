const STYLES: Record<string, string> = {
  Active: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  Discontinued: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  Draft: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  Backorder: 'bg-amber-50 text-amber-700 ring-amber-600/20',
}

export function StatusPill({ value }: { value: string }) {
  const style = STYLES[value] ?? 'bg-slate-100 text-slate-600 ring-slate-500/20'
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${style}`}>
      {value}
    </span>
  )
}
