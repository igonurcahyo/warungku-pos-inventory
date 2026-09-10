import { createServerFn } from '@tanstack/react-start'
import { db } from '@/db'
import { products, categories, stores, transactions, transactionItems } from '@/db/schema'
import { eq, and, desc, gte, sql, count } from 'drizzle-orm'
import { formatTransactionNumber } from '@/server/transactions'

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

export const getDashboardStatsFn = createServerFn({ method: 'GET' })
  .handler(async () => {
    const { store } = await getRequiredStoreSession()

    // 1. Get all products for this store
    const storeProducts = await db
      .select({
        id: products.id,
        name: products.name,
        price: products.price,
        stock: products.stock,
        unit: products.unit,
        categoryName: categories.name,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(products.storeId, store.id))

    const totalProducts = storeProducts.length
    const totalStock = storeProducts.reduce((sum, p) => sum + p.stock, 0)
    const lowStockItems = storeProducts.filter((p) => p.stock > 0 && p.stock <= 5)
    const outOfStockItems = storeProducts.filter((p) => p.stock === 0)

    // 2. Today's transactions (paid only)
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const todayTransactions = await db
      .select({
        id: transactions.id,
        total: transactions.total,
        paymentMethod: transactions.paymentMethod,
        paymentStatus: transactions.paymentStatus,
        paidAmount: transactions.paidAmount,
        changeAmount: transactions.changeAmount,
        createdAt: transactions.createdAt,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.storeId, store.id),
          eq(transactions.paymentStatus, 'paid'),
          gte(transactions.createdAt, startOfDay),
        ),
      )
      .orderBy(desc(transactions.createdAt))

    const todaySales = todayTransactions.reduce((sum, t) => sum + t.total, 0)
    const cashSales = todayTransactions
      .filter((t) => t.paymentMethod === 'cash')
      .reduce((sum, t) => sum + t.total, 0)
    const qrisSales = todayTransactions
      .filter((t) => t.paymentMethod === 'qris')
      .reduce((sum, t) => sum + t.total, 0)

    // 3. Top selling products today (from paid transactions only)
    const topSellingItems = await db
      .select({
        productId: transactionItems.productId,
        productName: transactionItems.productName,
        price: transactionItems.price,
        quantity: transactionItems.quantity,
        subtotal: transactionItems.subtotal,
      })
      .from(transactionItems)
      .innerJoin(transactions, eq(transactionItems.transactionId, transactions.id))
      .where(
        and(
          eq(transactions.storeId, store.id),
          eq(transactions.paymentStatus, 'paid'),
          gte(transactions.createdAt, startOfDay),
        ),
      )

    // Group sold items by product
    const soldMap = new Map<number, { name: string; price: number; quantity: number; total: number }>()
    for (const item of topSellingItems) {
      const existing = soldMap.get(item.productId)
      if (existing) {
        existing.quantity += item.quantity
        existing.total += item.subtotal
      } else {
        soldMap.set(item.productId, {
          name: item.productName,
          price: item.price,
          quantity: item.quantity,
          total: item.subtotal,
        })
      }
    }
    const topProducts = Array.from(soldMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5)

    return {
      totalProducts,
      totalStock,
      lowStockCount: lowStockItems.length,
      outOfStockCount: outOfStockItems.length,
      lowStockItems,
      todaySales,
      cashSales,
      qrisSales,
      todayTransactionCount: todayTransactions.length,
      recentTransactions: todayTransactions.slice(0, 5).map((t) => ({
        ...t,
        paymentMethod: (t.paymentMethod as 'cash' | 'qris') || 'cash',
      })),
      topProducts,
    }
  })

export const getSalesReportCsvFn = createServerFn({ method: 'GET' })
  .handler(async () => {
    const { store } = await getRequiredStoreSession()

    const rows = await db
      .select({
        id: transactions.id,
        total: transactions.total,
        paymentMethod: transactions.paymentMethod,
        paymentStatus: transactions.paymentStatus,
        createdAt: transactions.createdAt,
        itemCount: count(transactionItems.id),
        totalQuantity: sql<number>`coalesce(sum(${transactionItems.quantity}), 0)`,
      })
      .from(transactions)
      .leftJoin(
        transactionItems,
        eq(transactionItems.transactionId, transactions.id),
      )
      .where(
        and(
          eq(transactions.storeId, store.id),
          eq(transactions.paymentStatus, 'paid'),
        ),
      )
      .groupBy(transactions.id)
      .orderBy(desc(transactions.createdAt))

    const now = new Date()
    const yyyy = now.getFullYear()
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const dd = String(now.getDate()).padStart(2, '0')
    const filename = `laporan-penjualan-${yyyy}-${mm}-${dd}.csv`

    const headers = [
      'No Transaksi',
      'Tanggal',
      'Total',
      'Metode Pembayaran',
      'Status Pembayaran',
      'Jumlah Item',
    ]

    const escapeCsv = (val: unknown) => {
      const str = String(val ?? '')
      if (
        str.includes('"') ||
        str.includes(',') ||
        str.includes('\n') ||
        str.includes('\r')
      ) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return `"${str}"`
    }

    const csvRows = [headers.map(escapeCsv).join(',')]

    for (const r of rows) {
      const trxNum = formatTransactionNumber(r.id, r.createdAt)
      const d = new Date(r.createdAt)
      const dateFormatted = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
      const method = r.paymentMethod === 'qris' ? 'QRIS' : 'Tunai'
      const status = r.paymentStatus === 'paid' ? 'Lunas' : r.paymentStatus
      const qty = Number(r.totalQuantity) || Number(r.itemCount) || 1

      csvRows.push(
        [
          escapeCsv(trxNum),
          escapeCsv(dateFormatted),
          r.total,
          escapeCsv(method),
          escapeCsv(status),
          qty,
        ].join(','),
      )
    }

    const totalSales = rows.reduce((sum, r) => sum + (Number(r.total) || 0), 0)
    csvRows.push(['TOTAL PENJUALAN', '', totalSales, '', '', ''].join(','))

    // UTF-8 BOM for Microsoft Excel / Google Sheets compatibility
    const BOM = '\uFEFF'
    const csvContent = BOM + csvRows.join('\r\n')

    return {
      success: true,
      count: rows.length,
      csv: csvContent,
      filename,
    }
  })
