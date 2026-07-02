# Button — Master Spec (Staaash component library)

Figma-first (source of truth) → mirror to code. References the `space-*`, `radius-*`, and `btn-*`/`text-*`/`stroke-*`/`focus-*` variables already in the Figma file. Dark (Volt) is the primary mode.

---

## 0. Property language (library-wide legend)

| Emoji | Kind | Property |
|---|---|---|
| 🎨 | pick-one | **Variant** — Primary · Secondary · Ghost · Destructive (maps 1:1 to `btn-*` tokens) |
| 📐 | pick-one | **Size** — XS · S · M · L · XL |
| ✦ | pick-one | **State** — Default · Hover · Pressed · Focus · Disabled · Loading |
| ✏️ | text | **Label** |
| ⬡ | toggle | **Leading icon** · **Trailing icon** |
| 🔁 | instance-swap | **Icon** (per side) |
| 💊 | toggle | **Pill** |
| ⛶ | toggle | **Full width** |

> Change from earlier drafts: the separate **Intent** and **Emphasis** axes are gone. Your `btn-primary/secondary/ghost/destructive` tokens already encode color + emphasis together, so there's one **🎨 Variant** axis. No "Info" button (the Ask-Staaash label is passive, not a button).

---

## 1. Anatomy — no Slots

Horizontal auto-layout. Each icon is a **normal nested Icon instance** with an instance-swap property and a boolean visibility property. **Never a Figma Slot** — Slots block property edits on their contents, which is exactly the error to avoid here.

```
◻ Button                 AL: Horizontal · align center · gap=token · pad=token · radius=token
├─ 🔁 Leading Icon        Icon INSTANCE · instance-swap + ⬡ boolean visibility · icon-box per size
├─ ✏️ Label               text · vertical-trim to cap height · nowrap
└─ 🔁 Trailing Icon       Icon INSTANCE · instance-swap + ⬡ boolean · can swap to a Kbd or Badge instance
```

- Toggling an icon's boolean **hides the instance and auto-layout collapses its gap** — no Slot, no orphaned spacing.
- The trailing instance is the flexible one: swap the glyph for a **Kbd** (`⌘S`) or a count **Badge** instance.
- **Icon-only** = `✏️ Label` off + horizontal padding set equal to vertical padding → a square (see §3).

**Slot-vs-instance-swap rule (library-wide):** *curated + styleable + single → instance-swap (icons, avatar, kbd, badge). Arbitrary or variable-count → Slot (Modal/Drawer body, Popover content, Dropdown items, Card tag-row).* Button is curated/single on both sides → instance-swap.

---

## 2. Properties panel

| Property | Type | Options (default) |
|---|---|---|
| 🎨 Variant | variant | Primary · **Secondary** ◀ default · Ghost · Destructive |
| 📐 Size | variant | XS · S · **M** · L · XL |
| ✦ State | variant | **Default** · Hover · Pressed · Focus · Disabled · Loading |
| ✏️ Label | text | "Button" |
| ⬡ Leading / Trailing icon | boolean | off / off |
| 🔁 Icon | instance-swap | (any icon) |
| 💊 Pill · ⛶ Full width | boolean | off / off |

> Default = **Secondary / M**. Primary is volt — it's one of your "volt touches exactly 4 things," so it stays an explicit opt-in, not the default.

---

## 3. Size scale (height derived from padding — all values on the token grid)

Set **vertical + horizontal padding** (tokens) and let height hug. `height = 2·pad-y + icon-box`.

| 📐 | pad-y | pad-x | gap | icon-box | Text (Instrument Sans) | Height | Radius | Icon-only square |
|---|---|---|---|---|---|---|---|---|
| XS | `space-50` (4) | `space-100` (8) | `space-50` (4) | 16 | 12 / 600 | 24 | `radius-100` (8) | 24 |
| S | `space-100` (8) | `space-150` (12) | `space-50` (4) | 16 | 13 / 600 | 32 | `radius-100` (8) | 32 |
| **M** ◀ | `space-100` (8) | `space-200` (16) | `space-100` (8) | 20 | 14 / 600 (−0.1 track) | 36 | `radius-150` (12) | 36 |
| L | `space-150` (12) | `space-250` (20) | `space-100` (8) | 20 | 15 / 600 | 44 | `radius-150` (12) | 44 |
| XL | `space-200` (16) | `space-300` (24) | `space-100` (8) | 24 | 16 / 600 | 56 | `radius-200` (16) | 56 |

