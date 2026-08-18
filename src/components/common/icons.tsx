/**
 * Inline SVGs rather than an icon package: the app needs nine glyphs, and
 * nine paths cost less than a dependency plus its tree-shaking caveats.
 * All of them inherit `currentColor` and size from the caller's font size.
 */
interface IconProps {
  className?: string
}

function Svg({ className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  )
}

export function SearchIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </Svg>
  )
}

export function ColumnsIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <line x1="9" y1="4" x2="9" y2="20" />
      <line x1="15" y1="4" x2="15" y2="20" />
    </Svg>
  )
}

export function FilterIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <polygon points="21 4 3 4 10 12.5 10 19 14 21 14 12.5 21 4" />
    </Svg>
  )
}

export function EditIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </Svg>
  )
}

export function TrashIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </Svg>
  )
}

export function ChevronLeftIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <polyline points="15 18 9 12 15 6" />
    </Svg>
  )
}

export function ChevronRightIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <polyline points="9 18 15 12 9 6" />
    </Svg>
  )
}

export function ChevronsLeftIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <polyline points="11 17 6 12 11 7" />
      <polyline points="18 17 13 12 18 7" />
    </Svg>
  )
}

export function ChevronsRightIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <polyline points="13 17 18 12 13 7" />
      <polyline points="6 17 11 12 6 7" />
    </Svg>
  )
}

export function BookmarkIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </Svg>
  )
}

export function DownloadIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </Svg>
  )
}
