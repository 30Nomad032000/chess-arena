# Chess Arena — Design System & Landing Page Spec

## Brand

**Tagline:** Machines play. You predict.
**Tone:** Technical, sharp, zero fluff. A trading terminal for chess degeneracy.
**Aesthetic:** Dark, monospaced, data-dense. Inspired by Bloomberg Terminal meets betting exchanges.

---

## Design Tokens

### Colors

```css
/* Backgrounds — darkest to lightest */
--bg-primary:       #0a0a0a
--bg-secondary:     #111111
--bg-tertiary:      #1a1a1a
--bg-elevated:      #222222
--bg-hover:         #2a2a2a

/* Text */
--text-primary:     #e8e4dd     /* warm off-white */
--text-secondary:   #9a9590     /* descriptions */
--text-muted:       #5a5550     /* labels, captions */

/* Accents */
--accent-red:       #e63b2e     /* primary action, brand */
--accent-red-hover: #ff4d3d
--accent-red-dim:   rgba(230, 59, 46, 0.15)
--accent-green:     #4ade80     /* wins, positive, live */
--accent-green-dim: rgba(74, 222, 128, 0.15)
--accent-yellow:    #facc15     /* warnings, rank gold */
--accent-yellow-dim:rgba(250, 204, 21, 0.15)

/* Borders */
--border-subtle:    rgba(255, 255, 255, 0.06)
--border-default:   rgba(255, 255, 255, 0.08)
--border-emphasis:  rgba(255, 255, 255, 0.14)
```

### Typography

```
Font Stack:  "SF Mono", "Cascadia Code", "Fira Code", "JetBrains Mono", "Consolas", monospace
Base Size:   14px
Line Height: 1.6

Headings:    letter-spacing: -0.02em, weight: 700
Labels:      letter-spacing: 0.06em, uppercase, weight: 600, size: 0.72rem
Body:        weight: 500
```

### Spacing & Radius

```
Radius:   4px (sm) / 8px (md) / 12px (lg)
Shadows:  0 1px 2px rgba(0,0,0,0.4)   — sm
          0 4px 12px rgba(0,0,0,0.5)   — md
          0 8px 24px rgba(0,0,0,0.6)   — lg
```

### Micro-Patterns

- **Status dot:** 8px circle, `#4ade80`, `box-shadow: 0 0 8px rgba(74,222,128,0.5)` — pulsing
- **Red underline:** Active tabs/nav use a 2px bottom border in `--accent-red`
- **Card pattern:** `bg-secondary` background, `border-subtle` border, `radius-md`, subtle hover lift
- **Data cells:** Monospaced numbers, right-aligned, semantic coloring (green/red for +/-)
- **Uppercase labels:** `0.72rem`, `letter-spacing: 0.06em`, `text-muted` color

---

## Landing Page Structure

### Section 0 — Nav (sticky)

- Minimal sticky nav, transparent to `bg-primary` on scroll
- Logo: chess pawn unicode + "Chess Arena" in monospace bold
- CTA button: red, right-aligned
- Nav links scroll to sections

### Section 1 — Hero

- "MACHINES PLAY." in large monospace (clamp(3rem, 6vw, 5rem)), `text-primary`
- "YOU PREDICT." same size, `accent-red`
- Subtitle in `text-secondary`, max-width 540px
- Two CTAs: primary red + ghost outline
- Below: animated chessboard showing a game mid-progress
- Game ticker bar underneath with agent names, move count, live dot
- Dot grid background: `radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)` at 32px
- Title lines stagger in (0ms, 150ms), subtitle fades (300ms), CTAs (450ms), board (600ms)

### Section 2 — Live Ticker

- Horizontal auto-scrolling marquee or vertical feed
- Each entry: agent names, result or "in progress", move count
- Live games get the green pulsing dot
- Monospaced, `text-secondary`, subtle left border colored by result

### Section 3 — Features Grid

- 3x2 grid (collapses to 2-col then 1-col)
- Cards: `bg-secondary`, `border-subtle`, `radius-md`
- Icon top-left, uppercase label, description in `text-secondary`
- Cards stagger in on scroll (80ms each)
- Hover: border brightens, translateY(-2px)

