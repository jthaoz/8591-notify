/**
 * stateManager.js — 通知去重狀態管理
 *
 * 狀態存在 ./state/notify-state.json
 * GitHub Actions 透過 actions/cache 在每次執行間保留這個檔案
 *
 * 結構：
 * {
 *   messageNotify: false,       // 聊聊訊息是否已通知
 *   badgeMap: {                 // href → 上次通知時的數量
 *     "/v3/seller/orders?type=3": 2
 *   }
 * }
 */
import fs from 'fs/promises';
import path from 'path';
import config from './config.js';
import log from './logger.js';

let state = { messageNotify: false, badgeMap: {} };

/** 從磁碟讀取狀態 */
export async function loadState() {
  try {
    const raw = await fs.readFile(config.stateFile, 'utf-8');
    state = JSON.parse(raw);
    log.info('已載入前次狀態', JSON.stringify(state));
  } catch {
    log.info('無前次狀態，從頭開始');
  }
}

/** 儲存狀態到磁碟 */
async function save() {
  await fs.mkdir(path.dirname(config.stateFile), { recursive: true });
  await fs.writeFile(config.stateFile, JSON.stringify(state, null, 2));
}

// ── 聊聊訊息 ─────────────────────────────────────────────────

/** 是否需要發聊聊通知（false → true 才發） */
export function shouldNotifyChat(has) {
  return has && !state.messageNotify;
}

export async function setChatState(has) {
  state.messageNotify = has;
  await save();
}

// ── Badge 通知 ────────────────────────────────────────────────

/** 是否需要發 badge 通知（數量增加才發） */
export function shouldNotifyBadge(href, count) {
  return count > (state.badgeMap[href] ?? 0);
}

export async function setBadgeState(href, count) {
  state.badgeMap[href] = count;
  await save();
}

/** Badge 消失時重置，讓下次重新出現時可再通知 */
export async function clearBadgeState(href) {
  if (href in state.badgeMap) {
    delete state.badgeMap[href];
    await save();
  }
}

export const getState = () => structuredClone(state);
