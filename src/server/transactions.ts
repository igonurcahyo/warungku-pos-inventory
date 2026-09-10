import { createServerFn } from '@tanstack/react-start'
import { db } from '@/db'
import { stores, transactions, transactionItems } from '@/db/schema'
import { eq, and, desc, gte, lte, sql, count, sum, ilike, exists } from 'drizzle-orm'

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

export function formatTransactionNumber(
  id: number,
  createdAt: Date | string,
): string {
  const d = new Date(createdAt)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `TRX-${yyyy}${mm}${dd}-${String(id).padStart(4, '0')}`
}

export interface GetTransactionsFilter {
  page?: number
  limit?: number
  search?: string
  period?: 'all' | 'today' | 'yesterday' | '7days' | '30days' | 'custom'
  startDate?: string
  endDate?: string
}

export interface TransactionSummary {
  totalTransactions: number
  totalRevenue: number
  todayTransactions: number
  todayRevenue: number
  averagePerTransaction: number
}

export interface TransactionListItem {
  id: number
  storeId: number
  transactionNumber: string
  paymentMethod: 'cash' | 'qris'
  paymentStatus: 'pending' | 'paid'
  total: number
  paidAmount: number
  changeAmount: number
  createdAt: Date
  itemCount: number
  totalQuantity: number
}

export interface TransactionDetail {
  id: number
  storeId: number
  storeName: string
  transactionNumber: string
  paymentMethod: 'cash' | 'qris'
  paymentStatus: 'pending' | 'paid'
  total: number
  paidAmount: number
  changeAmount: number
  createdAt: Date
  items: Array<{
    id: number
    productId: number
    productName: string
    price: number
    quantity: number
    subtotal: number
  }>
}

