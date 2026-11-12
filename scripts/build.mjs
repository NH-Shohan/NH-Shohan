// Builds the profile README's SVGs, each in a dark and a light version. Text is shaped with HarfBuzz and written as
// paths, so nothing depends on fonts being installed.
//   node scripts/build.mjs        every image
//   node scripts/build.mjs live   only the images drawn from live data, the activity chart and the package cards
//                                 (the daily GitHub Action runs this)
// The activity chart reads the contribution calendar, so GITHUB_TOKEN must be set.
import { mkdirSync, writeFileSync } from 'node:fs';
import * as si from 'simple-icons';
import { line, stops } from './text.mjs';

const OUT = new URL('../assets/', import.meta.url).pathname;
const ONLY = process.argv[2];
const LOGIN = 'NH-Shohan';
mkdirSync(OUT, { recursive: true });

const MONO = 'IBMPlexMono-Regular.ttf';
const MONO_M = 'IBMPlexMono-Medium.ttf';

const THEMES = {
  dark: { text: '#e6edf3', muted: '#8b949e', faint: '#30363d', green: '#3aad52', greenText: '#56d364', red: '#f47067' },
  light: { text: '#1f2328', muted: '#59636e', faint: '#d1d9e0', green: '#3aad52', greenText: '#1a7f37', red: '#cf222e' },
};

const n = (v) => Math.round(v * 100) / 100;
const EASE_OUT = '0.2 0.7 0.3 1';
const EASE_IN_OUT = '0.6 0 0.3 1';

// One-shot SMIL animation that holds its end value.
const anim = (attr, from, to, begin, dur, spline = EASE_OUT) =>
  `<animate attributeName="${attr}" from="${from}" to="${to}" begin="${n(begin)}s" dur="${n(dur)}s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines="${spline}"/>`;
const fadeIn = (begin, dur = 0.5) => anim('opacity', 0, 1, begin, dur);

// Several runs of text, each with its own font, set one after another on a baseline.
function runs(parts, x, y) {
  let pen = x;
  let svg = '';
  for (const { font, text, size, fill, tracking = 0 } of parts) {
    const l = line(font, text, size, { x: pen, y, tracking });
    svg += `<path fill="${fill}" d="${l.d}"/>`;
    pen += l.width;
  }
  return { svg, width: pen - x };
}
const widthOf = (parts) => runs(parts, 0, 0).width;

const esc = (v) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;');

