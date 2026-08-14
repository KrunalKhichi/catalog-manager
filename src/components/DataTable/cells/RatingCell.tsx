export function RatingCell({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-1 tabular-nums">
      <span className="text-amber-500">★</span>
      <span>{value.toFixed(1)}</span>
    </span>
  )
}