export const getTransactionsFn = createServerFn({ method: 'GET' })
  .validator((params?: GetTransactionsFilter) => params || {})
  .handler(async ({ data: filter }) => {
    const { store } = await getRequiredStoreSession()

    const page = Math.max(1, Number(filter.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(filter.limit) || 20))
    const offset = (page - 1) * limit
    const period = filter.period || 'all'
    const search = filter.search ? filter.search.trim() : ''

    // 1. Calculate overall store summary metrics (only paid transactions)
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

    const [allMetrics] = await db
      .select({
        totalCount: count(transactions.id),
        totalSum: sum(transactions.total),
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.storeId, store.id),
          eq(transactions.paymentStatus, 'paid'),
        ),
      )

    const [todayMetrics] = await db
      .select({
        todayCount: count(transactions.id),
        todaySum: sum(transactions.total),
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.storeId, store.id),
          eq(transactions.paymentStatus, 'paid'),
          gte(transactions.createdAt, startOfToday),
          lte(transactions.createdAt, endOfToday),
        ),
      )

    const totalTransactions = Number(allMetrics.totalCount || 0)
    const totalRevenue = Number(allMetrics.totalSum || 0)
    const todayTransactions = Number(todayMetrics.todayCount || 0)
    const todayRevenue = Number(todayMetrics.todaySum || 0)
    const averagePerTransaction =
      totalTransactions > 0 ? Math.round(totalRevenue / totalTransactions) : 0

    const summary: TransactionSummary = {
      totalTransactions,
      totalRevenue,
      todayTransactions,
      todayRevenue,
      averagePerTransaction,
    }

    // 2. Build filter conditions for transactions list
    const conditions = [eq(transactions.storeId, store.id)]

    // Period / Date filter
    if (period === 'today') {
      conditions.push(
        gte(transactions.createdAt, startOfToday),
        lte(transactions.createdAt, endOfToday),
      )
    } else if (period === 'yesterday') {
      const startOfYesterday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - 1,
      )
      const endOfYesterday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - 1,
        23,
        59,
        59,
        999,
      )
      conditions.push(
        gte(transactions.createdAt, startOfYesterday),
        lte(transactions.createdAt, endOfYesterday),
      )
    } else if (period === '7days') {
      const sevenDaysAgo = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - 6,
      )
      conditions.push(gte(transactions.createdAt, sevenDaysAgo))
    } else if (period === '30days') {
      const thirtyDaysAgo = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - 29,
      )
      conditions.push(gte(transactions.createdAt, thirtyDaysAgo))
    } else if (period === 'custom') {
      if (filter.startDate) {
        const start = new Date(filter.startDate)
        start.setHours(0, 0, 0, 0)
        conditions.push(gte(transactions.createdAt, start))
      }
      if (filter.endDate) {
        const end = new Date(filter.endDate)
        end.setHours(23, 59, 59, 999)
        conditions.push(lte(transactions.createdAt, end))
      }
    }

    // Search filter (transaction ID, formatted number, or items productName)
    if (search) {
      // Check if search contains numeric ID (e.g. TRX-20260909-0002 -> 2, or just 2)
      const numericMatch = search.match(/\d+$/)
      const idSearch = numericMatch ? Number(numericMatch[0]) : null

      // Item product name match via subquery
      const productSubquery = exists(
        db
          .select({ dummy: sql`1` })
          .from(transactionItems)
          .where(
            and(
              eq(transactionItems.transactionId, transactions.id),
              ilike(transactionItems.productName, `%${search}%`),
            ),
          ),
      )

      if (idSearch !== null && !isNaN(idSearch)) {
        conditions.push(
          sql`(${transactions.id} = ${idSearch} OR ${productSubquery})`,
        )
      } else {
        conditions.push(productSubquery)
      }
    }

    // 3. Count total filtered records
    const [countResult] = await db
      .select({ count: count(transactions.id) })
      .from(transactions)
      .where(and(...conditions))

    const totalFiltered = Number(countResult.count || 0)
    const totalPages = Math.max(1, Math.ceil(totalFiltered / limit))

    // 4. Fetch paginated transactions with aggregated item counts
    const rows = await db
      .select({
        id: transactions.id,
        storeId: transactions.storeId,
        paymentMethod: transactions.paymentMethod,
        paymentStatus: transactions.paymentStatus,
        total: transactions.total,
        paidAmount: transactions.paidAmount,
        changeAmount: transactions.changeAmount,
        createdAt: transactions.createdAt,
        itemCount: count(transactionItems.id),
        totalQuantity: sql<number>`coalesce(sum(${transactionItems.quantity}), 0)`,
      })
      .from(transactions)
      .leftJoin(
        transactionItems,
        eq(transactionItems.transactionId, transactions.id),
      )
      .where(and(...conditions))
      .groupBy(transactions.id)
      .orderBy(desc(transactions.createdAt))
      .limit(limit)
      .offset(offset)

    const transactionList: TransactionListItem[] = rows.map((row) => ({
      id: row.id,
      storeId: row.storeId,
      transactionNumber: formatTransactionNumber(row.id, row.createdAt),
      paymentMethod: (row.paymentMethod as 'cash' | 'qris') || 'cash',
      paymentStatus: (row.paymentStatus as 'pending' | 'paid') || 'paid',
      total: row.total,
      paidAmount: row.paidAmount,
      changeAmount: row.changeAmount,
      createdAt: row.createdAt,
      itemCount: Number(row.itemCount || 0),
      totalQuantity: Number(row.totalQuantity || 0),
    }))

    return {
      transactions: transactionList,
      pagination: {
        page,
        limit,
        total: totalFiltered,
        totalPages,
      },
      summary,
    }
  })

export const getTransactionDetailFn = createServerFn({ method: 'GET' })
  .validator((params: { id: number }) => params)
  .handler(async ({ data }) => {
    const { store } = await getRequiredStoreSession()

    const txnId = Number(data.id)
    if (isNaN(txnId) || txnId <= 0) {
      throw new Error('ID Transaksi tidak valid.')
    }

    // Strict multi-tenant check: transaction must belong to current user's store
    const txnList = await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, txnId), eq(transactions.storeId, store.id)))
      .limit(1)

    if (txnList.length === 0) {
      throw new Error('Transaksi tidak ditemukan atau Anda tidak memiliki akses.')
    }

    const txn = txnList[0]

    // Retrieve snapshot items
    const items = await db
      .select({
        id: transactionItems.id,
        productId: transactionItems.productId,
        productName: transactionItems.productName,
        price: transactionItems.price,
        quantity: transactionItems.quantity,
        subtotal: transactionItems.subtotal,
      })
      .from(transactionItems)
      .where(eq(transactionItems.transactionId, txn.id))
      .orderBy(transactionItems.id)

    const detail: TransactionDetail = {
      id: txn.id,
      storeId: txn.storeId,
      storeName: store.name,
      transactionNumber: formatTransactionNumber(txn.id, txn.createdAt),
      paymentMethod: (txn.paymentMethod as 'cash' | 'qris') || 'cash',
      paymentStatus: (txn.paymentStatus as 'pending' | 'paid') || 'paid',
      total: txn.total,
      paidAmount: txn.paidAmount,
      changeAmount: txn.changeAmount,
      createdAt: txn.createdAt,
      items,
    }

    return detail
  })
