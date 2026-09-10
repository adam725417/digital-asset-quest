# 數位資產尋寶任務 Digital Asset Quest

可直接部署到 **GitHub Pages** 的互動遊戲。

目前版本包含：

- 日式卡通風格介面
- 手機友善操作
- 主持人 QR Code 頁
- 老師戰情室 Dashboard（儀表板）
- Google Apps Script（Google 應用程式指令碼）+ Google Sheet 集中收集

## 檔案說明

- `index.html`：玩家頁
- `admin.html`：主持人 QR Code 頁
- `dashboard.html`：老師戰情室
- `style.css`：日式卡通風格與手機版樣式
- `app.js`：遊戲邏輯
- `dashboard.js`：戰情室邏輯
- `config.js`：場次名稱、Apps Script URL、更新秒數等設定
- `Code.gs`：Google Apps Script 後端

## GitHub Pages

Repository → `Settings` → `Pages`

設定：

- Source：`Deploy from a branch`
- Branch：`main`
- Folder：`/(root)`

頁面入口：

- 玩家：`/index.html`
- 主持人：`/admin.html`
- 老師戰情室：`/dashboard.html`

## Google Sheet 串接

1. 建立 Google Sheet
2. `擴充功能 → Apps Script`
3. 將 `Code.gs` 貼入 Apps Script
4. 部署為 Web App
5. 取得 `/exec` 網址
6. 將網址填入 `config.js` 的：

```js
gasEndpoint: "https://script.google.com/macros/s/.../exec"
```

完成後，玩家按「送出結果」就會寫入 Google Sheet，老師戰情室也能讀取統計資料。
