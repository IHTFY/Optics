Based on the card game, [Illusion](https://pandasaurusgames.com/products/illusion).

[PLAY IT](https://optics.ihtfy.com)

## How to play

Order the cards from least to most of the target color, following the arrow.
On your turn, either place the next card in the line (drag it, or tap where it
should go, then **Place** below it), or **Challenge** if you think the line is wrong.
After a challenge, the arrow becomes a graph of the amounts: each drop, marked ✕,
is a pair in the wrong order. **Sorted** shows the correct order and **Played**
switches back.

Keyboard: `←`/`→` move the card, `Enter` places it, `C` challenges, `S` toggles
sorted/played, `Esc` takes it back.

## Development

```sh
pnpm install
pnpm dev            # local dev server
pnpm test           # unit tests
pnpm test:e2e       # browser tests (Playwright)
```

Every push to `master` that passes CI is deployed to GitHub Pages automatically.
