import { useState } from 'react'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { DashboardLayout } from '../components/layout/DashboardLayout'
import {
  Package,
  AlertTriangle,
  PackageX,
  WalletCards,
  Search,
  Plus,
  Minus,
  ArrowDownLeft,
  ArrowUpRight,
  History,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Calendar,
} from 'lucide-react'
import { getSessionFn, getCurrentUserFn } from '@/lib/auth'
import { getCategoriesFn } from '@/server/products'
import {
  getStockProductsFn,
  addStockFn,
  removeStockFn,
  getStockHistoryFn,
} from '@/server/stock'
import { STOCK_THRESHOLDS, getStockStatusInfo } from '@/lib/stock-config'
import type { StockStatusCode } from '@/lib/stock-config'

export const Route = createFileRoute('/stock')({
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
    const [productsList, categoriesList, historyList] = await Promise.all([
      getStockProductsFn(),
      getCategoriesFn(),
      getStockHistoryFn({ data: { limit: 20 } }),
    ])
    return {
      user,
      products: productsList,
      categories: categoriesList,
      history: historyList,
    }
  },
  head: () => ({
    meta: [
      {
        title: 'Manajemen Stok — WarungKu POS & Inventory',
      },
      {
        name: 'description',
        content:
          'Pantau ketersediaan stok, peringatan stok menipis, dan riwayat pergerakan stok barang secara real-time.',
      },
    ],
  }),
  component: StockManagementPage,
})

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(dateInput: string | Date): string {
  const date = new Date(dateInput)
  const time = date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })
  const day = date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  return `${time} - ${day}`
}

