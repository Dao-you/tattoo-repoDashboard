# Tattoo Repo Dashboard

> 這是一個 **vibe coding 專案**：以快速迭代、視覺回饋優先、持續小步調整的方式打造的 Vue 3 前端儀表板。

一個用來監控 `NTUT-NPC/tattoo` 開啟中 Pull Request 狀態的純前端 dashboard，部署目標為 GitHub Pages。

## 目前專案現況（2026-03）

- 技術棧：Vue 3 + Vite + TypeScript（`<script setup lang="ts">`）。
- 部署型態：純前端（無 server runtime），由 GitHub Actions 自動建置並部署 GitHub Pages。
- 主要資料來源：GitHub REST API（PR、commits、issue comments、review comments、reviews、check-runs）。
- 目前 UI 方向：高密度卡片資訊 + 全螢幕狀態展示動畫 + 可配置設定面板。

## 功能總覽

### 儀表板核心

- 依更新時間排序並顯示 open PR 清單（Draft 會往後排）。
- PR 卡片包含：
  - PR 編號、標題、作者
  - 最新 commit / 最新 comment（可切換顯示模式）
  - linked issue（由標題/內文解析）
  - CI badges（只保留 GitHub Actions workflow check）
  - review 狀態（draft / pending review / approved / changes requested / ci failed）
  - approved reviewer 計數
- 30 秒預設輪詢更新（可在設定調整 5~300 秒）。
- Header 顯示同步狀態、更新倒數環、最後更新時間。

### 互動與設定

- 點擊 PR 卡片可開啟全螢幕詳細卡。
- 有更新事件時可顯示全螢幕動畫/狀態提示與禮砲效果。
- 設定面板採全螢幕 modal card，可設定：
  - GitHub API Token（localStorage）
  - 更新頻率
  - 動態顯示模式（分開顯示 / 只顯示最新動態）
  - 時間顯示模式（智慧時間 / 完整時間）
  - 狀態動畫自動關閉秒數

### GitHub Pages base path

`vite.config.ts` 目前支援兩種路徑：

1. 預設 Pages：`/<repo>/`
2. 自訂網域根路徑：透過 `VITE_BASE_PATH=/`

## 專案結構

- `src/views/DashboardView.vue`：主畫面資料流、輪詢、設定面板、全螢幕卡片控制。
- `src/components/PrCard.vue`：PR 卡片/詳細內容與狀態動畫。
- `src/components/CiStatusBadges.vue`：CI badge 呈現。
- `src/services/githubApi.ts`：GitHub API 呼叫、資料整形、token 儲存與驗證。
- `src/utils/parsers.ts`：build number / linked issue 解析與文字工具。
- `.github/workflows/deploy-pages.yml`：Pages 部署流程。

## 本地開發

```bash
npm install
npm run dev
```

## 建置與部署檢查

```bash
npm run build
```

GitHub Actions 使用：

- `npm ci`
- `npm run build`
- `actions/upload-pages-artifact`
- `actions/deploy-pages`

## merged PR 歷史總覽（依 repo merge commit）

> 以下依目前 git log 中的 `Merge pull request #...` 彙整。

### 初始建立與基礎功能

- #3, #4, #5, #6, #7, #8, #9, #10, #11, #12
- 重點：建立 dashboard、串接 GitHub API、加入輪詢/錯誤處理、token 輸入、CI icon 互動與全螢幕更新動畫。

### 資訊密度與顯示優化

- #13, #14, #15, #16, #17, #18, #19, #20, #22, #23, #24, #25
- 重點：卡片尺寸、倒數/時間、膠囊狀態、動畫顯示邏輯、owner 與 approved 顯示、CI workflow 過濾。

### 動畫與全螢幕體驗強化

- #26, #27, #28, #29, #30, #31, #32, #33, #34, #35, #36
- 重點：header 精簡、hover 動畫、slide in/out、logo 與 favicon、最新活動顯示模式、close button/重疊修正、confetti 效果。

