/**
 * config.js — 統一讀取所有設定
 * 本機從 .env 讀，GitHub Actions 從 Secrets 讀（自動注入為環境變數）
 */
import 'dotenv/config';

function need(key) {
  const v = process.env[key];
  if (!v) throw new Error(`❌ 缺少必要設定：${key}`);
  return v;
}

// 帳號編號（GitHub Actions matrix 傳入，本機預設 1）
const accountNum = process.env.ACCOUNT_NUM || '1';

export default {
  telegram: {
    token: need('TELEGRAM_BOT_TOKEN'),
    chatId: need('TELEGRAM_CHAT_ID'),
  },
  site: {
    url: process.env.SITE_URL || 'https://www.8591.com.tw/',
  },
  // 帳號顯示名稱（通知訊息裡會顯示）
  accountName: process.env.ACCOUNT_NAME || `帳號${accountNum}`,
  sessionJson: process.env.SESSION_JSON || null,
  // 每個帳號的狀態檔案獨立
  stateFile: `./state/notify-state-account${accountNum}.json`,
};
