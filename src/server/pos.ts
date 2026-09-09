import { createServerFn } from '@tanstack/react-start'
import { db } from '@/db'
import {
  products,
  categories,
  stores,
  stockMovements,
  transactions,
  transactionItems,
} from '@/db/schema'
import { eq, and, gte, sql, desc } from 'drizzle-orm'

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

export const getPosProductsFn = createServerFn({ method: 'GET' })
  .validator(
    (params?: { search?: string; categoryId?: number }) => params || {},
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
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(and(...conditions))
      .orderBy(products.name)

    let filtered = rows
    const searchTerm = filter.search ? filter.search.trim().toLowerCase() : ''
    if (searchTerm) {
      filtered = filtered.filter((p) =>
        p.name.toLowerCase().includes(searchTerm),
      )
    }

    return filtered
  })

interface CartItem {
  productId: number
  quantity: number
}

export const createTransactionFn = createServerFn({ method: 'POST' })
  .validator((data: { items: CartItem[]; paidAmount: number }) => data)
  .handler(async ({ data }) => {
    const { store } = await getRequiredStoreSession()

    if (data.items.length === 0) {
      throw new Error('Keranjang belanja kosong.')
    }

    const paidAmount = Math.round(Number(data.paidAmount))
    if (isNaN(paidAmount) || paidAmount <= 0) {
      throw new Error('Jumlah pembayaran tidak valid.')
    }

    const result = await db.transaction(async (tx) => {
      // 1. Fetch all products from DB — source of truth for price & stock
      const productIds = data.items.map((i) => i.productId)
      const dbProducts = await tx
        .select()
        .from(products)
        .where(and(eq(products.storeId, store.id)))

      const productMap = new Map(dbProducts.map((p) => [p.id, p]))

      // 2. Validate each item and compute totals
      let total = 0
      const validatedItems: Array<{
        productId: number
        productName: string
        price: number
        quantity: number
        subtotal: number
        currentStock: number
      }> = []

      for (const item of data.items) {
        const qty = Math.round(Number(item.quantity))
        if (isNaN(qty) || qty <= 0) {
          throw new Error('Quantity tidak valid.')
        }

        const product = productMap.get(item.productId)
        if (!product) {
          throw new Error(
            `Produk tidak ditemukan atau bukan milik warung Anda.`,
          )
        }

        if (product.stock < qty) {
          throw new Error(
            `Stok "${product.name}" tidak mencukupi. Tersedia: ${product.stock}, diminta: ${qty}.`,
          )
        }

        const subtotal = product.price * qty
        total += subtotal

        validatedItems.push({
          productId: product.id,
          productName: product.name,
          price: product.price,
          quantity: qty,
          subtotal,
          currentStock: product.stock,
        })
      }

      // 3. Validate payment
      if (paidAmount < total) {
        throw new Error(
          `Pembayaran kurang. Total: Rp${total.toLocaleString('id-ID')}, dibayar: Rp${paidAmount.toLocaleString('id-ID')}.`,
        )
      }

      const changeAmount = paidAmount - total

      // 4. Create transaction record
      const txnList = await tx
        .insert(transactions)
        .values({
          storeId: store.id,
          total,
          paidAmount,
          changeAmount,
        })
        .returning()

      const txn = txnList[0]

      // 5. Insert transaction items + reduce stock + create stock movements
      for (const item of validatedItems) {
        // Insert transaction item
        await tx.insert(transactionItems).values({
          transactionId: txn.id,
          productId: item.productId,
          productName: item.productName,
          price: item.price,
          quantity: item.quantity,
          subtotal: item.subtotal,
        })

        // Atomic stock reduction with guard — prevents negative stock
        // ponytail: single UPDATE with WHERE stock >= qty is the concurrency guard
        const updatedList = await tx
          .update(products)
          .set({
            stock: sql`${products.stock} - ${item.quantity}`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(products.id, item.productId),
              eq(products.storeId, store.id),
              gte(products.stock, item.quantity),
            ),
          )
          .returning()

        if (updatedList.length === 0) {
          throw new Error(
            `Stok "${item.productName}" berubah. Silakan coba lagi.`,
          )
        }

        // Create stock movement
        await tx.insert(stockMovements).values({
          storeId: store.id,
          productId: item.productId,
          type: 'OUT',
          quantity: item.quantity,
          note: 'Penjualan POS',
        })
      }

      return {
        transactionId: txn.id,
        total,
        paidAmount,
        changeAmount,
      }
    })

    return result
  })
