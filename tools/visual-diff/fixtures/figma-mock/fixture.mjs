/**
 * Declarative content spec for the `figma-mock` fixture.
 *
 * Every number here was read off the Figma export at 2x, not invented:
 *   visual-diff/figma/everything@2x.png
 *
 * Regenerate the database after editing:
 *   node tools/visual-diff/seed-fixture.mjs
 *
 * The seeder derives bookmark ids so that the app's own cardAspect() hash
 * (renderer/src/lib/format.js) lands on the `aspect` requested below — that is
 * how the fixture reproduces the mock's card proportions without touching app
 * code. Card preview images are cropped out of the Figma export itself, so the
 * gallery compares layout and chrome rather than unrelated artwork.
 */

export default {
  // Which screen in visual-diff.config.mjs this fixture is built against —
  // the seeder uses its frame size and Figma reference to crop card images.
  screen: 'everything',

  // Sidebar / topbar counts, straight off the mock.
  //   everything = !deleted && !archived      → 235
  //   unread     = everything && !read_at     → 189
  //   favorite   = everything && favorited    → 4
  //   archived   = archived && !deleted       → 3
  //   trash      = deleted                    → 0 (no badge shown in the mock)
  library: { everything: 235, unread: 189, favorite: 4, archived: 3, trash: 0 },

  // The mock shows five collections then a "••• More" row. The app's
  // COLLECTIONS_VISIBLE is 6, so "More" only appears at seven or more. We seed
  // seven to reproduce the More row; the sixth visible row is a KNOWN
  // divergence between the design (threshold 5) and the code (threshold 6),
  // and the diff is supposed to show it. See README.
  collections: [
    { name: 'Craft & detail', count: 4 },
    { name: 'Typography', count: 2 },
    { name: 'Motion', count: 2 },
    { name: 'Systems', count: 3 },
    { name: 'Reading List', count: 1 },
    { name: 'Inspiration', count: 0 },
    { name: 'Later', count: 0 }
  ],

  // The mock renders the TAGS header with no chips under it.
  tags: [],

  // The cards visible above the fold, in creation order (newest first). The
  // app's masonry places 1→left, 2→middle, 3→right, then fills the shortest
  // column — which reproduces the mock's arrangement exactly with these
  // aspects. `aspect` must be one of the app's CARD_ASPECTS buckets:
  // 1.78, 1.6, 1.42, 1.25, 1.0, 0.85.
  cards: [
    { slug: 'rauno', title: 'Rauno Freiberg', url: 'https://rauno.me', domain: 'rauno.me', daysAgo: 2, aspect: 1.78 },
    { slug: 'polar', title: 'Polar', url: 'https://polar.sh', domain: 'polar.sh', daysAgo: 2, aspect: 1.0 },
    { slug: 'dropshot', title: 'Dropshot — cinematic product shots in seconds', url: 'https://usedropshot.com', domain: 'usedropshot.com', daysAgo: 3, aspect: 1.78 },
    { slug: 'interfaces', title: 'Interfaces.dev', url: 'https://interfaces.dev', domain: 'interfaces.dev', daysAgo: 3, aspect: 1.0 },
    { slug: 'aiid', title: 'AI in Design Report 2026', url: 'https://stateofaidesign.com', domain: 'stateofaidesign.com', daysAgo: 7, aspect: 1.78 },
    { slug: 'collins', title: 'COLLINS', url: 'https://wearecollins.com', domain: 'wearecollins.com', daysAgo: 7, aspect: 0.85 },

    // These two sit at the bottom edge of the frame and are cut off in the
    // mock — their domain and title are NOT legible, so the values below are
    // placeholders chosen only to occupy the right slots. Their meta rows fall
    // outside the captured viewport, so they contribute image pixels only.
    { slug: 'unknown-right', title: 'Unknown (clipped in mock)', url: 'https://example.com/a', domain: 'example.com', daysAgo: 7, aspect: 1.0 },
    { slug: 'unknown-left', title: 'Unknown (clipped in mock)', url: 'https://example.com/b', domain: 'example.com', daysAgo: 8, aspect: 1.6 }
  ],

  // Filler makes the counts add up. It is created far enough in the past to
  // sort below every card above, so it never reaches the captured viewport.
  filler: {
    oldestDaysAgo: 400,
    startDaysAgo: 30
  }
}
