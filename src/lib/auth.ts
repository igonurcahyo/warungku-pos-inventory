import { createServerFn } from '@tanstack/react-start'
import { db } from '@/db'
import { users, stores } from '@/db/schema'
import { eq } from 'drizzle-orm'

export const getSessionFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { getSessionServer } = await import('./session.server')
    return getSessionServer()
  },
)

export const getCurrentUserFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { getSessionServer, clearSessionServer } =
      await import('./session.server')
    const session = getSessionServer()
    if (!session) {
      return null
    }

    try {
      const usersList = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
        })
        .from(users)
        .where(eq(users.id, session.userId))
        .limit(1)

      const user = usersList[0] as (typeof usersList)[0] | undefined

      if (!user) {
        clearSessionServer()
        return null
      }

      const storesList = await db
        .select({
          id: stores.id,
          name: stores.name,
        })
        .from(stores)
        .where(eq(stores.ownerId, user.id))
        .limit(1)

      const store = storesList[0] as (typeof storesList)[0] | undefined

      return {
        ...user,
        store: store ? store : null,
      }
    } catch (error) {
      console.error('Error fetching current user:', error)
      return null
    }
  },
)

export const logoutFn = createServerFn({ method: 'POST' }).handler(async () => {
  const { clearSessionServer } = await import('./session.server')
  clearSessionServer()
  return { success: true }
})
