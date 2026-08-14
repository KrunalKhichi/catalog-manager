const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

export function CurrencyCell({ value }: { value: number }) {
  return <span className="tabular-nums">{formatter.format(value)}</span>
}
