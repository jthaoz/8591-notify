import { verifyBot, sendMessage } from '../src/telegram.js';
import {
  loadState, shouldNotifyBadge,
  setBadgeState, clearBadgeState, getState
} from '../src/stateManager.js';
import { launch, isLoggedIn, saveSession, clearCachedSession } from '../src/auth.js';
import { scrape } from '../src/monitor.js';
import config from '../src/config.js';
import log from '../src/logger.js';

const tag = `（${config.accountName}）`;

async function main() {
  log.info(`════════════════════════════════`);
  log.info(`  8591 監控 — ${config.accountName}`);
  log.info(`════════════════════════════════`);

  try {
    const name = await verifyBot();
    log.ok(`Telegram Bot：${name}`);
  } catch (e) {
    log.error('Telegram Bot 驗證失敗：', e.message);
    process.exit(1);
  }

  await loadState();

  const { browser, context, page } = await launch();

  try {
    await page.goto(config.site.url, { waitUntil: 'domcontentloaded', timeout: 30_000 });

    const loggedIn = await isLoggedIn(page);
    if (!loggedIn) {
      log.warn('Session 已過期！');
      // 清除過期快取，下次改用你重登後更新的 SESSION_JSON
      await clearCachedSession();
      await sendMessage(
        `⚠️ <b>8591 監控警告${tag}</b>\n\n` +
        `Session 已過期，無法登入賣場。\n` +
        `請重新執行 <code>node scripts/login.js</code> 並更新對應的 GitHub Secret。`
      );
      process.exit(1);
    }

    // 登入成功 → 把最新 cookies 存起來，自動延長 session
    await saveSession(context);

    const { badges, hasChatMessage } = await scrape(page);

    if (hasChatMessage) {
      await sendMessage(
        `💬 <b>8591 賣場 — 新聊聊訊息${tag}</b>\n\n` +
        `您有新的訊息，請盡快回覆買家！`
      );
      log.ok('已發送聊聊通知');
    }

    const currentHrefs = new Set(badges.map(b => b.href));
    for (const href of Object.keys(getState().badgeMap)) {
      if (!currentHrefs.has(href)) {
        await clearBadgeState(href);
      }
    }

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
    await sendMessage(`⚠️ <b>8591 監控錯誤${tag}</b>\n\n<code>${err.message}</code>`);
  } catch { /* 忽略 */ }
  process.exit(1);
});
