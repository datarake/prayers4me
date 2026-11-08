# Hero scene generator

`generate.mjs` draws a misty lake at dawn with one small warm light, as an SVG that renders at any size and is entirely ours (no licence questions). It is a stylised illustration, flatter than the photographic `welcome-hero.jpg` the app uses today, so it is not wired into the app. It is useful for store graphics, or as a fallback if the photo's licence cannot be confirmed.

```bash
node generate.mjs portrait hero.svg   # 1600 x 2844
node generate.mjs wide hero-wide.svg  # 2400 x 1350
rsvg-convert hero.svg -o hero.png     # brew install librsvg
```
