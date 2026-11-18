# 拾物圖鑑

漂流木、石頭、貝殼與各種撿拾物的收藏圖鑑。純靜態網站，放在 GitHub Pages；資料與照片存在 Supabase。

## 功能

- 上傳多張照片（手機照片會自動縮小）、記錄名稱、分類、日期、地點、種類、尺寸、重量、標籤、備註
- 自訂分類（新增、改名、換色、排序、刪除）
- 搜尋、依編號／日期／尺寸／名稱排序
- 外觀可調：標題、背景、字體、重點色、照片比例、每排張數、是否顯示文字
- 只有管理員（你）登入後能編輯，其他人只能瀏覽

## 設定步驟

1. **Supabase**：到 supabase.com 建立免費專案。
2. **建立資料表**：SQL Editor → 貼上 `supabase-setup.sql`→ Run。
3. **建立帳號**：Authentication → Users → Add user → Create new user，填同一個 Email 和密碼，勾選 Auto Confirm User。
4. **關閉公開註冊**（建議）：Authentication → Sign In / Providers → 關閉 Allow new users to sign up。
5. **填設定**：把 Project URL 和 publishable（或 anon）key 填進 `config.js`。
6. **GitHub Pages**：repo 的 Settings → Pages → Source 選 `Deploy from a branch`，Branch 選 `main` / `(root)`。

## 檔案

| 檔案 | 用途 |
|---|---|
| `index.html` | 頁面與樣式 |
| `app.js` | 網站功能 |
| `config.js` | Supabase 連線設定 |
| `supabase-setup.sql` | 資料庫與照片空間的初始設定 |
