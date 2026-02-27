# Tattoo Repo Dashboard

一個以 Vue + Vite 製作的純前端儀表板，用來監控 `NTUT-NPC/tattoo` 的 Pull Request 狀態，適合多人協作時快速掌握進度。

## 我如何先確認 tattoo 專案的流程

在實作前，先直接讀取目標專案公開資訊，確認 BOT 留言格式與 CI workflow：

- 透過 GitHub REST API 查詢 open PR 與留言，確認 `github-actions[bot]` 留言中固定存在 `**Build Number:** <number>`。
- 同時有 `rileychh-dokploy-riley-ntut-npc[bot]` 的 preview 留言可作為狀態補充。
- 讀取 `.github/workflows/pr-preview.yaml`，確認 build number 由 `manage-build-number` action 管理，並在 PR comment 內更新。
- 讀取 `.github/workflows/analyze.yaml`、`release-preview.yaml` 等，確認 CI 來源主要來自 check-runs/status API。

### 驗證指令（你可重跑）

```bash
curl -s "https://api.github.com/repos/NTUT-NPC/tattoo/pulls?state=open&sort=updated&direction=desc&per_page=10" | jq -r '.[] | "#\(.number) \(.title)"'
curl -s "https://api.github.com/repos/NTUT-NPC/tattoo/issues/<PR_NUMBER>/comments?per_page=50" | jq -r '.[] | select((.user.login|ascii_downcase|contains("bot")) or (.user.type=="Bot")) | .user.login, .body'
curl -sL "https://raw.githubusercontent.com/NTUT-NPC/tattoo/main/.github/workflows/pr-preview.yaml"
```

## 主要功能

- PR 卡片式儀表板（依最新更新時間排序）。
- 卡片顯示：
  - 醒目的 PR 編號
  - PR 標題
  - 最新 commit（作者頭貼、ID、訊息）
  - CI Build Number（從 PR issue comments 解析）
  - 最新留言（作者頭貼、時間、內容摘要）
  - 關聯 issue（從標題/描述關鍵字解析）
  - 最多 4 個 CI 狀態圖示（check-runs + commit status）
  - 手機優先緊湊卡片 + 可展開細節（預設先看重點）
  - linked issue 與 commit/comment 同膠囊樣式顯示，便於快速掃描
- 自動每 30 秒更新。
- 響應式排版（桌機/手機都可讀）。

## 專案結構

- `src/views/DashboardView.vue`: 儀表板頁面、輪詢、錯誤處理。
- `src/components/PrCard.vue`: PR 卡片。
- `src/components/CiStatusBadges.vue`: CI 狀態小圖示。
- `src/services/githubApi.ts`: GitHub API 串接與資料整形。
- `src/utils/parsers.ts`: Build number / linked issue 解析與文字截斷。

## 本地執行

```bash
npm install
npm run dev
```

## GitHub Pages 部署

已提供 `.github/workflows/deploy-pages.yml`：

- push 到預設分支或手動觸發會自動 build + deploy。
- 會依 `GITHUB_REPOSITORY` 自動推導 Vite `base`（`/<repo>/`）。
- 若你使用自訂網域根路徑，設定 repo variable：`VITE_BASE_PATH=/`。

## API 策略說明

由於需求是「純前端直接打 GitHub 公開資料」，採用 REST API：

1. 拉 open PR 清單（已是 updated desc）。
2. 每個 PR 拉 commits / issue comments / review comments。
3. 以最新 commit SHA 查 `check-runs` + `status`。
4. 從 comments 抓最新可解析的 Build Number。

> 注意：未帶 token 的 GitHub API 有 rate limit（每 IP 約 60 req/hr）。
> 若 PR 很多、更新很頻繁，可能在尖峰時段被限流。這是公開純前端模式的先天限制。
