# 安全漏洞修復說明

## 修復的漏洞

### 1. ✅ jspdf + dompurify (已修復)
- **問題**: jspdf 2.x 依賴舊版 dompurify，存在 XSS 漏洞
- **修復**: 更新 jspdf 至 3.0.3（包含安全的 dompurify 3.2.4+）
- **影響**: 可能有 API 變更，但向後兼容性良好

### 2. ✅ vite + esbuild (已修復)
- **問題**: vite 5.x 依賴舊版 esbuild，開發伺服器存在安全問題
- **修復**: 更新 vite 至 6.0.0（包含安全的 esbuild）
- **影響**: 可能有配置變更，但大部分向後兼容

### 3. ⚠️ xlsx (已替換)
- **問題**: xlsx 套件存在原型污染和 ReDoS 漏洞，且無修復版本
- **修復**: 替換為 `exceljs`（更安全、功能更強大）
- **影響**: API 不同，需要更新匯入/匯出程式碼

## 變更內容

### package.json 更新
- `jspdf`: `^2.5.1` → `^3.0.3`
- `vite`: `^5.1.4` → `^6.0.0`
- `xlsx`: `^0.18.5` → 移除
- `exceljs`: 新增 `^4.4.0`

## 需要更新的程式碼

### 匯入/匯出功能（待實作時）

**舊的 xlsx 用法**:
```typescript
import * as XLSX from 'xlsx';

// 讀取
const workbook = XLSX.read(data, { type: 'binary' });
const sheet = workbook.Sheets[workbook.SheetNames[0]];

// 寫入
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
XLSX.writeFile(wb, 'output.xlsx');
```

**新的 exceljs 用法**:
```typescript
import ExcelJS from 'exceljs';

// 讀取
const workbook = new ExcelJS.Workbook();
await workbook.xlsx.load(buffer);

// 寫入
const workbook = new ExcelJS.Workbook();
const worksheet = workbook.addWorksheet('Sheet1');
await workbook.xlsx.writeFile('output.xlsx');
```

## 執行修復

```bash
# 刪除舊的 node_modules 和 lock 檔案
rm -rf node_modules package-lock.json

# 重新安裝
npm install

# 驗證修復
npm audit
```

## 注意事項

1. **jspdf 3.x**: API 基本兼容，但建議測試 PDF 匯出功能
2. **vite 6.x**: 配置檔案可能需要小調整，但大部分向後兼容
3. **exceljs**: 需要重寫匯入/匯出邏輯（當實作時）

## 替代方案（如果 exceljs 不適用）

如果 exceljs 不符合需求，可以考慮：
- `xlsx-populate`: 另一個安全的 Excel 處理庫
- 後端處理: 在 Django 後端使用 `openpyxl` 處理 Excel 檔案

## 驗證

修復後執行：
```bash
npm audit
```

應該顯示 0 個漏洞（或僅剩低風險漏洞）。