function StockManagementPage() {
  const { user, products, categories, history } = Route.useLoaderData()
  const router = useRouter()

  // Filter States
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<StockStatusCode | 'all'>('all')

  // Modal States
  const [isAddStockOpen, setIsAddStockOpen] = useState(false)
  const [isRemoveStockOpen, setIsRemoveStockOpen] = useState(false)
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [historyFilterProduct, setHistoryFilterProduct] = useState<number | 'all'>('all')

  // Active product for single-item action
  const [activeProductId, setActiveProductId] = useState<number | null>(null)
  const [stockQuantity, setStockQuantity] = useState<string>('')
  const [stockNote, setStockNote] = useState<string>('')

  // Loading & Feedback States
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  function showFeedback(type: 'success' | 'error', message: string) {
    setFeedback({ type, message })
    setTimeout(() => {
      setFeedback((prev) => (prev?.message === message ? null : prev))
    }, 4000)
  }

  // Derived Metrics
  const totalSku = products.length
  const lowStockItems = products.filter(
    (p) => p.stock > 0 && p.stock <= STOCK_THRESHOLDS.LOW_STOCK,
  )
  const outOfStockItems = products.filter((p) => p.stock <= 0)
  const totalInventoryValue = products.reduce(
    (acc, p) => acc + p.price * p.stock,
    0,
  )

  // Filtered Products List
  const filteredProducts = products.filter((p) => {
    // Search
    const term = searchTerm.trim().toLowerCase()
    const matchesSearch =
      !term ||
      p.name.toLowerCase().includes(term) ||
      `PRD-${String(p.id).padStart(3, '0')}`.toLowerCase().includes(term) ||
      (p.categoryName && p.categoryName.toLowerCase().includes(term))

    // Category
    const matchesCategory =
      selectedCategory === 'all' ||
      p.categoryId === Number(selectedCategory)

    // Status
    const statusInfo = getStockStatusInfo(p.stock)
    const matchesStatus =
      selectedStatus === 'all' || statusInfo.code === selectedStatus

    return matchesSearch && matchesCategory && matchesStatus
  })

  // Open Modals
  function openAddModal(productId?: number) {
    setActiveProductId(productId || (products.length > 0 ? products[0].id : null))
    setStockQuantity('')
    setStockNote('')
    setFormError('')
    setIsAddStockOpen(true)
  }

  function openRemoveModal(productId?: number) {
    setActiveProductId(productId || (products.length > 0 ? products[0].id : null))
    setStockQuantity('')
    setStockNote('')
    setFormError('')
    setIsRemoveStockOpen(true)
  }

  function openHistoryModal(productId?: number) {
    setHistoryFilterProduct(productId || 'all')
    setIsHistoryModalOpen(true)
  }

  // Handle Add Stock (Stok Masuk)
  async function handleAddStockSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')

    if (!activeProductId) {
      setFormError('Pilih produk terlebih dahulu.')
      return
    }

    const qty = Number(stockQuantity)
    if (isNaN(qty) || qty <= 0) {
      setFormError('Jumlah stok harus berupa angka lebih dari 0.')
      return
    }

    setIsSubmitting(true)
    try {
      await addStockFn({
        data: {
          productId: activeProductId,
          quantity: qty,
          note: stockNote.trim() || 'Restok barang',
        },
      })

      showFeedback('success', `Berhasil menambahkan ${qty} stok ke produk.`)
      setIsAddStockOpen(false)
      await router.invalidate()
    } catch (err: any) {
      setFormError(err?.message || 'Terjadi kesalahan saat menambah stok.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Remove Stock (Stok Keluar)
  async function handleRemoveStockSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')

    if (!activeProductId) {
      setFormError('Pilih produk terlebih dahulu.')
      return
    }

    const targetProduct = products.find((p) => p.id === activeProductId)
    if (!targetProduct) {
      setFormError('Produk tidak ditemukan.')
      return
    }

    const qty = Number(stockQuantity)
    if (isNaN(qty) || qty <= 0) {
      setFormError('Jumlah stok harus berupa angka lebih dari 0.')
      return
    }

    if (qty > targetProduct.stock) {
      setFormError(
        `Stok tidak mencukupi. Stok saat ini hanya ${targetProduct.stock} ${targetProduct.unit}.`,
      )
      return
    }

    setIsSubmitting(true)
    try {
      await removeStockFn({
        data: {
          productId: activeProductId,
          quantity: qty,
          note: stockNote.trim() || 'Pengurangan stok manual',
        },
      })

      showFeedback('success', `Berhasil mengurangi ${qty} stok dari produk.`)
      setIsRemoveStockOpen(false)
      await router.invalidate()
    } catch (err: any) {
      setFormError(err?.message || 'Terjadi kesalahan saat mengurangi stok.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Modal target product lookup
  const selectedAddProduct = products.find((p) => p.id === activeProductId)
  const selectedRemoveProduct = products.find((p) => p.id === activeProductId)

  // Filtered History for Modal
  const modalHistoryItems = history.filter((item) => {
    if (historyFilterProduct === 'all') return true
    return item.productId === historyFilterProduct
  })

  return (
    <DashboardLayout user={user}>
      {/* Toast Feedback Notification */}
      {feedback && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border transition-all animate-in fade-in slide-in-from-bottom-5 ${
            feedback.type === 'success'
              ? 'bg-wk-primary text-white border-wk-primary-container'
              : 'bg-wk-error text-white border-red-700'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 size={20} className="shrink-0" />
          ) : (
            <AlertCircle size={20} className="shrink-0" />
          )}
          <span className="text-sm font-medium">{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            className="ml-2 hover:opacity-75"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold font-wk-heading text-wk-on-surface tracking-tight">
            Manajemen Stok
          </h1>
          <p className="text-sm text-wk-on-surface-variant mt-1">
            Pantau ketersediaan barang, log perubahan stok, dan cegah produk habis.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => openRemoveModal()}
            className="px-4 py-2.5 rounded-xl border border-wk-outline-variant bg-wk-surface-container-low hover:bg-wk-surface-container text-wk-on-surface font-medium text-sm flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Minus size={18} className="text-wk-error" />
            Kurangi Stok
          </button>
          <button
            onClick={() => openAddModal()}
            className="px-5 py-2.5 rounded-xl bg-wk-primary hover:bg-wk-primary-container text-white font-medium text-sm flex items-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <Plus size={18} />
            Tambah Stok
          </button>
        </div>
      </div>

      {/* Top Stats Grid (Stitch UI 4 Columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        {/* Total SKU */}
        <div className="bg-wk-surface-container-low rounded-xl p-5 sm:p-6 flex flex-col justify-between shadow-xs border border-wk-outline-variant/30">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-wk-on-surface-variant">
              Total SKU Produk
            </span>
            <div className="w-10 h-10 rounded-xl bg-wk-primary-fixed/30 text-wk-primary flex items-center justify-center">
              <Package size={20} />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-wk-on-surface font-wk-heading">
              {totalSku}
            </div>
            <div className="text-xs text-wk-on-surface-variant font-medium mt-1 flex items-center gap-1">
              <span>{categories.length} kategori terdaftar</span>
            </div>
          </div>
        </div>

        {/* Stok Menipis */}
        <div className="bg-wk-surface-container-low rounded-xl p-5 sm:p-6 flex flex-col justify-between shadow-xs border border-wk-outline-variant/30">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-wk-on-surface-variant">
              Stok Menipis
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <AlertTriangle size={20} />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-amber-700 font-wk-heading">
              {lowStockItems.length} SKU
            </div>
            <div className="text-xs text-amber-600 font-medium mt-1">
              ≤ {STOCK_THRESHOLDS.LOW_STOCK} unit (perlu restock)
            </div>
          </div>
        </div>

        {/* Stok Habis */}
        <div className="bg-wk-surface-container-low rounded-xl p-5 sm:p-6 flex flex-col justify-between shadow-xs border border-wk-outline-variant/30">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-wk-on-surface-variant">
              Stok Habis
            </span>
            <div className="w-10 h-10 rounded-xl bg-wk-error-container text-wk-error flex items-center justify-center">
              <PackageX size={20} />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-wk-error font-wk-heading">
              {outOfStockItems.length} SKU
            </div>
            <div className="text-xs text-wk-on-surface-variant font-medium mt-1">
              Barang kosong segera beli
            </div>
          </div>
        </div>

        {/* Nilai Total Inventaris */}
        <div className="bg-wk-surface-container-low rounded-xl p-5 sm:p-6 flex flex-col justify-between shadow-xs border border-wk-outline-variant/30">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-wk-on-surface-variant">
              Nilai Inventaris
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <WalletCards size={20} />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold text-wk-on-surface font-wk-heading truncate">
              {formatRupiah(totalInventoryValue)}
            </div>
            <div className="text-xs text-wk-on-surface-variant font-medium mt-1">
              Total aset barang berjalan
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar & Filter Controls */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-6 bg-wk-surface-container-low p-4 rounded-xl border border-wk-outline-variant/30">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-wk-on-surface-variant"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari nama barang, SKU, atau kategori..."
              className="w-full bg-wk-surface-container-lowest pl-10 pr-4 py-2 rounded-xl text-sm text-wk-on-surface placeholder:text-wk-on-surface-variant border border-wk-outline-variant/50 focus:outline-none focus:ring-2 focus:ring-wk-primary"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-wk-surface-container-lowest px-3 py-2 rounded-xl text-sm text-wk-on-surface border border-wk-outline-variant/50 focus:outline-none focus:ring-2 focus:ring-wk-primary cursor-pointer"
          >
            <option value="all">Semua Kategori</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setSelectedStatus('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              selectedStatus === 'all'
                ? 'bg-wk-primary text-white'
                : 'bg-wk-surface-container-lowest text-wk-on-surface-variant hover:bg-wk-surface-container hover:text-wk-on-surface'
            }`}
          >
            Semua ({products.length})
          </button>
          <button
            onClick={() => setSelectedStatus('aman')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              selectedStatus === 'aman'
                ? 'bg-emerald-700 text-white'
                : 'bg-wk-surface-container-lowest text-emerald-800 hover:bg-emerald-50'
            }`}
          >
            Stok Aman
          </button>
          <button
            onClick={() => setSelectedStatus('menipis')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              selectedStatus === 'menipis'
                ? 'bg-amber-600 text-white'
                : 'bg-wk-surface-container-lowest text-amber-800 hover:bg-amber-50'
            }`}
          >
            Stok Menipis ({lowStockItems.length})
          </button>
          <button
            onClick={() => setSelectedStatus('habis')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              selectedStatus === 'habis'
                ? 'bg-red-700 text-white'
                : 'bg-wk-surface-container-lowest text-red-800 hover:bg-red-50'
            }`}
          >
            Stok Habis ({outOfStockItems.length})
          </button>
        </div>
      </div>

      {/* Peringatan Stok Menipis Banner/Table (if any low/out of stock items) */}
      {(lowStockItems.length > 0 || outOfStockItems.length > 0) && (
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-5 mb-8">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
              <h2 className="text-base font-bold text-amber-900 font-wk-heading">
                Peringatan Stok Kritis & Menipis ({lowStockItems.length + outOfStockItems.length} Produk)
              </h2>
            </div>
            <span className="text-xs text-amber-800">
              Item di bawah atau sama dengan ambang batas (≤ {STOCK_THRESHOLDS.LOW_STOCK} unit)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-xs font-semibold text-amber-900/70 border-b border-amber-200/70">
                  <th className="pb-2.5">Produk</th>
                  <th className="pb-2.5">Kategori</th>
                  <th className="pb-2.5">Stok Saat Ini</th>
                  <th className="pb-2.5">Batas Minimum</th>
                  <th className="pb-2.5">Status</th>
                  <th className="pb-2.5 text-right">Aksi Cepat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-200/50 text-sm">
                {[...outOfStockItems, ...lowStockItems].slice(0, 5).map((item) => {
                  const status = getStockStatusInfo(item.stock)
                  return (
                    <tr key={item.id} className="hover:bg-amber-100/40 transition-colors">
                      <td className="py-2.5">
                        <div className="font-semibold text-amber-950">
                          {item.name}
                        </div>
                        <div className="text-xs text-amber-800">
                          PRD-{String(item.id).padStart(3, '0')}
                        </div>
                      </td>
                      <td className="py-2.5 text-amber-900">
                        {item.categoryName || 'Tanpa Kategori'}
                      </td>
                      <td className="py-2.5 font-bold">
                        <span
                          className={
                            item.stock <= 0 ? 'text-red-700' : 'text-amber-800'
                          }
                        >
                          {item.stock} {item.unit}
                        </span>
                      </td>
                      <td className="py-2.5 text-amber-800">
                        {STOCK_THRESHOLDS.LOW_STOCK} {item.unit}
                      </td>
                      <td className="py-2.5">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            status.code === 'habis'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="py-2.5 text-right">
                        <button
                          onClick={() => openAddModal(item.id)}
                          className="px-3 py-1 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
                        >
                          Restok Cepat
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Main Grid: Daftar Stok Produk & Riwayat Pergerakan */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (col-span-2): Tabel Stok Produk */}
        <div className="lg:col-span-2 bg-wk-surface-container-low rounded-xl p-5 sm:p-6 border border-wk-outline-variant/30 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div>
                <h2 className="text-lg font-bold font-wk-heading text-wk-on-surface">
                  Daftar Stok Produk
                </h2>
                <span className="text-xs text-wk-on-surface-variant">
                  Menampilkan {filteredProducts.length} dari {products.length} produk
                </span>
              </div>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="py-12 text-center text-wk-on-surface-variant">
                <Package size={40} className="mx-auto mb-2 opacity-40" />
                <p className="font-medium text-sm">Tidak ada produk yang cocok</p>
                <p className="text-xs mt-1">Coba sesuaikan pencarian atau filter status.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-xs font-semibold text-wk-on-surface-variant border-b border-wk-outline-variant/30">
                      <th className="pb-3 font-semibold">Produk</th>
                      <th className="pb-3 font-semibold">Kategori</th>
                      <th className="pb-3 font-semibold">Harga</th>
                      <th className="pb-3 font-semibold">Stok Saat Ini</th>
                      <th className="pb-3 font-semibold">Status</th>
                      <th className="pb-3 font-semibold text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-wk-outline-variant/20 text-sm">
                    {filteredProducts.map((p) => {
                      const status = getStockStatusInfo(p.stock)
                      return (
                        <tr
                          key={p.id}
                          className="hover:bg-wk-surface-container/50 transition-colors"
                        >
                          <td className="py-3.5">
                            <div className="font-semibold text-wk-on-surface">
                              {p.name}
                            </div>
                            <div className="text-xs text-wk-on-surface-variant">
                              PRD-{String(p.id).padStart(3, '0')}
                            </div>
                          </td>
                          <td className="py-3.5 text-wk-on-surface-variant text-xs">
                            <span className="px-2 py-0.5 rounded-md bg-wk-surface-container">
                              {p.categoryName || 'Umum'}
                            </span>
                          </td>
                          <td className="py-3.5 font-medium text-wk-on-surface">
                            {formatRupiah(p.price)}
                          </td>
                          <td className="py-3.5">
                            <span className="font-bold text-wk-on-surface">
                              {p.stock}
                            </span>{' '}
                            <span className="text-xs text-wk-on-surface-variant">
                              {p.unit}
                            </span>
                          </td>
                          <td className="py-3.5">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                status.code === 'aman'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : status.code === 'menipis'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {status.label}
                            </span>
                          </td>
                          <td className="py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => openAddModal(p.id)}
                                title="Tambah Stok"
                                className="p-1.5 rounded-lg bg-wk-primary-fixed/30 text-wk-primary hover:bg-wk-primary hover:text-white transition-colors cursor-pointer"
                              >
                                <Plus size={16} />
                              </button>
                              <button
                                onClick={() => openRemoveModal(p.id)}
                                title="Kurangi Stok"
                                className="p-1.5 rounded-lg bg-wk-surface-container text-wk-error hover:bg-wk-error hover:text-white transition-colors cursor-pointer"
                              >
                                <Minus size={16} />
                              </button>
                              <button
                                onClick={() => openHistoryModal(p.id)}
                                title="Lihat Riwayat"
                                className="p-1.5 rounded-lg bg-wk-surface-container text-wk-on-surface-variant hover:bg-wk-surface-container-high transition-colors cursor-pointer"
                              >
                                <History size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (col-span-1): Riwayat Pergerakan Log */}
        <div className="bg-wk-surface-container-low rounded-xl p-5 sm:p-6 border border-wk-outline-variant/30 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold font-wk-heading text-wk-on-surface">
                Riwayat Pergerakan
              </h2>
              <button
                onClick={() => openHistoryModal()}
                className="text-xs text-wk-primary font-semibold hover:underline cursor-pointer"
              >
                Lihat Semua
              </button>
            </div>

            {history.length === 0 ? (
              <div className="py-10 text-center text-wk-on-surface-variant">
                <History size={36} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm font-medium">Belum ada riwayat pergerakan</p>
                <p className="text-xs mt-1">
                  Catatan stok masuk atau keluar akan otomatis tampil di sini.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.slice(0, 7).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 p-3 rounded-xl bg-wk-surface-container-lowest hover:bg-wk-surface-container transition-colors border border-wk-outline-variant/20"
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        item.type === 'IN'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {item.type === 'IN' ? (
                        <ArrowDownLeft size={16} />
                      ) : (
                        <ArrowUpRight size={16} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-xs text-wk-on-surface">
                          {item.type === 'IN' ? 'Stok Masuk' : 'Stok Keluar'}
                        </span>
                        <span
                          className={`text-xs font-bold ${
                            item.type === 'IN'
                              ? 'text-emerald-700'
                              : 'text-red-700'
                          }`}
                        >
                          {item.type === 'IN' ? '+' : '-'}
                          {item.quantity} {item.productUnit}
                        </span>
                      </div>
                      <p className="text-xs text-wk-on-surface-variant truncate mt-0.5 font-medium">
                        {item.productName}
                      </p>
                      {item.note && (
                        <p className="text-xs text-wk-outline truncate">
                          "{item.note}"
                        </p>
                      )}
                      <div className="text-[11px] text-wk-outline mt-1 flex items-center gap-1">
                        <Calendar size={11} />
                        {formatDate(item.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-5 pt-3 border-t border-wk-outline-variant/30">
            <button
              onClick={() => openHistoryModal()}
              className="w-full py-2.5 bg-wk-surface-container hover:bg-wk-surface-container-high text-wk-on-surface rounded-xl font-medium text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <History size={14} />
              Buka Semua Riwayat Stok
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Tambah Stok (Stok Masuk) */}
      {isAddStockOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-wk-surface rounded-2xl max-w-md w-full p-6 shadow-2xl border border-wk-outline-variant/30 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <ArrowDownLeft size={18} />
                </div>
                <h3 className="text-lg font-bold text-wk-on-surface font-wk-heading">
                  Tambah Stok (Stok Masuk)
                </h3>
              </div>
              <button
                onClick={() => setIsAddStockOpen(false)}
                className="p-1 text-wk-on-surface-variant hover:text-wk-on-surface rounded-full hover:bg-wk-surface-container"
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 text-red-800 text-xs rounded-xl flex items-center gap-2 border border-red-200">
                <AlertCircle size={16} className="shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleAddStockSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-wk-on-surface-variant mb-1.5">
                  Pilih Produk
                </label>
                <select
                  value={activeProductId || ''}
                  onChange={(e) => setActiveProductId(Number(e.target.value))}
                  className="w-full bg-wk-surface-container-low px-3.5 py-2.5 rounded-xl text-sm text-wk-on-surface border border-wk-outline-variant/50 focus:outline-none focus:ring-2 focus:ring-wk-primary cursor-pointer"
                  required
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Stok: {p.stock} {p.unit})
                    </option>
                  ))}
                </select>
                {selectedAddProduct && (
                  <p className="text-xs text-wk-on-surface-variant mt-1">
                    Stok saat ini:{' '}
                    <span className="font-bold text-wk-on-surface">
                      {selectedAddProduct.stock} {selectedAddProduct.unit}
                    </span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-wk-on-surface-variant mb-1.5">
                  Jumlah Stok Masuk
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value)}
                  placeholder="Contoh: 10"
                  className="w-full bg-wk-surface-container-low px-3.5 py-2.5 rounded-xl text-sm text-wk-on-surface border border-wk-outline-variant/50 focus:outline-none focus:ring-2 focus:ring-wk-primary"
                  required
                  autoFocus
                />
                {selectedAddProduct && stockQuantity && Number(stockQuantity) > 0 && (
                  <p className="text-xs text-emerald-700 mt-1 font-medium">
                    Stok setelah ditambah: {selectedAddProduct.stock + Number(stockQuantity)}{' '}
                    {selectedAddProduct.unit}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-wk-on-surface-variant mb-1.5">
                  Catatan / Supplier / Keterangan (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={stockNote}
                  onChange={(e) => setStockNote(e.target.value)}
                  placeholder="Contoh: Pembelian dari agen, restock mingguan"
                  className="w-full bg-wk-surface-container-low px-3.5 py-2.5 rounded-xl text-sm text-wk-on-surface border border-wk-outline-variant/50 focus:outline-none focus:ring-2 focus:ring-wk-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsAddStockOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-wk-surface-container hover:bg-wk-surface-container-high text-wk-on-surface text-sm font-medium transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-wk-primary hover:bg-wk-primary-container text-white text-sm font-medium shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    'Simpan Stok Masuk'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Kurangi Stok (Stok Keluar) */}
      {isRemoveStockOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-wk-surface rounded-2xl max-w-md w-full p-6 shadow-2xl border border-wk-outline-variant/30 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-100 text-red-800 flex items-center justify-center">
                  <ArrowUpRight size={18} />
                </div>
                <h3 className="text-lg font-bold text-wk-on-surface font-wk-heading">
                  Kurangi Stok (Stok Keluar)
                </h3>
              </div>
              <button
                onClick={() => setIsRemoveStockOpen(false)}
                className="p-1 text-wk-on-surface-variant hover:text-wk-on-surface rounded-full hover:bg-wk-surface-container"
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 text-red-800 text-xs rounded-xl flex items-center gap-2 border border-red-200">
                <AlertCircle size={16} className="shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleRemoveStockSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-wk-on-surface-variant mb-1.5">
                  Pilih Produk
                </label>
                <select
                  value={activeProductId || ''}
                  onChange={(e) => setActiveProductId(Number(e.target.value))}
                  className="w-full bg-wk-surface-container-low px-3.5 py-2.5 rounded-xl text-sm text-wk-on-surface border border-wk-outline-variant/50 focus:outline-none focus:ring-2 focus:ring-wk-primary cursor-pointer"
                  required
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Stok: {p.stock} {p.unit})
                    </option>
                  ))}
                </select>
                {selectedRemoveProduct && (
                  <p className="text-xs text-wk-on-surface-variant mt-1">
                    Stok saat ini:{' '}
                    <span className="font-bold text-wk-on-surface">
                      {selectedRemoveProduct.stock} {selectedRemoveProduct.unit}
                    </span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-wk-on-surface-variant mb-1.5">
                  Jumlah Stok Keluar
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedRemoveProduct?.stock || 999999}
                  step="1"
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value)}
                  placeholder="Contoh: 5"
                  className="w-full bg-wk-surface-container-low px-3.5 py-2.5 rounded-xl text-sm text-wk-on-surface border border-wk-outline-variant/50 focus:outline-none focus:ring-2 focus:ring-wk-primary"
                  required
                  autoFocus
                />
                {selectedRemoveProduct && stockQuantity && Number(stockQuantity) > 0 && (
                  <p
                    className={`text-xs mt-1 font-medium ${
                      Number(stockQuantity) > selectedRemoveProduct.stock
                        ? 'text-red-600'
                        : 'text-amber-700'
                    }`}
                  >
                    {Number(stockQuantity) > selectedRemoveProduct.stock
                      ? 'Peringatan: Jumlah melebihi stok yang tersedia!'
                      : `Sisa stok setelah dikurangi: ${
                          selectedRemoveProduct.stock - Number(stockQuantity)
                        } ${selectedRemoveProduct.unit}`}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-wk-on-surface-variant mb-1.5">
                  Alasan / Catatan Pengurangan (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={stockNote}
                  onChange={(e) => setStockNote(e.target.value)}
                  placeholder="Contoh: Barang kadaluarsa, rusak di rak, koreksi stok fisik"
                  className="w-full bg-wk-surface-container-low px-3.5 py-2.5 rounded-xl text-sm text-wk-on-surface border border-wk-outline-variant/50 focus:outline-none focus:ring-2 focus:ring-wk-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsRemoveStockOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-wk-surface-container hover:bg-wk-surface-container-high text-wk-on-surface text-sm font-medium transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-red-700 hover:bg-red-800 text-white text-sm font-medium shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    'Kurangi Stok'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Riwayat Pergerakan Lengkap */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-wk-surface rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-wk-outline-variant/30 flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-wk-primary-fixed/30 text-wk-primary flex items-center justify-center">
                  <History size={18} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-wk-on-surface font-wk-heading">
                    Riwayat Pergerakan Stok
                  </h3>
                  <p className="text-xs text-wk-on-surface-variant">
                    Log audit transaksi barang masuk dan keluar
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="p-1 text-wk-on-surface-variant hover:text-wk-on-surface rounded-full hover:bg-wk-surface-container"
              >
                <X size={20} />
              </button>
            </div>

            {/* Filter by product inside history modal */}
            <div className="mb-4">
              <select
                value={historyFilterProduct}
                onChange={(e) =>
                  setHistoryFilterProduct(
                    e.target.value === 'all' ? 'all' : Number(e.target.value),
                  )
                }
                className="w-full bg-wk-surface-container-low px-3.5 py-2 rounded-xl text-xs text-wk-on-surface border border-wk-outline-variant/50 focus:outline-none focus:ring-2 focus:ring-wk-primary cursor-pointer"
              >
                <option value="all">Tampilkan Semua Produk</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {modalHistoryItems.length === 0 ? (
                <div className="py-12 text-center text-wk-on-surface-variant">
                  <History size={36} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-medium">Belum ada riwayat pergerakan stok</p>
                </div>
              ) : (
                modalHistoryItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-wk-surface-container-low border border-wk-outline-variant/20 hover:bg-wk-surface-container transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          item.type === 'IN'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {item.type === 'IN' ? (
                          <ArrowDownLeft size={16} />
                        ) : (
                          <ArrowUpRight size={16} />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-wk-on-surface">
                          {item.productName}
                        </div>
                        <div className="text-xs text-wk-on-surface-variant">
                          {item.note || (item.type === 'IN' ? 'Stok Masuk' : 'Stok Keluar')}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`text-sm font-bold ${
                          item.type === 'IN' ? 'text-emerald-700' : 'text-red-700'
                        }`}
                      >
                        {item.type === 'IN' ? '+' : '-'}
                        {item.quantity} {item.productUnit}
                      </div>
                      <div className="text-[11px] text-wk-outline">
                        {formatDate(item.createdAt)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-4 mt-2 border-t border-wk-outline-variant/30 flex justify-end">
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-wk-surface-container text-wk-on-surface text-sm font-medium hover:bg-wk-surface-container-high transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
