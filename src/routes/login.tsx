import { useState } from 'react'
import { createFileRoute, Link, useRouter, redirect } from '@tanstack/react-router'
import { LogIn, Eye, EyeOff, Loader2 } from 'lucide-react'
import { WarungkuLogo } from '@/components/warungku-logo'
import { createServerFn } from '@tanstack/react-start'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { verify } from '@node-rs/argon2'
import { getSessionFn } from '@/lib/auth'

export const loginFn = createServerFn({ method: 'POST' })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    const { email, password, remember } = data

    if (!email || !password) {
      throw new Error('Email dan kata sandi wajib diisi')
    }

    const normalizedEmail = email.toLowerCase().trim()

    try {
      const usersList = await db
        .select()
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1)
        
      const user = usersList[0] as typeof usersList[0] | undefined

      if (!user) {
        throw new Error('Email atau kata sandi salah.')
      }

      const isValidPassword = await verify(user.passwordHash, password)
      
      if (!isValidPassword) {
        throw new Error('Email atau kata sandi salah.')
      }

      const { setSessionServer } = await import('@/lib/session.server')
      setSessionServer(
        {
          userId: user.id,
          email: user.email,
        },
        remember
      )

      return { success: true }
    } catch (error: any) {
      if (error.message === 'Email atau kata sandi salah.') {
        throw error
      }
      console.error('Login error:', error)
      throw new Error('Terjadi kesalahan saat masuk. Silakan coba lagi.')
    }
  })

export const Route = createFileRoute('/login')({
  beforeLoad: async () => {
    const session = await getSessionFn()
    if (session) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: LoginPemilik,
  head: () => ({
    meta: [
      {
        title: 'Masuk — WarungKu POS & Inventory',
      },
      {
        name: 'description',
        content:
          'Masuk ke akun pemilik untuk mengelola kasir, stok, dan laporan warung Anda.',
      },
    ],
  }),
})

function LoginPemilik() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setErrorMsg('')

    try {
      await loginFn({
        data: {
          email,
          password,
          remember,
        },
      })
      router.navigate({ to: '/dashboard' })
    } catch (error: any) {
      setErrorMsg(error.message || 'Gagal masuk.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="relative min-h-screen bg-wk-surface p-wk-xl font-wk-body text-wk-on-surface">
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-wk-md">
        <div className="w-full max-w-md space-y-wk-xl rounded-wk-xl bg-wk-surface-container-lowest p-wk-xl shadow-sm">
          {/* Header: Logo + Title + Subtitle */}
          <div className="space-y-wk-sm text-center">
            <div className="mb-wk-md flex justify-center">
              <WarungkuLogo />
            </div>
            <h1 className="font-wk-heading text-[32px] leading-[40px] font-bold tracking-[-0.02em] text-wk-on-surface">
              Masuk ke Akun Pemilik
            </h1>
            <p className="text-[14px] leading-[20px] text-wk-on-surface-variant">
              Kelola kasir, stok, dan laporan warung Anda dengan mudah.
            </p>
          </div>

          {errorMsg && (
            <div className="rounded-wk-md bg-red-50 p-wk-md text-[14px] text-red-600 border border-red-200">
              {errorMsg}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-wk-md">
            {/* Email / Username */}
            <div className="space-y-wk-xxs">
              <label
                htmlFor="login-email"
                className="block text-[14px] leading-[20px] font-medium text-wk-on-surface"
              >
                Email
              </label>
              <input
                id="login-email"
                type="email"
                required
                disabled={isLoading}
                placeholder="owner@warungberkah.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-wk-lg bg-wk-surface-container-low px-wk-md py-wk-sm text-wk-on-surface transition-all placeholder:text-wk-outline focus:ring-2 focus:ring-wk-primary focus:outline-none disabled:opacity-50"
              />
            </div>

            {/* Kata Sandi */}
            <div className="space-y-wk-xxs">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="login-password"
                  className="block text-[14px] leading-[20px] font-medium text-wk-on-surface"
                >
                  Kata Sandi
                </label>
                <a
                  href="#"
                  className="text-[12px] leading-[16px] font-medium text-wk-primary hover:underline"
                >
                  Lupa kata sandi?
                </a>
              </div>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  disabled={isLoading}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-wk-lg bg-wk-surface-container-low px-wk-md py-wk-sm pr-10 text-wk-on-surface transition-all placeholder:text-wk-outline focus:ring-2 focus:ring-wk-primary focus:outline-none disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-wk-on-surface-variant hover:text-wk-on-surface disabled:opacity-50"
                  aria-label={
                    showPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'
                  }
                >
                  {showPassword ? (
                    <EyeOff className="size-[18px]" />
                  ) : (
                    <Eye className="size-[18px]" />
                  )}
                </button>
              </div>
            </div>

            {/* Ingat saya */}
            <div className="flex items-center gap-wk-xs">
              <input
                id="login-remember"
                type="checkbox"
                checked={remember}
                disabled={isLoading}
                onChange={(e) => setRemember(e.target.checked)}
                className="size-4 rounded accent-wk-primary focus:ring-wk-primary disabled:opacity-50"
              />
              <label
                htmlFor="login-remember"
                className="cursor-pointer text-[14px] leading-[20px] font-medium text-wk-on-surface-variant"
              >
                Ingat saya
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-wk-xs rounded-wk-lg bg-wk-primary px-wk-md py-wk-md text-[14px] leading-[20px] font-medium text-wk-on-primary shadow-sm transition-all hover:bg-wk-primary-container disabled:opacity-70"
            >
              {isLoading ? (
                <Loader2 className="size-[18px] animate-spin" />
              ) : (
                <LogIn className="size-[18px]" />
              )}
              {isLoading ? 'Sedang masuk...' : 'Masuk ke Dashboard'}
            </button>
          </form>

          {/* Footer */}
          <div className="text-center text-[12px] leading-[16px] text-wk-on-surface-variant">
            Belum punya akun warung?{' '}
            <Link
              to="/register"
              className="font-medium text-wk-primary hover:underline"
            >
              Daftar sekarang
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
