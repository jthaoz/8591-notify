import { chromium } from 'playwright';
import fs from 'fs/promises';
import config from './config.js';
import log from './logger.js';

const SESSION_FILE = './session/browser-state.json';
// 自動延長用的 session 快取（存在 state 目錄，會被 GitHub cache 保留）
const SESSION_CACHE = './state/session.json';

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

  let storageState = undefined;

  // 優先順序：1. 快取的最新 session → 2. SESSION_JSON secret → 3. 本機檔案
  let loadedFromCache = false;
  try {
    const cached = await fs.readFile(SESSION_CACHE, 'utf-8');
    storageState = JSON.parse(cached);
    loadedFromCache = true;
    log.info('從快取載入最新 Session（自動延長）');
  } catch {
    if (config.sessionJson) {
      log.info('從環境變數載入 Session（首次或快取遺失）');
      const json = Buffer.from(config.sessionJson, 'base64').toString('utf-8');
      storageState = JSON.parse(json);
    } else {
      try {
        await fs.access(SESSION_FILE);
        storageState = SESSION_FILE;
        log.info(`從檔案載入 Session：${SESSION_FILE}`);
      } catch {
        log.warn('找不到 session，請先執行 npm run login');
      }
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

  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  const page = await context.newPage();
  return { browser, context, page, loadedFromCache };
}

// 把最新的 cookies 存到快取，下次優先使用
export async function saveSession(context) {
  try {
    await fs.mkdir('./state', { recursive: true });
    const state = await context.storageState();
    await fs.writeFile(SESSION_CACHE, JSON.stringify(state));
    log.info('已儲存最新 Session（自動延長成功）');
  } catch (e) {
    log.warn('儲存 Session 失敗：', e.message);
  }
}

// session 過期時刪除快取，下次回頭用 SESSION_JSON secret（你重登後更新的）
export async function clearCachedSession() {
  try {
    await fs.unlink(SESSION_CACHE);
    log.info('已清除過期的快取 Session');
  } catch { /* 沒有快取就忽略 */ }
}

export async function isLoggedIn(page) {
  try {
    const url = page.url();
    if (url.includes('login') || url.includes('signin')) return false;
    await page.waitForSelector(
      '[class*="seller"], [class*="dashboard"], [class*="sidebar"], nav',
      { timeout: 8_000 }
    );
    return true;
  } catch {
    return false;
  }
}
