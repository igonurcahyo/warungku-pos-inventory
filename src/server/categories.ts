import { createServerFn } from '@tanstack/react-start'
import { db } from '@/db'
import { categories, products, stores } from '@/db/schema'
import { eq, and, sql, ne } from 'drizzle-orm'

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

export const getCategoriesFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { store } = await getRequiredStoreSession()

    const catList = await db
      .select({
        id: categories.id,
        storeId: categories.storeId,
        name: categories.name,
        createdAt: categories.createdAt,
        updatedAt: categories.updatedAt,
        productCount: sql<number>`cast(count(${products.id}) as integer)`,
      })
      .from(categories)
      .leftJoin(
        products,
        and(
          eq(products.categoryId, categories.id),
          eq(products.storeId, store.id),
        ),
      )
      .where(eq(categories.storeId, store.id))
      .groupBy(categories.id)
      .orderBy(categories.name)

    return catList
  },
)

export const createCategoryFn = createServerFn({ method: 'POST' })
  .validator((data: { name: string }) => data)
  .handler(async ({ data }) => {
    const { store } = await getRequiredStoreSession()

    const trimmedName = (data.name || '').trim()
    if (!trimmedName) {
      throw new Error('Nama kategori tidak boleh kosong.')
    }
    if (trimmedName.length < 2) {
      throw new Error('Nama kategori minimal 2 karakter.')
    }
    if (trimmedName.length > 50) {
      throw new Error('Nama kategori maksimal 50 karakter.')
    }

    // Check duplicate in same store (case-insensitive)
    const existing = await db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(
          eq(categories.storeId, store.id),
          sql`lower(${categories.name}) = lower(${trimmedName})`,
        ),
      )
      .limit(1)

    if (existing.length > 0) {
      throw new Error('Kategori dengan nama ini sudah ada di warung Anda.')
    }

    try {
      const inserted = await db
        .insert(categories)
        .values({
          storeId: store.id,
          name: trimmedName,
        })
        .returning()

      return inserted[0]
    } catch (error: any) {
      if (
        error.code === '23505' ||
        error.message?.includes('categories_store_id_name_unique')
      ) {
        throw new Error('Kategori dengan nama ini sudah ada di warung Anda.')
      }
      throw error
    }
  })

export const updateCategoryFn = createServerFn({ method: 'POST' })
  .validator((data: { id: number; name: string }) => data)
  .handler(async ({ data }) => {
    const { store } = await getRequiredStoreSession()

    const categoryId = Number(data.id)
    if (!categoryId || isNaN(categoryId)) {
      throw new Error('ID kategori tidak valid.')
    }

    const trimmedName = (data.name || '').trim()
    if (!trimmedName) {
      throw new Error('Nama kategori tidak boleh kosong.')
    }
    if (trimmedName.length < 2) {
      throw new Error('Nama kategori minimal 2 karakter.')
    }
    if (trimmedName.length > 50) {
      throw new Error('Nama kategori maksimal 50 karakter.')
    }

    // Verify category belongs to user's store
    const currentList = await db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(eq(categories.id, categoryId), eq(categories.storeId, store.id)),
      )
      .limit(1)

    if (!currentList[0]) {
      throw new Error(
        'Kategori tidak ditemukan atau Anda tidak memiliki akses.',
      )
    }

    // Check duplicate excluding this category
    const duplicate = await db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(
          eq(categories.storeId, store.id),
          sql`lower(${categories.name}) = lower(${trimmedName})`,
          ne(categories.id, categoryId),
        ),
      )
      .limit(1)

    if (duplicate.length > 0) {
      throw new Error('Kategori dengan nama ini sudah ada di warung Anda.')
    }

    try {
      const updatedList = await db
        .update(categories)
        .set({
          name: trimmedName,
          updatedAt: new Date(),
        })
        .where(
          and(eq(categories.id, categoryId), eq(categories.storeId, store.id)),
        )
        .returning()

      return updatedList[0]
    } catch (error: any) {
      if (
        error.code === '23505' ||
        error.message?.includes('categories_store_id_name_unique')
      ) {
        throw new Error('Kategori dengan nama ini sudah ada di warung Anda.')
      }
      throw error
    }
  })

export const deleteCategoryFn = createServerFn({ method: 'POST' })
  .validator((data: { id: number }) => data)
  .handler(async ({ data }) => {
    const { store } = await getRequiredStoreSession()

    const categoryId = Number(data.id)
    if (!categoryId || isNaN(categoryId)) {
      throw new Error('ID kategori tidak valid.')
    }

    // Verify category belongs to user's store
    const currentList = await db
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .where(
        and(eq(categories.id, categoryId), eq(categories.storeId, store.id)),
      )
      .limit(1)

    if (!currentList[0]) {
      throw new Error(
        'Kategori tidak ditemukan atau Anda tidak memiliki akses.',
      )
    }

    // Check if category is still used by products
    const productsUsing = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(products)
      .where(
        and(
          eq(products.categoryId, categoryId),
          eq(products.storeId, store.id),
        ),
      )

    const productCount = productsUsing[0]?.count || 0
    if (productCount > 0) {
      throw new Error(
        'Kategori masih digunakan oleh produk dan tidak dapat dihapus.',
      )
    }

    await db
      .delete(categories)
      .where(
        and(eq(categories.id, categoryId), eq(categories.storeId, store.id)),
      )

    return { success: true, id: categoryId }
  })