// Images are drawn on an 840 wide canvas with 40px margins. The file crops the margins off, so each image lines up
// with the README's text instead of sitting indented inside it.
const MARGIN = 40;
function svgDoc(w, h, title, desc, body, css = '') {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w - 2 * MARGIN}" height="${h}" viewBox="${MARGIN} 0 ${w - 2 * MARGIN} ${h}" role="img" aria-labelledby="title desc">
<title id="title">${esc(title)}</title>
<desc id="desc">${esc(desc)}</desc>
${css ? `<style>${css}</style>` : ''}
${body}
</svg>
`;
}

// ---------------------------------------------------------------------------------------------------------------
// Hero: a terminal. `whoami` is typed at the prompt, the name comes back as the answer, a green rule draws under it,
// then the role, and a fresh prompt waits with a blinking caret.

function hero(t) {
  const W = 840, H = 214, X0 = 40, X1 = 800;
  const PROMPT_Y = 40, NAME_Y = 100, RULE_Y = 120, ROLE_Y = 152, NEXT_Y = 190;

  // The command, typed one key at a time after the prompt.
  const CMD = 'whoami', CS = 14, KEY = 0.085, TYPE_AT = 0.45;
  const dollar = runs([{ font: MONO_M, text: '$ ', size: CS, fill: t.green }], X0, PROMPT_Y);
  const cmdX = X0 + dollar.width;
  const cmd = line(MONO, CMD, CS, { x: cmdX, y: PROMPT_Y });
  const xs = stops(MONO, CMD, CS, { x: cmdX });
  const typeDur = KEY * xs.length, ENTER = TYPE_AT + typeDur + 0.25;
  const keyTimes = xs.map((_, i) => n(i / xs.length)).join(';');
  const stepped = (attr, values) => `<animate attributeName="${attr}" values="${values.map(n).join(';')}" keyTimes="${keyTimes}" calcMode="discrete" begin="${TYPE_AT}s" dur="${n(typeDur)}s" fill="freeze"/>`;
  const typedClip = `<clipPath id="typed"><rect x="${n(cmdX)}" y="${PROMPT_Y - 16}" width="0" height="22">${stepped('width', xs.map((x) => x - cmdX))}</rect></clipPath>`;
  const caret1 = `<rect x="${n(cmdX + 1)}" y="${PROMPT_Y - 13}" width="8" height="17" fill="${t.green}" opacity="0.85">${stepped('x', xs.map((x) => x + 1))}<set attributeName="opacity" to="0" begin="${n(ENTER)}s" fill="freeze"/></rect>`;

  // The answer: the name, revealed left to right like output arriving.
  const nameParts = [{ font: MONO_M, text: 'Nahim Hossain Shohan', size: 40, fill: t.text }];
  const name = runs(nameParts, X0, NAME_Y);
  const OUT_AT = ENTER + 0.1;
  const nameClip = `<clipPath id="name"><rect x="${X0 - 4}" y="${NAME_Y - 40}" width="0" height="56">${anim('width', 0, n(name.width + 8), OUT_AT, 0.55, EASE_IN_OUT)}</rect></clipPath>`;

  // The rule, the same green line the rest of the page hangs from.
  const RULE_AT = OUT_AT + 0.35;
  const rule = `<rect x="${X0}" y="${RULE_Y}" width="0" height="3" fill="${t.green}">${anim('width', 0, X1 - X0, RULE_AT, 0.9, EASE_IN_OUT)}</rect>`;

  // The role, then a new prompt. Only this last line loops: a day's work is typed, run and cleared, over and over.
  const role = runs([
    { font: MONO, text: 'Full-Stack & AI Engineer  ·  UI/UX Designer', size: 15, fill: t.text },
    { font: MONO, text: '  ·  Dhaka, Bangladesh', size: 15, fill: t.muted },
  ], X0, ROLE_Y);
  const ROLE_AT = RULE_AT + 0.45, NEXT_AT = ROLE_AT + 0.6;
  const next = runs([{ font: MONO_M, text: '$ ', size: CS, fill: t.green }], X0, NEXT_Y);
  const LOOP = [
    'npx create-3np-stack my-app',
    'code --install-extension NahimHossainShohan.shohantheme',
    'open design.fig',
    'pnpm add @matrajs/react',
    'claude mcp add matra -- npx -y @matrajs/mcp',
    'pnpm dev',
    'npm i notionuxt',
    'git push origin main',
    'vercel deploy --prod',
  ];
  const TYPE = 0.07, ERASE = 0.025, HOLD = 1.6, REST = 0.45;
  const loopX = X0 + next.width;
  const caretX = [[0, loopX]], clipsW = LOOP.map(() => [[0, 0]]);
  let clock = REST;
  LOOP.forEach((cmd, c) => {
    const at = stops(MONO, cmd, CS, { x: loopX });
    for (let k = 1; k < at.length; k++, clock += TYPE) { caretX.push([clock, at[k]]); clipsW[c].push([clock, at[k] - loopX]); }
    clock += HOLD;
    for (let k = at.length - 2; k >= 0; k--, clock += ERASE) { caretX.push([clock, at[k]]); clipsW[c].push([clock, at[k] - loopX]); }
    clock += REST;
  });
  const LOOP_DUR = clock;
  // One discrete track over the whole loop, so every command stays in step on every repeat.
  const track = (attr, points) => `<animate attributeName="${attr}" values="${points.map(([, v]) => n(v)).join(';')}" keyTimes="${points.map(([at]) => Math.min(1, at / LOOP_DUR).toFixed(4)).join(';')}" calcMode="discrete" begin="${n(NEXT_AT)}s" dur="${n(LOOP_DUR)}s" repeatCount="indefinite"/>`;
  const loopClips = clipsW.map((pts, c) => `<clipPath id="loop${c}"><rect x="${n(loopX)}" y="${NEXT_Y - 16}" width="0" height="22">${track('width', pts)}</rect></clipPath>`).join('');
  const loopText = LOOP.map((cmd, c) => `<path clip-path="url(#loop${c})" fill="${t.text}" d="${line(MONO, cmd, CS, { x: loopX, y: NEXT_Y }).d}"/>`).join('');
  const caret2 = `<rect class="caret" x="${n(loopX + 1)}" y="${NEXT_Y - 13}" width="8" height="17" fill="${t.green}" opacity="0">${fadeIn(NEXT_AT, 0.15)}${track('x', caretX.map(([at, x]) => [at, x + 1]))}</rect>`;

  const css = `.caret{animation:blink 1.1s steps(1) ${n(NEXT_AT + 0.3)}s infinite}@keyframes blink{50%{opacity:0}}@media (prefers-reduced-motion:reduce){.caret{animation:none}}`;
  const body = `<defs>${typedClip}${nameClip}${loopClips}</defs>
