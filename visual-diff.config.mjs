/**
 * Frame → route mapping for the visual diff harness.
 *
 *   node tools/visual-diff/index.mjs
 *
 * EDIT THIS FILE to add screens. Nothing here is auto-generated or inferred at
 * runtime — the harness only ever diffs what you list in `screens` below.
 *
 * IMPORTANT — what "route" means in staaash:
 * staaash is an Electron app with no URL router. Every "screen" is React state
 * inside App.jsx (view, layout, drawerId, settingsOpen, …), reached by clicking.
 * So a route here is a *recipe of UI steps*, not a path. See `steps` below.
 */

export default {
  figma: {
    fileKey: 'yPHeCTtyigj5XqiReFv8NW',

    // Export scale for the reference PNG. 2 = retina, matches the app capture,
    // which is forced to devicePixelRatio 2 so both sides are directly comparable.
    scale: 2
  },

  app: {
    // Electron app to launch, relative to this config file.
    dir: './desktop',

    // Env for the Electron process. Setting HOME here selects a seeded fixture
    // database and is what keeps the harness away from your real library at
    // ~/Library/Application Support/staaash.
    //
    // Seed or re-seed it with:
    //   node tools/visual-diff/seed-fixture.mjs
    //
    // Set `env: {}` to run against your real library instead — useful for
    // eyeballing the live app, but the scores become content-dependent and
    // will drift every time you save a bookmark.
    env: {
      HOME: './tools/visual-diff/fixtures/figma-mock/home'
    }
  },

  defaults: {
    // Time to wait after the route steps before capturing, for images/layout to settle.
    settleMs: 3500,

    // pixelmatch per-pixel colour tolerance, 0–1. Lower = stricter.
    // 0.1 is the usual "ignore imperceptible noise" value.
    threshold: 0.1,

    // false = anti-aliased pixels are NOT counted as differences. Keep false;
    // text rendering differs between Figma and Chromium on nearly every glyph edge.
    includeAA: false,

    // Hides scrollbars in every scroll container before capture.
    hideScrollbars: true
  },

  screens: [
    {
      // Used for output filenames: visual-diff/<id>.{shot,diff,side-by-side}.png
      id: 'everything',

      // From the Figma URL: ?node-id=5181-38
      figmaNodeId: '5181-38',

      // The frame's exact size in Figma. Verified against the node, not guessed —
      // the window is pinned to this so width matches the design 1:1.
      frame: { width: 1440, height: 792 },

      route: {
        description: 'Library → Everything, gallery layout. The app launches in ' +
          'this state (App.jsx:45 default), so the click is a redundant but ' +
          'explicit assertion that we captured the right view.',

        // Supported steps:
        //   { waitFor: '.sel' }                 wait for a selector to attach
        //   { click: '.sel' }                   click a selector
        //   { clickText: { sel, text } }        click the element matching text
        //   { key: 'Escape' }                   press a key
        //   { eval: 'document.title' }          run JS in the renderer
        //   { wait: 500 }                       sleep ms
        steps: [
          { waitFor: '.sb-row' },
          { clickText: { sel: '.sb-row', text: 'Everything' } },
          { waitFor: '.masonry' }
        ]
      },

      // OPTIONAL. Sub-regions to score separately, in CSS px within the frame.
      // The whole-screen number is dominated by gallery content (your real
      // bookmarks vs the design's mock cards), so these isolate the chrome —
      // which is the part that actually should match pixel-for-pixel.
      // Delete this array to get only the whole-screen number.
      //
      // These boxes were measured from the running app, not guessed. Re-measure
      // any time the layout moves:  node tools/visual-diff/index.mjs --rects
      regions: [
        { name: 'sidebar', x: 0, y: 0, width: 264, height: 792 },
        { name: 'topbar', x: 264, y: 0, width: 1176, height: 70 },
        { name: 'ask-bar', x: 264, y: 730, width: 1176, height: 46 },
        // The card grid: .content from y=70 down to where .ask-wrap starts at
        // y=730, so the ask bar is not counted twice.
        { name: 'gallery', x: 264, y: 70, width: 1176, height: 660 }
      ]
    }

    // To add a screen, copy the block above. Example — the settings overlay:
    //
    // {
    //   id: 'settings',
    //   figmaNodeId: '0000-000',            // ← the real node id from Figma
    //   frame: { width: 1440, height: 792 },
    //   route: {
    //     description: 'Settings overlay open',
    //     steps: [
    //       { waitFor: '.masonry' },
    //       { click: '[aria-label="Open settings"]' },
    //       { waitFor: '.overlay' }
    //     ]
    //   }
    // }
  ]
}
