/**
 * The handful of class strings that repeat across the toolbar, dialogs and
 * pagination. Kept as constants rather than wrapper components so the markup
 * stays readable and one-off overrides are just appended.
 */
export const BUTTON =
  'inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:opacity-50 disabled:hover:bg-white'

export const BUTTON_PRIMARY =
  'inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600'

export const BUTTON_DANGER =
  'inline-flex items-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 disabled:opacity-50'

export const INPUT =
  'w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 disabled:bg-slate-50'

/** Square icon-only button; every use needs its own aria-label and title. */
export const ICON_BUTTON =
  'inline-flex size-7 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-500'