${dollar.svg}
<path clip-path="url(#typed)" fill="${t.text}" d="${cmd.d}"/>
${caret1}
<g clip-path="url(#name)">${name.svg}</g>
${rule}
<g opacity="0">${fadeIn(ROLE_AT, 0.5)}<g transform="translate(0 4)"><animateTransform attributeName="transform" type="translate" from="0 4" to="0 0" begin="${n(ROLE_AT)}s" dur="0.5s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines="${EASE_OUT}"/>${role.svg}</g></g>
<g opacity="0">${fadeIn(NEXT_AT, 0.15)}${next.svg}</g>
${loopText}
${caret2}`;
  return svgDoc(W, H, 'Nahim Hossain Shohan', 'Full-Stack and AI Engineer, UI/UX Designer, Dhaka, Bangladesh.', body, css);
}

// ---------------------------------------------------------------------------------------------------------------
// Journey: the same line as a timeline. Every public repo from the early years hangs from it as a short thread, and the
// projects that mattered hang longest, in a staircase from 2021 to now. The README's text version lists the same rows.

const PROJECTS = [
  { year: 2024, name: 'Shohan Theme', note: 'a VS Code theme', x: 336 },
  { year: 2024, name: 'create-3np-stack', note: 'a full-stack app from one npx', x: 404 },
  { year: 2025, name: 'TaskGrid', note: 'project management, in real time', x: 472 },
  { year: 2025, name: 'notionuxt', note: 'a Notion-style editor for Vue', x: 536 },
  { year: 2025, name: 'Pengine', note: 'a print-on-demand storefront', x: 600 },
  { year: 2025, name: 'Rooktoo', note: 'blood donation, with an AI assistant', x: 664 },
  { year: 2026, name: 'DoctorProjukti', note: 'a healthcare ecosystem', x: 726 },
  { year: 2026, name: 'Matra', note: 'a rich text editor framework, from scratch', x: 788, head: true },
];
const YEARS = [{ label: '2021', x: 40 }, { label: '2022-23', x: 180 }, { label: '2024', x: 322 }, { label: '2025', x: 458 }, { label: '2026', x: 712 }];

function journey(t) {
  const W = 840, X0 = 40, X1 = 800, LY = 64, LH = 4, ROW0 = 176, ROW = 39;
  const H = ROW0 + (PROJECTS.length - 1) * ROW + 40;
  const LINE_AT = 0.1, LINE_DUR = 2.2;
  const lineT = (x) => LINE_AT + LINE_DUR * Math.min(1, Math.max(0, (x - X0) / (X1 - X0)));
  let body = '';

  for (const y of YEARS) {
    const label = runs([{ font: MONO, text: y.label, size: 12, fill: t.muted }], y.x, LY - 14);
    body += `<g opacity="0">${fadeIn(lineT(y.x), 0.4)}${label.svg}</g>`;
  }
  body += `<rect x="${X0}" y="${LY}" width="0" height="${LH}" fill="${t.green}">${anim('width', 0, X1 - X0, LINE_AT, LINE_DUR, EASE_IN_OUT)}</rect>`;

  // Every small public repo from the early years, as a short thread.
  const cluster = (count, x0, label, sub) => {
    for (let i = 0; i < count; i++) {
      const x = x0 + 6 + i * 5.6, len = 9 + ((i * 7) % 11);
      body += `<line x1="${n(x)}" y1="${LY + LH}" x2="${n(x)}" y2="${LY + LH}" stroke="${t.muted}" stroke-width="1.4" stroke-linecap="round">${anim('y2', LY + LH, LY + LH + len, lineT(x) + 0.05, 0.35)}</line>`;
    }
    const a = runs([{ font: MONO_M, text: label, size: 12, fill: t.text }], x0, LY + 46);
    const b = runs([{ font: MONO, text: sub, size: 12, fill: t.muted }], x0, LY + 62);
    body += `<g opacity="0">${fadeIn(lineT(x0 + count * 5.6) + 0.2, 0.5)}${a.svg}${b.svg}</g>`;
  };
  cluster(22, 40, '22 repos', 'learning the web');
  cluster(14, 180, '14 repos', 'Java, Oracle, Python');

  // The projects, one row each, the label to the left of its stem so no stem crosses a label.
  PROJECTS.forEach((p, i) => {
    const rowY = ROW0 + i * ROW; // name baseline
    const dotY = rowY - 6;
    const start = lineT(p.x) + 0.08;
    const grow = 0.25 + (dotY - LY) / 900;
    const c = p.head ? t.green : t.muted;
    body += `<line x1="${p.x}" y1="${LY + LH}" x2="${p.x}" y2="${LY + LH}" stroke="${c}" stroke-width="${p.head ? 2 : 1.4}">${anim('y2', LY + LH, dotY, start, grow, EASE_IN_OUT)}</line>`;
    body += `<circle cx="${p.x}" cy="${dotY}" r="0" fill="${c}">${anim('r', 0, p.head ? 4.5 : 3.5, start + grow - 0.05, 0.3)}</circle>`;
    const nameParts = [{ font: MONO_M, text: p.name, size: 15, fill: t.text }];
    const noteParts = [{ font: MONO, text: p.note, size: 12, fill: t.muted }];
    const right = p.x - 12;
    let label = runs(nameParts, right - widthOf(nameParts), rowY).svg + runs(noteParts, right - widthOf(noteParts), rowY + 17).svg;
    if (p.head) {
      const tagParts = [{ font: MONO_M, text: 'HEAD -> main', size: 10.5, fill: t.greenText }];
      const tw = widthOf(tagParts) + 14, tx = right - widthOf(nameParts) - 10 - tw;
      label += `<rect x="${n(tx)}" y="${rowY - 17}" width="${n(tw)}" height="19" rx="9.5" fill="none" stroke="${t.green}" stroke-width="1.2"/>`
        + runs(tagParts, tx + 7, rowY - 4).svg;
    }
    body += `<g opacity="0">${fadeIn(start + grow, 0.45)}${label}</g>`;
  });

  return svgDoc(W, H, 'The journey so far, 2021 to 2026',
    `A timeline drawn as one green line. 2021: 22 repos learning the web. 2022 and 2023: 14 university repos in Java, Oracle and Python. ${PROJECTS.map((p) => `${p.year}: ${p.name}, ${p.note}.`).join(' ')} Matra is at HEAD.`, body);
}

// ---------------------------------------------------------------------------------------------------------------
// Tools: two rows, each a few groups hanging from their own stretch of line, joined by dotted bridges. Every tool hangs
// at one of two lengths, so long names never meet. The first in a row has a short name, so it fits the cropped edge.

const ROWS = [
  [
    ['web & mobile', [['React', si.siReact], ['TypeScript', si.siTypescript], ['Next.js', si.siNextdotjs], ['Vue', si.siVuedotjs], ['Nuxt', si.siNuxt],
      ['Tailwind', si.siTailwindcss], ['Expo', si.siExpo], ['Flutter', si.siFlutter]]],
    ['backend & data', [['Node.js', si.siNodedotjs], ['NestJS', si.siNestjs], ['PostgreSQL', si.siPostgresql], ['MongoDB', si.siMongodb], ['Redis', si.siRedis],
      ['Supabase', si.siSupabase], ['Docker', si.siDocker]]],
  ],
  [
    ['ai & ml', [['Python', si.siPython], ['PyTorch', si.siPytorch], ['Hugging Face', si.siHuggingface], ['Optuna', si.siOptuna], ['LangChain', si.siLangchain],
      ['Gemini', si.siGooglegemini], ['Anthropic', si.siAnthropic], ['OpenAI', si.siOpenai]]],
    ['design & shipping', [['Figma', si.siFigma], ['shadcn/ui', si.siShadcnui], ['Git', si.siGit], ['GitHub Actions', si.siGithubactions], ['Vercel', si.siVercel],
      ['Cloudflare', si.siCloudflare]]],
  ],
];

function stack(t) {
  const W = 840, X0 = 40, X1 = 800, GAP = 26, ROW_GAP = 164, FIRST = 36;
  const widest = Math.max(...ROWS.map((row) => row.reduce((a, [, tools]) => a + tools.length, 0)));
  const longest = ROWS.find((row) => row.reduce((a, [, tools]) => a + tools.length, 0) === widest);
  const step = (X1 - X0 - GAP * (longest.length - 1)) / widest;
  let body = '', groupIndex = 0;
  ROWS.forEach((row, r) => {
    const LY = FIRST + r * ROW_GAP;
    let x = X0, i = 0;
    row.forEach(([name, tools], g) => {
      const w = step * tools.length, at = 0.05 + groupIndex++ * 0.3;
      body += `<g opacity="0">${fadeIn(at, 0.5)}${runs([{ font: MONO_M, text: name, size: 11.5, fill: t.text }], x, LY - 12).svg}</g>`;
      body += `<rect x="${n(x)}" y="${LY}" width="0" height="2" fill="${t.faint}">${anim('width', 0, n(w), at, 0.6, EASE_IN_OUT)}</rect>`;
      if (g < row.length - 1) body += `<line x1="${n(x + w + 5)}" y1="${LY + 1}" x2="${n(x + w + GAP - 4)}" y2="${LY + 1}" stroke="${t.faint}" stroke-width="1.6" stroke-linecap="round" stroke-dasharray="0.01 5" opacity="0">${fadeIn(at + 0.5, 0.4)}</line>`;
      tools.forEach(([label, icon], k) => {
        const cx = x + step * (k + 0.5), size = 22, iy = LY + 22 + (i % 2) * 48, t0 = at + 0.1 + k * 0.06;
        const lw = widthOf([{ font: MONO, text: label, size: 10, fill: t.muted }]);
        body += `<line x1="${n(cx)}" y1="${LY + 2}" x2="${n(cx)}" y2="${LY + 2}" stroke="${t.faint}" stroke-width="1.2">${anim('y2', LY + 2, iy - 5, t0, 0.3)}</line>`;
        body += `<g opacity="0">${fadeIn(t0 + 0.2, 0.4)}<g transform="translate(${n(cx - size / 2)} ${iy}) scale(${size / 24})"><path fill="${t.text}" d="${icon.path}"/></g>`
          + runs([{ font: MONO, text: label, size: 10, fill: t.muted }], cx - lw / 2, iy + size + 18).svg + '</g>';
        i++;
      });
      x += w + GAP;
    });
  });
  const H = FIRST + (ROWS.length - 1) * ROW_GAP + 118;
  const list = ROWS.flat().map(([name, tools]) => `${name}: ${tools.map(([l]) => l).join(', ')}`).join('. ');
  return svgDoc(W, H, 'Tools', `${list}.`, body);
}

// ---------------------------------------------------------------------------------------------------------------
// Activity: contributions in each of the last 12 months, one bar a month, like a histogram printed in a terminal.
// Redrawn every day by a GitHub Action, so it is the one part of the page that is always current.

async function calendar() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN is not set');
  const query = 'query($login: String!) { user(login: $login) { contributionsCollection { contributionCalendar { totalContributions weeks { contributionDays { date contributionCount } } } } } }';
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { authorization: `bearer ${token}`, 'content-type': 'application/json', 'user-agent': 'nh-shohan-profile' },
    body: JSON.stringify({ query, variables: { login: LOGIN } }),
  });
  const json = await res.json();
  if (!res.ok || json.errors) throw new Error(`GitHub answered ${res.status}: ${JSON.stringify(json.errors ?? json)}`);
  return json.data.user.contributionsCollection.contributionCalendar;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const day = (iso) => { const [y, m, d] = iso.split('-').map(Number); return `${d} ${MONTHS[m - 1]} ${y}`; };

function streaks(days) {
  let longest = 0, run = 0;
  for (const d of days) { run = d.contributionCount ? run + 1 : 0; longest = Math.max(longest, run); }
  // Today may simply not have started yet, so the current streak may end yesterday.
  let i = days.length - 1, current = 0;
  if (i >= 0 && !days[i].contributionCount) i--;
  for (; i >= 0 && days[i].contributionCount; i--) current++;
  return { longest, current };
}

function activity(t, cal, today) {
  const W = 840, X0 = 40, X1 = 800, TOP = 26, ROW = 19, BAR_X = 128, BAR_MAX = 520, BAR_H = 9;
  const days = cal.weeks.flatMap((w) => w.contributionDays);
  const byMonth = new Map();
  for (const d of days) byMonth.set(d.date.slice(0, 7), (byMonth.get(d.date.slice(0, 7)) ?? 0) + d.contributionCount);
  const months = [...byMonth].slice(-12); // the oldest month is usually only a few days of the window
  const max = Math.max(1, ...months.map(([, c]) => c));
  const best = months.reduce((a, m) => (m[1] > a[1] ? m : a), months[0]);
  const busiestDay = days.reduce((a, d) => (d.contributionCount > a.contributionCount ? d : a), days[0]);
  const { longest, current } = streaks(days);
  let body = '';

  months.forEach(([key, count], i) => {
    const y = TOP + i * ROW, at = 0.1 + i * 0.08, w = Math.max(2, (count / max) * BAR_MAX);
    const [yy, mm] = key.split('-');
    const isBest = key === best[0];
    body += runs([{ font: MONO, text: `${MONTHS[Number(mm) - 1]} ${yy}`, size: 12, fill: t.muted }], X0, y + 9).svg;
    body += `<rect x="${BAR_X}" y="${y}" width="${BAR_MAX}" height="${BAR_H}" rx="2" fill="${t.faint}" opacity="0.45"/>`;
    body += `<rect x="${BAR_X}" y="${y}" width="0" height="${BAR_H}" rx="2" fill="${t.green}" opacity="${isBest ? 1 : 0.7}">${anim('width', 0, n(w), at, 0.6)}</rect>`;
    const label = runs([{ font: isBest ? MONO_M : MONO, text: count.toLocaleString('en-US') + (isBest ? '  busiest' : ''), size: 12, fill: isBest ? t.text : t.muted }], BAR_X + BAR_MAX + 14, y + 9);
    body += `<g opacity="0">${fadeIn(at + 0.5, 0.3)}${label.svg}</g>`;
  });

  const total = cal.totalContributions.toLocaleString('en-US');
  const y1 = TOP + months.length * ROW + 30, y2 = y1 + 22;
  const head = runs([
    { font: MONO_M, text: total, size: 15, fill: t.text },
    { font: MONO, text: ' contributions in the last year', size: 13, fill: t.muted },
  ], X0, y1);
  const stats = runs([{ font: MONO, text: `longest streak ${longest} days  ·  current streak ${current} days  ·  busiest day ${day(busiestDay.date)}`, size: 12, fill: t.muted }], X0, y2);
  const updParts = [{ font: MONO, text: `updated ${day(today)}`, size: 11, fill: t.muted }];
  body += `<g opacity="0">${fadeIn(0.1 + months.length * 0.08 + 0.4, 0.5)}${head.svg}${stats.svg}${runs(updParts, X1 - widthOf(updParts), y1).svg}</g>`;

  const H = y2 + 16;
  return svgDoc(W, H, 'Contributions in the last 12 months',
    `${months.map(([k, c]) => `${k}: ${c}`).join(', ')}. ${total} contributions in the last year. Longest streak ${longest} days, current streak ${current} days, busiest day ${day(busiestDay.date)}. Updated ${day(today)}.`, body);
}

// ---------------------------------------------------------------------------------------------------------------
// Research: the paper as the run that produced it. The command is typed, the setup prints line by line, the search
// bar fills, and the accuracy bar fills while its number counts up to the result. Only facts from the paper appear.

function research(t) {
  const W = 840, X0 = 40, S = 13, LINE = 24;
  const CMD = 'python finetune.py --model gpt2-medium --data imdb --few-shot adaptive --tune optuna';
  const dollar = runs([{ font: MONO_M, text: '$ ', size: S, fill: t.green }], X0, 28);
  const cmdX = X0 + dollar.width;
  const xs = stops(MONO, CMD, S, { x: cmdX });
  const TYPE_AT = 0.3, KEY = 0.02, typeDur = KEY * xs.length;
  const keyTimes = xs.map((_, i) => n(i / xs.length)).join(';');
  const stepped = (attr, values) => `<animate attributeName="${attr}" values="${values.map(n).join(';')}" keyTimes="${keyTimes}" calcMode="discrete" begin="${TYPE_AT}s" dur="${n(typeDur)}s" fill="freeze"/>`;
  let defs = `<clipPath id="cmd"><rect x="${n(cmdX)}" y="10" width="0" height="24">${stepped('width', xs.map((x) => x - cmdX))}</rect></clipPath>`;
  let body = dollar.svg + `<path clip-path="url(#cmd)" fill="${t.text}" d="${line(MONO, CMD, S, { x: cmdX, y: 28 }).d}"/>`
    + `<rect x="${n(cmdX + 1)}" y="15" width="8" height="17" fill="${t.green}" opacity="0.85">${stepped('x', xs.map((x) => x + 1))}<set attributeName="opacity" to="0" begin="${n(TYPE_AT + typeDur + 0.2)}s" fill="freeze"/></rect>`;

  // The setup, one line at a time, as the script would print it.
  const OUT = TYPE_AT + typeDur + 0.35, GAP = 0.32;
  const keyW = widthOf([{ font: MONO, text: 'accuracy  ', size: S, fill: t.muted }]);
  const valueX = X0 + keyW;
  const row = (i, key, value) => {
    const y = 60 + i * LINE;
    const parts = runs([{ font: MONO, text: key, size: S, fill: t.muted }], X0, y).svg + runs([{ font: MONO, text: value, size: S, fill: t.text }], valueX, y).svg;
    return { y, at: OUT + i * GAP, svg: parts };
  };
  const rows = [
    row(0, 'model', 'gpt2-medium, 355M parameters'),
    row(1, 'data', 'IMDB movie reviews, few labelled examples'),
    row(2, 'prompts', 'adaptive few-shot'),
    row(3, 'search', 'optuna'),
    row(4, 'accuracy', 'imdb'),
  ];
  for (const r of rows) body += `<g opacity="0">${fadeIn(r.at, 0.2)}${r.svg}</g>`;

  // Two bars, lined up: the hyperparameter search, then the result.
  const barX = valueX + widthOf([{ font: MONO, text: 'optuna    ', size: S, fill: t.text }]), BAR = 240;
  const bar = (r, to, dur) => `<rect x="${n(barX)}" y="${r.y - 10}" width="${BAR}" height="11" rx="2" fill="${t.faint}" opacity="0">${fadeIn(r.at, 0.2)}</rect>`
    + `<rect x="${n(barX)}" y="${r.y - 10}" width="0" height="11" rx="2" fill="${t.green}">${anim('width', 0, n(BAR * to), r.at + 0.2, dur)}</rect>`;
  const SEARCH = rows[3], ACC = rows[4], SEARCH_DUR = 1.3, ACC_DUR = 1.6;
  body += bar(SEARCH, 1, SEARCH_DUR);
  body += `<g opacity="0">${fadeIn(SEARCH.at + 0.2 + SEARCH_DUR, 0.2)}${runs([{ font: MONO, text: 'best trial kept', size: S, fill: t.muted }], barX + BAR + 16, SEARCH.y).svg}</g>`;
  // The result waits for the search, then fills while its number counts up.
  const accAt = SEARCH.at + 0.2 + SEARCH_DUR + 0.2;
  const ACC_ROW = { ...ACC, at: Math.max(ACC.at, accAt - 0.2) };
  body += bar(ACC_ROW, 0.867, ACC_DUR);
  const frames = [0, 23.5, 44.1, 60.2, 71.8, 79.6, 84.2, 86, 86.7];
  frames.forEach((v, k) => {
    const start = ACC_ROW.at + 0.2 + (k / (frames.length - 1)) * ACC_DUR, next = ACC_ROW.at + 0.2 + ((k + 1) / (frames.length - 1)) * ACC_DUR;
    const last = k === frames.length - 1;
    const num = runs([{ font: MONO_M, text: `${v.toFixed(1)}%`, size: S + 1, fill: last ? t.greenText : t.text }], barX + BAR + 16, ACC.y);
    body += `<g opacity="0"><set attributeName="opacity" to="1" begin="${n(start)}s"/>${last ? '' : `<set attributeName="opacity" to="0" begin="${n(next)}s"/>`}${num.svg}</g>`;
  });

  // The paper itself, as comments under the run.
  const END = ACC_ROW.at + 0.2 + ACC_DUR + 0.3;
  const c1 = runs([{ font: MONO, text: '# Advancing NLP Tasks Through Fine-tuning of Foundation Language Models, 2024', size: 12, fill: t.muted }], X0, 60 + 5 * LINE + 14);
  body += `<g opacity="0">${fadeIn(END, 0.5)}${c1.svg}</g>`;

  const H = 60 + 5 * LINE + 28;
  return svgDoc(W, H, 'Research: fine-tuning GPT-2 Medium',
    'Advancing NLP Tasks Through Fine-tuning of Foundation Language Models, 2024, with Md. Jidanul Hakim Jitu. GPT-2 Medium, 355M parameters, fine-tuned on IMDB movie reviews with few labelled examples, adaptive few-shot prompts and an Optuna hyperparameter search. Accuracy 86.7%.',
    `<defs>${defs}</defs>${body}`);
}

// ---------------------------------------------------------------------------------------------------------------
// Cards: one per published package, laid out like the mcprush card they sit beside. The numbers come from the npm
// registry and the VS Code Marketplace each time this runs, so the daily Action keeps them current. Like the mcprush
// card, they are dark in both themes, so the four read as one set.

// Small line icons on a 24 unit grid, drawn with a stroke.
const ICONS = {
  scale: 'M12 3v18M7 21h10M5 7h14M5 7l-3 7a3 3 0 0 0 6 0l-3-7M19 7l-3 7a3 3 0 0 0 6 0l-3-7',
  box: 'M3 7.5 12 3l9 4.5v9L12 21l-9-4.5zM3 7.5l9 4.5 9-4.5M12 12v9',
  check: 'M5 12.5l4.5 4.5L19 7',
  download: 'M12 3v12M7 10l5 5 5-5M4 20h16',
  tag: 'M3 12V3h9l9 9-9 9zM7.5 7.5h.01',
  layers: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5',
  palette: 'M12 3a9 9 0 1 0 0 18c1.5 0 2-1 2-2s-1-1.5-1-2.5S14 15 15 15h2a4 4 0 0 0 4-4c0-4.4-4-8-9-8zM7.5 11h.01M10 7h.01M15 7.5h.01',
  contrast: 'M12 3a9 9 0 1 0 0 18zM12 3a9 9 0 0 1 0 18',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  refresh: 'M20 12a8 8 0 1 1-2.4-5.7M20 4v5h-5',
  code: 'M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16',
};

const npmJson = async (url) => { const r = await fetch(url); if (!r.ok) throw new Error(`${url} answered ${r.status}`); return r.json(); };
async function npmPackage(name) {
  const meta = await npmJson(`https://registry.npmjs.org/${name}`);
  const version = meta['dist-tags'].latest, latest = meta.versions[version];
  const year = await npmJson(`https://api.npmjs.org/downloads/point/last-year/${name}`);
  return {
    version, releases: Object.keys(meta.versions).length, license: latest.license, deps: Object.keys(latest.dependencies ?? {}).length,
    typed: Boolean(latest.types || latest.typings || JSON.stringify(latest.exports ?? '').includes('types')), updated: meta.time[version], downloads: year.downloads,
  };
}
async function marketplace(id) {
  const r = await fetch('https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery', {
    method: 'POST', headers: { accept: 'application/json;api-version=7.2-preview.1', 'content-type': 'application/json' },
    body: JSON.stringify({ filters: [{ criteria: [{ filterType: 7, value: id }] }], flags: 914 }),
  });
  if (!r.ok) throw new Error(`Marketplace answered ${r.status}`);
  const e = (await r.json()).results[0].extensions[0];
  const stat = Object.fromEntries(e.statistics.map((x) => [x.statisticName, x.value]));
  return { version: e.versions[0].version, updated: e.lastUpdated, installs: stat.install, downloads: stat.downloadCount, updates: stat.updateCount };
}

