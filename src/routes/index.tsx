import { createFileRoute, redirect } from '@tanstack/react-router'
import { getSessionFn } from '@/lib/auth'

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    const session = await getSessionFn()
    if (session) {
      throw redirect({ to: '/dashboard' })
    } else {
      throw redirect({ to: '/login' })
    }
  },
  component: () => null,
})
