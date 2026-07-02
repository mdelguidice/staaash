import { ChestIcon } from './Icons.jsx'

export default function EmptyState({ view, query, onNew }) {
  let heading = 'Nothing staaashed yet'
  let sub = 'Press N to save your first link, or drag one in.'
  if (query) {
    heading = 'No matches'
    sub = 'Nothing in your staaash matches that. Try different words.'
  } else if (view.type === 'library') {
    if (view.key === 'unread') {
      heading = 'All caught up'
      sub = 'Everything here has been read. Nice.'
    } else if (view.key === 'favorite') {
      heading = 'No favorites yet'
      sub = 'Tap the heart on anything worth keeping close.'
    } else if (view.key === 'archived') {
      heading = 'Nothing archived'
      sub = 'Archive finished links to keep Everything fresh.'
    } else if (view.key === 'trash') {
      heading = 'Trash is empty'
      sub = 'Deleted bookmarks wait here before they’re gone for good.'
    }
  } else if (view.type === 'collection') {
    heading = 'An empty shelf'
    sub = 'New saves that fit this collection will land here.'
  }

  return (
    <div className="empty">
      <div>
        <ChestIcon />
        <h2>{heading}</h2>
        <p>{sub}</p>
      </div>
    </div>
  )
}
