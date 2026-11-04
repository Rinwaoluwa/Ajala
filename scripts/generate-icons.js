#!/usr/bin/env node
/**
 * Turns the stateful icons in `assets/icons` into path data the app draws with
 * react-native-svg, so each can be shown outlined (inactive) or filled (active).
 *
 * The design's outline icons are strokes converted to shapes. For the filled
 * state the script extracts each icon's silhouette (its outermost edges); the
 * app paints that in the fill colour and draws the icon's own strokes over it in
 * a darker shade, as the design's two-tone house does — so the active icon keeps
 * every stroke of the inactive one.
 *
 * Icons listed as `solid` are drawn filled already (the two-tone house); for
 * those the outline is drawn at runtime by stroking the shapes instead.
 *
 * It also writes a chosen (colour) and an unchosen (grey) version of the
 * multi-colour illustrations listed in `ILLUSTRATIONS`.
 *
 * Run after adding or changing one: `npm run icons`. Writes
 * `src/shared/components/ui/vectorIcons.generated.ts` and `illustrations.generated.ts`.
 */
const fs = require('fs');
const path = require('path');

const ICONS = {
  home: { file: 'home.svg', solid: true },
  compass: { file: 'compass.svg' },
  luggage: { file: 'luggage.svg' },
  profile: { file: 'profile.svg' },
  like: { file: 'like.svg' },
  bell: { file: 'bell.svg' },
  chat: { file: 'chat.svg' },
  pin: { file: 'map.svg' },
};

/**
 * Multi-colour art with a chosen and an unchosen look (the "Create something"
 * cards): `colour` is supplied in colour (made grey here), `grey` is supplied
 * grey (made colour here, on a teal ramp taken from the meetup art's own teals).
 */
const ILLUSTRATIONS = {
  // The colour art supplied for "Create something" (assets/icons/colored_*.svg).
  meet: { file: 'colored_create_something.svg', supplied: 'colour' },
  confetti: { file: 'colored_confetti.svg', supplied: 'colour' },
  calendar: { file: 'colored_calender.svg', supplied: 'colour' },
  group: { file: 'colored_group.svg', supplied: 'colour' },
};

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'src/shared/components/ui/vectorIcons.generated.ts');
const OUT_ILLUSTRATIONS = path.join(ROOT, 'src/shared/components/ui/illustrations.generated.ts');

/** Absolute M/L/H/V/C/Z only — what Figma exports. Anything else stops the script. */
function subpaths(d) {
  const tokens = d.match(/[A-Za-z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g);
  const out = [];
  let current = null;
  let i = 0;
  let cmd = null;
  let x = 0;
  let y = 0;
  const num = () => Number(tokens[i++]);
  while (i < tokens.length) {
    if (/[A-Za-z]/.test(tokens[i])) cmd = tokens[i++];
    if (!'MLHVCZ'.includes(cmd)) throw new Error(`Unsupported path command "${cmd}"`);
    if (cmd === 'M') {
      current = { start: i - 1, points: [] };
      out.push(current);
      x = num();
      y = num();
      current.points.push([x, y]);
      cmd = 'L'; // implicit lineto after a moveto
    } else if (cmd === 'L') {
      x = num();
      y = num();
      current.points.push([x, y]);
    } else if (cmd === 'H') {
      x = num();
      current.points.push([x, y]);
    } else if (cmd === 'V') {
      y = num();
      current.points.push([x, y]);
    } else if (cmd === 'C') {
      for (let k = 0; k < 3; k += 1) {
        x = num();
        y = num();
        current.points.push([x, y]);
      }
    } else if (cmd === 'Z') {
      current.closed = true;
    }
  }
  // Re-slice the original text at each M so the output keeps the exact numbers.
  const starts = [...d.matchAll(/M/g)].map((m) => m.index);
  return out.map((sp, n) => ({
    d: d.slice(starts[n], starts[n + 1] ?? d.length).trim(),
    box: bbox(sp.points),
  }));
}

function bbox(points) {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}

const encloses = (a, b) => a !== b && a.x0 <= b.x0 && a.y0 <= b.y0 && a.x1 >= b.x1 && a.y1 >= b.y1;

/**
 * The icon's silhouette: its outermost edges only (no subpath encloses them).
 * The filled state paints this in the fill colour and draws every original
 * stroke over it in a darker shade — the design's two-tone house, for any icon,
 * with no detail lost (a case's strap and clasps are joined to its inner edge,
 * so cutting shapes away would take them too).
 */
function silhouetteD(d) {
  const parts = subpaths(d);
  return parts
    .filter((p) => !parts.some((q) => encloses(q.box, p.box)))
    .map((p) => p.d)
    .join(' ');
}

const icons = {};
for (const [name, { file, solid = false }] of Object.entries(ICONS)) {
  const svg = fs.readFileSync(path.join(ROOT, 'assets/icons', file), 'utf8');
  const viewBox = svg.match(/viewBox="([^"]+)"/)[1];
  const paths = [...svg.matchAll(/<path\b([^>]*)\/?>/g)].map(([, attrs]) => ({
    d: attrs.match(/\sd="([^"]+)"/)[1],
    fill: (attrs.match(/fill="([^"]+)"/) || [])[1] || '#000000',
    evenOdd: /fill-rule="evenodd"/.test(attrs),
  }));
  icons[name] = {
    viewBox,
    solid,
    paths,
    silhouette: solid ? null : paths.map((p) => ({ d: silhouetteD(p.d), evenOdd: false })),
  };
}

