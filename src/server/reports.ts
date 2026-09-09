import { createServerFn } from '@tanstack/react-start'
import { db } from '@/db'
import { stores, transactions, transactionItems } from '@/db/schema'
import { eq, and, desc, gte, lte } from 'drizzle-orm'

// Private session helper — NOT exported to avoid client import protection issues
async function getRequiredStoreSession() {
  const { getSessionServer } = await import('@/lib/session.server')
  const session = getSessionServer()
  if (!session) {
    throw new Error('Sesi Anda telah berakhir. Silakan masuk kembali.')
  }

  const storesList = await db
    .select({
      id: stores.id,
      name: stores.name,
    })
    .from(stores)
    .where(eq(stores.ownerId, session.userId))
    .limit(1)

  const store = storesList[0] as (typeof storesList)[0] | undefined
  if (!store) {
    throw new Error('Data warung tidak ditemukan untuk akun Anda.')
  }

  return { session, store }
}

function formatTransactionNumber(id: number, createdAt: Date | string): string {
  const d = new Date(createdAt)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `TRX-${yyyy}${mm}${dd}-${String(id).padStart(4, '0')}`
}

function formatDateString(date: Date): string {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function formatLabel(date: Date): string {
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
  })
}

export type ReportPeriod = 'today' | '7days' | '30days' | 'month' | 'custom'

export interface SalesReportParams {
  period?: ReportPeriod
  startDate?: string
  endDate?: string
}

export interface SalesReportData {
  period: ReportPeriod
  startDateStr: string
  endDateStr: string
  summary: {
    totalRevenue: number
    totalTransactions: number
    totalItemsSold: number
    averageTransaction: number
  }
  chartData: Array<{
    date: string
    label: string
    revenue: number
    transactionCount: number
  }>
  topProducts: Array<{
    productId: number
    productName: string
    quantitySold: number
    totalRevenue: number
  }>
  recentTransactions: Array<{
    id: number
    transactionNumber: string
    total: number
    paidAmount: number
    changeAmount: number
    itemCount: number
    totalQuantity: number
    createdAt: Date
  }>
}

