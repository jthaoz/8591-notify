# 8591 賣場通知監控 → Telegram（三帳號版）

每 5 分鐘自動偵測三個 8591 賣場帳號，有新通知時推播到 Telegram，並標明是哪個帳號。

---

## 📋 你需要準備的東西

- GitHub 帳號（免費）
- Telegram 帳號（免費）
- 電腦（只有第一次設定才需要）

---

## 🚀 設定步驟

### 第一步：建立 Telegram Bot

1. 在 Telegram 搜尋 **`@BotFather`**
2. 發送 `/newbot`，依指示取得 Token：
   ```
   123456789:AAxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
   **保存這個，這是 `TELEGRAM_BOT_TOKEN`**

3. 搜尋 **`@userinfobot`**，發送 `/start`，取得你的 ID：
   ```
   987654321
   ```
   **這是 `TELEGRAM_CHAT_ID`**

4. 找到剛建的 Bot，按「Start」啟動

---

### 第二步：電腦上安裝並登入三個帳號

安裝 Node.js：https://nodejs.org（下載 LTS 版）

```bash
git clone https://github.com/你的帳號/8591-notify.git
cd 8591-notify
npm install
npx playwright install chromium
cp .env.example .env
```

編輯 `.env`，填入 Telegram 資訊：
```
TELEGRAM_BOT_TOKEN=123456789:AAxxxxx
TELEGRAM_CHAT_ID=987654321
SITE_URL=https://www.8591.com.tw/
```

**依序登入三個帳號（每個帳號跑一次）：**

```bash
node scripts/login.js 1   # 登入帳號一
node scripts/login.js 2   # 登入帳號二
node scripts/login.js 3   # 登入帳號三
```

每次執行：
1. 瀏覽器自動開啟
2. 你手動登入對應的 8591 帳號
3. 回到 Terminal 按 **Enter**
4. 程式印出一串 base64 → **複製起來**

---

### 第三步：建立 GitHub Repository

1. 前往 https://github.com/new
2. 名稱：`8591-notify`
3. **選 Public**（免費無限執行）
4. 建立

---

### 第四步：設定 GitHub Secrets

到 Repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

總共設定 **8 個 Secrets**：

| Secret 名稱 | 填入的值 |
|------------|---------|
| `TELEGRAM_BOT_TOKEN` | 第一步取得的 Bot Token |
| `TELEGRAM_CHAT_ID` | 第一步取得的 Chat ID |
| `SITE_URL` | `https://www.8591.com.tw/` |
| `SESSION_JSON_1` | 帳號一的 base64 session |
| `SESSION_JSON_2` | 帳號二的 base64 session |
| `SESSION_JSON_3` | 帳號三的 base64 session |
| `ACCOUNT_NAME_1` | 自訂名稱，例如：`主帳號` |
| `ACCOUNT_NAME_2` | 自訂名稱，例如：`副帳號` |
| `ACCOUNT_NAME_3` | 自訂名稱，例如：`備用帳號` |

---

### 第五步：上傳程式碼並測試

```bash
git remote add origin https://github.com/你的帳號/8591-notify.git
git add .
git commit -m "初始設定"
git push -u origin main
```

1. 到 GitHub → **Actions** 標籤
2. 選「**8591 通知監控**」
3. 點「**Run workflow**」手動測試
4. 會同時跑三個 job（三個帳號並行）
5. 成功後 Telegram 不會有訊息（表示目前沒有新通知，正常）

**之後每 5 分鐘自動執行，完全不需要開電腦。**

---

## 🔔 通知樣式

所有通知都會標明帳號名稱：

```
🔔 8591 賣場通知（主帳號）

📋 類型：待移交
🔢 數量：2 筆
🔗 前往查看
```

```
💬 8591 賣場 — 新聊聊訊息（副帳號）

您有新的訊息，請盡快回覆買家！
```

---

## 🔄 Session 過期怎麼辦

哪個帳號過期，Telegram 會收到對應的警告。

重新登入對應帳號：
```bash
node scripts/login.js 1   # 重登帳號一
node scripts/login.js 2   # 重登帳號二
node scripts/login.js 3   # 重登帳號三
```
更新對應的 `SESSION_JSON_1/2/3` Secret 即可。

---

## ⚠️ 注意

GitHub 超過 60 天沒有 push 可能停用排程。
偶爾到 Actions 頁面手動點「Run workflow」即可維持活躍。
