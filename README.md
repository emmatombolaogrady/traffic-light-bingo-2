# Mobile Bingo Prototype (1–45)

A lightweight, mobile-friendly bingo ticket + number drawing prototype. Ticket is **5 rows x 3 columns** (3 across by 5 down = 15 numbers). Includes draw logic, row bingo detection, and full house detection. (Number universe grid removed per latest update.)

## Features
- Mobile-first responsive layout
- 5x3 ticket (3 across by 5 down) with 15 unique numbers (1–45)
- Shuffle & random draw without replacement
- Highlights hits directly on your ticket
- Row bingo and full house detection with status messaging
- New Ticket & Reset Draws controls
- Accessible semantic roles & ARIA live regions
- Subtle animations & optional device vibration support

## File Structure
```
index.html    # Main HTML scaffold
styles.css    # Visual design, responsive grid, theming
script.js     # Game logic and interactivity
README.md     # Documentation
```

## How To Use
Open `index.html` directly in a modern browser (Chrome, Safari, Firefox, Edge). No build step needed.

1. Press **Draw Number** to begin drawing numbers.
2. Matching numbers on your ticket highlight automatically.
3. A completed row triggers a Bingo notification.
4. All 15 numbers matched triggers Full House.
5. **New Ticket** generates a brand new random ticket.
6. **Reset Draws** clears draws while keeping the current ticket.

## Future Enhancements (Ideas)
- Column-based number distribution constraints (classic bingo grouping)
- Multi-ticket support & player management
- Shareable game seeds
- Progressive Web App (offline installable)
- Sound effects & richer animations
- Stats: draw history, speed run mode
- Dark/light theme toggle

## Accessibility Notes
- Status messages announced via `role="status"` (polite updates)
- Large touch targets & high contrast color scheme
- Focus ring preserved for keyboard users

## License
Prototype code – feel free to adapt.
