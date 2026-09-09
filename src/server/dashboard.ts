import { createServerFn } from '@tanstack/react-start'
import { db } from '@/db'
import { products, categories, stores, transactions, transactionItems } from '@/db/schema'
import { eq, and, desc, gte } from 'drizzle-orm'

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

    // 2. Today's transactions
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const todayTransactions = await db
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
          gte(transactions.createdAt, startOfDay),
        ),
      )
      .orderBy(desc(transactions.createdAt))

    const todaySales = todayTransactions.reduce((sum, t) => sum + t.total, 0)

    // 3. Top selling products today
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
      todayTransactionCount: todayTransactions.length,
      recentTransactions: todayTransactions.slice(0, 5),
      topProducts,
    }
  })
