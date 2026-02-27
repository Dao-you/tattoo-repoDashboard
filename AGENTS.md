# tattoo-repoDashboard 開發協作指南

## 元件切分原則
- 單一元件只負責單一視覺/互動職責；避免「超大元件」同時處理資料抓取與複雜 UI。
- 將頁面拆為：
  - **Container（資料協調）**：負責資料取得、狀態整併、錯誤處理。
  - **Presentational（純 UI）**：僅接收 props 並負責呈現。
- 可重複使用的卡片/欄位應抽成共用元件，避免頁面內複製貼上。

## 命名規範
- 元件檔名使用 `PascalCase`（例如 `RepoSummaryCard.jsx`）。
- hooks 使用 `useXxx`（例如 `useRepoStats.js`）。
- parser / formatter 使用語意化動詞（例如 `parseBuildNumber`, `formatRunStatus`）。
- 避免縮寫與模糊命名（如 `data1`, `tmp`, `infoObj`）。

## 資料層與 UI 層邊界
- **資料層（data/domain）**
  - API 呼叫、回應正規化、欄位轉換、錯誤與重試策略。
  - build number 與 workflow 狀態等業務解析邏輯。
- **UI 層（components/pages）**
  - 僅消費資料層提供的乾淨資料模型。
  - 不直接寫 GitHub API 請求、不內嵌複雜解析規則。
- 新增欄位前，先確認資料層輸出已具備該欄位，避免 UI 端臨時計算。

## 新增欄位 / 卡片時的修改入口檔案
> 實際檔案可能依專案演進調整；以下為建議入口。

1. `src/services/github.js`
   - 補齊 GitHub API 欄位讀取與 mapping。
2. `src/utils/parsers.js`
   - 新增/調整欄位解析、格式轉換、fallback 規則。
3. `src/pages/Dashboard.jsx`
   - 將新欄位接入頁面資料流與卡片配置。
4. `src/components/cards/*`
   - 建立或擴充卡片 UI 元件。

## 發版前檢查清單

### UI
- [ ] 各卡片在桌面/平板/手機斷點顯示正常。
- [ ] loading / empty / error state 皆可辨識。
- [ ] 欄位格式（日期、數字、build number）符合產品定義。

### API
- [ ] GitHub token 設定正確，未將敏感資訊提交至 repo。
- [ ] Rate limit 接近上限時，UI 有可理解提示。
- [ ] API 失敗時有 fallback 與錯誤記錄（必要時可追蹤）。

### Pages workflow
- [ ] `npm run build` 成功且產物完整。
- [ ] GitHub Pages workflow 成功執行。
- [ ] 部署後首頁與資源路徑（base path）正確。