const body =
  '// Generated by scripts/generate-icons.js from assets/icons — do not edit. Run `npm run icons`.\n\n' +
  'export type VectorPath = { d: string; fill?: string; evenOdd: boolean };\n' +
  'export type VectorIconData = {\n  viewBox: string;\n  solid: boolean;\n  paths: VectorPath[];\n  silhouette: VectorPath[] | null;\n};\n\n' +
  `export const vectorIcons = ${JSON.stringify(icons, null, 2)} satisfies Record<string, VectorIconData>;\n\n` +
  'export type VectorIconName = keyof typeof vectorIcons;\n';

fs.writeFileSync(OUT, body);
console.log(`${Object.keys(icons).length} icons written to ${path.relative(ROOT, OUT)}`);

// ---- Illustrations: a chosen (colour) and an unchosen (grey) version of each. ----

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (rgb) =>
  '#' +
  rgb
    .map((v) => Math.round(v).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
const luminance = ([r, g, b]) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
const grey = (h) => {
  const l = luminance(hex(h)) * 255;
  return toHex([l, l, l]);
};
/** Dark to light along the meetup art's teals (#062224, #018980) out to a pale mint. */
const RAMP = [
  [0.1, hex('#062224')],
  [0.42, hex('#018980')],
  [0.8, hex('#9ED9D3')],
  [1, hex('#F2FBFA')],
];
const teal = (h) => {
  const l = luminance(hex(h));
  const upper = RAMP.findIndex(([at]) => at >= l);
  if (upper <= 0) return toHex(RAMP[upper === 0 ? 0 : RAMP.length - 1][1]);
  const [a, ca] = RAMP[upper - 1];
  const [b, cb] = RAMP[upper];
  const t = (l - a) / (b - a);
  return toHex(ca.map((v, i) => v + (cb[i] - v) * t));
};
const recolour = (svg, map) => svg.replace(/#[0-9A-Fa-f]{6}\b/g, (c) => map(c.toUpperCase()));

const illustrations = {};
for (const [name, { file, supplied }] of Object.entries(ILLUSTRATIONS)) {
  const svg = fs.readFileSync(path.join(ROOT, 'assets/icons', file), 'utf8').trim();
  const width = Number(svg.match(/width="([0-9.]+)"/)[1]);
  const height = Number(svg.match(/height="([0-9.]+)"/)[1]);
  illustrations[name] = {
    width,
    height,
    colour: supplied === 'colour' ? svg : recolour(svg, teal),
    grey: supplied === 'grey' ? svg : recolour(svg, grey),
  };
}

fs.writeFileSync(
  OUT_ILLUSTRATIONS,
  '// Generated by scripts/generate-icons.js from assets/icons — do not edit. Run `npm run icons`.\n\n' +
    'export type IllustrationData = { width: number; height: number; colour: string; grey: string };\n\n' +
    `export const illustrations = ${JSON.stringify(illustrations, null, 2)} satisfies Record<string, IllustrationData>;\n\n` +
    'export type IllustrationName = keyof typeof illustrations;\n',
);
console.log(
  `${Object.keys(illustrations).length} illustrations written to ${path.relative(ROOT, OUT_ILLUSTRATIONS)}`,
);
