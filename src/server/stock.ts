import { createServerFn } from '@tanstack/react-start'
import { db } from '@/db'
import { products, categories, stores, stockMovements } from '@/db/schema'
import { eq, and, desc, sql, gte, lte, asc } from 'drizzle-orm'
import { STOCK_THRESHOLDS } from '@/lib/stock-config'

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

export const getStockProductsFn = createServerFn({ method: 'GET' })
  .validator(
    (params?: { search?: string; categoryId?: number; status?: string }) =>
      params || {},
  )
  .handler(async ({ data: filter }) => {
    const { store } = await getRequiredStoreSession()

    const conditions = [eq(products.storeId, store.id)]

    if (filter.categoryId && !isNaN(Number(filter.categoryId))) {
      conditions.push(eq(products.categoryId, Number(filter.categoryId)))
    }

    const rows = await db
      .select({
        id: products.id,
        storeId: products.storeId,
        categoryId: products.categoryId,
        categoryName: categories.name,
        name: products.name,
        price: products.price,
        stock: products.stock,
        unit: products.unit,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(and(...conditions))
      .orderBy(desc(products.updatedAt))

    let filtered = rows
    const searchTerm = filter.search ? filter.search.trim().toLowerCase() : ''
    if (searchTerm) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchTerm) ||
          `PRD-${String(p.id).padStart(3, '0')}`
            .toLowerCase()
            .includes(searchTerm) ||
          (p.categoryName && p.categoryName.toLowerCase().includes(searchTerm)),
      )
    }

    if (filter.status && filter.status !== 'all' && filter.status !== 'semua') {
      if (filter.status === 'habis') {
        filtered = filtered.filter((p) => p.stock <= 0)
      } else if (filter.status === 'menipis') {
        filtered = filtered.filter(
          (p) => p.stock > 0 && p.stock <= STOCK_THRESHOLDS.LOW_STOCK,
        )
      } else if (filter.status === 'aman') {
        filtered = filtered.filter((p) => p.stock > STOCK_THRESHOLDS.LOW_STOCK)
      }
    }

    return filtered
  })

export const getStockProducts = getStockProductsFn

export const addStockFn = createServerFn({ method: 'POST' })
  .validator(
    (data: { productId: number; quantity: number; note?: string }) => data,
  )
  .handler(async ({ data }) => {
    const { store } = await getRequiredStoreSession()

    const productId = Number(data.productId)
    if (!productId || isNaN(productId)) {
      throw new Error('Produk tidak valid.')
    }

    const quantity = Number(data.quantity)
    if (isNaN(quantity) || quantity <= 0) {
      throw new Error('Jumlah stok harus lebih dari 0.')
    }

    const integerQty = Math.round(quantity)

    const updated = await db.transaction(async (tx) => {
      // 1. Verifikasi kepemilikan produk oleh warung pengguna
      const prodList = await tx
        .select()
        .from(products)
        .where(and(eq(products.id, productId), eq(products.storeId, store.id)))
        .limit(1)

      const existingProd = prodList[0] as (typeof prodList)[0] | undefined
      if (!existingProd) {
        throw new Error(
          'Produk tidak ditemukan atau Anda tidak memiliki akses ke produk ini.',
        )
      }

      // 2. Operasi database atomik untuk menambah stok
      const updatedList = await tx
        .update(products)
        .set({
          stock: sql`${products.stock} + ${integerQty}`,
          updatedAt: new Date(),
        })
        .where(and(eq(products.id, productId), eq(products.storeId, store.id)))
        .returning()

      const resultProduct = updatedList[0] as
        | (typeof updatedList)[0]
        | undefined
      if (!resultProduct) {
        throw new Error('Terjadi kesalahan saat memperbarui stok.')
      }

      // 3. Catat riwayat pergerakan stok (IN)
      await tx.insert(stockMovements).values({
        storeId: store.id,
        productId: productId,
        type: 'IN',
        quantity: integerQty,
        note: data.note?.trim() || null,
      })

      return resultProduct
    })

    return updated
  })

export const addStock = addStockFn