const short = (v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v)));
function ago(iso, today) {
  const days = Math.round((Date.parse(today) - Date.parse(iso.slice(0, 10))) / 86_400_000);
  if (days < 60) return `${days}d ago`;
  const [y, m] = iso.slice(0, 7).split('-');
  return `${MONTHS[Number(m) - 1]} ${y}`;
}

async function cardData(today) {
  const [core, notionuxt, theme] = await Promise.all([npmPackage('@matrajs/core'), npmPackage('notionuxt'), marketplace('NahimHossainShohan.shohantheme')]);
  const npmFacts = (p) => [['scale', p.license, ''], ['box', String(p.deps), p.deps === 1 ? ' dependency' : ' dependencies'], ...(p.typed ? [['check', 'typed', '']] : [])];
  return [
    { slug: 'matra', title: '@matrajs/core', sub: 'by matrajs', rows: [npmFacts(core), [['download', `${short(core.downloads)}/yr`, ' npm'], ['tag', String(core.releases), ' releases'], ['layers', '9', ' packages']]],
      footer: `v${core.version} · updated ${ago(core.updated, today)}`, logo: si.siNpm.path, logoText: 'npm' },
    { slug: 'notionuxt', title: 'notionuxt', sub: 'by NH-Shohan', rows: [npmFacts(notionuxt), [['download', `${short(notionuxt.downloads)}/yr`, ' npm'], ['tag', String(notionuxt.releases), ' releases'], ['layers', 'Vue 3', '']]],
      footer: `v${notionuxt.version} · updated ${ago(notionuxt.updated, today)}`, logo: si.siNpm.path, logoText: 'npm' },
    { slug: 'theme', title: 'Shohan Theme', sub: 'by NahimHossainShohan', rows: [[['palette', '3', ' themes'], ['contrast', 'high', ' contrast'], ['check', 'free', '']], [['user', short(theme.installs), ' installs'], ['download', short(theme.downloads), ' downloads'], ['refresh', short(theme.updates), ' updates']]],
      footer: `v${theme.version} · updated ${ago(theme.updated, today)}`, stroke: ICONS.code, logoText: 'Marketplace' },
  ];
}

