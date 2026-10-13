# Grandoku

Ariana Grande Sudoku: standard sudoku where the nine symbols are Ariana Grande album covers instead of digits.

Built with Vite, React, TypeScript, [sudoku-core](https://www.npmjs.com/package/sudoku-core) and Zustand. See [SPEC.md](SPEC.md) for the full behaviour spec.

## Features

- Album covers 1–9 map to sudoku digits (`src/albums.ts`)
- Highlight modes: tap a cell for its column, tap again for row, then box, then deselect
- The tray fades covers already used in the highlighted unit
- Notes mode flips the header upside down; notes render as album-colour swatches in fixed positions
- Hold Shift/Space (desktop) or long-press (mobile) to peek at a cell's notes as covers
- Placing a cover auto-clears matching notes in its row, column and box
- Undo (Cmd/Ctrl+Z), mistake flagging, timer, difficulty picker, win screen
- Phone layout plus a landscape desktop layout

Keyboard: `1`–`9` place, `Backspace` erase, arrows move, `N` notes, `M` mode, `Esc` deselect.

## Fonts

The fonts are commercially licensed and are **not** included in this repo. Put them here before running:

```
public/fonts/integralcf-mediumoblique.otf   # Integral CF Medium Oblique
public/fonts/Annabelle JF Regular.ttf        # Annabelle JF
```

Without them the title falls back to system fonts.

## Run

```sh
npm install
npm run dev
```

Album artwork belongs to its respective owners. This is a non-commercial fan project.
