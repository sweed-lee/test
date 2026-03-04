## Laser Logic

Laser Logic is a zero-dependency browser puzzle game built with HTML5 Canvas and vanilla JavaScript.
Players redirect and transform laser beams across a grid using mirrors, filters, splitters, prisms,
combiners, and blockers.

### Features

- Grid-based tactical laser puzzles with handcrafted levels
- Additive RGB color logic (Red/Green/Blue -> Cyan/Magenta/Yellow/White)
- Multiple beam interactions:
  - **Mirror**: reflects beams
  - **Filter**: adds color channels
  - **Splitter**: duplicates a beam into two paths
  - **Combiner**: merges beam colors
  - **Prism**: splits multi-channel light into RGB directions
  - **Blocker**: absorbs beams
- Target activation requires an **exact** color match
- Level progression with saved unlocks and best-star tracking in localStorage

### Run

You can open `index.html` directly in a browser, or run a tiny local server:

```bash
python3 -m http.server 8080
```

Then visit:

```text
http://localhost:8080
```

### Controls

- **Left Click** on grid: place selected component
- **Left Click** on same component: rotate
- **Right Click** on placed component: rotate
- Select **Eraser** to remove components
- Use **Prev / Reset / Next** to navigate and retry levels

### Project Structure

```text
index.html            # App shell
styles.css            # Game and UI styling
src/constants.js      # Direction + color helpers
src/levelData.js      # Handcrafted levels
src/grid.js           # GameGrid + Component system
src/beamSimulator.js  # Beam traversal and color mixing
src/gameEngine.js     # State management and progression
src/uiManager.js      # Canvas rendering and interactions
src/main.js           # Bootstrapping
```
