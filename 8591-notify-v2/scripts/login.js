/**
 * scripts/login.js — 登入並產生 SESSION_JSON
 *
 * 用法：
 *   node scripts/login.js 1   ← 帳號一
 *   node scripts/login.js 2   ← 帳號二
 *   node scripts/login.js 3   ← 帳號三
 */
import { chromium } from 'playwright';
import fs from 'fs/promises';
import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import 'dotenv/config';

const accountNum = process.argv[2] || '1';
const SITE_URL = process.env.SITE_URL || 'https://www.8591.com.tw/';
const SESSION_FILE = `./session/browser-state-account${accountNum}.json`;

async function main() {
  console.log(`\n══════════════════════════════════════════`);
  console.log(`  8591 賣場 — 帳號${accountNum} 登入`);
  console.log(`══════════════════════════════════════════\n`);

  const browser = await chromium.launch({
    headless: false,
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
      'AppleWebKit/537.36 (KHTML, like Gecko) ' +
      'Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
    locale: 'zh-TW',
    timezoneId: 'Asia/Taipei',
  });

  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  const page = await context.newPage();
  await page.goto(SITE_URL);

  console.log(`📌 請在瀏覽器中登入【帳號${accountNum}】的 8591 賣場`);
  console.log(`   登入完成後回到這裡按 Enter\n`);

  const rl = readline.createInterface({ input, output });
  await rl.question(`▶ 帳號${accountNum} 登入完成後按 Enter...`);
  rl.close();

  await fs.mkdir('./session', { recursive: true });
  await context.storageState({ path: SESSION_FILE });

  const raw = await fs.readFile(SESSION_FILE, 'utf-8');
  const b64 = Buffer.from(raw).toString('base64');

  console.log(`\n══════════════════════════════════════════`);
  console.log(`  複製以下內容到 GitHub Secret`);
  console.log(`  Secret 名稱：SESSION_JSON_${accountNum}`);
  console.log(`══════════════════════════════════════════\n`);
  console.log(b64);
  console.log(`\n══════════════════════════════════════════`);
  console.log(`  ⬆ 全部選取複製，不要漏掉任何字元`);
  console.log(`══════════════════════════════════════════\n`);

  await browser.close();
}

main().catch(e => {
  console.error('登入失敗：', e.message);
  process.exit(1);
});
