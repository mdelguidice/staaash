# 5181:38 rebuild — diff report

Static HTML/CSS recreation of Figma node `5181:38` (“1000 → Staaash → Default”, 1440×792, 1x).
Files: `index.html`, `styles.css`, `assets/` (icons, thumbnails, self-hosted fonts), `tools/` (asset crop + check harness), `diff/` (outputs of the last check run).

Re-run: `node figma-5181-38/tools/crop-assets.mjs && node figma-5181-38/tools/check.mjs`
(uses the deps already installed in `tools/visual-diff/node_modules`).

## Process deviations from the brief

1. **`www.figma.com` is denied by this container's egress policy** (403 on CONNECT). Every asset URL the Figma MCP returns — `get_screenshot`, `download_assets`, image fills, SVG exports — is on that host, so steps 1 and 7 could not be done literally. Node *data* (`get_metadata`, `get_design_context`, `get_variable_defs`) was unaffected and is the source of every value in `styles.css`.
2. **Reference used instead:** `visual-diff/figma/everything@2x.png` — a 2880×1584 export of this exact node, committed in `51ab95c`. It is **stale**: live Figma differs in the header button order (`+New` is now left of `Gallery|List`), Collections has 4 items (no “Reading List”), and the Tags section has 7 chips. The gallery region, library rows, footer, search bar and all icons are unchanged. Verified against a live inline screenshot of `5181:38`.
3. **Assets are crops of that export at the node rects**, not `download_assets` exports. Monochrome glyphs were unmixed to RGBA against their background so they sit correctly on any surface. Three icons (`icon-more`, `icon-chevron-down`, `icon-plus-8`) were cropped from the positions the old layout had them at. Ellipse nodes and the window-controls instance also come back as SVG URLs only, so they are crops too.
4. **Fonts are self-hosted** (`assets/fonts/`, OFL). Chromium inside the harness cannot reach `fonts.googleapis.com` through the proxy, and a static page should not depend on it anyway. Instrument Sans (variable wght) and Inter (variable wght) are the Google Fonts files.
5. **Step 8 was split in two.** Chromium and Figma do not share a text rasterizer, so a 1px pixel threshold can never reach an empty list on glyph edges (the repo's own `visual-diff.config.mjs` says the same). What was done instead:
   - **Geometry:** every element carrying a `data-node-id` (163 nodes, text included) is measured with `getBoundingClientRect` and compared against the Figma rect from `get_metadata`. Result: **0 nodes off by more than 1px on any edge.**
   - **Pixels:** 2x render diffed against the export with pixelmatch (`threshold 0.1`, AA ignored), and a 50% overlay written to `diff/overlay@2x.png`. Gallery region (valid comparison): **0.10 %** of pixels differ, all on glyph edges. The other regions are dominated by the stale-export differences above.

To finish the pixel step properly: export `5181-38` at 2x, commit it as `figma-5181-38/reference@2x.png`, point `REF` in `tools/check.mjs` at it, re-run.

## Residual differences (node IDs)

`5181:45` was originally built with the inner shadow the brief listed; `get_design_context` returned no effect, the export shows none, and the live file was confirmed to have none, so it was removed.

| Node | What | Why it is still there |
|---|---|---|
| `5181:539` | Blur overlay gradient stops. The node is a vector; its gradient lives in the SVG, which is on the blocked host. | Built as `linear-gradient(180deg, rgba(8,8,8,0), #080808)` + `backdrop-filter: blur(12px)`. Over the plain background the export shows no visible tint, consistent with an ink-coloured gradient; the alpha curve is unverified. |
| `5181:309`, `5181:386`, `5181:502` | Bottom-row thumbnails are cropped from the export **under** the blur, so the page blurs already-blurred pixels. They are also only as tall as the frame shows (77/312/232 px). | No unblurred source available. |
| `5317:798`, `5317:802`, `5317:806` | Tag dot fills for `ai`, `app design`, `banking`. Not variable-bound (the other four are: teal/sky/cobalt/violet), and the ellipse SVGs are blocked. | Set to `rose-500`, `tangerine-500`, `moss-500` from a high-res screenshot of `5270:138`. **These are the only three values in the build not read from node data.** |
| `5181:554` | `⌘` is not in Instrument Sans; the glyph comes from a fallback face and is 12px wide. | Box pinned to Figma's 10px so `5181:553`/`5181:555` land exactly. Glyph shape differs. |
| `5270:253` | Chevron is a 20px glyph clipped to 16 in Figma. | Asset is the clipped 16px; rendered at 16. |
| `5181:38` | Frame `border-radius: 18px`. | Invisible at 1440×792 on the same background; present in CSS. |
| all text | Glyph anti-aliasing. | Rasterizer difference; every text node's box is within 1px. |

## Inconsistencies in the file (matched, not fixed)

- **Card meta rows come in two layouts.** `5181:232` and `5181:308` use `justify-between` with a padded Link (`p-6`) and a padded date container (`p-4`, 57×18); every other card uses `gap-16`, a `flex-1` Link with no padding, and a bare date. `5181:259` also has a fill (`rgba(250,255,230,0.08)`) that its twin `5181:335` lacks.
- **Collection rows are 34px tall at `y=-1` inside 32px containers** (`5181:91/99/107/115`), while the “More” row `5181:131` and every Library row are 32.
- **Column gap is `var(--radius-150)` (12px)** — a radius token used as spacing (`5181:231/346/423`).
- `5181:67` Archived icon frame is 15×16 (others 16×16), so its label `5181:70` starts at x=51 not 52.
- `5181:62` Favorite label container is `items-end` while its siblings are `items-center` (no visible effect at 14px in a 14px box).
- `5181:203` collapse control: stroke is `acid/50` at 100 % while the glyph fill is at 80 %; `5181:205` “expand” is present at opacity 0.
- `5181:213` view-mode: the active segment is `p-6`, the inactive is `px-6 py-4`.
- `5181:223` (gear button) is named “new” and carries a hidden `+ New` child (`5181:224`).
- `5181:540` search: `py-14` with a 24px child inside `max-h-48` — the padding cannot be honoured, the frame clamps.
- `5181:545` Ask Staaash: 12px text on a 10px line-height; `5317:795` chip text tracks at 4 % while button text tracks at 2 %.
- `5181:452` dropshot favicon is 6×8 (others 8×8); `5181:492` has radius 2 inside a radius-3 wrapper.
- Hidden leftovers: `5181:546` (duplicate ai chip), `5181:148` (old Tags section), `5181:122` (Reading List), `5181:82`, `5181:87`, `5270:136`, `5181:132`, `5270:181`, `5181:189`, `5181:190`.
- Sidebar right stroke (`5181:39`) is painted *outside* the 264px box (x=264–265 in the export); header, footer, search and card strokes are all painted inside. Reproduced as such.