export const getSalesReportFn = createServerFn({ method: 'GET' })
  .validator((params?: SalesReportParams) => params || {})
  .handler(async ({ data: filter }): Promise<SalesReportData> => {
    const { store } = await getRequiredStoreSession()

    const period: ReportPeriod = filter.period || '7days'
    const now = new Date()

    let startRange: Date
    let endRange: Date = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999,
    )

    if (period === 'today') {
      startRange = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        0,
        0,
        0,
        0,
      )
    } else if (period === '7days') {
      startRange = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - 6,
        0,
        0,
        0,
        0,
      )
    } else if (period === '30days') {
      startRange = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - 29,
        0,
        0,
        0,
        0,
      )
    } else if (period === 'month') {
      startRange = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
    } else {
      // 'custom' or fallback
      if (filter.startDate) {
        const [sy, sm, sd] = filter.startDate.split('-').map(Number)
        startRange = new Date(sy, sm - 1, sd, 0, 0, 0, 0)
      } else {
        startRange = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - 6,
          0,
          0,
          0,
          0,
        )
      }

      if (filter.endDate) {
        const [ey, em, ed] = filter.endDate.split('-').map(Number)
        endRange = new Date(ey, em - 1, ed, 23, 59, 59, 999)
      }
    }

    // 1. Fetch transactions within range for authenticated store
    const storeTransactions = await db
      .select({
        id: transactions.id,
        total: transactions.total,
        paidAmount: transactions.paidAmount,
        changeAmount: transactions.changeAmount,
        createdAt: transactions.createdAt,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.storeId, store.id),
          gte(transactions.createdAt, startRange),
          lte(transactions.createdAt, endRange),
        ),
      )
      .orderBy(desc(transactions.createdAt))

    // 2. Fetch items for these transactions to calculate quantities and top products
    const txIds = storeTransactions.map((t) => t.id)

    let itemsRows: Array<{
      id: number
      transactionId: number
      productId: number
      productName: string
      price: number
      quantity: number
      subtotal: number
      createdAt: Date
    }> = []

    if (txIds.length > 0) {
      itemsRows = await db
        .select({
          id: transactionItems.id,
          transactionId: transactionItems.transactionId,
          productId: transactionItems.productId,
          productName: transactionItems.productName,
          price: transactionItems.price,
          quantity: transactionItems.quantity,
          subtotal: transactionItems.subtotal,
          createdAt: transactionItems.createdAt,
        })
        .from(transactionItems)
        .innerJoin(
          transactions,
          eq(transactionItems.transactionId, transactions.id),
        )
        .where(
          and(
            eq(transactions.storeId, store.id),
            gte(transactions.createdAt, startRange),
            lte(transactions.createdAt, endRange),
          ),
        )
    }

    // Group items by transaction for recent transactions metadata
    const txItemsMap = new Map<number, { itemCount: number; totalQty: number }>()
    for (const item of itemsRows) {
      const current = txItemsMap.get(item.transactionId) || {
        itemCount: 0,
        totalQty: 0,
      }
      current.itemCount += 1
      current.totalQty += item.quantity
      txItemsMap.set(item.transactionId, current)
    }

    // 3. Summary Calculations
    const totalTransactions = storeTransactions.length
    const totalRevenue = storeTransactions.reduce((acc, t) => acc + t.total, 0)
    const totalItemsSold = itemsRows.reduce((acc, i) => acc + i.quantity, 0)
    const averageTransaction =
      totalTransactions > 0 ? Math.round(totalRevenue / totalTransactions) : 0

    // 4. Daily Chart Data (fill all days in date range)
    const dayMap = new Map<
      string,
      { label: string; revenue: number; count: number }
    >()

    // Prepopulate every single day from startRange to endRange
    const currentCursor = new Date(startRange)
    while (currentCursor <= endRange) {
      const dateKey = formatDateString(currentCursor)
      dayMap.set(dateKey, {
        label: formatLabel(currentCursor),
        revenue: 0,
        count: 0,
      })
      currentCursor.setDate(currentCursor.getDate() + 1)
    }

    for (const t of storeTransactions) {
      const dateKey = formatDateString(new Date(t.createdAt))
      const dayData = dayMap.get(dateKey)
      if (dayData) {
        dayData.revenue += t.total
        dayData.count += 1
      }
    }

    const chartData = Array.from(dayMap.entries()).map(([date, val]) => ({
      date,
      label: val.label,
      revenue: val.revenue,
      transactionCount: val.count,
    }))

    // 5. Top Selling Products
    const productSoldMap = new Map<
      number,
      { productId: number; productName: string; qty: number; revenue: number }
    >()

    for (const item of itemsRows) {
      const existing = productSoldMap.get(item.productId)
      if (existing) {
        existing.qty += item.quantity
        existing.revenue += item.subtotal
      } else {
        productSoldMap.set(item.productId, {
          productId: item.productId,
          productName: item.productName,
          qty: item.quantity,
          revenue: item.subtotal,
        })
      }
    }

    const topProducts = Array.from(productSoldMap.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5)
      .map((p) => ({
        productId: p.productId,
        productName: p.productName,
        quantitySold: p.qty,
        totalRevenue: p.revenue,
      }))

    // 6. Recent Transactions (top 5-10)
    const recentTransactions = storeTransactions.slice(0, 10).map((t) => {
      const meta = txItemsMap.get(t.id) || { itemCount: 0, totalQty: 0 }
      return {
        id: t.id,
        transactionNumber: formatTransactionNumber(t.id, t.createdAt),
        total: t.total,
        paidAmount: t.paidAmount,
        changeAmount: t.changeAmount,
        itemCount: meta.itemCount,
        totalQuantity: meta.totalQty,
        createdAt: t.createdAt,
      }
    })

    return {
      period,
      startDateStr: formatDateString(startRange),
      endDateStr: formatDateString(endRange),
      summary: {
        totalRevenue,
        totalTransactions,
        totalItemsSold,
        averageTransaction,
      },
      chartData,
      topProducts,
      recentTransactions,
    }
  })