- **Cleanup applied:** old off-grid values (pad-x 10/26, pad-y 7/9, radius 9/14) are gone — every value is now a `space-*` / `radius-*` token.
- `💊 Pill` → radius = `radius-full`. `⛶ Full width` → fill horizontally, pad-x becomes a minimum, content stays centered.
- **Icon-only:** pad-x = pad-y → square (width = height). Icon centered, equal padding all sides.
- **Hit area:** M/L/XL ≥40px ✓. XS/S on desktop pointer are fine; extend the frame to 40×40 with a transparent pseudo-element only if they go touch.

---

## 4. Color — mapped to your `btn-*` tokens (Dark mode)

Icon color **follows the variant's text token** in every state.

**🎨 Primary** (volt — hero / Save only)
| State | BG | Text/Icon |
|---|---|---|
| Default | `btn-primary/bg` #CCFF00 | `btn-primary/text` #080808 |
| Hover | `btn-primary/bg-hover` #B9E900 | #080808 |
| Pressed | `btn-primary/bg-active` #82A900 + `scale(0.96)` | #080808 |
| Disabled | `btn-primary/bg-disabled` #365100 | `btn-primary/text-disabled` #494949 |
| Focus | + `focus/ring` #CCFF00 2px, offset `focus/ring-offset` #080808 | #080808 |
| Loading | bg unchanged, spinner in leading instance | label 70% |

**🎨 Secondary** (neutral, bordered — everyday default)
| State | BG | Text | Stroke |
|---|---|---|---|
| Default | `btn-secondary/bg` #171717 | `btn-secondary/text` #FAFAFA | `btn-secondary/stroke` #494949 |
| Hover | `btn-secondary/bg-hover` #494949 | #FAFAFA | `btn-secondary/stroke-hover` #A2A2A2 |
| Pressed | `btn-secondary/bg-active` #A2A2A2 + scale | ⚠️ switch to `text/inverse` #080808 for contrast | — |
| Disabled | `btn-secondary/bg-disabled` #080808 | `btn-secondary/text-disabled` #8B8B8B | `btn-secondary/stroke-disabled` #171717 |

