/**
 * scripts/check.js
 * GitHub Actions 每 5 分鐘執行一次（三個帳號並行）
 */
import { verifyBot, sendMessage } from '../src/telegram.js';
import {
  loadState, shouldNotifyChat, shouldNotifyBadge,
  setChatState, setBadgeState, clearBadgeState, getState
} from '../src/stateManager.js';
import { launch, isLoggedIn } from '../src/auth.js';
import { scrape } from '../src/monitor.js';
import config from '../src/config.js';
import log from '../src/logger.js';

// 通知標題加上帳號名稱，方便區分
const tag = `（${config.accountName}）`;

async function main() {
  log.info(`════════════════════════════════`);
  log.info(`  8591 監控 — ${config.accountName}`);
  log.info(`════════════════════════════════`);

  // 1. 驗證 Telegram
  try {
    const name = await verifyBot();
    log.ok(`Telegram Bot：${name}`);
  } catch (e) {
    log.error('Telegram Bot 驗證失敗：', e.message);
    process.exit(1);
  }

  // 2. 載入前次狀態
  await loadState();

  // 3. 啟動瀏覽器
  const { browser, page } = await launch();

  try {
    await page.goto(config.site.url, { waitUntil: 'domcontentloaded', timeout: 30_000 });

    // 4. 確認登入狀態
    const loggedIn = await isLoggedIn(page);
    if (!loggedIn) {
      log.warn('Session 已過期！');
      await sendMessage(
        `⚠️ <b>8591 監控警告${tag}</b>\n\n` +
        `Session 已過期，無法登入賣場。\n` +
        `請重新執行 <code>node scripts/login.js ${config.accountName}</code> 並更新 GitHub Secret。`
      );
      process.exit(1);
    }

    // 5. 抓取通知
    const { badges, hasChatMessage } = await scrape(page);

    // ── 聊聊訊息 ─────────────────────────────────────────────
    if (shouldNotifyChat(hasChatMessage)) {
      await sendMessage(
        `💬 <b>8591 賣場 — 新聊聊訊息${tag}</b>\n\n` +
        `您有新的訊息，請盡快回覆買家！`
      );
      log.ok('已發送聊聊通知');
    }
    await setChatState(hasChatMessage);

    // ── Badge 通知 ────────────────────────────────────────────
    const currentHrefs = new Set(badges.map(b => b.href));

    // 清除已消失的 badge
    for (const href of Object.keys(getState().badgeMap)) {
      if (!currentHrefs.has(href)) {
        await clearBadgeState(href);
      }
    }

    // 發送有變化的 badge
    for (const { href, count, label } of badges) {
      if (shouldNotifyBadge(href, count)) {
        const fullUrl = new URL(href, config.site.url).toString();
        await sendMessage(
          `🔔 <b>8591 賣場通知${tag}</b>\n\n` +
          `📋 類型：${label}\n` +
          `🔢 數量：${count} 筆\n` +
          `🔗 <a href="${fullUrl}">前往查看</a>`
        );
        await setBadgeState(href, count);
        log.ok(`已發送通知 [${label}] ×${count}`);
      }
    }

    if (!hasChatMessage && badges.length === 0) {
      log.info('目前沒有新通知');
    }

  } finally {
    await browser.close();
  }

  log.info('執行完畢');
}

main().catch(async (err) => {
  log.error('執行失敗：', err.message);
  try {
    await sendMessage(
      `⚠️ <b>8591 監控錯誤${tag}</b>\n\n<code>${err.message}</code>`
    );
  } catch { /* 忽略 */ }
  process.exit(1);
});
