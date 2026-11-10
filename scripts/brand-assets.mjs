// Regenerates every static brand file from one geometry:
//   public/favicon.svg, favicon.ico, apple-touch-icon.png, og.png
//   public/brand/invigil-mark.{svg,png}, invigil-lockup.{svg,png}, invigil-lockup-white.svg, invigil-lockup-mono.svg
// The wordmark outline is read from the BrandMarkComponent so the app and the files cannot drift.
// Run:  npm run brand        (needs Node 22+ and Chrome/Edge; set CHROME if it is not in the default place)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pub = path.join(root, 'public');
const chromePath = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const component = fs.readFileSync(path.join(root, 'src/app/shared/brand-mark/brand-mark.component.ts'), 'utf8');
const WORD = component.match(/const WORD = '([^']+)'/)?.[1];
if (!WORD) throw new Error('wordmark path not found in brand-mark.component.ts');

// ── colours: the tokens, as hex (a standalone SVG cannot read CSS variables) ──
const hex = (L, C, h) => {
  const a = C * Math.cos(h * Math.PI / 180), b = C * Math.sin(h * Math.PI / 180);
  const l = (L + .3963377774 * a + .2158037573 * b) ** 3, m = (L - .1055613458 * a - .0638541728 * b) ** 3, s = (L - .0894841775 * a - 1.2914855480 * b) ** 3;
  const lin = [4.0767416621 * l - 3.3077115913 * m + .2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - .3413193965 * s, -.0041960863 * l - .7034186147 * m + 1.7076147010 * s];
  return '#' + lin.map(v => { v = Math.min(1, Math.max(0, v)); v = v <= .0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - .055; return Math.round(v * 255).toString(16).padStart(2, '0'); }).join('');
};
const BLUE = hex(.44, .19, 262), ACCENT = hex(.46, .20, 262), YELLOW = hex(.89, .17, 95), INK = hex(.21, .03, 262), WHITE = '#fcfcfe';

// ── geometry (40-unit box) ──
const figures = (fg, you, small) => small
  ? `<g fill="${fg}"><circle cx="11.5" cy="11.5" r="3.2"/><circle cx="28.5" cy="11.5" r="3.2"/><rect x="8.8" y="17" width="5.4" height="12.5" rx="2.7"/><rect x="17.3" y="17" width="5.4" height="12.5" rx="2.7"/><rect x="25.8" y="17" width="5.4" height="12.5" rx="2.7"/></g><circle cx="20" cy="11.5" r="3.2" fill="${you}"/>`
  : `<g fill="${fg}"><circle cx="12.5" cy="11.5" r="2.5"/><circle cx="27.5" cy="11.5" r="2.5"/><rect x="10.4" y="15.8" width="4.2" height="9.5" rx="2.1"/><rect x="17.9" y="15.8" width="4.2" height="9.5" rx="2.1"/><rect x="25.4" y="15.8" width="4.2" height="9.5" rx="2.1"/><rect x="8.5" y="28" width="23" height="3.2" rx="1.6"/></g><circle cx="20" cy="11.5" r="2.5" fill="${you}"/>`;
const roundel = (bg, fg, you, small = false, edge = '') => `<circle cx="20" cy="20" r="20" fill="${bg}" ${edge}/>${figures(fg, you, small)}`;
const svg = (w, h, body, extra = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" ${extra}>${body}</svg>\n`;

const S = 0.7, OX = 50, BASE = 27.2, WIDTH = Math.round((OX + 94.36 * S) * 10) / 10;
const word = (ink, dot) => `<g transform="translate(${OX} ${BASE}) scale(${S})"><path d="${WORD}" fill="${ink}"/><circle cx="4.26" cy="-26.46" r="3.5" fill="${ink}"/><circle cx="80.62" cy="-26.46" r="3.5" fill="${ink}"/><circle cx="51.78" cy="-26.46" r="3.5" fill="${dot}"/></g>`;
const lockup = (bg, fg, you, ink, dot, edge) => svg(WIDTH, 40, roundel(bg, fg, you, false, edge) + word(ink, dot), 'role="img" aria-label="Invigil"');

// ── files ──
const files = {
  'favicon.svg': svg(40, 40, roundel(BLUE, WHITE, YELLOW, true)),
  'brand/invigil-mark.svg': svg(40, 40, roundel(BLUE, WHITE, YELLOW), 'role="img" aria-label="Invigil"'),
  'brand/invigil-lockup.svg': lockup(BLUE, WHITE, YELLOW, INK, ACCENT, ''),
  'brand/invigil-lockup-white.svg': lockup('#ffffff24', WHITE, YELLOW, WHITE, YELLOW, 'stroke="#ffffff66" stroke-width="1"'),
  // One colour for print, fax and stamps: black roundel, the "you" head knocked out to paper white.
  'brand/invigil-lockup-mono.svg': lockup('#000', '#fff', '#fff', '#000', '#000', ''),
};
fs.mkdirSync(path.join(pub, 'brand'), { recursive: true });
for (const [f, body] of Object.entries(files)) fs.writeFileSync(path.join(pub, f), body);

// ── PNGs through headless Chrome ──
const sleep = ms => new Promise(r => setTimeout(r, ms));
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'brand-'));
const chrome = spawn(chromePath, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--remote-debugging-port=9351', `--user-data-dir=${profile}`, '--no-first-run', '--force-device-scale-factor=1', 'about:blank'], { stdio: 'ignore' });
let targets;
for (let i = 0; i < 60; i++) { try { targets = await (await fetch('http://127.0.0.1:9351/json')).json(); if (targets.find(t => t.type === 'page')) break; } catch { /* retry */ } await sleep(250); }
const ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
await new Promise(r => (ws.onopen = r));
let id = 0; const pending = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result ?? m); pending.delete(m.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Page.enable');
await send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
const png = async (html, w, h) => {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'data:text/html;base64,' + Buffer.from(`<!doctype html><meta charset="utf-8"><body style="margin:0;background:transparent">${html}</body>`).toString('base64') });
  await sleep(700);
  return Buffer.from((await send('Page.captureScreenshot', { format: 'png', fromSurface: true })).data, 'base64');
};
const sized = (markup, w, h) => markup.replace('<svg ', `<svg width="${w}" height="${h}" `);

