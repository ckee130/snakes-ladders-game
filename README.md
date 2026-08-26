# Snakes and Ladders - Game Library

A TypeScript library implementing the classic Snakes and Ladders board game logic.

## Features

- 100-square board with configurable snakes and ladders
- Multi-player support (human and computer opponents)
- Turn-order determination via roll-off
- Exact-landing win condition
- Dependency-injectable dice for deterministic testing
- Optional demo UI (does not change library logic)

## Installation

```bash
npm install
```

## Commands

```bash
npm test         # Run tests
npm run test:watch
npm run build    # Compile library to dist/
npm run demo     # Open the demo UI
```

## Demo UI

```bash
npm run demo
```

Opens a simple browser UI that imports the library and lets you play against the computer. Game rules still live entirely under `src/`.
