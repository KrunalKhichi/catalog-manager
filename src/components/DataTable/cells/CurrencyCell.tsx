import { currency } from '../../../utils/format'

export function CurrencyCell({ value }: { value: number }) {
  return <span className="tabular-nums">{currency.format(value)}</span>
}
