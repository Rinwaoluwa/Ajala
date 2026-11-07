# contracts — the source of truth shared with design

- `design-tokens/` — `design-tokens.json` exported from Figma. `src/shared/theme`,
  `tailwind.config.js` and the generated `global.css` (`npm run tokens:css`) all read it.
  See `docs/DESIGN_TOKENS.md`.

The API contract is the client spec in `docs/api/`.

Changing a contract is a conversation with the design or backend owner, not a client-side patch.
