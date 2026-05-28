/** logger.js — 加時間戳的簡易 console */
const ts = () => new Date().toISOString().replace('T', ' ').slice(0, 19);
const fmt = (lv, ...a) => `[${ts()}] ${lv} ${a.join(' ')}`;

export default {
  info:  (...a) => console.log(fmt('ℹ️ ', ...a)),
  ok:    (...a) => console.log(fmt('✅', ...a)),
  warn:  (...a) => console.warn(fmt('⚠️ ', ...a)),
  error: (...a) => console.error(fmt('❌', ...a)),
};
