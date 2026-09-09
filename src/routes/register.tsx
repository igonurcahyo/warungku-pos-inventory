import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { UserPlus, Eye, EyeOff } from 'lucide-react'
import { WarungkuLogo } from '@/components/warungku-logo'

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
  const [namaLengkap, setNamaLengkap] = useState('')
  const [namaWarung, setNamaWarung] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // UI-only — no backend registration
  }

  return (
    <main className="relative min-h-screen bg-wk-surface p-wk-xl font-wk-body text-wk-on-surface">
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-wk-md">
        <div className="w-full max-w-xl space-y-wk-xl rounded-wk-xl bg-wk-surface-container-lowest p-wk-xxl shadow-sm">
          {/* Header: Logo + Title + Subtitle */}
          <div className="space-y-wk-md text-center">
            <div className="mb-wk-md flex justify-center">
              <WarungkuLogo />
            </div>
            <h1 className="font-wk-heading text-[32px] leading-[40px] font-bold tracking-[-0.02em] text-wk-on-surface">
              Pendaftaran Warung Baru
            </h1>
            <p className="text-[16px] leading-[24px] text-wk-on-surface-variant">
              Daftarkan warung kelontong Anda dan nikmati kemudahan manajemen
              stok serta kasir digital.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-wk-md">
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
                type="text"
                required
                placeholder="Budi Santoso"
                value={namaLengkap}
                onChange={(e) => setNamaLengkap(e.target.value)}
                className="w-full rounded-wk-lg bg-wk-surface-container-low px-wk-md py-wk-sm text-wk-on-surface transition-all placeholder:text-wk-outline focus:ring-2 focus:ring-wk-primary focus:outline-none"
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
                type="text"
                required
                placeholder="Warung Berkah Jaya"
                value={namaWarung}
                onChange={(e) => setNamaWarung(e.target.value)}
                className="w-full rounded-wk-lg bg-wk-surface-container-low px-wk-md py-wk-sm text-wk-on-surface transition-all placeholder:text-wk-outline focus:ring-2 focus:ring-wk-primary focus:outline-none"
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
                  type="text"
                  required
                  placeholder="+62 812-3456-7890"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full rounded-wk-lg bg-wk-surface-container-low px-wk-md py-wk-sm text-wk-on-surface transition-all placeholder:text-wk-outline focus:ring-2 focus:ring-wk-primary focus:outline-none"
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
                  type="email"
                  required
                  placeholder="budi.santoso@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-wk-lg bg-wk-surface-container-low px-wk-md py-wk-sm text-wk-on-surface transition-all placeholder:text-wk-outline focus:ring-2 focus:ring-wk-primary focus:outline-none"
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
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-wk-lg bg-wk-surface-container-low px-wk-md py-wk-sm pr-10 text-wk-on-surface transition-all placeholder:text-wk-outline focus:ring-2 focus:ring-wk-primary focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-wk-on-surface-variant hover:text-wk-on-surface"
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
              className="mt-wk-lg flex w-full items-center justify-center gap-wk-xs rounded-wk-lg bg-wk-primary px-wk-md py-wk-md text-[14px] leading-[20px] font-medium text-wk-on-primary shadow-sm transition-all hover:bg-wk-primary-container"
            >
              <UserPlus className="size-[18px]" />
              Daftar & Buat Warung
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
