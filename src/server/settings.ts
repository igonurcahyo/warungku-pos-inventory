import { createServerFn } from '@tanstack/react-start'
import { db } from '@/db'
import { stores, users } from '@/db/schema'
import { eq, and, ne } from 'drizzle-orm'

async function getRequiredStoreSession() {
  const { getSessionServer } = await import('@/lib/session.server')
  const session = getSessionServer()
  if (!session) {
    throw new Error('Sesi Anda telah berakhir. Silakan masuk kembali.')
  }

  const userList = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      whatsapp: users.whatsapp,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1)

  const user = userList[0] as (typeof userList)[0] | undefined
  if (!user) {
    throw new Error('Akun pengguna tidak ditemukan.')
  }

  const storesList = await db
    .select({
      id: stores.id,
      ownerId: stores.ownerId,
      name: stores.name,
      createdAt: stores.createdAt,
      updatedAt: stores.updatedAt,
    })
    .from(stores)
    .where(eq(stores.ownerId, session.userId))
    .limit(1)

  const store = storesList[0] as (typeof storesList)[0] | undefined
  if (!store) {
    throw new Error('Data warung tidak ditemukan untuk akun Anda.')
  }

  return { session, user, store }
}

export interface StoreSettingsData {
  store: {
    id: number
    name: string
    createdAt: Date
    updatedAt: Date
  }
  user: {
    id: number
    name: string
    email: string
    whatsapp: string
    createdAt: Date
  }
}

export const getStoreSettingsFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<StoreSettingsData> => {
    const { user, store } = await getRequiredStoreSession()

    return {
      store: {
        id: store.id,
        name: store.name,
        createdAt: store.createdAt,
        updatedAt: store.updatedAt,
      },
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        whatsapp: user.whatsapp,
        createdAt: user.createdAt,
      },
    }
  },
)

export interface UpdateStoreSettingsInput {
  storeName: string
  ownerName: string
  whatsapp: string
  email: string
}

export const updateStoreSettingsFn = createServerFn({ method: 'POST' })
  .validator((data: UpdateStoreSettingsInput) => {
    if (!data.storeName || !data.storeName.trim()) {
      throw new Error('Nama warung wajib diisi.')
    }
    if (data.storeName.trim().length > 150) {
      throw new Error('Nama warung maksimal 150 karakter.')
    }

    if (!data.ownerName || !data.ownerName.trim()) {
      throw new Error('Nama pemilik wajib diisi.')
    }
    if (data.ownerName.trim().length > 100) {
      throw new Error('Nama pemilik maksimal 100 karakter.')
    }

    if (!data.whatsapp || !data.whatsapp.trim()) {
      throw new Error('Nomor WhatsApp wajib diisi.')
    }
    const cleanWhatsapp = data.whatsapp.trim()
    if (!/^[0-9+()\- ]{6,20}$/.test(cleanWhatsapp)) {
      throw new Error('Format nomor WhatsApp tidak valid.')
    }

    if (!data.email || !data.email.trim()) {
      throw new Error('Email pemilik wajib diisi.')
    }
    const cleanEmail = data.email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      throw new Error('Format email tidak valid.')
    }

    return {
      storeName: data.storeName.trim(),
      ownerName: data.ownerName.trim(),
      whatsapp: cleanWhatsapp,
      email: cleanEmail,
    }
  })
  .handler(async ({ data }) => {
    const { session, store } = await getRequiredStoreSession()
    const { setSessionServer } = await import('@/lib/session.server')

    // Check if email already used by another user
    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, data.email), ne(users.id, session.userId)))
      .limit(1)

    if (existingUser.length > 0) {
      throw new Error('Email sudah digunakan oleh akun lain.')
    }

    const now = new Date()

    // Update store (only for owner's store)
    await db
      .update(stores)
      .set({
        name: data.storeName,
        updatedAt: now,
      })
      .where(and(eq(stores.id, store.id), eq(stores.ownerId, session.userId)))

    // Update user profile
    await db
      .update(users)
      .set({
        name: data.ownerName,
        whatsapp: data.whatsapp,
        email: data.email,
        updatedAt: now,
      })
      .where(eq(users.id, session.userId))

    // Update session cookie if email changed
    if (session.email !== data.email) {
      setSessionServer(
        {
          userId: session.userId,
          email: data.email,
        },
        true,
      )
    }

    return {
      success: true,
      message: 'Pengaturan toko berhasil disimpan.',
    }
  })