export const removeStockFn = createServerFn({ method: 'POST' })
  .validator(
    (data: { productId: number; quantity: number; note?: string }) => data,
  )
  .handler(async ({ data }) => {
    const { store } = await getRequiredStoreSession()

    const productId = Number(data.productId)
    if (!productId || isNaN(productId)) {
      throw new Error('Produk tidak valid.')
    }

    const quantity = Number(data.quantity)
    if (isNaN(quantity) || quantity <= 0) {
      throw new Error('Jumlah stok harus lebih dari 0.')
    }

    const integerQty = Math.round(quantity)

    const updated = await db.transaction(async (tx) => {
      // 1. Verifikasi kepemilikan produk dan cek ketersediaan stok
      const prodList = await tx
        .select()
        .from(products)
        .where(and(eq(products.id, productId), eq(products.storeId, store.id)))
        .limit(1)

      const existingProd = prodList[0] as (typeof prodList)[0] | undefined
      if (!existingProd) {
        throw new Error(
          'Produk tidak ditemukan atau Anda tidak memiliki akses ke produk ini.',
        )
      }

      if (existingProd.stock < integerQty) {
        throw new Error('Stok tidak mencukupi.')
      }

      // 2. Operasi database atomik untuk mengurangi stok hanya jika stok masih mencukupi
      const updatedList = await tx
        .update(products)
        .set({
          stock: sql`${products.stock} - ${integerQty}`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(products.id, productId),
            eq(products.storeId, store.id),
            gte(products.stock, integerQty),
          ),
        )
        .returning()

      const resultProduct = updatedList[0] as
        | (typeof updatedList)[0]
        | undefined
      if (!resultProduct) {
        throw new Error('Stok tidak mencukupi.')
      }

      // 3. Catat riwayat pergerakan stok (OUT)
      await tx.insert(stockMovements).values({
        storeId: store.id,
        productId: productId,
        type: 'OUT',
        quantity: integerQty,
        note: data.note?.trim() || null,
      })

      return resultProduct
    })

    return updated
  })

export const removeStock = removeStockFn

export const getStockHistoryFn = createServerFn({ method: 'GET' })
  .validator((params?: { productId?: number; limit?: number }) => params || {})
  .handler(async ({ data: filter }) => {
    const { store } = await getRequiredStoreSession()

    const conditions = [eq(stockMovements.storeId, store.id)]

    if (filter.productId && !isNaN(Number(filter.productId))) {
      conditions.push(eq(stockMovements.productId, Number(filter.productId)))
    }

    const limitCount = filter.limit && filter.limit > 0 ? filter.limit : 50

    const rows = await db
      .select({
        id: stockMovements.id,
        storeId: stockMovements.storeId,
        productId: stockMovements.productId,
        productName: products.name,
        productUnit: products.unit,
        categoryName: categories.name,
        type: stockMovements.type,
        quantity: stockMovements.quantity,
        note: stockMovements.note,
        createdAt: stockMovements.createdAt,
      })
      .from(stockMovements)
      .innerJoin(products, eq(stockMovements.productId, products.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(and(...conditions))
      .orderBy(desc(stockMovements.createdAt))
      .limit(limitCount)

    return rows
  })

export const getStockHistory = getStockHistoryFn

export interface StockNotificationItem {
  id: number
  name: string
  stock: number
  unit: string
  status: 'Stok habis' | 'Stok menipis'
}

export const getStockNotificationsFn = createServerFn({ method: 'GET' })
  .handler(async (): Promise<StockNotificationItem[]> => {
    const { store } = await getRequiredStoreSession()

    const rows = await db
      .select({
        id: products.id,
        name: products.name,
        stock: products.stock,
        unit: products.unit,
      })
      .from(products)
      .where(
        and(
          eq(products.storeId, store.id),
          lte(products.stock, STOCK_THRESHOLDS.LOW_STOCK),
        ),
      )
      .orderBy(asc(products.stock), asc(products.name))

    return rows.map((product) => ({
      id: product.id,
      name: product.name,
      stock: product.stock,
      unit: product.unit,
      status: product.stock <= 0 ? 'Stok habis' : 'Stok menipis',
    }))
  })
