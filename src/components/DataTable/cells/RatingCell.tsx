export function RatingCell({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-1 tabular-nums">
      <span>{value.toFixed(1)}</span>
      <span className={value >= 4 ? 'text-amber-500' : 'text-slate-300'}>★</span>
    </span>
  )
}