**Six features:**
1. AI Agents — Random, Minimax, MCTS, LLM from 800 to 1600+ ELO
2. Live Matches — WebSocket-streamed with real-time board updates
3. Betting — Three markets per match: outcome, move count, next move
4. ELO Rankings — Auto-updating with tournament support
5. Game Replay — Step through completed matches move by move
6. MCP Server — Connect any LLM as a player via Model Context Protocol

### Section 4 — Agents Table

- Full-width dark table, alternating row backgrounds
- Rank: gold/silver/bronze for top 3
- ELO: green >= 1400, primary 1000-1399, red < 1000
- Table rows animate in from right on scroll, stagger 50ms

### Section 5 — How Betting Works

- 4-step horizontal flow (stacks on mobile): Pick Match → Bet → Watch → Win
- Step numbers in `accent-red`, large monospace
- Dashed connecting lines between steps
- Market type breakdown below: outcome odds, move brackets, piece predictions
- Odds color-coded: green (short), yellow (mid), red (long)

### Section 6 — MCP Integration

- Terminal-style code block with red left border
- Tool names as inline code pills
- Lines appear one by one (typing animation)
- Flow: See Board → Test Move → Play → Rank Up

### Section 7 — Architecture

- ASCII diagram rendered in monospace block (or SVG with animated connections)
- Tech pills: React 19, Express, FastAPI, PostgreSQL 16, Redis 7, WebSockets, MCP

### Section 8 — CTA / Footer

- "1,000 PAWNS ARE WAITING." — "1,000" in red
- Single red CTA, larger than hero
- Minimal footer: logo + GitHub link

---

## Animation Spec

| Element | Trigger | Animation | Duration | Easing |
|---------|---------|-----------|----------|--------|
| Hero title L1 | Load | translateY(20px) → 0, opacity | 600ms | cubic-bezier(0.16, 1, 0.3, 1) |
| Hero title L2 | Load | Same, 150ms delay | 600ms | Same |
| Hero subtitle | Load | opacity, 300ms delay | 500ms | ease-out |
| Hero CTAs | Load | translateY(10px) → 0, 450ms delay | 400ms | ease-out |
| Hero board | Load | opacity, scale(0.98) → 1, 600ms delay | 800ms | ease-out |
| Board pieces | Loop | Move every 2s | 300ms/move | ease-in-out |
| Live ticker | Loop | Scroll | Infinite | linear |
| Feature cards | Scroll | translateY(30px) → 0, stagger 80ms | 500ms | cubic-bezier(0.16, 1, 0.3, 1) |
| Table rows | Scroll | translateX(20px) → 0, stagger 50ms | 400ms | ease-out |
| Steps | Scroll | Sequential L→R, 200ms stagger | 500ms | ease-out |
| Terminal | Scroll | Lines appear one by one | 100ms/line | steps |
| Status dot | Loop | scale + opacity pulse | 2s | ease-in-out |

---

## Responsive Breakpoints

```css
/* Desktop: default — full grids, side-by-side */
@media (max-width: 1024px) { /* Tablet: 2-col grids, stacked board */ }
@media (max-width: 640px)  { /* Mobile: single column, reduced type */ }
```

---

## Component Reference

### Buttons
- **Primary:** `bg: accent-red`, white text, hover glow `box-shadow: 0 0 20px rgba(230,59,46,0.3)`
- **Ghost:** transparent, `border-emphasis` border, hover brightens

### Cards
- `bg-secondary`, `border-subtle`, `radius-md`, 24px padding
- Hover: border to `border-emphasis`, translateY(-2px)

### Terminal Block
- `bg-secondary`, `border-default`, red left border (3px)
- Green prompt color, primary command color
- Tool names: `accent-red-dim` background, `accent-red` text, `radius-sm`

### Odds Display
- Tabular-nums, 700 weight
- Green < 2.50, yellow 2.50-6.00, red > 6.00

### Status Indicators
- 8px green dot with glow and pulse animation
- Uppercase "LIVE" label, 0.72rem, green

---

## Background Textures

- **Dot grid:** `radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)` 32px
- **Accent glow:** 600px radial gradient, `rgba(230,59,46,0.06)`, positioned behind key sections
- **Noise grain:** Optional fixed overlay at 1.5% opacity
