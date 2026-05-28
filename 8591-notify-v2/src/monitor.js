import config from './config.js';
import log from './logger.js';

const EXCLUDED_TYPES = ['4'];

const TYPE_NAMES = {
  '1': '待付款', '2': '待確認', '3': '待移交',
  '5': '待出貨', '6': '運輸中', '7': '已完成',
  '8': '已取消', '9': '退貨/退款',
};

function labelOf(href) {
  try {
    const u = new URL(href, config.site.url);
    const t = u.searchParams.get('type');
    if (t && TYPE_NAMES[t]) return TYPE_NAMES[t];
    return u.pathname.split('/').filter(Boolean).pop() || href;
  } catch { return href; }
}

export async function scrape(page) {
  log.info(`前往 ${config.site.url}`);

  // 等待頁面完全載入（含 API 資料）
  await page.goto(config.site.url, {
    waitUntil: 'networkidle',
    timeout: 45_000,
  });

  // 額外等待動態內容渲染
  await page.waitForTimeout(5_000);

  // 嘗試等待 badge 出現（最多再等 10 秒）
  try {
    await page.waitForSelector('.badge__content', { timeout: 10_000 });
  } catch {
    log.warn('等待 badge 元素超時，繼續執行');
  }

  const raw = await page.evaluate((excludedTypes) => {
    const badges = [];

    for (const badge of document.querySelectorAll('.badge__content')) {
      if (badge.style.display === 'none') continue;
      const text = (badge.innerText || badge.textContent || '').trim();
      if (!text) continue;
      const count = parseInt(text, 10);
      if (isNaN(count) || count <= 0) continue;
      const link = badge.closest('a');
      if (!link) continue;
      const href = link.getAttribute('href') || '';
      if (!href) continue;
      try {
        const u = new URL(href, location.origin);
        const type = u.searchParams.get('type');
        if (type && excludedTypes.includes(type)) continue;
      } catch { /* 忽略 */ }
      badges.push({ href, count });
    }

    // 聊聊訊息偵測（多種可能的文字）
    const allText = document.body.innerText || '';
    const hasChatMessage =
      allText.includes('您有新的訊息') ||
      allText.includes('新訊息') ||
      allText.includes('未讀訊息') ||
      [...document.querySelectorAll('span, div, p')].some(
        el => (el.innerText || '').includes('您有新的訊息')
      );

    // 頁面文字（debug 用）
    const pageTitle = document.title;
    const url = location.href;

    return { badges, hasChatMessage, pageTitle, url };
  }, EXCLUDED_TYPES);

  log.info(`頁面：${raw.pageTitle} (${raw.url})`);
  log.info(`偵測結果 → badges: [${raw.badges.map(b => `${labelOf(b.href)}×${b.count}`).join(', ') || '無'}]  聊聊: ${raw.hasChatMessage}`);

  const badges = raw.badges.map(b => ({ ...b, label: labelOf(b.href) }));
  return { badges, hasChatMessage: raw.hasChatMessage };
}
