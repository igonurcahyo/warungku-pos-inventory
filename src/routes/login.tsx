import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { LogIn, Eye, EyeOff } from 'lucide-react'
import { WarungkuLogo } from '@/components/warungku-logo'

export const Route = createFileRoute('/login')({
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
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // UI-only — no backend auth
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

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-wk-md">
            {/* Email / Username */}
            <div className="space-y-wk-xxs">
              <label
                htmlFor="login-email"
                className="block text-[14px] leading-[20px] font-medium text-wk-on-surface"
              >
                Email / Username
              </label>
              <input
                id="login-email"
                type="text"
                required
                placeholder="owner@warungberkah.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-wk-lg bg-wk-surface-container-low px-wk-md py-wk-sm text-wk-on-surface transition-all placeholder:text-wk-outline focus:ring-2 focus:ring-wk-primary focus:outline-none"
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
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-wk-lg bg-wk-surface-container-low px-wk-md py-wk-sm pr-10 text-wk-on-surface transition-all placeholder:text-wk-outline focus:ring-2 focus:ring-wk-primary focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-wk-on-surface-variant hover:text-wk-on-surface"
                  aria-label={showPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
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
                onChange={(e) => setRemember(e.target.checked)}
                className="size-4 rounded accent-wk-primary focus:ring-wk-primary"
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
              className="flex w-full items-center justify-center gap-wk-xs rounded-wk-lg bg-wk-primary px-wk-md py-wk-md text-[14px] leading-[20px] font-medium text-wk-on-primary shadow-sm transition-all hover:bg-wk-primary-container"
            >
              <LogIn className="size-[18px]" />
              Masuk ke Dashboard
            </button>
          </form>

          {/* Footer */}
          <div className="text-center text-[12px] leading-[16px] text-wk-on-surface-variant">
            Belum punya akun warung?{' '}
            <Link
              to="/"
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
