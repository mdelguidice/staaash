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
    },

    {
      id: 'settings',

      // NOT DESIGNED YET. There is no settings frame in the Figma file, so a
      // pixel delta is impossible by definition rather than pending a lookup.
      // The screen still earns its place: it calibrates, audits tokens, and
      // diffs computed styles. Add the node id when the design exists.
      figmaNodeId: null,

      frame: { width: 1440, height: 792 },

      route: {
        description: 'Settings overlay open, over the Everything gallery.',
        steps: [
          { waitFor: '.masonry' },
          { click: '[aria-label="Open settings"]' },
          { waitFor: '.modal' }
        ]
      },

      // Measured with --rects against this screen's own route, not guessed.
      regions: [
        { name: 'sidebar', x: 0, y: 0, width: 264, height: 792 },
        { name: 'modal', x: 480, y: 175, width: 480, height: 443 },
        // Scrim + everything behind it, to catch dimming/blur regressions.
        { name: 'scrim', x: 0, y: 0, width: 1440, height: 792 }
      ]
    },

    {
      id: 'drawer-open',
      figmaNodeId: null, // NOT DESIGNED YET — see the note on `settings` above
      frame: { width: 1440, height: 792 },

      route: {
        description:
          'Bookmark drawer open, opened from the first card in the gallery. ' +
          'Uses nth-child rather than a data-card-id so it works against the ' +
          'real library as well as the fixture.',
        steps: [
          { waitFor: '.masonry' },
          { click: '.masonry-item:nth-child(1) .card' },
          { waitFor: '.drawer.is-open' },
          // The sheet rises with a 480ms expo transition; let it land before
          // the stabilise pass freezes transitions mid-flight.
          { wait: 900 }
        ]
      },

      // Measured with --rects against this screen's own route, not guessed.
      // The sheet is 753 tall from y=63, so it bleeds 24px past the viewport by
      // design; the harness clamps the region to the frame.
      regions: [
        { name: 'sidebar', x: 0, y: 0, width: 264, height: 792 },
        { name: 'drawer', x: 410, y: 63, width: 620, height: 753 },
        { name: 'scrim', x: 0, y: 0, width: 1440, height: 792 }
      ]
    }
  ],

  /**
   * App CSS custom property → Figma variable name.
   *
   * Checked exactly, by value, regardless of whether the difference is visible:
   * pixelmatch cannot see a colour drift below ~27/255, so token audits catch
   * what pixel diffing structurally cannot.
   *
   * These pairings come from the app's own source comments in styles.css —
   * where `--canvas: #080808` is annotated "ink/500" — i.e. author intent
   * rather than inference on my part.
   * Figma values are read from visual-diff/figma/<screen>.variables.json —
   * refresh that file with the Figma MCP `get_variable_defs`.
   *
   * Add pairs as you map more of the system. Unmapped app vars and unused Figma
   * tokens are both reported, so the gaps stay visible.
   */
  tokenMap: {
    '--canvas': 'ink/500',
    '--text': 'acid/50',
    '--muted': 'text/muted',
    '--volt': 'acid/500',
    '--volt-deep': 'acid/600',
    '--ink-on-volt': 'acid/950',
    '--ink-on-volt-badge': 'acid/900',

    // Layered values. Some of the design is specified as a translucent fill
    // over another token, so the colour it renders exists nowhere as a variable
    // — and an app that hardcodes a hand-flattened approximation drifts by a
    // level or two, which pixelmatch structurally cannot see.
    //
    //   { color, alpha, over }  → composited against the base token, compared
    //                             as the resulting flat hex
    //   { color, alpha }        → compared as rgba, channel for channel
    //
    // Source: Mike's spec for the sidebar, 2026-07-28.
    // #F6F3F3 @ 1% over #080808 = (10.38, 10.35, 10.35) → #0a0a0a.
    '--sidebar': { color: '#F6F3F3', alpha: 0.01, over: 'ink/500' },
    '--border': { color: '#FAFFE6', alpha: 0.06 }
  }
}