function card(t, c) {
  const W = 380, H = 200, P = 22;
  const bg = '#161b22';
  let body = `<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="10" fill="${bg}" stroke="${t.faint}"/>`;
  body += runs([{ font: MONO_M, text: c.title, size: 17, fill: t.text }], P, 40).svg;
  body += runs([{ font: MONO, text: c.sub, size: 12, fill: t.muted }], P, 62).svg;
  // A row of stats, each an icon and a bold value; the row shrinks a little if it would not fit the card.
  const rowWidth = (items, size, gap) => items.reduce((a, [, strong, rest]) => a + 21 + widthOf([{ font: MONO_M, text: strong, size, fill: '' }, { font: MONO, text: rest, size, fill: '' }]), 0) + gap * (items.length - 1);
  c.rows.forEach((items, r) => {
    const y = 104 + r * 32;
    let size = 12, gap = 18;
    while (rowWidth(items, size, gap) > W - 2 * P && size > 10) { size -= 0.25; gap = Math.max(12, gap - 1); }
    let x = P;
    for (const [icon, strong, rest] of items) {
      body += `<path transform="translate(${n(x)} ${y - 12}) scale(${14 / 24})" d="${ICONS[icon]}" fill="none" stroke="${t.muted}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
      const text = runs([{ font: MONO_M, text: strong, size, fill: t.text }, { font: MONO, text: rest, size, fill: t.muted }], x + 21, y);
      body += text.svg;
      x += 21 + text.width + gap;
    }
  });
  body += `<line x1="${P}" y1="153.5" x2="${W - P}" y2="153.5" stroke="${t.faint}" stroke-dasharray="4 4"/>`;
  body += runs([{ font: MONO, text: c.footer, size: 11, fill: t.muted }], P, 180).svg;
  const label = runs([{ font: MONO_M, text: c.logoText, size: 13, fill: t.text }], 0, 0);
  const lx = W - P - label.width;
  body += runs([{ font: MONO_M, text: c.logoText, size: 13, fill: t.text }], lx, 180).svg;
  body += c.logo
    ? `<path transform="translate(${n(lx - 24)} 166) scale(${18 / 24})" fill="${t.text}" d="${c.logo}"/>`
    : `<path transform="translate(${n(lx - 24)} 166) scale(${18 / 24})" d="${c.stroke}" fill="none" stroke="${t.text}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="title desc">
<title id="title">${esc(c.title)}</title>
<desc id="desc">${esc(`${c.sub}. ${c.rows.flat().map(([, a, b]) => a + b).join(', ')}. ${c.footer}.`)}</desc>
${body}
</svg>
`;
}

// ---------------------------------------------------------------------------------------------------------------
// Section headings: each a prompt line like the header's, the $ in green. GitHub strips colour from README text, so the
// headings are drawn too, sized to their text so they stay the same size on every screen.

const HEADINGS = [
  ['about', 'cat about.ts'], ['experience', 'cat experience.log'], ['tools', 'ls ./tools'], ['work', 'ls ./work'],
  ['research', 'cat research.md'], ['journey', 'git log --since=2021'], ['activity', 'watch -n 86400 git-activity'], ['badges', 'ls ./badges'],
];

function heading(t, cmd) {
  const H = 58; // room above the text, so each section starts with some air
  const parts = [{ font: MONO_M, text: '$ ', size: 20, fill: t.green }, { font: MONO_M, text: cmd, size: 20, fill: t.text }];
  const w = Math.ceil(widthOf(parts)) + 4;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${H}" viewBox="0 0 ${w} ${H}" role="img" aria-labelledby="title">
<title id="title">${esc(`$ ${cmd}`)}</title>
${runs(parts, 1, 50).svg}
</svg>
`;
}

const today = new Date().toISOString().slice(0, 10);
const [cal, cards] = await Promise.all([calendar(), cardData(today)]);
for (const c of cards) writeFileSync(`${OUT}card-${c.slug}.svg`, card(THEMES.dark, c));
for (const [mode, t] of Object.entries(THEMES)) {
  writeFileSync(`${OUT}activity-${mode}.svg`, activity(t, cal, today));
  if (ONLY === 'live') continue;
  writeFileSync(`${OUT}hero-${mode}.svg`, hero(t));
  writeFileSync(`${OUT}journey-${mode}.svg`, journey(t));
  writeFileSync(`${OUT}stack-${mode}.svg`, stack(t));
  writeFileSync(`${OUT}research-${mode}.svg`, research(t));
  for (const [slug, cmd] of HEADINGS) writeFileSync(`${OUT}heading-${slug}-${mode}.svg`, heading(t, cmd));
}
console.log(`built ${ONLY === 'live' ? 'the live images (activity and cards)' : 'every image'} in ${OUT}`);
