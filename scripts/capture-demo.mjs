/**
 * Regenerate README media from the real React example in sandboxed Chromium.
 * Requires Node 22.12+ (or 24+), npm install, Chrome, and ffmpeg on PATH.
 * Run: node scripts/capture-demo.mjs
 * Optional: CHROME_PATH=/path/to/chrome DEMO_PORT=4190 node scripts/capture-demo.mjs
 * Existing Vite on DEMO_PORT is reused; otherwise this script starts/stops one.
 * No native app is launched. Clipboard and localStorage assertions must pass.
 */
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { get } from 'node:http';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = join(root, 'docs/media');
const temporary = await mkdtemp(join(tmpdir(), 'agent-action-media-'));
const port = Number(process.env.DEMO_PORT || 4190);
const url = `http://127.0.0.1:${port}/showcase.html`;
const storageKey = 'parcha.agent-action.showcase.v1';
const size = { width: 1440, height: 960 };
const fps = 12;
const errors = [];
let server;
let browser;

function ffmpeg(args) {
  const result = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { encoding: 'utf8' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr || `ffmpeg exited ${result.status}`);
}

async function ensureServer() {
  const ready = () => new Promise(resolve => {
    const request = get(url, response => { response.resume(); resolve(response.statusCode === 200); });
    request.on('error', () => resolve(false));
    request.setTimeout(1000, () => { request.destroy(); resolve(false); });
  });
  if (await ready()) return;
  server = spawn(process.execPath, [join(root, 'node_modules/vite/bin/vite.js'), 'examples', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: root, stdio: 'pipe' });
  let log = '';
  server.stdout.on('data', chunk => { log += chunk; });
  server.stderr.on('data', chunk => { log += chunk; });
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error(`Vite exited: ${log}`);
    if (await ready()) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Vite did not become ready: ${log}`);
}

// A visible pointer is the only recording overlay. All UI and state are real.
function installPointer() {
  const install = () => {
    const pointer = document.createElement('div');
    pointer.id = 'recording-pointer';
    pointer.setAttribute('aria-hidden', 'true');
    pointer.style.cssText = 'position:fixed;left:1500px;top:980px;width:30px;height:34px;z-index:2147483647;pointer-events:none;filter:drop-shadow(0 2px 3px #0007)';
    pointer.innerHTML = '<svg width="30" height="34" viewBox="0 0 30 34"><path d="M4 2v24l6-6 5 11 5-2-5-10h9L4 2Z" fill="#f5faf7" stroke="#101a14" stroke-width="1.7" stroke-linejoin="round"/></svg>';
    const pulse = document.createElement('div');
    pulse.id = 'recording-click';
    pulse.style.cssText = 'position:fixed;left:1500px;top:980px;width:34px;height:34px;border:2px solid #c5f6d1;background:#bcebc329;border-radius:50%;z-index:2147483646;pointer-events:none;opacity:0;transform:translate(-50%,-50%)';
    document.body.append(pulse, pointer);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
}

class Recording {
  constructor(page, name) { this.page = page; this.name = name; this.frames = []; this.point = { x: 940, y: 700 }; }
  async frame(duration) {
    const path = join(temporary, `${this.name}-${String(this.frames.length).padStart(4, '0')}.png`);
    await this.page.screenshot({ path });
    this.frames.push({ path, duration });
  }
  async pointer(x, y, click = false) {
    await this.page.mouse.move(x, y);
    await this.page.evaluate(({ x, y, click }) => {
      const pointer = document.getElementById('recording-pointer');
      const pulse = document.getElementById('recording-click');
      pointer.style.left = `${x - 4}px`; pointer.style.top = `${y - 2}px`;
      pulse.style.left = `${x}px`; pulse.style.top = `${y}px`; pulse.style.opacity = click ? '1' : '0';
    }, { x, y, click });
    this.point = { x, y };
  }
  async move(target, seconds = .65) {
    const box = typeof target.boundingBox === 'function' ? await target.boundingBox() : target;
    assert.ok(box, 'Pointer target must be visible');
    const next = { x: box.x + (box.width || 0) / 2, y: box.y + (box.height || 0) / 2 };
    const start = this.point;
    const count = Math.max(1, Math.round(seconds * fps));
    for (let step = 1; step <= count; step++) {
      const progress = step / count;
      const eased = progress * progress * (3 - 2 * progress);
      await this.pointer(start.x + (next.x - start.x) * eased, start.y + (next.y - start.y) * eased);
      await this.frame(seconds / count);
    }
  }
  async click() {
    await this.pointer(this.point.x, this.point.y, true);
    await this.frame(.13);
    await this.page.mouse.click(this.point.x, this.point.y);
    await this.pointer(this.point.x, this.point.y);
    // Keep real intermediate browser frames so the menu's entrance is visible.
    await this.frame(.07);
    await this.page.waitForTimeout(15);
    await this.frame(.07);
    await this.page.waitForTimeout(30);
    await this.frame(.07);
    await this.page.waitForTimeout(50);
  }
  async export() {
    const escaped = path => path.replaceAll("'", "'\\''");
    const list = join(temporary, `${this.name}.txt`);
    const last = this.frames.at(-1);
    const duration = this.frames.reduce((sum, frame) => sum + frame.duration, 0);
    await writeFile(list, this.frames.map(frame => `file '${escaped(frame.path)}'\nduration ${frame.duration}`).join('\n') + `\nfile '${escaped(last.path)}'\n`);
    const input = ['-f', 'concat', '-safe', '0', '-i', list, '-t', duration.toFixed(3)];
    ffmpeg([...input, '-vf', 'fps=12,scale=1200:800:flags=lanczos,split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3', '-loop', '0', join(output, `${this.name}.gif`)]);
    ffmpeg([...input, '-vf', 'fps=24,scale=1200:800:flags=lanczos', '-c:v', 'libx264', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', join(output, `${this.name}.mp4`)]);
    return { name: this.name, duration: Number(duration.toFixed(2)), gifBytes: (await stat(join(output, `${this.name}.gif`))).size, mp4Bytes: (await stat(join(output, `${this.name}.mp4`))).size };
  }
}

try {
  await mkdir(output, { recursive: true });
  ffmpeg(['-version']);
  await ensureServer();
  browser = await chromium.launch({ chromiumSandbox: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' }) });
  const context = await browser.newContext({ viewport: size, deviceScaleFactor: 1, permissions: ['clipboard-read', 'clipboard-write'] });
  await context.addInitScript(installPointer);
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url);
  await page.getByRole('heading', { name: 'Your product. Their agent.' }).waitFor();
  const trigger = label => page.getByRole('button', { name: `Choose coding agent for ${label}`, exact: true });
  const selected = async label => assert.deepEqual(await page.locator('[data-current-agent]').allTextContents(), [label, label, label]);
  const reset = async () => {
    await page.evaluate(key => localStorage.removeItem(key), storageKey);
    await page.reload();
    await trigger('Build an agent').waitFor();
    await selected('Codex app');
  };

  // Static image: the actual component with its provider menu open.
  await trigger('Build an agent').click();
  await page.getByRole('menuitemradio', { name: 'Claude Code CLI', exact: true }).waitFor();
  await page.mouse.move(1000, 200);
  await page.waitForTimeout(250);
  await page.screenshot({ path: join(output, 'agent-action.png') });
  await page.getByRole('menuitem', { name: 'API playground', exact: true }).click();
  assert.equal(await page.getByRole('region', { name: 'API playground', exact: true }).count(), 1);
  assert.equal(JSON.parse(await page.locator('.playground-panel pre').innerText()).prompt, await page.locator('#build-prompt').inputValue());
  await page.getByRole('button', { name: 'Close', exact: true }).click();

  // Clip 1: select a CLI provider, invoke the real action, verify the clipboard.
  await reset();
  const choose = new Recording(page, 'choose-agent');
  await choose.pointer(1000, 710);
  await choose.frame(.8);
  await choose.move(trigger('Build an agent'));
  await choose.click();
  await choose.frame(1.5);
  await choose.move(page.getByRole('menuitemradio', { name: 'Claude Code CLI', exact: true }), .75);
  await choose.click();
  await selected('Claude Code CLI');
  await choose.frame(1.1);
  await choose.move(page.getByRole('button', { name: 'Build an agent', exact: true }), .6);
  await choose.click();
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), await page.locator('#build-prompt').inputValue(), 'Real clipboard must contain the entered prompt');
  assert.equal(await page.locator('.copy-toast.visible').count(), 1, 'Copy confirmation is visible');
  await choose.frame(2.5);
  await choose.move({ x: 1000, y: 710 }, .65);
  await choose.frame(1.1);
  const chooseReport = await choose.export();

  // Clip 2: one selection updates all widgets and survives a genuine reload.
  await reset();
  const remember = new Recording(page, 'remember-choice');
  await remember.pointer(830, 720);
  await remember.frame(.8);
  await remember.move(trigger('Run workflow'));
  await remember.click();
  await remember.frame(1.15);
  await remember.move(page.getByRole('menuitemradio', { name: 'Cursor', exact: true }), .7);
  await remember.click();
  await selected('Cursor');
  assert.equal(await page.evaluate(key => localStorage.getItem(key), storageKey), 'cursor');
  await remember.frame(1.4);
  await remember.move(page.getByRole('button', { name: 'Reload demo', exact: true }), .85);
  await remember.pointer(remember.point.x, remember.point.y, true);
  await remember.frame(.13);
  await Promise.all([page.waitForEvent('load'), page.mouse.click(remember.point.x, remember.point.y)]);
  await trigger('Build an agent').waitFor();
  await selected('Cursor');
  assert.equal(await page.locator('.aa-root[data-provider="cursor"]').count(), 3);
  await remember.pointer(remember.point.x, remember.point.y);
  await remember.frame(1.4);
  await remember.move(trigger('Query data'), .85);
  await remember.click();
  assert.equal(await page.getByRole('menuitemradio', { name: 'Cursor', exact: true }).getAttribute('aria-checked'), 'true');
  await remember.frame(2);
  const rememberReport = await remember.export();

  assert.deepEqual(errors, [], 'No browser runtime errors');
  const report = { viewport: size, outputSize: { width: 1200, height: 800 }, realClipboardVerified: true, sharedPreferenceVerified: true, preferenceAfterReloadVerified: true, extraActionCallbackVerified: true, nativeAppLaunched: false, browserErrors: errors, recordings: [chooseReport, rememberReport] };
  await writeFile(join(output, 'capture-report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser?.close();
  server?.kill('SIGTERM');
  await rm(temporary, { recursive: true, force: true });
}
