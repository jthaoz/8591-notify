/**
 * monitor.js — 從 8591 頁面抓取通知
 *
 * 抓兩種通知：
 *   1. Badge 數字（橘色徽章，排除 type=4 待領收）
 *   2. 聊聊訊息（「您有新的訊息」文字）
 */
import config from './config.js';
import log from './logger.js';

// 排除的 type（待領收，不通知）
const EXCLUDED_TYPES = ['4'];

// type 對應中文名稱
const TYPE_NAMES = {
  '1': '待付款',
  '2': '待確認',
  '3': '待移交',
  '5': '待出貨',
  '6': '運輸中',
  '7': '已完成',
  '8': '已取消',
  '9': '退貨/退款',
};

function labelOf(href) {
  try {
    const u = new URL(href, config.site.url);
    const t = u.searchParams.get('type');
    if (t && TYPE_NAMES[t]) return TYPE_NAMES[t];
    return u.pathname.split('/').filter(Boolean).pop() || href;
  } catch {
    return href;
  }
}

/**
 * 導覽到 8591 賣場後台並抓取所有通知
 * @param {import('playwright').Page} page
 * @returns {Promise<{ badges: Array<{href,count,label}>, hasChatMessage: boolean }>}
 */
export async function scrape(page) {
  // 導覽到賣場首頁（重新整理取得最新狀態）
  log.info(`前往 ${config.site.url}`);
  await page.goto(config.site.url, {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  });

  // 等頁面穩定（最多 10 秒）
  await page.waitForTimeout(3_000);

  // ── 在瀏覽器端執行抓取（注意：此函式內不能用外部變數）──
  const raw = await page.evaluate((excludedTypes) => {
    const badges = [];

    // 1. Badge 偵測
    for (const badge of document.querySelectorAll('.badge__content')) {
      if (badge.style.display === 'none') continue;

      const text = badge.innerText.trim();
      if (!text) continue;

      const count = parseInt(text, 10);
      if (isNaN(count) || count <= 0) continue;

      const link = badge.closest('a');
      if (!link) continue;

      const href = link.getAttribute('href') || '';
      if (!href) continue;

      // 解析 type 並排除
      try {
        const u = new URL(href, location.origin);
        const type = u.searchParams.get('type');
        if (type && excludedTypes.includes(type)) continue;
      } catch { /* 忽略 */ }

      badges.push({ href, count });
    }

    // 2. 聊聊訊息偵測
    const hasChatMessage = [...document.querySelectorAll('span')].some(
      el => el.innerText && el.innerText.includes('您有新的訊息')
    );

    return { badges, hasChatMessage };
  }, EXCLUDED_TYPES);

  // 補上中文 label
  const badges = raw.badges.map(b => ({ ...b, label: labelOf(b.href) }));

  log.info(`偵測結果 → badges: [${badges.map(b => `${b.label}×${b.count}`).join(', ') || '無'}]  聊聊: ${raw.hasChatMessage}`);

  return { badges, hasChatMessage: raw.hasChatMessage };
}
