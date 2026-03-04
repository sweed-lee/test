# Mote: Creator SEED

Browser-based puzzle game built with pure HTML5 Canvas + vanilla JavaScript.

## Concept

You cannot move the Mote directly.  
Instead, you place temporary light sources, and the light-averse Mote autonomously
steps toward darker adjacent tiles. Reach the goal ring with as few lights as possible.

## Features implemented

- Deterministic puzzle generation from numeric seeds
- Solvability checks (flood-fill / shortest path verification)
- Difficulty + light-budget grading
- Temporary light physics with decay
- Autonomous Mote movement based on local light field
- Puzzle editor (wall/erase/start/goal tools)
- Custom level export as numeric seed and import by seed
- Seed Hub for local saved seeds and quick sharing/copy
- Progression manager (tutorial + challenge catalog, unlock flow, best scores)
- Minimalist graphics and effects in Canvas

## Run

No build step required.

1. Open `index.html` directly in a modern browser, or
2. Serve the folder with any static file server:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

## Controls

- **Click on board (play mode):** place a temporary light
- **Reset:** restart current level
- **Seed input + Load Seed:** generate/load level by seed
- **Random Seed:** create a random generated level
- **Enter Edit Mode:** toggle puzzle editor
- **Save Current As Seed:** export custom layout as numeric seed

## Notes

- All generation and gameplay logic is deterministic and offline.
- No external libraries and no network resources are required.
