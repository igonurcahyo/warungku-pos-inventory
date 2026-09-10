import { useState } from 'react'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { UserPlus, Eye, EyeOff, Loader2 } from 'lucide-react'
import { WarungkuLogo } from '@/components/warungku-logo'
import { createServerFn } from '@tanstack/react-start'
import { db } from '@/db'
import { users, stores } from '@/db/schema'
import { hash } from '@node-rs/argon2'

export const registerWarungFn = createServerFn({ method: 'POST' })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    const {
      namaLengkap,
      namaWarung,
      whatsapp,
      email,
      password,
      confirmPassword,
    } = data

    if (!namaLengkap || !namaWarung || !whatsapp || !email || !password) {
      throw new Error('Semua field wajib diisi')
    }
    if (password !== confirmPassword) {
      throw new Error('Konfirmasi kata sandi tidak cocok')
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      throw new Error('Format email tidak valid')
    }

    const passwordHash = await hash(password)

    try {
      await db.transaction(async (tx) => {
        const [newUser] = await tx
          .insert(users)
          .values({
            name: namaLengkap,
            whatsapp,
            email,
            passwordHash,
          })
          .returning({ id: users.id })

        await tx.insert(stores).values({
          ownerId: newUser.id,
          name: namaWarung,
        })
      })

      return { success: true }
    } catch (error: any) {
      if (
        error.code === '23505' ||
        error.message?.includes('users_email_unique')
      ) {
        throw new Error('Email sudah terdaftar')
      }
      console.error('Registration error:', error)
      throw new Error('Gagal melakukan pendaftaran. Silakan coba lagi.')
    }
  })

export const Route = createFileRoute('/register')({
  component: RegisterWarung,
  head: () => ({
    meta: [
      {
        title: 'Daftar Warung — WarungKu POS & Inventory',
      },
      {
        name: 'description',
        content:
          'Daftarkan warung kelontong baru Anda untuk mulai mengelola kasir dan stok secara digital.',
      },
    ],
  }),
})

