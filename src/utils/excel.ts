/**
 * Excel 處理工具（使用 exceljs）
 * 替代原本的 xlsx 套件
 */

import ExcelJS from 'exceljs'

export interface ExcelRow {
  [key: string]: string | number | Date | null
}

/**
 * 讀取 Excel 檔案
 */
export async function readExcelFile(file: File): Promise<ExcelRow[]> {
  const buffer = await file.arrayBuffer()
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  
  const worksheet = workbook.worksheets[0]
  const rows: ExcelRow[] = []
  
  // 讀取標題行（第一行）
  const headerRow = worksheet.getRow(1)
  const headers: string[] = []
  headerRow.eachCell((cell, colNumber) => {
    headers[colNumber - 1] = cell.value?.toString() || ''
  })
  
  // 讀取資料行
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return // 跳過標題行
    
    const rowData: ExcelRow = {}
    row.eachCell((cell, colNumber) => {
      const header = headers[colNumber - 1]
      if (header) {
        rowData[header] = cell.value?.toString() || null
      }
    })
    rows.push(rowData)
  })
  
  return rows
}

/**
 * 匯出為 Excel 檔案
 */
export async function exportToExcel(
  data: ExcelRow[],
  filename: string = 'export.xlsx',
  sheetName: string = 'Sheet1'
): Promise<void> {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet(sheetName)
  
  if (data.length === 0) {
    throw new Error('No data to export')
  }
  
  // 取得所有欄位名稱
  const headers = Object.keys(data[0])
  
  // 設定標題行
  worksheet.addRow(headers)
  
  // 設定標題行樣式
  const headerRow = worksheet.getRow(1)
  headerRow.font = { bold: true }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  }
  
  // 新增資料行
  data.forEach((row) => {
    const values = headers.map((header) => row[header] ?? '')
    worksheet.addRow(values)
  })
  
  // 自動調整欄寬
  worksheet.columns.forEach((column) => {
    if (column.header) {
      column.width = 15
    }
  })
  
  // 下載檔案
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  window.URL.revokeObjectURL(url)
}

/**
 * 匯出為 CSV（簡單實作，不依賴 Excel 庫）
 */
export function exportToCSV(
  data: ExcelRow[],
  filename: string = 'export.csv'
): void {
  if (data.length === 0) {
    throw new Error('No data to export')
  }
  
  const headers = Object.keys(data[0])
  const csvRows = [headers.join(',')]
  
  data.forEach((row) => {
    const values = headers.map((header) => {
      const value = row[header]
      // 處理包含逗號或引號的值
      if (value === null || value === undefined) {
        return '""'
      }
      const stringValue = String(value)
      if (stringValue.includes(',') || stringValue.includes('"')) {
        return `"${stringValue.replace(/"/g, '""')}"`
      }
      return stringValue
    })
    csvRows.push(values.join(','))
  })
  
  const csvContent = csvRows.join('\n')
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  window.URL.revokeObjectURL(url)
}

