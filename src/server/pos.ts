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
import { eq, and, gte, sql } from 'drizzle-orm'
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

export interface CartItem {
  productId: number
  quantity: number
}

export interface CreateTransactionInput {
  items: CartItem[]
  paymentMethod?: 'cash' | 'qris'
  paidAmount?: number
}

export const createTransactionFn = createServerFn({ method: 'POST' })
  .validator((data: CreateTransactionInput) => data)
  .handler(async ({ data }) => {
    const { store } = await getRequiredStoreSession()

    if (!data.items || data.items.length === 0) {
      throw new Error('Keranjang belanja kosong.')
    }

    const paymentMethod = data.paymentMethod === 'qris' ? 'qris' : 'cash'

    const result = await db.transaction(async (tx) => {
      // 1. Fetch all store products from DB — source of truth for price & stock
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

      if (paymentMethod === 'cash') {
        // Cash payment flow
        const paidAmount = Math.round(Number(data.paidAmount))
        if (isNaN(paidAmount) || paidAmount <= 0) {
          throw new Error('Jumlah uang tunai tidak valid.')
        }

        if (paidAmount < total) {
          throw new Error(
            `Pembayaran kurang. Total: Rp${total.toLocaleString('id-ID')}, dibayar: Rp${paidAmount.toLocaleString('id-ID')}.`,
          )
        }

        const changeAmount = paidAmount - total

        // Insert paid cash transaction
        const txnList = await tx
          .insert(transactions)
          .values({
            storeId: store.id,
            total,
            paidAmount,
            changeAmount,
            paymentMethod: 'cash',
            paymentStatus: 'paid',
          })
          .returning()

        const txn = txnList[0]

        // Insert items + atomically decrement stock + record stockMovements
        for (const item of validatedItems) {
          await tx.insert(transactionItems).values({
            transactionId: txn.id,
            productId: item.productId,
            productName: item.productName,
            price: item.price,
            quantity: item.quantity,
            subtotal: item.subtotal,
          })

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
              `Stok "${item.productName}" berubah atau tidak mencukupi. Silakan coba lagi.`,
            )
          }

          await tx.insert(stockMovements).values({
            storeId: store.id,
            productId: item.productId,
            type: 'OUT',
            quantity: item.quantity,
            note: 'Penjualan POS (Tunai)',
          })
        }

        const transactionNumber = formatTransactionNumber(txn.id, txn.createdAt)

        return {
          transactionId: txn.id,
          transactionNumber,
          total,
          paidAmount,
          changeAmount,
          paymentMethod: 'cash' as const,
          paymentStatus: 'paid' as const,
        }
      } else {
        // QRIS initiation flow (status: pending, stock not deducted yet)
        const txnList = await tx
          .insert(transactions)
          .values({
            storeId: store.id,
            total,
            paidAmount: 0,
            changeAmount: 0,
            paymentMethod: 'qris',
            paymentStatus: 'pending',
          })
          .returning()

        const txn = txnList[0]

        // Record items snapshot for QRIS transaction
        for (const item of validatedItems) {
          await tx.insert(transactionItems).values({
            transactionId: txn.id,
            productId: item.productId,
            productName: item.productName,
            price: item.price,
            quantity: item.quantity,
            subtotal: item.subtotal,
          })
        }

        const transactionNumber = formatTransactionNumber(txn.id, txn.createdAt)
        const qrPayload = `WARUNGKU|${transactionNumber}|${total}`

        return {
          transactionId: txn.id,
          transactionNumber,
          total,
          paidAmount: 0,
          changeAmount: 0,
          paymentMethod: 'qris' as const,
          paymentStatus: 'pending' as const,
          qrPayload,
        }
      }
    })

    return result
  })

export const simulateQrisPaymentFn = createServerFn({ method: 'POST' })
  .validator((data: { transactionId: number }) => data)
  .handler(async ({ data }) => {
    const { store } = await getRequiredStoreSession()
    const txnId = Number(data.transactionId)
    if (isNaN(txnId) || txnId <= 0) {
      throw new Error('ID Transaksi tidak valid.')
    }

    const result = await db.transaction(async (tx) => {
      // 1. Fetch transaction with ownership check
      const txnList = await tx
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.id, txnId),
            eq(transactions.storeId, store.id),
          ),
        )
        .limit(1)

      const txn = txnList[0]
      if (!txn) {
        throw new Error('Transaksi tidak ditemukan.')
      }

      if (txn.paymentStatus === 'paid') {
        throw new Error('Transaksi ini sudah dibayar sebelumnya.')
      }

      if (txn.paymentStatus !== 'pending') {
        throw new Error('Status transaksi tidak valid untuk pembayaran.')
      }

      // 2. Fetch items snapshot
      const items = await tx
        .select()
        .from(transactionItems)
        .where(eq(transactionItems.transactionId, txn.id))

      if (items.length === 0) {
        throw new Error('Item transaksi tidak ditemukan.')
      }

      // 3. Atomically decrement stock and record movements
      // ponytail: single UPDATE with WHERE stock >= qty is the concurrency guard
      for (const item of items) {
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
            `Stok "${item.productName}" tidak mencukupi untuk menyelesaikan pembayaran.`,
          )
        }

        await tx.insert(stockMovements).values({
          storeId: store.id,
          productId: item.productId,
          type: 'OUT',
          quantity: item.quantity,
          note: 'Penjualan POS (QRIS)',
        })
      }

      // 4. Update transaction: payment_status = paid, paid_amount = total, change_amount = 0
      const updatedTxn = await tx
        .update(transactions)
        .set({
          paymentStatus: 'paid',
          paidAmount: txn.total,
          changeAmount: 0,
        })
        .where(
          and(
            eq(transactions.id, txn.id),
            eq(transactions.storeId, store.id),
            eq(transactions.paymentStatus, 'pending'), // concurrency guard
          ),
        )
        .returning()

      if (updatedTxn.length === 0) {
        throw new Error(
          'Gagal memperbarui status transaksi atau transaksi telah diproses.',
        )
      }

      const transactionNumber = formatTransactionNumber(txn.id, txn.createdAt)

      return {
        transactionId: txn.id,
        transactionNumber,
        total: txn.total,
        paidAmount: txn.total,
        changeAmount: 0,
        paymentMethod: 'qris' as const,
        paymentStatus: 'paid' as const,
      }
    })

    return result
  })

