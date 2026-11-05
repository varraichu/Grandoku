# Grandoku demo video

A promo of the game, made with [Remotion](https://remotion.dev) (videos written as React). Cuts, each vertical 9:16 and landscape 16:9: v1 full (~42s) and fast (~26s) with captions over the gameplay, and v2 full (~51s) and fast (~40s, sped up only between key moments) with a title card per feature, labels on the game and a freeze-frame for note colours. Style test clips live under `out/tests/`. Silent, so music can be added when posting.

## How it works

1. `scripts/record.mjs` opens the game in a headless browser, plays a scripted game (hints, notes, mistakes, win, save image) and saves a high-quality take per format to `public/takes/`, plus the time of each moment and where the ring and tattoos sit on screen.
2. `src/` cuts those takes into scenes with captions, zooms and overlays. Both cut lists (which moment, how long, how fast, what caption) are in `src/scenes.ts`.

## Run it

```sh
npm install

# 1. Record (needs the game running with the autoplay branch's code, from the repo root):
#    npx vite --port 5199
npm run record

# 2. Preview and tweak in the browser
npm run studio

# 3. Render to out/
npm run render        # v1
npm run render:v2     # v2
npm run render:tests  # style tests
```

Takes and rendered videos are gitignored (they're large and can be regenerated).
