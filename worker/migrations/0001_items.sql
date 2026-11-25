-- One row per thing saved from the phone. A screenshot and a link shared
-- within the merge window become one row (see mergeTarget in src/index.ts).
CREATE TABLE items (
  id TEXT PRIMARY KEY,
  saved_at TEXT NOT NULL,       -- when Mike saved it, from the phone's clock
  received_at TEXT NOT NULL,    -- when the Worker got it
  url TEXT,
  note TEXT,
  images TEXT NOT NULL DEFAULT '[]', -- JSON [{ key, type, size }], keys in R2
  synced_at TEXT                -- set by the desktop; the row and images stay
);
CREATE INDEX items_unsynced ON items (synced_at, received_at);

-- The phone retries a save it isn't sure was sent. Each attempt carries the
-- same client_id, so a retry of a save that did arrive changes nothing.
CREATE TABLE received (
  client_id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL
);
