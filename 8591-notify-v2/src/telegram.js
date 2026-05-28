/**
 * telegram.js — 發送 Telegram 訊息
 */
import config from './config.js';
import log from './logger.js';

const API = `https://api.telegram.org/bot${config.telegram.token}`;

async function post(method, body) {
  const res = await fetch(`${API}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(`Telegram ${method} 失敗：${json.description}`);
  return json.result;
}

/** 發送 HTML 格式訊息 */
export async function sendMessage(html) {
  log.info(`Telegram ← ${html.replace(/<[^>]+>/g, '')}`);
  await post('sendMessage', {
    chat_id: config.telegram.chatId,
    text: html,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  });
}

/** 啟動時驗證 token */
export async function verifyBot() {
  const me = await post('getMe', {});
  return `@${me.username}`;
}
