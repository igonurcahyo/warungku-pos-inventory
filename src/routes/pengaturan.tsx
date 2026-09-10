import { useState, useTransition, useEffect } from 'react'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { DashboardLayout } from '../components/layout/DashboardLayout'
import {
  Settings,
  Store,
  User,
  Phone,
  Mail,
  CheckCircle2,
  AlertCircle,
  Save,
  RotateCcw,
  Loader2,
  ShieldCheck,
  Building2,
  SlidersHorizontal,
  Calendar,
  Clock,
  BadgeCheck,
} from 'lucide-react'
import { getSessionFn, getCurrentUserFn } from '@/lib/auth'
import { getStoreSettingsFn, updateStoreSettingsFn } from '@/server/settings'

export const Route = createFileRoute('/pengaturan')({
  beforeLoad: async () => {
    const session = await getSessionFn()
    if (!session) {
      throw redirect({ to: '/login' })
    }
  },
  loader: async () => {
    const user = await getCurrentUserFn()
    if (!user) {
      throw redirect({ to: '/login' })
    }
    const settings = await getStoreSettingsFn()
    return { user, settings }
  },
  head: () => ({
    meta: [
      {
        title: 'Pengaturan Toko — WarungKu POS & Inventory',
      },
      {
        name: 'description',
        content: 'Kelola informasi dan preferensi toko Anda.',
      },
    ],
  }),
  component: PengaturanPage,
})

