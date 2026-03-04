## Chrono-Sync: Refined

Chrono-Sync is a browser-based deterministic time-cloning puzzle game implemented in vanilla JavaScript + HTML5 Canvas with no external dependencies.

### Core Loop

1. **Recording phase**: move and record your route.
2. **Sync phase**: your clone replays the recorded actions exactly while you control the present player.
3. Use both timelines to solve grid-based puzzles with:
   - walls
   - toggle buttons + doors
   - pressure plates + sustained doors
   - one-way gates
   - timeline blockers

### Controls

- **Move**: `WASD` or arrow keys
- **End recording early**: `Space`
- **Restart level**: `R`
- **Next level / Previous level**: `N` / `B`
- **Menu**: `Esc`
- **Start / Continue**: `Enter`

### Run

Open `index.html` in a modern browser.

No build step, packages, or network calls are required.

### Project Structure

- `index.html` — app shell + script wiring
- `styles.css` — minimalist UI styling
- `js/levels.js` — handcrafted 12-level progression
- `js/level-manager.js` — structured level parsing + puzzle element model
- `js/entities.js` — `Player` + `ChronoClone` entities
- `js/physics-engine.js` — deterministic recording/replay + interactions
- `js/phase-manager.js` — recording/sync timers and phase UI model
- `js/game-engine.js` — game loop, rendering, input, high-level state
- `js/main.js` — bootstrap entrypoint