> ⚠️ Token check: `btn-secondary/bg-active` (#A2A2A2) is light, so #FAFAFA text fails contrast on press. Either flip text to `text/inverse` on the Pressed state, or darken `bg-active`. Flagging for your call before this variant ships.

**🎨 Ghost** (lowest emphasis)
| State | BG | Text |
|---|---|---|
| Default | transparent (`btn-ghost/bg` #000000 → use 0% alpha) | `btn-ghost/text` #FAFAFA |
| Hover | `btn-ghost/bg-hover` #FAFAFA **@ ~6% alpha** | #FAFAFA |
| Pressed | #FAFAFA **@ ~10% alpha** + scale | #FAFAFA |
| Disabled | transparent | `btn-ghost/text-disabled` #8B8B8B |

> ⚠️ Token check: `btn-ghost/bg-hover/active` are stored as solid #FAFAFA but must be applied as a low-opacity wash, or ghost turns into a white button. Recommend storing these as `acid`/`mist` **alpha** tokens (you already have `acid/alpha-*`) instead of solids.

**🎨 Destructive** (delete confirm)
| State | BG | Text/Icon |
|---|---|---|
| Default | `btn-destructive/bg` #FF2D55 | `btn-destructive/text` #FFFFFF |
| Hover | `btn-destructive/bg-hover` #EC224C | #FFFFFF |
| Pressed | `btn-destructive/bg-active` #B70030 + scale | #FFFFFF |
| Disabled | `btn-destructive/bg-disabled` #390000 | `btn-destructive/text-disabled` #B70030 |

Focus ring is identical across variants: `focus/ring` #CCFF00, 2px, offset `focus/ring-offset` #080808, on `:focus-visible`.

---

## 5. Hidden icons & horizontal padding

**Geometrically self-correcting.** Hiding an icon collapses the instance *and* its gap; pad-left/pad-right stay equal and the label doesn't drift. Hiding never breaks padding.

**Optical asymmetry (the real issue):** an icon on only one side *looks* roomier on that side because the glyph carries internal whitespace. Decision (Option B, chosen for maintainability over a variant explosion):

- Keep the **⬡ booleans** and **equal padding** — no per-side padding variants.
- Absorb the ~2–4px difference with **icon discipline**: every icon drawn to the same tight bearing inside its box, so glyph edge ≈ text edge under equal padding. (This is the Icon-primitive bearing rule — specced with the Icon component.)
- Only the **icon-only** variant gets equal-all-sides padding (it's square anyway).
- If a single prominent button (volt Save) still reads off, tune *that* instance's padding locally — don't systematize it.

---

## 6. Optical centering (corrections live at the source, never per-button)

**Axis 1 — Horizontal (asymmetric glyphs):** fix inside the **Icon component** so all instances inherit.
| Glyph | Correction (@24px) |
|---|---|
| Play ▶ | shift right ~1px |
| Magnifier | up-left ~0.5px |
| Send / paper-plane | down-left ~1px |
| Symmetric (plus, close, hamburger) | none |
Scale the nudge with icon size. A trailing-only chevron/arrow reads as extra right padding — acceptable to pull that variant's right padding in one step, baked in (not by hand).

**Axis 2 — Vertical (the label line-box):** text sits ~1px high because the line-box exceeds cap height. Fix in the **text style**: Vertical trim → "Cap height and baseline," then auto-layout `center` is optically correct. Size icons to read at **cap height**, not point size (Instrument Sans 14px cap ≈ 10px), so icon and label balance.

**Verify with the flip test:** stack geometric-center vs corrected at 400% zoom; if you can't tell which is wrong, stop.

---

## 7. Motion & feel (make-interfaces-feel-better, integrated)

- **Press:** `scale(0.96)` exact, every variant. `static` prop + `prefers-reduced-motion` disable it.
- **Transitions:** `transition-property: background-color, color, border-color, box-shadow, scale` · `160ms` · `cubic-bezier(0.2,0,0,1)`. Never `transition: all`.
- **Spinner ⇆ icon** (loading): cross-fade `opacity 0→1`, `scale .25→1`, `blur 4px→0`; both in DOM, one absolute. Width locks so the label can't reflow.
- **Tabular numbers** on a trailing count Badge.
- **Font smoothing** `antialiased` from root.
- `will-change` only if first-frame stutter appears.

---

## 8. Accessibility

- Icon-only carries an `aria-label` (Figma: keep a hidden Label value as accessible name; note in component description).
- **Visible focus ring** on `:focus-visible`, every variant (`focus/ring` + offset). Never remove without replacement.
- Text/bg pairs ≥4.5:1 — verify the Secondary-Pressed and Ghost-hover token flags in §4.

---

## 9. Code mirror (Figma → React/CSS)

```
🎨 Variant  → variant="primary" | "secondary" | "ghost" | "destructive"
📐 Size     → size="xs" | "s" | "m" | "l" | "xl"
✏️ Label    → children
⬡ icons     → leadingIcon / trailingIcon
💊 ⛶        → pill / fullWidth (booleans)
✦ State     → :hover / :active / :focus-visible / disabled / isLoading
```
Colors resolve through CSS vars named to match the Figma tokens: `--btn-primary-bg`, `--btn-secondary-stroke-hover`, `--focus-ring`, etc. Spacing/radius via `--space-*` / `--radius-*`. One Figma token change → one CSS var change.

---

## 10. ✦ Feel Pass

| # | Check | Decision |
|---|---|---|
| 1 | Concentric radius | inner = button radius − pad-y if a child ever gets its own bg |
| 2 | Optical centering | §6 — source-level, both axes |
| 3 | Shadows over borders | Primary/Ghost/Destructive borderless; Secondary stroke is the deliberate exception; no drop shadows |
| 4 | Interruptible transitions | 160ms named props |
| 5 | Split/stagger enter | `n/a` |
| 6 | Subtle exit | `n/a` — parent-owned |
| 7 | Icon animation | spinner⇆icon cross-fade |
| 8 | Font smoothing | `antialiased` |
| 9 | Tabular nums | trailing count Badge |
| 10 | Text wrap | `n/a` — single-line nowrap |
| 11 | Image outline | `n/a` |
| 12 | Scale on press | `0.96`, all variants, reduced-motion opt-out |
| 13 | `initial={false}` | `n/a` |
| 14 | Min hit area | M/L/XL ≥40 ✓; XS/S extend if touch |
