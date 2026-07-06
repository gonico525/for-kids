// スモークテスト: 全ページ(ハブ+games/*+study/*)を実ブラウザで開いて
//   - JS エラー / コンソールエラーが出ないこと
//   - 🔊/🔇 ボタンのトグルが効くこと
//   - Service Worker が登録されること
// を確認する。静的サーバーは内蔵しているので、node tools/smoke.mjs だけで動く。
//
// 必要なもの: playwright または playwright-core(npm i --no-save playwright-core)と
// Chromium 系ブラウザ。実行ファイルは CHROME_PATH → playwright 既定 → システムの
// Chrome の順で探す。
import { createServer } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { extname, join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  try {
    ({ chromium } = await import('playwright-core'));
  } catch {
    console.error('playwright が見つかりません。npm i --no-save playwright-core を実行してください');
    process.exit(2);
  }
}

// ---------- 内蔵の静的サーバー(依存なし) ----------
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
};
const server = createServer(async (req, res) => {
  try {
    let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (path.endsWith('/')) path += 'index.html';
    const file = join(ROOT, path);
    if (!file.startsWith(ROOT)) throw new Error('out of root');
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const base = `http://127.0.0.1:${server.address().port}`;

// ---------- ページ一覧はディレクトリから自動で拾う(追加漏れを防ぐ) ----------
const pages = ['/'];
for (const cat of ['games', 'study']) {
  for (const e of await readdir(join(ROOT, cat), { withFileTypes: true })) {
    if (e.isDirectory()) pages.push(`/${cat}/${e.name}/`);
  }
}

// ---------- ブラウザ起動(見つかったものを使う) ----------
async function launch() {
  const tries = [];
  if (process.env.CHROME_PATH) tries.push({ executablePath: process.env.CHROME_PATH });
  tries.push({});                    // playwright 既定の Chromium
  tries.push({ channel: 'chrome' }); // システムの Chrome
  let last;
  for (const opt of tries) {
    try { return await chromium.launch(opt); } catch (e) { last = e; }
  }
  throw last;
}
const browser = await launch();

let failed = false;
for (const path of pages) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  await page.goto(base + path, { waitUntil: 'load' });
  await page.waitForTimeout(500);

  // 🔊/🔇 トグル(あれば): 表示が変わり、元に戻ること
  const btn = await page.$('#btn-sound, #soundBtn');
  if (btn) {
    const before = (await btn.textContent()).trim();
    await btn.click();
    const after = (await btn.textContent()).trim();
    await btn.click();
    const restored = (await btn.textContent()).trim();
    if (before === after || before !== restored) errors.push(`sound toggle broken: ${before}->${after}->${restored}`);
  }

  // SW 登録(load 後に KidsApp.init が register する)
  const swCount = await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length);
  if (swCount === 0) errors.push('service worker not registered');

  if (errors.length) {
    failed = true;
    console.log(`NG ${path}\n  ${errors.join('\n  ')}`);
  } else {
    console.log(`OK ${path}`);
  }
  await page.close();
}

await browser.close();
server.close();
process.exit(failed ? 1 : 0);
