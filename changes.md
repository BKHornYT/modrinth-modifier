# Changes

## v1.0.4-beta
- **Full UI port from Modrinth App** (modrinth/code, AGPL v3):
  - Layout: grid with narrow 64px icon-only navbar + statusbar, content area has `border-top-left-radius: 20px` — direct port of their `app-grid-layout`
  - Colors: their exact dark mode surface tokens (`#16181c` → `#34363c`), text, borders, radius scale
  - Buttons: ported their `.btn` system — `brightness()` filter on hover, `scale(0.95)` on active, `.btn-primary` (green), `.btn-secondary` (green highlight), `.btn-transparent`
  - Cards: ported their `.card` / `.base-card` — `#27292e` bg, 16px radius, box-shadow
  - Inputs: raised surface bg, inset shadow, green focus ring with glow
  - Nav buttons: 48px circular, tooltip on hover, exact active state colors
  - Window controls: circular hover effect, red danger on close
  - Profile list now uses individual cards per profile instead of a bordered list
- **Changelog in update banner**: "What's new" toggle shows GitHub release notes
- **Version check fix**: only shows update banner if remote version is actually newer
- **LICENSE**: GNU AGPL v3 with Modrinth attribution
