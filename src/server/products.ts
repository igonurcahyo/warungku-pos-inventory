import { createServerFn } from '@tanstack/react-start'
import { db } from '@/db'
import { products, categories, stores } from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'

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

export { getCategoriesFn, createCategoryFn } from './categories'

export const getProductsFn = createServerFn({ method: 'GET' })
  .validator(
    (params?: { search?: string; categoryId?: number; status?: string }) =>
      params || {},
  )
  .handler(async ({ data: filter }) => {
    const { store } = await getRequiredStoreSession()

    const conditions = [eq(products.storeId, store.id)]

    if (filter.categoryId) {
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
            .includes(searchTerm),
      )
    }

    if (filter.status) {
      if (filter.status === 'habis') {
        filtered = filtered.filter((p) => p.stock <= 0)
      } else if (filter.status === 'menipis') {
        filtered = filtered.filter((p) => p.stock > 0 && p.stock <= 5)
      } else if (filter.status === 'aman') {
        filtered = filtered.filter((p) => p.stock > 5)
      }
    }

    return filtered
  })

export const createProductFn = createServerFn({ method: 'POST' })
  .validator(
    (data: {
      name: string
      categoryId: number
      price: number
      stock: number
      unit?: string
    }) => data,
  )
  .handler(async ({ data }) => {
    const { store } = await getRequiredStoreSession()

    const trimmedName = data.name.trim()
    if (!trimmedName) {
      throw new Error('Nama produk wajib diisi.')
    }

    const price = Number(data.price)
    if (isNaN(price) || price < 0) {
      throw new Error(
        'Harga harus berupa angka dan lebih dari atau sama dengan 0.',
      )
    }

    const stock = Number(data.stock)
    if (isNaN(stock) || stock < 0) {
      throw new Error(
        'Stok harus berupa angka dan lebih dari atau sama dengan 0.',
      )
    }

    const categoryId = Number(data.categoryId)
    if (!categoryId || isNaN(categoryId)) {
      throw new Error('Kategori wajib dipilih.')
    }

    const catList = await db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(eq(categories.id, categoryId), eq(categories.storeId, store.id)),
      )
      .limit(1)

    const cat = catList[0] as (typeof catList)[0] | undefined
    if (!cat) {
      throw new Error('Kategori yang dipilih tidak valid untuk warung Anda.')
    }

    const unit = data.unit ? data.unit.trim() : 'Pcs'

    const inserted = await db
      .insert(products)
      .values({
        storeId: store.id,
        categoryId: cat.id,
        name: trimmedName,
        price: Math.round(price),
        stock: Math.round(stock),
        unit,
      })
      .returning()

    return inserted[0]
  })

export const updateProductFn = createServerFn({ method: 'POST' })
  .validator(
    (data: {
      id: number
      name: string
      categoryId: number
      price: number
      stock: number
      unit?: string
    }) => data,
  )
  .handler(async ({ data }) => {
    const { store } = await getRequiredStoreSession()

    const productId = Number(data.id)
    if (!productId) {
      throw new Error('ID produk tidak valid.')
    }

    const trimmedName = data.name.trim()
    if (!trimmedName) {
      throw new Error('Nama produk wajib diisi.')
    }

    const price = Number(data.price)
    if (isNaN(price) || price < 0) {
      throw new Error(
        'Harga harus berupa angka dan lebih dari atau sama dengan 0.',
      )
    }

    const stock = Number(data.stock)
    if (isNaN(stock) || stock < 0) {
      throw new Error(
        'Stok harus berupa angka dan lebih dari atau sama dengan 0.',
      )
    }

    const categoryId = Number(data.categoryId)
    if (!categoryId || isNaN(categoryId)) {
      throw new Error('Kategori wajib dipilih.')
    }

    const catList = await db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(eq(categories.id, categoryId), eq(categories.storeId, store.id)),
      )
      .limit(1)

    const cat = catList[0] as (typeof catList)[0] | undefined
    if (!cat) {
      throw new Error('Kategori yang dipilih tidak valid untuk warung Anda.')
    }

    const unit = data.unit ? data.unit.trim() : 'Pcs'

    const updatedList = await db
      .update(products)
      .set({
        categoryId: cat.id,
        name: trimmedName,
        price: Math.round(price),
        stock: Math.round(stock),
        unit,
        updatedAt: new Date(),
      })
      .where(and(eq(products.id, productId), eq(products.storeId, store.id)))
      .returning()

    const updated = updatedList[0] as (typeof updatedList)[0] | undefined
    if (!updated) {
      throw new Error('Produk tidak ditemukan atau tidak memiliki izin akses.')
    }

    return updated
  })

export const deleteProductFn = createServerFn({ method: 'POST' })
  .validator((data: { id: number }) => data)
  .handler(async ({ data }) => {
    const { store } = await getRequiredStoreSession()

    const productId = Number(data.id)
    if (!productId) {
      throw new Error('ID produk tidak valid.')
    }

    const deletedList = await db
      .delete(products)
      .where(and(eq(products.id, productId), eq(products.storeId, store.id)))
      .returning()

    const deleted = deletedList[0] as (typeof deletedList)[0] | undefined
    if (!deleted) {
      throw new Error('Produk tidak ditemukan atau tidak memiliki izin akses.')
    }

    return { success: true, id: deleted.id }
  })

export const updateProductStockFn = createServerFn({ method: 'POST' })
  .validator((data: { id: number; stock: number }) => data)
  .handler(async ({ data }) => {
    const { store } = await getRequiredStoreSession()

    const productId = Number(data.id)
    const stock = Number(data.stock)
    if (isNaN(stock) || stock < 0) {
      throw new Error('Stok harus bernilai 0 atau lebih.')
    }

    const updatedList = await db
      .update(products)
      .set({
        stock: Math.round(stock),
        updatedAt: new Date(),
      })
      .where(and(eq(products.id, productId), eq(products.storeId, store.id)))
      .returning()

    const updated = updatedList[0] as (typeof updatedList)[0] | undefined
    if (!updated) {
      throw new Error('Produk tidak ditemukan atau tidak memiliki izin akses.')
    }

    return updated
  })
