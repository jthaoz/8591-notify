/**
 * auth.js — 啟動 Playwright 並載入 Session
 *
 * Session 來源優先順序：
 *   1. SESSION_JSON 環境變數（base64）← GitHub Actions 用這個
 *   2. session/browser-state.json 檔案   ← 本機開發用
 */
import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import config from './config.js';
import log from './logger.js';

const SESSION_FILE = './session/browser-state.json';

/**
 * 啟動瀏覽器並套用 session，回傳 { browser, page }
 * @returns {Promise<{ browser: import('playwright').Browser, page: import('playwright').Page }>}
 */
export async function launch() {
  log.info('啟動 Chromium（headless）...');

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
    ],
  });

  // ── 決定 session 來源 ────────────────────────────────────
  let storageState = undefined;

  if (config.sessionJson) {
    // GitHub Actions：SESSION_JSON 是 base64 字串
    log.info('從環境變數載入 Session（GitHub Actions 模式）');
    const json = Buffer.from(config.sessionJson, 'base64').toString('utf-8');
    storageState = JSON.parse(json); // 直接傳物件給 Playwright
  } else {
    // 本機：從檔案讀
    try {
      await fs.access(SESSION_FILE);
      storageState = SESSION_FILE;
      log.info(`從檔案載入 Session：${SESSION_FILE}`);
    } catch {
      log.warn('找不到 session 檔案，請先執行 npm run login');
    }
  }

  const context = await browser.newContext({
    storageState,
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
      'AppleWebKit/537.36 (KHTML, like Gecko) ' +
      'Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
    locale: 'zh-TW',
    timezoneId: 'Asia/Taipei',
  });

  // 隱藏自動化特徵
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  const page = await context.newPage();
  return { browser, page };
}

/**
 * 檢查頁面是否仍在登入狀態
 * @param {import('playwright').Page} page
 */
export async function isLoggedIn(page) {
  try {
    const url = page.url();
    // 8591 登入頁通常含有 login 字樣
    if (url.includes('login') || url.includes('signin')) return false;
    // 等待賣場特有元素
    await page.waitForSelector(
      '[class*="seller"], [class*="dashboard"], [class*="sidebar"], nav',
      { timeout: 8_000 }
    );
    return true;
  } catch {
    return false;
  }
}
