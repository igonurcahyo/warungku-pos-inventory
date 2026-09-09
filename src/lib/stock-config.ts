export const STOCK_THRESHOLDS = {
  /**
   * Stok di bawah atau sama dengan batas ini dan > 0 dikategorikan sebagai Stok Menipis.
   * Stok > batas ini dikategorikan sebagai Stok Aman.
   * Stok <= 0 dikategorikan sebagai Stok Habis.
   */
  LOW_STOCK: 5,
} as const

export type StockStatusCode = 'aman' | 'menipis' | 'habis'

export interface StockStatusInfo {
  code: StockStatusCode
  label: 'Stok Aman' | 'Stok Menipis' | 'Stok Habis'
  badgeVariant: 'success' | 'warning' | 'error'
  shortLabel: 'Aman' | 'Menipis' | 'Habis'
}

export function getStockStatusInfo(stock: number): StockStatusInfo {
  if (stock <= 0) {
    return {
      code: 'habis',
      label: 'Stok Habis',
      shortLabel: 'Habis',
      badgeVariant: 'error',
    }
  }

  if (stock <= STOCK_THRESHOLDS.LOW_STOCK) {
    return {
      code: 'menipis',
      label: 'Stok Menipis',
      shortLabel: 'Menipis',
      badgeVariant: 'warning',
    }
  }

  return {
    code: 'aman',
    label: 'Stok Aman',
    shortLabel: 'Aman',
    badgeVariant: 'success',
  }
}
