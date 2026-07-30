/**
 * Declarative content spec for the `figma-mock` fixture.
 *
 * Every number here was read off the Figma export at 2x, not invented:
 *   visual-diff/figma/everything@2x.png
 *
 * Regenerate the database after editing:
 *   node tools/visual-diff/seed-fixture.mjs
 *
 * The seeder writes each card's `aspect` as image_w/image_h, and the app takes
 * its shape from that (cardShape in renderer/src/lib/format.js) — which is how
 * the fixture reproduces the mock's card proportions without touching app code.
 * Card preview images are cropped out of the Figma export itself, so the gallery
 * compares layout and chrome rather than unrelated artwork.
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

  // The mock shows five collections then a "••• More" row. COLLECTIONS_VISIBLE
  // is 5 (it was 6 until 59bfbe9 matched it to the design), so seeding seven
  // renders exactly five rows plus More, as drawn.
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
  // aspects.
  //
  // These are the DESIGN's two thumbnail ratios, taken from the frame itself:
  // 365x195 = 1.872 and 365x350 = 1.043 (5181:230). The seeder writes them as
  // image_w/image_h and the app lays out from those, so the app renders 1.872
  // exactly rather than approximating it — which is what makes .card-media's
  // height assertable at all. Both are well clear of the tall-end clamp
  // (MAX_CARD_TALLNESS = 1.5, i.e. aspect >= 0.667), so no fixture card crops.
  cards: [
    { slug: 'rauno', title: 'Rauno Freiberg', url: 'https://rauno.me', domain: 'rauno.me', daysAgo: 2, aspect: 1.872 },
    { slug: 'polar', title: 'Polar', url: 'https://polar.sh', domain: 'polar.sh', daysAgo: 2, aspect: 1.043 },
    { slug: 'dropshot', title: 'Dropshot — cinematic product shots in seconds', url: 'https://usedropshot.com', domain: 'usedropshot.com', daysAgo: 3, aspect: 1.872 },
    { slug: 'interfaces', title: 'Interfaces.dev', url: 'https://interfaces.dev', domain: 'interfaces.dev', daysAgo: 3, aspect: 1.043 },
    { slug: 'aiid', title: 'AI in Design Report 2026', url: 'https://stateofaidesign.com', domain: 'stateofaidesign.com', daysAgo: 7, aspect: 1.872 },
    { slug: 'collins', title: 'COLLINS', url: 'https://wearecollins.com', domain: 'wearecollins.com', daysAgo: 7, aspect: 1.043 },

    // These two sit at the bottom edge of the frame and are cut off in the
    // mock — their domain and title are NOT legible, so the values below are
    // placeholders chosen only to occupy the right slots. Their meta rows fall
    // outside the captured viewport, so they contribute image pixels only.
    { slug: 'unknown-right', title: 'Unknown (clipped in mock)', url: 'https://example.com/a', domain: 'example.com', daysAgo: 7, aspect: 1.043 },
    { slug: 'unknown-left', title: 'Unknown (clipped in mock)', url: 'https://example.com/b', domain: 'example.com', daysAgo: 8, aspect: 1.872 }
  ],

  // Filler makes the counts add up. It is created far enough in the past to
  // sort below every card above, so it never reaches the captured viewport.
  filler: {
    oldestDaysAgo: 400,
    startDaysAgo: 30
  }
}
