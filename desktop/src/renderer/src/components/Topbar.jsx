import { FilterIcon, PlusIcon, SunIcon } from './Icons.jsx'

export default function Topbar({
  title,
  count,
  layout,
  sidebarCollapsed,
  onToggleSidebar,
  onLayout,
  onNew,
  onTheme
}) {
  return (
    <header className="topbar">
      <button
        className={`tb-collapse${sidebarCollapsed ? ' is-collapsed' : ''}`}
        onClick={onToggleSidebar}
        aria-label={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
        style={sidebarCollapsed ? { marginLeft: 62 } : undefined}
      >
        <span className="tb-collapse-glyph" aria-hidden="true">
          <span />
          <span />
        </span>
      </button>
      <div className="tb-title">
        <h1>{title}</h1>
        <span className="tb-sub">
          • {count} bookmark{count === 1 ? '' : 's'}
        </span>
        <button className="tb-filter" aria-label="Filter">
          <FilterIcon size={18} />
        </button>
      </div>

      <div className="seg" role="tablist" aria-label="View layout">
        <button
          role="tab"
          aria-selected={layout === 'gallery'}
          className={layout === 'gallery' ? 'is-active' : ''}
          onClick={() => onLayout('gallery')}
        >
          Gallery
        </button>
        <button
          role="tab"
          aria-selected={layout === 'list'}
          className={layout === 'list' ? 'is-active' : ''}
          onClick={() => onLayout('list')}
        >
          List
        </button>
      </div>

      <button className="btn-new" onClick={onNew}>
        <PlusIcon size={9} strokeWidth="2.4" />
        New
      </button>

      <button className="tb-icon-btn" onClick={onTheme} aria-label="Toggle theme">
        <SunIcon size={16} />
      </button>
    </header>
  )
}
