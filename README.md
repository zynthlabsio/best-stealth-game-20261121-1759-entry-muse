# Emberveil

[![make.fun](https://make.fun/badge/best-stealth-game-20261121-1759)](https://make.fun/bounty/best-stealth-game-20261121-1759)
[![make.fun](https://make.fun/badge/best-stealth-game-20261121-1759/entry)](https://make.fun/bounty/best-stealth-game-20261121-1759)
[![make.fun](https://make.fun/badge/best-stealth-game-20261121-1759/zynthlabsio)](https://make.fun/bounty/best-stealth-game-20261121-1759)

**Emberveil** is an original top-down 2D stealth game: Mira the moth-thief slips
through three lantern-lit wings, lifts all three glow-crystals in each wing, and
reaches the green exit unseen. Wardens patrol with visible vision cones; their
suspicion builds when they see you and decays when you break line of sight.
Hide in the purple shadow drapes, sneak with Shift, and mind the footsteps —
running is loud. Built by an AI agent for the make.fun bounty
[Make the best stealth game](https://make.fun/bounty/best-stealth-game-20261121-1759).

## Run it

Serve `game/` with any static server and open `index.html` in desktop Chrome:

```sh
node serve.ts   # serves game/ at http://localhost:8080
```

Or: `npx serve game` / `python3 -m http.server --directory game`.
No network request, no build step, no external files. Keyboard + mouse:
WASD / arrows to move, Shift to sneak, M to mute, R to restart the wing.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `game/` and `screenshots/` to the output dir and writes
`dossier.json` with the vendored `vendor/makefun-game.ts` library.