function PengaturanPage() {
  const { user, settings } = Route.useLoaderData()
  const router = useRouter()

  // Form states
  const [storeName, setStoreName] = useState(settings.store.name)
  const [ownerName, setOwnerName] = useState(settings.user.name)
  const [whatsapp, setWhatsapp] = useState(settings.user.whatsapp)
  const [email, setEmail] = useState(settings.user.email)

  // Feedback states
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error'
    message: string
    detail?: string
  } | null>(null)

  // Validation field errors
  const [errors, setErrors] = useState<{
    storeName?: string
    ownerName?: string
    whatsapp?: string
    email?: string
  }>({})

  // Keep form in sync if loader data changes
  useEffect(() => {
    setStoreName(settings.store.name)
    setOwnerName(settings.user.name)
    setWhatsapp(settings.user.whatsapp)
    setEmail(settings.user.email)
  }, [settings])

  // Auto-dismiss success feedback after 5 seconds
  useEffect(() => {
    if (feedback?.type === 'success') {
      const timer = setTimeout(() => setFeedback(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [feedback])

  // Detect unsaved changes
  const hasChanges =
    storeName.trim() !== settings.store.name ||
    ownerName.trim() !== settings.user.name ||
    whatsapp.trim() !== settings.user.whatsapp ||
    email.trim().toLowerCase() !== settings.user.email.toLowerCase()

  function validate(): boolean {
    const newErrors: typeof errors = {}

    if (!storeName.trim()) {
      newErrors.storeName = 'Nama warung wajib diisi.'
    } else if (storeName.trim().length > 150) {
      newErrors.storeName = 'Nama warung maksimal 150 karakter.'
    }

    if (!ownerName.trim()) {
      newErrors.ownerName = 'Nama pemilik wajib diisi.'
    } else if (ownerName.trim().length > 100) {
      newErrors.ownerName = 'Nama pemilik maksimal 100 karakter.'
    }

    const cleanWhatsapp = whatsapp.trim()
    if (!cleanWhatsapp) {
      newErrors.whatsapp = 'Nomor WhatsApp wajib diisi.'
    } else if (!/^[0-9+()\- ]{6,20}$/.test(cleanWhatsapp)) {
      newErrors.whatsapp = 'Nomor WhatsApp hanya boleh angka dan simbol telepon (+, -).'
    }

    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail) {
      newErrors.email = 'Email pemilik wajib diisi.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      newErrors.email = 'Format email tidak valid (contoh: nama@domain.com).'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function handleReset() {
    setStoreName(settings.store.name)
    setOwnerName(settings.user.name)
    setWhatsapp(settings.user.whatsapp)
    setEmail(settings.user.email)
    setErrors({})
    setFeedback(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!validate()) {
      setFeedback({
        type: 'error',
        message: 'Pengaturan toko gagal disimpan. Silakan coba lagi.',
        detail: 'Mohon periksa kembali kolom formulir yang belum sesuai format.',
      })
      return
    }

    setFeedback(null)

    startTransition(async () => {
      try {
        await updateStoreSettingsFn({
          data: {
            storeName: storeName.trim(),
            ownerName: ownerName.trim(),
            whatsapp: whatsapp.trim(),
            email: email.trim().toLowerCase(),
          },
        })

        setFeedback({
          type: 'success',
          message: 'Pengaturan toko berhasil disimpan.',
        })
        setErrors({})
        // Invalidate router cache to update store name in layout/header
        await router.invalidate()
      } catch (err: any) {
        setFeedback({
          type: 'error',
          message: 'Pengaturan toko gagal disimpan. Silakan coba lagi.',
          detail: err?.message || 'Terjadi kesalahan sistem saat memperbarui data.',
        })
      }
    })
  }

  return (
    <DashboardLayout user={user}>
      <div className="space-y-4 sm:space-y-wk-lg">
        {/* PAGE HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-wk-md border-b border-wk-surface-container pb-3 sm:pb-wk-md">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-wk-primary mb-1 uppercase tracking-wider">
              <Settings size={14} className="text-wk-primary" />
              <span>Pengaturan & Preferensi</span>
            </div>
            <h1 className="font-wk-heading text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-wk-on-surface">
              Pengaturan Toko
            </h1>
            <p className="text-xs sm:text-sm text-wk-on-surface-variant mt-0.5">
              Kelola informasi dan preferensi toko Anda.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto bg-wk-surface-container-low px-3 py-1.5 rounded-xl border border-wk-surface-container text-xs font-medium text-wk-on-surface-variant">
            <BadgeCheck size={16} className="text-wk-primary shrink-0" />
            <span>
              Status Toko:{' '}
              <strong className="text-wk-on-surface font-semibold">Aktif (Verified)</strong>
            </span>
          </div>
        </div>

        {/* FEEDBACK ALERTS */}
        {feedback?.type === 'success' && (
          <div className="p-3.5 sm:p-wk-md rounded-2xl bg-wk-primary-container/10 border border-wk-primary/20 text-wk-primary flex items-start gap-2.5 text-xs sm:text-sm shadow-xs transition-all">
            <CheckCircle2 size={18} className="shrink-0 text-wk-primary mt-0.5" />
            <div>
              <p className="font-semibold">{feedback.message}</p>
              <p className="text-[11px] sm:text-xs text-wk-on-surface-variant mt-0.5">
                Data toko dan akun pemilik berhasil diperbarui di database PostgreSQL.
              </p>
            </div>
          </div>
        )}

        {feedback?.type === 'error' && (
          <div className="p-3.5 sm:p-wk-md rounded-2xl bg-wk-error-container text-wk-error border border-wk-error/20 flex items-start gap-2.5 text-xs sm:text-sm shadow-xs transition-all">
            <AlertCircle size={18} className="shrink-0 text-wk-error mt-0.5" />
            <div>
              <p className="font-semibold">{feedback.message}</p>
              {feedback.detail && (
                <p className="text-[11px] sm:text-xs text-wk-error/90 mt-0.5">{feedback.detail}</p>
              )}
            </div>
          </div>
        )}

        {/* MAIN FORM */}
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-wk-lg">
          {/* SECTION 1: INFORMASI TOKO */}
          <div className="bg-wk-surface-container-lowest border border-wk-surface-container rounded-2xl p-4 sm:p-6 lg:p-wk-xl shadow-xs">
            <div className="flex items-center gap-2.5 mb-3 sm:mb-wk-md pb-2.5 sm:pb-wk-sm border-b border-wk-surface-container">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-wk-primary/10 text-wk-primary flex items-center justify-center shrink-0">
                <Store size={20} />
              </div>
              <div>
                <h2 className="font-wk-heading text-base sm:text-lg font-bold text-wk-on-surface">
                  Informasi Toko
                </h2>
                <p className="text-[11px] sm:text-xs text-wk-on-surface-variant">
                  Identitas resmi warung yang digunakan pada struk dan laporan transaksi.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-wk-lg">
              {/* Nama Warung */}
              <div className="md:col-span-2">
                <label
                  htmlFor="storeName"
                  className="block text-xs font-semibold text-wk-on-surface mb-1.5"
                >
                  Nama Warung <span className="text-wk-error">*</span>
                </label>
                <div className="relative">
                  <input
                    id="storeName"
                    type="text"
                    value={storeName}
                    onChange={(e) => {
                      setStoreName(e.target.value)
                      if (errors.storeName) setErrors((prev) => ({ ...prev, storeName: undefined }))
                    }}
                    placeholder="Contoh: Warung Berkah Jaya"
                    maxLength={150}
                    className={`w-full px-3.5 py-2.5 rounded-xl border bg-wk-surface text-wk-on-surface text-sm focus:outline-none focus:ring-2 transition-all ${
                      errors.storeName
                        ? 'border-wk-error focus:ring-wk-error/30'
                        : 'border-wk-outline-variant focus:border-wk-primary focus:ring-wk-primary/20'
                    }`}
                  />
                </div>
                {errors.storeName ? (
                  <p className="text-xs text-wk-error mt-1">{errors.storeName}</p>
                ) : (
                  <p className="text-[11px] text-wk-on-surface-variant mt-1">
                    Nama warung akan dicantumkan di kepala struk dan bagian atas dashboard.
                  </p>
                )}
              </div>

              {/* Metadata Toko (Read-Only) */}
              <div className="p-3 sm:p-wk-md bg-wk-surface-container-low rounded-xl border border-wk-surface-container">
                <div className="flex items-center gap-2 text-xs text-wk-on-surface-variant font-medium mb-1">
                  <Building2 size={15} className="text-wk-primary" />
                  <span>ID Toko</span>
                </div>
                <div className="font-mono text-xs sm:text-sm font-semibold text-wk-on-surface">
                  #STR-{String(settings.store.id).padStart(4, '0')}
                </div>
                <div className="text-[10px] sm:text-[11px] text-wk-on-surface-variant mt-0.5">
                  Kode unik terdaftar di sistem WarungKu.
                </div>
              </div>

              <div className="p-3 sm:p-wk-md bg-wk-surface-container-low rounded-xl border border-wk-surface-container">
                <div className="flex items-center gap-2 text-xs text-wk-on-surface-variant font-medium mb-1">
                  <Calendar size={15} className="text-wk-primary" />
                  <span>Terdaftar Sejak</span>
                </div>
                <div className="text-xs sm:text-sm font-semibold text-wk-on-surface">
                  {new Date(settings.store.createdAt).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </div>
                <div className="text-[10px] sm:text-[11px] text-wk-on-surface-variant mt-0.5">
                  Tanggal registrasi pertama kali warung ini dibuat.
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: AKUN PEMILIK */}
          <div className="bg-wk-surface-container-lowest border border-wk-surface-container rounded-2xl p-4 sm:p-6 lg:p-wk-xl shadow-xs">
            <div className="flex items-center gap-2.5 mb-3 sm:mb-wk-md pb-2.5 sm:pb-wk-sm border-b border-wk-surface-container">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-wk-secondary/10 text-wk-secondary flex items-center justify-center shrink-0">
                <User size={20} />
              </div>
              <div>
                <h2 className="font-wk-heading text-base sm:text-lg font-bold text-wk-on-surface">
                  Akun Pemilik
                </h2>
                <p className="text-[11px] sm:text-xs text-wk-on-surface-variant">
                  Kontak dan data identitas pemilik akun yang sedang aktif.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-wk-lg">
              {/* Nama Pemilik */}
              <div className="md:col-span-2">
                <label
                  htmlFor="ownerName"
                  className="block text-xs font-semibold text-wk-on-surface mb-1.5"
                >
                  Nama Pemilik <span className="text-wk-error">*</span>
                </label>
                <div className="relative">
                  <input
                    id="ownerName"
                    type="text"
                    value={ownerName}
                    onChange={(e) => {
                      setOwnerName(e.target.value)
                      if (errors.ownerName) setErrors((prev) => ({ ...prev, ownerName: undefined }))
                    }}
                    placeholder="Contoh: Budi Santoso"
                    maxLength={100}
                    className={`w-full px-3.5 py-2.5 rounded-xl border bg-wk-surface text-wk-on-surface text-sm focus:outline-none focus:ring-2 transition-all ${
                      errors.ownerName
                        ? 'border-wk-error focus:ring-wk-error/30'
                        : 'border-wk-outline-variant focus:border-wk-primary focus:ring-wk-primary/20'
                    }`}
                  />
                </div>
                {errors.ownerName && (
                  <p className="text-xs text-wk-error mt-1">{errors.ownerName}</p>
                )}
              </div>

              {/* Nomor WhatsApp / Telepon */}
              <div>
                <label
                  htmlFor="whatsapp"
                  className="block text-xs font-semibold text-wk-on-surface mb-1.5"
                >
                  Nomor WhatsApp / Telepon <span className="text-wk-error">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-wk-on-surface-variant">
                    <Phone size={16} />
                  </div>
                  <input
                    id="whatsapp"
                    type="tel"
                    value={whatsapp}
                    onChange={(e) => {
                      setWhatsapp(e.target.value)
                      if (errors.whatsapp) setErrors((prev) => ({ ...prev, whatsapp: undefined }))
                    }}
                    placeholder="Contoh: 081234567890"
                    maxLength={20}
                    className={`w-full pl-9 pr-3.5 py-2.5 rounded-xl border bg-wk-surface text-wk-on-surface text-sm focus:outline-none focus:ring-2 transition-all ${
                      errors.whatsapp
                        ? 'border-wk-error focus:ring-wk-error/30'
                        : 'border-wk-outline-variant focus:border-wk-primary focus:ring-wk-primary/20'
                    }`}
                  />
                </div>
                {errors.whatsapp ? (
                  <p className="text-xs text-wk-error mt-1">{errors.whatsapp}</p>
                ) : (
                  <p className="text-[11px] text-wk-on-surface-variant mt-1">
                    Digunakan untuk konfirmasi dan kontak operasional warung.
                  </p>
                )}
              </div>

              {/* Email Pemilik */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold text-wk-on-surface mb-1.5"
                >
                  Email Pemilik <span className="text-wk-error">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-wk-on-surface-variant">
                    <Mail size={16} />
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }))
                    }}
                    placeholder="nama@email.com"
                    maxLength={255}
                    className={`w-full pl-9 pr-3.5 py-2.5 rounded-xl border bg-wk-surface text-wk-on-surface text-sm focus:outline-none focus:ring-2 transition-all ${
                      errors.email
                        ? 'border-wk-error focus:ring-wk-error/30'
                        : 'border-wk-outline-variant focus:border-wk-primary focus:ring-wk-primary/20'
                    }`}
                  />
                </div>
                {errors.email ? (
                  <p className="text-xs text-wk-error mt-1">{errors.email}</p>
                ) : (
                  <p className="text-[11px] text-wk-on-surface-variant mt-1">
                    Email utama untuk login akun WarungKu.
                  </p>
                )}
              </div>

              {/* Security Note */}
              <div className="md:col-span-2 p-3 sm:p-wk-md bg-wk-surface-container-low rounded-xl border border-wk-surface-container flex items-start gap-2.5 text-xs text-wk-on-surface-variant">
                <ShieldCheck size={18} className="text-wk-primary shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-wk-on-surface">Proteksi Akun: </span>
                  Kata sandi Anda tersimpan dalam enkripsi aman berstandar industri (Argon2) dan
                  tidak ditampilkan di layar.
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: PREFERENSI TOKO */}
          <div className="bg-wk-surface-container-lowest border border-wk-surface-container rounded-2xl p-4 sm:p-6 lg:p-wk-xl shadow-xs">
            <div className="flex items-center gap-2.5 mb-3 sm:mb-wk-md pb-2.5 sm:pb-wk-sm border-b border-wk-surface-container">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-wk-primary/10 text-wk-primary flex items-center justify-center shrink-0">
                <SlidersHorizontal size={20} />
              </div>
              <div>
                <h2 className="font-wk-heading text-base sm:text-lg font-bold text-wk-on-surface">
                  Preferensi Toko
                </h2>
                <p className="text-[11px] sm:text-xs text-wk-on-surface-variant">
                  Konfigurasi regional dan operasional dasar sistem POS WarungKu.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-wk-md">
              <div className="p-3 sm:p-wk-md bg-wk-surface-container-low rounded-xl border border-wk-surface-container">
                <div className="text-xs text-wk-on-surface-variant font-medium mb-1">Mata Uang</div>
                <div className="text-xs sm:text-sm font-semibold text-wk-on-surface flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded bg-wk-primary/10 text-wk-primary text-xs font-mono font-bold">
                    IDR
                  </span>
                  Rupiah Indonesia (Rp)
                </div>
                <div className="text-[10px] sm:text-[11px] text-wk-on-surface-variant mt-1">
                  Format angka otomatis menggunakan standar Indonesia.
                </div>
              </div>

              <div className="p-3 sm:p-wk-md bg-wk-surface-container-low rounded-xl border border-wk-surface-container">
                <div className="text-xs text-wk-on-surface-variant font-medium mb-1">Zona Waktu</div>
                <div className="text-xs sm:text-sm font-semibold text-wk-on-surface flex items-center gap-1.5">
                  <Clock size={16} className="text-wk-primary" />
                  WIB (UTC+07:00)
                </div>
                <div className="text-[10px] sm:text-[11px] text-wk-on-surface-variant mt-1">
                  Waktu pencatatan transaksi kasir & laporan penjualan.
                </div>
              </div>

              <div className="p-3 sm:p-wk-md bg-wk-surface-container-low rounded-xl border border-wk-surface-container sm:col-span-2 lg:col-span-1">
                <div className="text-xs text-wk-on-surface-variant font-medium mb-1">
                  Mode Kasir & Inventaris
                </div>
                <div className="text-xs sm:text-sm font-semibold text-wk-on-surface flex items-center gap-1.5">
                  <Store size={16} className="text-wk-secondary" />
                  Toko Retail Mandiri
                </div>
                <div className="text-[10px] sm:text-[11px] text-wk-on-surface-variant mt-1">
                  Pengurangan stok real-time saat transaksi selesai.
                </div>
              </div>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 sm:gap-wk-sm pt-2">
            {hasChanges && (
              <button
                type="button"
                onClick={handleReset}
                disabled={isPending}
                className="w-full sm:w-auto px-4 sm:px-wk-lg py-2.5 rounded-xl border border-wk-outline-variant hover:bg-wk-surface-container-high text-wk-on-surface-variant text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <RotateCcw size={15} />
                <span>Batal / Atur Ulang</span>
              </button>
            )}

            <button
              type="submit"
              disabled={isPending || !hasChanges}
              className="w-full sm:w-auto px-5 sm:px-wk-xl py-2.5 rounded-xl bg-wk-primary hover:bg-wk-primary-container text-wk-on-primary text-xs sm:text-sm font-medium transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Menyimpan Perubahan...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Simpan Perubahan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}