function RegisterWarung() {
  const router = useRouter()
  const [namaLengkap, setNamaLengkap] = useState('')
  const [namaWarung, setNamaWarung] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirmPassword) {
      setErrorMsg('Konfirmasi kata sandi tidak cocok')
      return
    }

    setIsLoading(true)
    setErrorMsg('')

    try {
      await registerWarungFn({
        data: {
          namaLengkap,
          namaWarung,
          whatsapp,
          email,
          password,
          confirmPassword,
        },
      })

      router.navigate({ to: '/login' })
    } catch (error: any) {
      setErrorMsg(error.message || 'Terjadi kesalahan saat pendaftaran.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="relative min-h-screen bg-wk-surface p-3.5 sm:p-6 md:p-wk-xl font-wk-body text-wk-on-surface flex items-center justify-center">
      <div className="w-full max-w-xl">
        <div className="w-full space-y-6 sm:space-y-wk-xl rounded-2xl sm:rounded-wk-xl bg-wk-surface-container-lowest p-5 sm:p-8 md:p-wk-xxl shadow-sm border border-wk-surface-container/50">
          {/* Header: Logo + Title + Subtitle */}
          <div className="space-y-2 text-center">
            <div className="mb-3 flex justify-center">
              <WarungkuLogo />
            </div>
            <h1 className="font-wk-heading text-2xl sm:text-[32px] leading-tight sm:leading-[40px] font-bold tracking-[-0.02em] text-wk-on-surface">
              Pendaftaran Warung Baru
            </h1>
            <p className="text-xs sm:text-sm leading-relaxed text-wk-on-surface-variant">
              Daftarkan warung kelontong Anda dan nikmati kemudahan manajemen
              stok serta kasir digital.
            </p>
          </div>

          {errorMsg && (
            <div className="rounded-wk-md bg-red-50 p-wk-md text-[14px] text-red-600 border border-red-200">
              {errorMsg}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-wk-md" autoComplete="off">
            {/* Nama Lengkap Pemilik */}
            <div className="space-y-wk-xxs">
              <label
                htmlFor="register-nama-lengkap"
                className="block text-[14px] leading-[20px] font-medium text-wk-on-surface"
              >
                Nama Lengkap Pemilik
              </label>
              <input
                id="register-nama-lengkap"
                name="namaLengkap"
                type="text"
                required
                autoComplete="off"
                disabled={isLoading}
                placeholder="Budi Santoso"
                value={namaLengkap}
                onChange={(e) => setNamaLengkap(e.target.value)}
                className="w-full rounded-wk-lg bg-wk-surface-container-low px-wk-md py-wk-sm text-wk-on-surface transition-all placeholder:text-wk-outline focus:ring-2 focus:ring-wk-primary focus:outline-none disabled:opacity-50"
              />
            </div>

            {/* Nama Warung */}
            <div className="space-y-wk-xxs">
              <label
                htmlFor="register-nama-warung"
                className="block text-[14px] leading-[20px] font-medium text-wk-on-surface"
              >
                Nama Warung
              </label>
              <input
                id="register-nama-warung"
                name="namaWarung"
                type="text"
                required
                autoComplete="off"
                disabled={isLoading}
                placeholder="Warung Berkah Jaya"
                value={namaWarung}
                onChange={(e) => setNamaWarung(e.target.value)}
                className="w-full rounded-wk-lg bg-wk-surface-container-low px-wk-md py-wk-sm text-wk-on-surface transition-all placeholder:text-wk-outline focus:ring-2 focus:ring-wk-primary focus:outline-none disabled:opacity-50"
              />
            </div>

            {/* WhatsApp + Email — 2 column grid */}
            <div className="grid grid-cols-1 gap-wk-md md:grid-cols-2">
              <div className="space-y-wk-xxs">
                <label
                  htmlFor="register-whatsapp"
                  className="block text-[14px] leading-[20px] font-medium text-wk-on-surface"
                >
                  Nomor WhatsApp / Telepon
                </label>
                <input
                  id="register-whatsapp"
                  name="whatsapp"
                  type="text"
                  required
                  autoComplete="off"
                  disabled={isLoading}
                  placeholder="+62 812-3456-7890"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full rounded-wk-lg bg-wk-surface-container-low px-wk-md py-wk-sm text-wk-on-surface transition-all placeholder:text-wk-outline focus:ring-2 focus:ring-wk-primary focus:outline-none disabled:opacity-50"
                />
              </div>
              <div className="space-y-wk-xxs">
                <label
                  htmlFor="register-email"
                  className="block text-[14px] leading-[20px] font-medium text-wk-on-surface"
                >
                  Email
                </label>
                <input
                  id="register-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="off"
                  disabled={isLoading}
                  placeholder="budi.santoso@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-wk-lg bg-wk-surface-container-low px-wk-md py-wk-sm text-wk-on-surface transition-all placeholder:text-wk-outline focus:ring-2 focus:ring-wk-primary focus:outline-none disabled:opacity-50"
                />
              </div>
            </div>

            {/* Password + Confirm — 2 column grid */}
            <div className="grid grid-cols-1 gap-wk-md md:grid-cols-2">
              <div className="space-y-wk-xxs">
                <label
                  htmlFor="register-password"
                  className="block text-[14px] leading-[20px] font-medium text-wk-on-surface"
                >
                  Kata Sandi
                </label>
                <div className="relative">
                  <input
                    id="register-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    disabled={isLoading}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-wk-lg bg-wk-surface-container-low px-wk-md py-wk-sm pr-10 text-wk-on-surface transition-all placeholder:text-wk-outline focus:ring-2 focus:ring-wk-primary focus:outline-none disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-wk-on-surface-variant hover:text-wk-on-surface disabled:opacity-50"
                    disabled={isLoading}
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
              <div className="space-y-wk-xxs">
                <label
                  htmlFor="register-confirm-password"
                  className="block text-[14px] leading-[20px] font-medium text-wk-on-surface"
                >
                  Konfirmasi Kata Sandi
                </label>
                <div className="relative">
                  <input
                    id="register-confirm-password"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    disabled={isLoading}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-wk-lg bg-wk-surface-container-low px-wk-md py-wk-sm pr-10 text-wk-on-surface transition-all placeholder:text-wk-outline focus:ring-2 focus:ring-wk-primary focus:outline-none disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-wk-on-surface-variant hover:text-wk-on-surface disabled:opacity-50"
                    disabled={isLoading}
                    aria-label={
                      showConfirmPassword
                        ? 'Sembunyikan sandi'
                        : 'Tampilkan sandi'
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="size-[18px]" />
                    ) : (
                      <Eye className="size-[18px]" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="mt-wk-lg flex w-full items-center justify-center gap-wk-xs rounded-wk-lg bg-wk-primary px-wk-md py-wk-md text-[14px] leading-[20px] font-medium text-wk-on-primary shadow-sm transition-all hover:bg-wk-primary-container disabled:opacity-70"
            >
              {isLoading ? (
                <Loader2 className="size-[18px] animate-spin" />
              ) : (
                <UserPlus className="size-[18px]" />
              )}
              {isLoading ? 'Mendaftarkan...' : 'Daftar & Buat Warung'}
            </button>
          </form>

          {/* Footer */}
          <div className="border-t border-wk-surface-container pt-wk-md text-center text-[14px] leading-[20px] text-wk-on-surface-variant">
            Sudah punya akun?{' '}
            <Link
              to="/login"
              className="font-medium text-wk-primary hover:underline"
            >
              Masuk di sini
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