### 近期期（目前狀態）

- #37, #38, #39, #40, #41, #42, #44, #45, #46
- 重點：meta controls 重設計、背景 blur 過渡、PR card hover、全螢幕關閉行為、智慧時間顯示切換、設定面板全螢幕化與 auto-close 行為修正。

## Token 使用提醒

- Token 只存在 localStorage（key: `github_api_token`）。
- 建議使用最小權限、短效、只讀 token。
- 若不需要可在設定中清除回匿名模式。

## 完整 GitHub Token 申請教學（建議先看）

> 目標：讓 dashboard 在前端請求 GitHub API 時，降低匿名 rate limit 影響。

### 為什麼需要 token？

- 匿名 API 請求通常很快就會碰到速率限制（尤其多人同網路或高頻刷新時）。
- 設定 token 後，dashboard 會自動在請求加上 `Authorization: Bearer <token>`。
- 本專案只需要**讀取公開資料**，不需要寫入權限。

### 方案 A（推薦）：Fine-grained Personal Access Token

1. 登入 GitHub。
2. 進入 `Settings` → `Developer settings` → `Personal access tokens` → `Fine-grained tokens`。
3. 點 `Generate new token`。
4. 設定基本資訊：
   - **Token name**：例如 `tattoo-dashboard-readonly`
   - **Expiration**：建議 30~90 天（短效）
   - **Resource owner**：你的帳號或組織
5. 設定 repository 存取範圍：
   - 若僅監看 `NTUT-NPC/tattoo`：選 `Only select repositories` 並勾選該 repo
   - 若要看多個 repo：再依需求增加，但仍維持最小範圍
6. 設定權限（只讀最小化）：
   - `Pull requests` → **Read-only**
   - `Issues` → **Read-only**
   - `Commit statuses` → **Read-only**
   - `Checks` / `Actions`（若畫面有）→ **Read-only**
7. 送出並建立 token。
8. **立即複製 token**（離開頁面後通常無法再次完整顯示）。

### 方案 B：Classic Personal Access Token（備用）

1. 進入 `Settings` → `Developer settings` → `Personal access tokens` → `Tokens (classic)`。
2. 點 `Generate new token (classic)`。
3. 設定名稱與期限（建議短效）。
4. 權限通常勾 `public_repo` 即可（僅公開 repo 讀取情境）。
5. 建立後複製 token。

### 在 dashboard 中套用 token

1. 開啟頁面，點右上角 `⚙`。
2. 在 `GitHub API Token（選填）` 貼上 token。
3. 點擊儲存按鈕。
4. 看到成功訊息後，後續 API 會自動帶 token。
5. 若要回匿名模式，按清除即可。

### 驗證 token 是否成功

把 `<TOKEN>` 換成你剛建立的值：

```bash
curl -H "Authorization: Bearer <TOKEN>" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/rate_limit
```

檢查回傳中的 `resources.core.remaining`：
- 若顯著高於匿名請求，表示 token 生效。
- 若出現 401/403，通常是 token 過期、權限不足、或貼錯值。

### 常見錯誤排查

- **貼上後仍被限流**：確認 token 沒過期、沒有前後空白、以及確實儲存成功。
- **有 token 但資料不完整**：檢查是否漏開 `Pull requests` / `Issues` / `Commit statuses` / `Checks` 讀取權限。
- **公司網路限制**：可能被代理或防火牆影響 API 請求，先用 `curl` 測試。

### 安全建議

- 不要把 token commit 到 repo 或貼到公開頻道。
- 使用「最小權限 + 短效」策略。
- 只在信任裝置輸入 token，定期輪替。
- 若懷疑外洩，立即在 GitHub 撤銷 token 並重建。

## 注意事項

- 這個專案刻意維持純前端，不提供後端代理。
- 未帶 token 時會受到 GitHub API 匿名 rate limit 限制。
