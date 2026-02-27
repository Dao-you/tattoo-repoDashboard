# tattoo-repoDashboard

## 專案目的
`tattoo-repoDashboard` 是一個用來彙整 GitHub repository 關鍵資訊的儀表板專案，目標是讓團隊能在單一畫面快速掌握專案健康度、發版進度與自動化工作流程狀態。

## 功能清單
- 顯示 repository 基本資訊（名稱、描述、預設分支、更新時間）。
- 彙整 Pull Request / Issue 等開發活動指標。
- 顯示 CI / CD（含 Pages）工作流程執行狀態。
- 以 build number 對部署版本進行解析與展示。
- 透過卡片化 UI 呈現可擴充的專案指標。

## 本機開發、建置、部署指令
> 以下以 Node.js 專案慣例為主，請依實際 package manager（npm / pnpm / yarn）調整。

### 1) 安裝相依套件
```bash
npm install
```

### 2) 啟動本機開發模式
```bash
npm run dev
```

### 3) 建置正式版本
```bash
npm run build
```

### 4) 本機預覽建置結果
```bash
npm run preview
```

### 5) 部署（以 GitHub Pages workflow 為例）
```bash
npm run build
# push 到觸發 Pages workflow 的分支（通常是 main）
```

## GitHub API 資料來源與 rate limit 注意事項

### 常見資料來源
- Repository API：`GET /repos/{owner}/{repo}`
- Pull Requests API：`GET /repos/{owner}/{repo}/pulls`
- Issues API：`GET /repos/{owner}/{repo}/issues`
- Actions Workflows / Runs API：
  - `GET /repos/{owner}/{repo}/actions/workflows`
  - `GET /repos/{owner}/{repo}/actions/runs`

### Rate limit 注意事項
- **未驗證請求**限制較低，不適合頻繁輪詢。
- 建議使用 `GITHUB_TOKEN`（或 Fine-grained PAT）提升配額與穩定性。
- 讀取回應 header 監控配額：
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`
- 實作快取、退避（retry with backoff）與更新頻率節流，避免短時間大量請求。
- UI 需顯示 API 失敗/限流狀態，避免使用者誤判資料為「零」。

## build number 解析規則
- build number 解析邏輯集中在：`src/utils/parsers.js`
- 建議規則：
  - 優先解析明確格式（例如 `build-20240215.3`、`v1.2.0+45`）。
  - 若格式不符，回傳可預期 fallback（例如 `N/A` 或原字串）。
  - 解析函式應保持**純函式**與可測試性，不直接耦合 UI 元件。

### 可調整位置（`src/utils/parsers.js`）
- build number 的正規表示式（regex）。
- 版本字串切分規則（分隔符號、欄位順序）。
- fallback 顯示值。
- 是否支援多種 build metadata（例如 `+build`, `-rc`）。

---
如需新增指標，建議先在資料層補齊 parser 與 API mapping，再擴充 UI 卡片，確保資料來源與展示欄位一致。
