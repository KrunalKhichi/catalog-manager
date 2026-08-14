export function BooleanCell({ value }: { value: boolean }) {
  return value ? (
    <span className="text-emerald-600 font-medium">Yes</span>
  ) : (
    <span className="text-slate-400">No</span>
  )
}
