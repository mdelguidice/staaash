// Single stroke-icon set (1.6px, round caps) so weights stay consistent.
const I = ({ children, size = 16, ...rest }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...rest}
  >
    {children}
  </svg>
)

export const GridIcon = (p) => (
  <I {...p}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
  </I>
)

export const BookIcon = (p) => (
  <I {...p}>
    <path d="M12 6.5C10.6 5 8.6 4.2 5.5 4.2c-.8 0-1.5.1-2 .2v14.4c.5-.1 1.2-.2 2-.2 3.1 0 5.1.8 6.5 2.3 1.4-1.5 3.4-2.3 6.5-2.3.8 0 1.5.1 2 .2V4.4c-.5-.1-1.2-.2-2-.2-3.1 0-5.1.8-6.5 2.3Z" />
    <path d="M12 6.5v14.4" />
  </I>
)

export const HeartIcon = ({ filled, ...p }) => (
  <I {...p} fill={filled ? 'currentColor' : 'none'}>
    <path d="M12 20.3 4.8 13a4.7 4.7 0 0 1 0-6.6 4.6 4.6 0 0 1 6.5 0l.7.7.7-.7a4.6 4.6 0 0 1 6.5 0 4.7 4.7 0 0 1 0 6.6L12 20.3Z" />
  </I>
)

export const ArchiveIcon = (p) => (
  <I {...p}>
    <rect x="3.5" y="4" width="17" height="4.5" rx="1" />
    <path d="M5 8.5V18a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5" />
    <path d="M9.8 12.5h4.4" />
  </I>
)

export const TrashIcon = (p) => (
  <I {...p}>
    <path d="M4.5 6.5h15" />
    <path d="M9 6.5V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v1.5" />
    <path d="M6.5 6.5 7.4 19a2 2 0 0 0 2 1.8h5.2a2 2 0 0 0 2-1.8l.9-12.5" />
    <path d="M10 10.7v6M14 10.7v6" />
  </I>
)

export const PlusIcon = (p) => (
  <I {...p}>
    <path d="M12 5.5v13M5.5 12h13" />
  </I>
)

export const ChevronIcon = ({ dir = 'down', ...p }) => {
  const rot = { down: 0, up: 180, left: 90, right: -90 }[dir]
  return (
    <I {...p}>
      <path d="m6.5 9.5 5.5 5.5 5.5-5.5" transform={`rotate(${rot} 12 12)`} />
    </I>
  )
}

export const SidebarIcon = (p) => (
  <I {...p}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="3.5" />
    <rect x="6.2" y="7.2" width="5" height="9.6" rx="1.6" fill="currentColor" stroke="none" />
  </I>
)

export const FilterIcon = (p) => (
  <I {...p}>
    <path d="M5 7h14M7.5 12h9M10.5 17h3" />
  </I>
)

export const SunIcon = (p) => (
  <I {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 3v1.8M12 19.2V21M3 12h1.8M19.2 12H21M5.6 5.6l1.3 1.3M17.1 17.1l1.3 1.3M18.4 5.6l-1.3 1.3M6.9 17.1l-1.3 1.3" />
  </I>
)

export const ExtLinkIcon = (p) => (
  <I {...p}>
    <path d="M14 4.5h5.5V10M19.5 4.5 11 13M18 13.5V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4.5" />
  </I>
)

export const NoteIcon = (p) => (
  <I {...p}>
    <path d="M5 4.5h14a1 1 0 0 1 1 1V15l-5 5H6a1 1 0 0 1-1-1V4.5Z" transform="translate(-1 -0.5)" />
    <path d="M14 19.5V15h4.5" transform="translate(-1 -0.5)" />
  </I>
)

export const SlidersIcon = (p) => (
  <I {...p}>
    <path d="M5 8h8M17 8h2M5 16h2M11 16h8" />
    <circle cx="15" cy="8" r="2" />
    <circle cx="9" cy="16" r="2" />
  </I>
)

export const HelpIcon = (p) => (
  <I {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M9.6 9.4a2.5 2.5 0 0 1 4.8 1c0 1.6-2.4 2-2.4 3.4" />
    <path d="M12 16.8h.01" />
  </I>
)

export const DotsIcon = (p) => (
  <I {...p}>
    <circle cx="5.5" cy="12" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="18.5" cy="12" r="1.1" fill="currentColor" stroke="none" />
  </I>
)

export const CheckIcon = (p) => (
  <I {...p}>
    <path d="m5.5 12.5 4 4 9-9" />
  </I>
)

export const XIcon = (p) => (
  <I {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </I>
)

export const SearchIcon = (p) => (
  <I {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.5 4.5" />
  </I>
)

export const RestoreIcon = (p) => (
  <I {...p}>
    <path d="M4 9.5a8.5 8.5 0 1 1 1.6 7" />
    <path d="M4 5v4.5h4.5" />
  </I>
)

export const ChestIcon = (p) => (
  <I {...p} size={72} strokeWidth="1.1">
    <path d="M4 10a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v9H4v-9Z" />
    <path d="M4 12h16" />
    <path d="M10.8 12h2.4v3h-2.4z" />
    <path d="M12 6v-.5" />
  </I>
)
