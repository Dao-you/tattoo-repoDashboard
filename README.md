# Deployment to GitHub Pages

本專案已提供 `.github/workflows/deploy-pages.yml`，會在以下情境自動部署：

- push 到預設分支
- 手動觸發 (`workflow_dispatch`)

## 預設部署 URL

未設定 `VITE_BASE_PATH` 時，build 會自動以 repo 名稱推導 base path：

- 例如 repo 為 `my-app`，則使用 `base=/my-app/`
- 預設 Pages URL 會是：`https://<owner>.github.io/<repo>/`

## 自訂網域（CNAME）

若使用自訂 domain（根路徑 `/`），請：

1. 在 repository 設定 GitHub Pages 的 Custom domain（會建立/使用 `CNAME`）。
2. 設定 repository variable：`VITE_BASE_PATH=/`
3. 重新執行 workflow（push 或手動觸發）。

這樣 Vite build 會改用根路徑，避免資源路徑指向 `/<repo>/`。
