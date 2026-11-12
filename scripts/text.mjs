// Shapes text with HarfBuzz and returns it as SVG paths, so the SVGs need no fonts and render the same everywhere.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const hb = await require('harfbuzzjs');

const fonts = new Map();
export function font(file) {
  if (fonts.has(file)) return fonts.get(file);
  const blob = hb.createBlob(readFileSync(new URL(`./fonts/${file}`, import.meta.url)));
  const face = hb.createFace(blob, 0);
  const f = hb.createFont(face);
  const entry = { f, upem: face.upem };
  fonts.set(file, entry);
  return entry;
}

const r = (n) => Math.round(n * 10) / 10;

// Moves and scales a HarfBuzz path (font units, y up) to `size` px at (x, y) with y down.
function place(d, s, x, y) {
  return d.replace(/([MLQCZ])([^MLQCZ]*)/g, (_, cmd, args) => {
    const nums = args.trim() ? args.trim().split(/[ ,]+/).map(Number) : [];
    const out = [];
    for (let i = 0; i < nums.length; i += 2) out.push(`${r(x + nums[i] * s)} ${r(y - nums[i + 1] * s)}`);
    return cmd + out.join(' ');
  });
}

// Lays out one line. Returns its width and one entry per glyph, with the glyph's pen position for caret stops.
export function line(file, text, size, { x = 0, y = 0, tracking = 0 } = {}) {
  const { f, upem } = font(file);
  const s = size / upem;
  const buf = hb.createBuffer();
  buf.addText(text);
  buf.guessSegmentProperties();
  hb.shape(f, buf);
  const shaped = buf.json();
  buf.destroy();
  let pen = 0;
  const glyphs = shaped.map((g) => {
    const at = x + pen + g.dx * s;
    const d = place(f.glyphToPath(g.g), s, at, y - g.dy * s);
    const entry = { d, x: x + pen, cluster: g.cl, advance: g.ax * s + tracking };
    pen += g.ax * s + tracking;
    return entry;
  });
  return { width: pen - tracking, glyphs, d: glyphs.map((g) => g.d).join('') };
}

// Pen x after each character of `text`, for a caret that steps one keystroke at a time.
export function stops(file, text, size, opts = {}) {
  const out = [opts.x ?? 0];
  for (let i = 1; i <= text.length; i++) out.push(line(file, text.slice(0, i), size, opts).width + (opts.x ?? 0));
  return out;
}

// Extents of a glyph outline in px, from its path's coordinates (control points included, so never too small).
export function extents(d) {
  const pts = [...d.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)];
  const xs = pts.map((m) => Number(m[1])), ys = pts.map((m) => Number(m[2]));
  return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) };
}
