# Traffic Light Bingo – Mobile / PWA Prototype

A mobile-first traffic‑light themed bingo prototype. Ticket is **5 rows x 3 columns** (3 across by 5 down = 15 numbers) drawn from numbers **1–45**. Supports progressive web app (PWA) installation for Android & iOS (Safari) with offline play.

## Features
- Mobile-first responsive layout (safe-area aware)
- 5x3 ticket (3 across by 5 down) with 15 unique numbers (1–45)
- Unique non-overlapping numbers across 3 visible tickets
- Simulated opponent players (optional) with hidden tickets
- First column, second column, and full house prize phases
- Auto-call with dynamic speed adjustments after each prize
- Sequential win-streak leaderboard + champion modal
- PWA install (Android Chrome / iOS Safari) & offline caching
- Accessible semantic roles & ARIA live regions
- Female voice announcements (Web Speech API) + vibration feedback
 - Orientation-aware resizing (dynamic --vh, landscape ticket scaling)

## File Structure
```
index.html    # Main HTML scaffold
styles.css    # Visual design, responsive grid, theming
script.js     # Game logic and interactivity
README.md     # Documentation
manifest.json # PWA metadata (name, theme color, icons)
service-worker.js # Offline caching logic (cache-first for shell)
```

## Quick Start
Open `index.html` in any modern browser (Chrome, Safari, Firefox, Edge). No build step needed.

1. Select an avatar & buy-in (enables Start Game).
2. Optionally set simulated opponent count.
3. Press **Start Game** then **Draw Number** (or enable Auto Call).
4. Watch tickets highlight and prize modals progress (1 column → 2 columns → full house).
5. Install the app for a native-like fullscreen experience (see below).
6. Rotate your device—cells and modals adapt for landscape.

## Install as an App (PWA)
### Android (Chrome / Edge)
1. Open the game URL or local file served via a simple static server.
2. Tap the browser menu ••• and choose "Install App" or use the in‑UI Install button when shown.
3. Launch from your home screen (standalone mode, faster re-entry, offline ready).

### iOS (Safari)
1. Open the game.
2. Tap the Share icon, choose "Add to Home Screen".
3. Launch the icon – the status bar becomes translucent, safe‑area padding applied.

### Desktop
Chrome / Edge will show an install indicator; you can also use the Install button.

## Offline Use
The service worker pre‑caches the core shell: `index.html`, `styles.css`, `script.js`, `manifest.json`. Subsequent loads work offline. Any future network requests fallback to the cached shell if offline.

To update: refresh while online; a new service worker version will activate and replace the old cache automatically.

## Responsive/Orientation Strategy
- CSS clamp() + custom properties for ticket cell sizing.
- Dynamic `--vh` unit (set via JS) avoids mobile browser UI shrinking content.
- Media queries for ultra-narrow portrait (<360px) and constrained landscape heights.
- Orientation classes (`body.landscape` / `body.portrait`) enable precise layout tweaks.
- Modals scale down and reposition when height is limited.

## Icons
Placeholder icon paths are declared in `manifest.json` (`icons/icon-192.png`, `icons/icon-512.png`). Add real PNG assets (transparent background recommended). For maskable support supply `icons/maskable-icon-512.png` with extra padding around edges.

## Voice & Vibration
Number calls use female English voices when available (Web Speech API). On unsupported browsers this silently no‑ops. Vibration feedback only triggers on devices that support it.

## Future Enhancements (Ideas)
- Real multi-player sync & networked draws
- Visualized draw history list
- Sound effects & haptic layering
- Advanced accessibility preferences (reduced animation toggle)
- Settings panel (speech on/off, auto-call speed control)
- Analytics: average draws to first/second/full house

## Accessibility Notes
- Status messages announced via `role="status"` (polite updates)
- Large touch targets & high contrast, WCAG-friendly color contrasts
- Focus styles preserved; reduced motion respected (`prefers-reduced-motion`)
- ARIA labels for prize traffic light & leaderboard shapes

## License
Prototype code – feel free to adapt.

---
Enjoy refining the prototype! Questions or improvements welcome.
