// Single stroke-icon set, round caps, so weights stay consistent.
//
// Weight is the design's: Figma draws icons at stroke 1.5 on a 16 grid, checked
// against two independent families in the file — the five Library icons
// (5181:44) and the Collections header controls (5181:78). On the 24 grid that
// is 1.5 * 24/16 = 2.25 at the same render size. The set was previously 1.6 on
// the 24 grid, i.e. 1.067 rendered, which made every icon in the app about 30%
// lighter than drawn.
const I = ({ children, size = 16, viewBox = '0 0 24 24', strokeWidth = 2.25, ...rest }) => (
  <svg
    width={size}
    height={size}
    viewBox={viewBox}
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...rest}
  >
    {children}
  </svg>
)

/**
 * Icons traced from Figma are authored on its native 16px grid rather than
 * rescaled onto the 24 grid, so the geometry is the design's exactly.
 *
 * Stroke matches the set (see above) — 1.5 here is the same rendered weight as
 * 2.25 on the 24 grid.
 */
const FIGMA_16 = { viewBox: '0 0 16 16', strokeWidth: 1.5 }

// Figma 5181:47 — a panelled layout, not a 2x2 of separate squares. Its filled
// outline puts the outer edge at 0 with the straight run starting at 3.5111,
// so on the centre line the square is 0.667..15.333 with radius 2.844.
// Stroke 1.333, not the set's 1.5: Figma exports this one as an outlined fill
// whose right edge runs 14.667..16, so the design draws it lighter than its
// four neighbours. Matching each icon to its own source rather than smoothing
// over the design file's own inconsistency.
export const GridIcon = (p) => (
  <I {...FIGMA_16} strokeWidth={1.3333} {...p}>
    <rect x="0.667" y="0.667" width="14.667" height="14.667" rx="2.844" />
    <path d="M8 0.667V15.333" />
    <path d="M8 6H0.667" />
    <path d="M8 10H15.333" />
  </I>
)

// Figma 5181:55
export const BookIcon = (p) => (
  <I {...FIGMA_16} {...p}>
    <path d="M8 14C7.79219 13.5574 7.47278 13.1852 7.0775 12.925C6.68222 12.6649 6.22672 12.5455 5.76205 12.5455H2.02439C1.45863 12.5455 1 12.057 1 11.4545V3.09091C1 2.48841 1.45863 2 2.02439 2H5.95122C7.08276 2 8 2.97684 8 4.18182C8 2.97684 8.91724 2 10.0488 2H13.9756C14.5413 2 15 2.48841 15 3.09091V11.4545C15 12.057 14.5413 12.5455 13.9756 12.5455H10.238C9.77329 12.5455 9.31778 12.6649 8.9225 12.925C8.52722 13.1852 8.20781 13.5574 8 14ZM8 4.18182V14" />
  </I>
)

// Figma 5181:62
export const HeartIcon = ({ filled, ...p }) => (
  <I {...FIGMA_16} {...p} fill={filled ? 'currentColor' : 'none'}>
    <path d="M15 6.5C15 10.8125 8.58331 14 8 14C7.41669 14 1 10.8125 1 6.5C1 3.5 2.94444 2 4.88889 2C6.83331 2 8 3.125 8 3.125C8 3.125 9.16669 2 11.1111 2C13.0556 2 15 3.5 15 6.5Z" />
  </I>
)

// Figma 5181:68 — a tabbed folder, not an archive box with a lid.
export const ArchiveIcon = (p) => (
  <I {...FIGMA_16} {...p}>
    <path d="M2.625 5.11765V1.82353C2.625 1.36871 2.98877 1 3.4375 1H5.94471C6.16019 1 6.36689 1.08677 6.51923 1.2412L7.66827 2.40586C7.82061 2.56029 8.02731 2.64706 8.24279 2.64706H11.5625C12.0112 2.64706 12.375 3.01577 12.375 3.47059V5.11765M4.25 9.2353H7.5M14 12.3647V7.25882C14 6.79756 14 6.56699 13.9114 6.39083C13.8335 6.23588 13.7093 6.10989 13.5564 6.03093C13.3826 5.94118 13.1551 5.94118 12.7 5.94118H2.3C1.84496 5.94118 1.61744 5.94118 1.44363 6.03093C1.29075 6.10989 1.16646 6.23588 1.08855 6.39083C1 6.56699 1 6.79756 1 7.25882V12.3647C1 13.2871 1 13.7484 1.17712 14.1007C1.33291 14.4106 1.5815 14.6626 1.88727 14.8205C2.23487 15 2.68992 15 3.6 15H11.4C12.3101 15 12.7652 15 13.1128 14.8205C13.4185 14.6626 13.6671 14.4106 13.8229 14.1007C14 13.7484 14 13.2871 14 12.3647Z" />
  </I>
)

// Figma 5181:74 — same reading as the old one, but the handle is an arc rather
// than a rounded rectangle, and the can is centred on 8.5 rather than 8.
export const TrashIcon = (p) => (
  <I {...FIGMA_16} {...p}>
    <path d="M3.14706 4.02703L3.81355 13.5906C3.86885 14.3842 4.5355 15 5.33933 15H11.6607C12.4645 15 13.1311 14.3842 13.1864 13.5906L13.8529 4.02703M6.97059 7.43243V11.2162M10.0294 7.43243V11.2162M2 3.64865H15M5.49541 3.45659C5.76502 2.05753 7.00768 1 8.5 1C9.99232 1 11.235 2.05753 11.5046 3.45659" />
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