const roundSmall = svg(40, 40, roundel(BLUE, WHITE, YELLOW, true));
const roundFull = svg(40, 40, roundel(BLUE, WHITE, YELLOW));
const [p16, p32] = [await png(sized(roundSmall, 16, 16), 16, 16), await png(sized(roundSmall, 32, 32), 32, 32)];
const p48 = await png(sized(roundFull, 48, 48), 48, 48);
// Apple masks the icon itself, so it is a full-bleed square with the figures at 80%.
const apple = svg(40, 40, `<rect width="40" height="40" fill="${BLUE}"/><g transform="translate(20 20) scale(.8) translate(-20 -20)">${figures(WHITE, YELLOW)}</g>`);
fs.writeFileSync(path.join(pub, 'apple-touch-icon.png'), await png(sized(apple, 180, 180), 180, 180));
fs.writeFileSync(path.join(pub, 'brand/invigil-mark.png'), await png(sized(roundFull, 512, 512), 512, 512));
fs.writeFileSync(path.join(pub, 'brand/invigil-lockup.png'), await png(sized(files['brand/invigil-lockup.svg'], WIDTH * 10, 400), WIDTH * 10, 400));

// ICO holding three PNGs (16, 32, 48)
const imgs = [[16, p16], [32, p32], [48, p48]];
const head = Buffer.alloc(6); head.writeUInt16LE(1, 2); head.writeUInt16LE(imgs.length, 4);
let off = 6 + 16 * imgs.length;
const dir = imgs.map(([s, b]) => { const e = Buffer.alloc(16); e[0] = s; e[1] = s; e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6); e.writeUInt32LE(b.length, 8); e.writeUInt32LE(off, 12); off += b.length; return e; });
fs.writeFileSync(path.join(pub, 'favicon.ico'), Buffer.concat([head, ...dir, ...imgs.map(i => i[1])]));

// ── share image, 1200x630: the drawn hall plan (as on the landing), the lockup, the promise ──
const b64 = f => fs.readFileSync(path.join(pub, f)).toString('base64');
const face = (name, file) => `@font-face{font-family:${name};src:url(data:font/woff2;base64,${b64('fonts/' + file)}) format('woff2')}`;
const BENCH_COUNTS = [7, 5, 8, 6, 7];                                // columns of benches, uneven like a hall
const plan = BENCH_COUNTS.map((n, c) => '<span>' + Array.from({ length: n }, (_, k) => '<i' + (c === 2 && k === 3 ? ' class="me"' : '') + '></i>').join('') + '</span>').join('');
const og = `<style>${face('D', 'cal-sans-latin-400-normal.woff2')}${face('B', 'barlow-latin-400-normal.woff2')}
.c{position:relative;width:1200px;height:630px;overflow:hidden;font-family:B,sans-serif;color:${INK};background:linear-gradient(180deg,${hex(.74, .12, 245)},${hex(.93, .04, 240)})}
.plan{position:absolute;top:348px;right:56px;display:flex;gap:24px}
.plan span{display:flex;flex-direction:column;gap:15px}
.plan i{display:block;width:76px;height:18px;border-radius:6px;background:rgba(255,255,255,.62);box-shadow:inset 0 0 0 1px rgba(255,255,255,.5)}
.plan i.me{background:${YELLOW};box-shadow:0 0 0 4px rgba(255,255,255,.7),0 6px 14px -4px rgba(15,30,80,.5)}
.in{position:absolute;inset:0;padding:64px 72px}
h1{margin:34px 0 0;font-family:D,B,sans-serif;font-weight:400;font-size:112px;line-height:1;letter-spacing:-.012em;word-spacing:.1em}
p{margin:22px 0 0;font-size:34px;line-height:1.35;max-width:760px}
.chip{position:absolute;left:72px;bottom:64px;padding:16px 26px;border-radius:16px;background:${YELLOW};font-weight:600;font-size:38px;rotate:-2deg;box-shadow:0 14px 30px -12px rgba(15,30,80,.5)}
.chip small{font-size:22px;font-weight:400;margin-right:12px;opacity:.75}</style>
<div class="c"><div class="plan">${plan}</div>
<div class="in"><div style="height:64px">${sized(files['brand/invigil-lockup.svg'], Math.round(WIDTH * 1.6), 64)}</div>
<h1>Find your exam seat.</h1><p>Enter your hall ticket number to see your hall, bench and seat. No account, nothing to install.</p></div>
<div class="chip"><small>Example</small>Bench 14 · Seat 2</div></div>`;
fs.writeFileSync(path.join(pub, 'og.png'), await png(og, 1200, 630));

chrome.kill();
console.log('brand files written to', pub);
process.exit(0);
