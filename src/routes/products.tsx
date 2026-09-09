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
  Pencil,
  Trash2,
  Layers,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  TrendingUp,
} from 'lucide-react'
import { getSessionFn, getCurrentUserFn } from '@/lib/auth'
import {
  getProductsFn,
  getCategoriesFn,
  createProductFn,
  updateProductFn,
  deleteProductFn,
  updateProductStockFn,
  createCategoryFn,
} from '@/server/products'

export const Route = createFileRoute('/products')({
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
    const [productsList, categoriesList] = await Promise.all([
      getProductsFn(),
      getCategoriesFn(),
    ])
    return { user, products: productsList, categories: categoriesList }
  },
  head: () => ({
    meta: [
      {
        title: 'Manajemen Produk — WarungKu POS & Inventory',
      },
      {
        name: 'description',
        content:
          'Kelola inventaris, stok, harga, dan kategori produk warung Anda secara real-time.',
      },
    ],
  }),
  component: ProductsPage,
})

const COMMON_UNITS = [
  'Pcs',
  'Dus',
  'Kg',
  'Bungkus',
  'Pouch',
  'Karung',
  'Galon',
  'Renceng',
  'Botol',
  'Gram',
  'Liter',
]

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount)
}

function ProductsPage() {
  const { user, products, categories } = Route.useLoaderData()
  const router = useRouter()

  // Filter States
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<
    (typeof products)[0] | null
  >(null)
  const [deletingProduct, setDeletingProduct] = useState<
    (typeof products)[0] | null
  >(null)
  const [quickStockProduct, setQuickStockProduct] = useState<
    (typeof products)[0] | null
  >(null)
  const [quickStockValue, setQuickStockValue] = useState<number>(0)

  // Add/Edit Form Form State
  const [formName, setFormName] = useState('')
  const [formCategoryId, setFormCategoryId] = useState<number | ''>('')
  const [formPrice, setFormPrice] = useState<number | ''>('')
  const [formStock, setFormStock] = useState<number | ''>('')
  const [formUnit, setFormUnit] = useState('Pcs')
  const [formError, setFormError] = useState('')

  // Inline Category Creation
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false)
  const [newCatName, setNewCatName] = useState('')

  // Feedback State
  const [isSubmitting, setIsSubmitting] = useState(false)
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

  // Calculate Metrics
  const totalProducts = products.length
  const lowStockCount = products.filter(
    (p) => p.stock > 0 && p.stock <= 5,
  ).length
  const outOfStockCount = products.filter((p) => p.stock <= 0).length
  const totalInventoryValue = products.reduce(
    (sum, p) => sum + p.price * p.stock,
    0,
  )

  // Filtered List
  const filteredProducts = products.filter((p) => {
    // Search filter
    const matchesSearch =
      searchTerm.trim() === '' ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
      `prd-${String(p.id).padStart(3, '0')}`.includes(
        searchTerm.toLowerCase().trim(),
      )

    // Category filter
    const matchesCategory =
      selectedCategory === 'all' || p.categoryId === Number(selectedCategory)

    // Status filter
    let matchesStatus = true
    if (selectedStatus === 'habis') {
      matchesStatus = p.stock <= 0
    } else if (selectedStatus === 'menipis') {
      matchesStatus = p.stock > 0 && p.stock <= 5
    } else if (selectedStatus === 'aman') {
      matchesStatus = p.stock > 5
    }

    return matchesSearch && matchesCategory && matchesStatus
  })

  // Open Add Modal
  function handleOpenAdd() {
    setFormName('')
    setFormCategoryId(categories[0]?.id || '')
    setFormPrice('')
    setFormStock('')
    setFormUnit('Pcs')
    setFormError('')
    setIsAddingNewCategory(false)
    setNewCatName('')
    setIsAddModalOpen(true)
  }

  // Open Edit Modal
  function handleOpenEdit(product: (typeof products)[0]) {
    setEditingProduct(product)
    setFormName(product.name)
    setFormCategoryId(product.categoryId || categories[0]?.id || '')
    setFormPrice(product.price)
    setFormStock(product.stock)
    setFormUnit(product.unit || 'Pcs')
    setFormError('')
    setIsAddingNewCategory(false)
    setNewCatName('')
  }

  // Open Quick Stock Modal
  function handleOpenQuickStock(product: (typeof products)[0]) {
    setQuickStockProduct(product)
    setQuickStockValue(product.stock)
  }

  // Handle Inline Add Category
  async function handleCreateCategory() {
    if (!newCatName.trim()) {
      setFormError('Nama kategori baru tidak boleh kosong.')
      return
    }
    setIsSubmitting(true)
    try {
      const newCat = await createCategoryFn({
        data: { name: newCatName.trim() },
      })
      await router.invalidate()
      setFormCategoryId(newCat.id)
      setIsAddingNewCategory(false)
      setNewCatName('')
      showFeedback('success', `Kategori "${newCat.name}" berhasil dibuat.`)
    } catch (err: any) {
      setFormError(err.message || 'Gagal membuat kategori.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Save (Add or Edit)
  async function handleSaveProduct(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')

    // Client-side validations
    if (!formName.trim()) {
      setFormError('Nama produk wajib diisi.')
      return
    }
    if (formCategoryId === '' || !formCategoryId) {
      setFormError('Silakan pilih kategori produk.')
      return
    }
    if (formPrice === '' || Number(formPrice) < 0) {
      setFormError('Harga harus berupa angka dan minimal 0.')
      return
    }
    if (formStock === '' || Number(formStock) < 0) {
      setFormError('Stok harus berupa angka dan minimal 0.')
      return
    }

    setIsSubmitting(true)

    try {
      if (editingProduct) {
        await updateProductFn({
          data: {
            id: editingProduct.id,
            name: formName.trim(),
            categoryId: Number(formCategoryId),
            price: Number(formPrice),
            stock: Number(formStock),
            unit: formUnit,
          },
        })
        showFeedback(
          'success',
          `Produk "${formName.trim()}" berhasil diperbarui.`,
        )
        setEditingProduct(null)
      } else {
        await createProductFn({
          data: {
            name: formName.trim(),
            categoryId: Number(formCategoryId),
            price: Number(formPrice),
            stock: Number(formStock),
            unit: formUnit,
          },
        })
        showFeedback(
          'success',
          `Produk "${formName.trim()}" berhasil ditambahkan.`,
        )
        setIsAddModalOpen(false)
      }
      await router.invalidate()
    } catch (err: any) {
      setFormError(err.message || 'Terjadi kesalahan saat menyimpan produk.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Delete
  async function handleConfirmDelete() {
    if (!deletingProduct) return
    setIsSubmitting(true)
    try {
      await deleteProductFn({
        data: { id: deletingProduct.id },
      })
      showFeedback(
        'success',
        `Produk "${deletingProduct.name}" berhasil dihapus.`,
      )
      setDeletingProduct(null)
      await router.invalidate()
    } catch (err: any) {
      showFeedback('error', err.message || 'Gagal menghapus produk.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Quick Stock Update
  async function handleSaveQuickStock() {
    if (!quickStockProduct) return
    if (quickStockValue < 0) {
      showFeedback('error', 'Jumlah stok tidak boleh kurang dari 0.')
      return
    }
    setIsSubmitting(true)
    try {
      await updateProductStockFn({
        data: {
          id: quickStockProduct.id,
          stock: quickStockValue,
        },
      })
      showFeedback(
        'success',
        `Stok "${quickStockProduct.name}" diperbarui menjadi ${quickStockValue} ${quickStockProduct.unit}.`,
      )
      setQuickStockProduct(null)
      await router.invalidate()
    } catch (err: any) {
      showFeedback('error', err.message || 'Gagal memperbarui stok.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <DashboardLayout user={user}>
      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`mb-wk-md p-wk-md rounded-xl flex items-center justify-between shadow-sm transition-all animate-in fade-in slide-in-from-top-2 ${
            feedback.type === 'success'
              ? 'bg-wk-primary-fixed/30 border border-wk-primary/20 text-wk-primary'
              : 'bg-wk-error-container text-wk-error border border-wk-error/20'
          }`}
        >
          <div className="flex items-center gap-wk-xs text-sm font-medium">
            {feedback.type === 'success' ? (
              <CheckCircle2 size={18} />
            ) : (
              <AlertCircle size={18} />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="p-1 hover:bg-black/5 rounded-lg transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Top Welcome & Summary Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-wk-lg gap-wk-sm">
        <div>
          <h1 className="font-wk-heading text-2xl sm:text-3xl font-bold tracking-tight text-wk-on-surface">
            Manajemen Produk
          </h1>
          <p className="text-sm text-wk-on-surface-variant mt-0.5">
            Kelola inventaris barang dagangan{' '}
            {user.store ? user.store.name : 'warung Anda'}
          </p>
        </div>
      </div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-wk-md mb-wk-xl">
        {/* Total Produk */}
        <div className="bg-wk-surface-container-lowest rounded-xl p-wk-lg shadow-sm flex items-center justify-between border border-wk-surface-container">
          <div>
            <div className="text-xs text-wk-on-surface-variant font-medium uppercase tracking-wider mb-wk-xxs">
              Total Produk
            </div>
            <div className="font-wk-heading text-2xl font-bold text-wk-on-surface">
              {totalProducts} Item
            </div>
            <div className="text-xs text-wk-primary flex items-center mt-wk-xxs font-medium">
              <TrendingUp size={14} className="mr-1" /> Terdaftar aktif
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-wk-primary-fixed/40 text-wk-primary flex items-center justify-center">
            <Package size={24} />
          </div>
        </div>

        {/* Stok Menipis */}
        <div className="bg-wk-surface-container-lowest rounded-xl p-wk-lg shadow-sm flex items-center justify-between border border-wk-surface-container">
          <div>
            <div className="text-xs text-wk-on-surface-variant font-medium uppercase tracking-wider mb-wk-xxs">
              Stok Menipis
            </div>
            <div className="font-wk-heading text-2xl font-bold text-wk-secondary">
              {lowStockCount} Item
            </div>
            <div className="text-xs text-wk-secondary flex items-center mt-wk-xxs font-medium">
              <AlertTriangle size={14} className="mr-1" /> Perlu restock (&le;
              5)
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-wk-secondary-container/30 text-wk-secondary flex items-center justify-center">
            <AlertTriangle size={24} />
          </div>
        </div>

        {/* Stok Habis */}
        <div className="bg-wk-surface-container-lowest rounded-xl p-wk-lg shadow-sm flex items-center justify-between border border-wk-surface-container">
          <div>
            <div className="text-xs text-wk-on-surface-variant font-medium uppercase tracking-wider mb-wk-xxs">
              Stok Habis
            </div>
            <div className="font-wk-heading text-2xl font-bold text-wk-error">
              {outOfStockCount} Item
            </div>
            <div className="text-xs text-wk-error flex items-center mt-wk-xxs font-medium">
              <PackageX size={14} className="mr-1" /> Segera pesan (0)
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-wk-error-container text-wk-error flex items-center justify-center">
            <PackageX size={24} />
          </div>
        </div>

        {/* Total Nilai Inventaris */}
        <div className="bg-wk-surface-container-lowest rounded-xl p-wk-lg shadow-sm flex items-center justify-between border border-wk-surface-container">
          <div>
            <div className="text-xs text-wk-on-surface-variant font-medium uppercase tracking-wider mb-wk-xxs">
              Total Nilai Inventaris
            </div>
            <div className="font-wk-heading text-2xl font-bold text-wk-on-surface">
              {formatRupiah(totalInventoryValue)}
            </div>
            <div className="text-xs text-wk-on-surface-variant flex items-center mt-wk-xxs">
              Nilai stok tersimpan
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-wk-surface-container text-wk-on-surface-variant flex items-center justify-center">
            <WalletCards size={24} />
          </div>
        </div>
      </div>

      {/* Action Toolbar & Search */}
      <div className="bg-wk-surface-container-lowest rounded-xl p-wk-md sm:p-wk-lg shadow-sm mb-wk-lg flex flex-col md:flex-row items-stretch md:items-center justify-between gap-wk-md border border-wk-surface-container">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-wk-sm flex-1">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px]">
            <Search
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-wk-on-surface-variant pointer-events-none"
            />
            <input
              type="text"
              placeholder="Cari nama produk atau kode (PRD-001)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-wk-md py-2.5 bg-wk-surface rounded-xl text-wk-on-surface placeholder:text-wk-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-wk-primary border border-wk-surface-container text-sm transition-all"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-wk-md py-2.5 bg-wk-surface rounded-xl text-wk-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-wk-primary border border-wk-surface-container transition-all cursor-pointer"
          >
            <option value="all">Semua Kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-wk-md py-2.5 bg-wk-surface rounded-xl text-wk-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-wk-primary border border-wk-surface-container transition-all cursor-pointer"
          >
            <option value="all">Semua Status</option>
            <option value="aman">Aman (&gt; 5)</option>
            <option value="menipis">Menipis (1-5)</option>
            <option value="habis">Habis (0)</option>
          </select>
        </div>

        {/* Add Product Button */}
        <button
          onClick={handleOpenAdd}
          className="bg-wk-primary text-wk-on-primary hover:bg-wk-primary-container px-wk-lg py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-wk-xs transition-colors shadow-sm cursor-pointer shrink-0"
        >
          <Plus size={18} />
          <span>Tambah Produk</span>
        </button>
      </div>

      {/* Data Table Container */}
      <div className="bg-wk-surface-container-lowest rounded-xl shadow-sm overflow-hidden mb-wk-xl border border-wk-surface-container">
        {filteredProducts.length === 0 ? (
          /* Empty State */
          <div className="py-wk-xxl px-wk-lg text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-wk-surface-container-high flex items-center justify-center text-wk-on-surface-variant mb-wk-md">
              <Package size={32} />
            </div>
            <h3 className="font-wk-heading text-lg font-semibold text-wk-on-surface mb-1">
              {products.length === 0
                ? 'Belum Ada Produk Terdaftar'
                : 'Tidak Ada Produk yang Cocok'}
            </h3>
            <p className="text-sm text-wk-on-surface-variant max-w-sm mb-wk-lg">
              {products.length === 0
                ? 'Mulai tambahkan produk dagangan warung Anda agar siap dijual di kasir dan dipantau stoknya.'
                : 'Coba ubah kata kunci pencarian atau sesuaikan filter kategori dan status stok Anda.'}
            </p>
            {products.length === 0 ? (
              <button
                onClick={handleOpenAdd}
                className="bg-wk-primary text-wk-on-primary hover:bg-wk-primary-container px-wk-lg py-2.5 rounded-xl font-medium text-sm flex items-center gap-wk-xs transition-colors cursor-pointer shadow-sm"
              >
                <Plus size={18} />
                <span>Tambah Produk Pertama</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setSearchTerm('')
                  setSelectedCategory('all')
                  setSelectedStatus('all')
                }}
                className="bg-wk-surface-container-high hover:bg-wk-surface-container-highest text-wk-on-surface px-wk-md py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer"
              >
                Reset Filter
              </button>
            )}
          </div>
        ) : (
          /* Data Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-wk-surface-container-low text-wk-on-surface-variant text-xs font-semibold uppercase tracking-wider border-b border-wk-surface-container">
                  <th className="py-wk-md px-wk-lg">Kode</th>
                  <th className="py-wk-md px-wk-lg">Nama Produk</th>
                  <th className="py-wk-md px-wk-lg">Kategori</th>
                  <th className="py-wk-md px-wk-lg text-right">Stok</th>
                  <th className="py-wk-md px-wk-lg">Satuan</th>
                  <th className="py-wk-md px-wk-lg text-right">Harga Jual</th>
                  <th className="py-wk-md px-wk-lg text-center">Status Stok</th>
                  <th className="py-wk-md px-wk-lg text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-wk-surface-container text-sm text-wk-on-surface">
                {filteredProducts.map((product) => {
                  const isOutOfStock = product.stock <= 0
                  const isLowStock = product.stock > 0 && product.stock <= 5

                  return (
                    <tr
                      key={product.id}
                      className="hover:bg-wk-surface-container-low/60 transition-colors"
                    >
                      {/* Kode */}
                      <td className="py-wk-md px-wk-lg font-mono text-xs text-wk-on-surface-variant font-medium">
                        PRD-{String(product.id).padStart(3, '0')}
                      </td>

                      {/* Nama Produk */}
                      <td className="py-wk-md px-wk-lg font-medium text-wk-on-surface">
                        <div className="flex items-center gap-wk-sm">
                          <div className="w-8 h-8 rounded-lg bg-wk-surface-container flex items-center justify-center text-wk-primary shrink-0">
                            <Package size={16} />
                          </div>
                          <span className="truncate max-w-xs">
                            {product.name}
                          </span>
                        </div>
                      </td>

                      {/* Kategori */}
                      <td className="py-wk-md px-wk-lg text-wk-on-surface-variant">
                        <span className="inline-block px-2.5 py-1 rounded-lg bg-wk-surface-container text-xs font-medium">
                          {product.categoryName || 'Tanpa Kategori'}
                        </span>
                      </td>

                      {/* Stok */}
                      <td className="py-wk-md px-wk-lg text-right font-semibold">
                        <span
                          className={
                            isOutOfStock
                              ? 'text-wk-error'
                              : isLowStock
                                ? 'text-wk-secondary'
                                : 'text-wk-on-surface'
                          }
                        >
                          {product.stock}
                        </span>
                      </td>

                      {/* Satuan */}
                      <td className="py-wk-md px-wk-lg text-wk-on-surface-variant">
                        {product.unit}
                      </td>

                      {/* Harga Jual */}
                      <td className="py-wk-md px-wk-lg text-right font-semibold text-wk-primary">
                        {formatRupiah(product.price)}
                      </td>

                      {/* Status Stok Badge */}
                      <td className="py-wk-md px-wk-lg text-center">
                        {isOutOfStock ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-wk-error-container text-wk-error">
                            Habis
                          </span>
                        ) : isLowStock ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-wk-secondary-container/30 text-wk-secondary">
                            Menipis
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-wk-primary-fixed/30 text-wk-primary">
                            Aman
                          </span>
                        )}
                      </td>

                      {/* Aksi */}
                      <td className="py-wk-md px-wk-lg text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenQuickStock(product)}
                            className="p-1.5 rounded-lg hover:bg-wk-surface-container text-wk-on-surface-variant hover:text-wk-primary transition-colors cursor-pointer"
                            title="Update Stok Cepat"
                          >
                            <Layers size={16} />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(product)}
                            className="p-1.5 rounded-lg hover:bg-wk-surface-container text-wk-on-surface-variant hover:text-wk-on-surface transition-colors cursor-pointer"
                            title="Edit Produk"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => setDeletingProduct(product)}
                            className="p-1.5 rounded-lg hover:bg-wk-surface-container text-wk-on-surface-variant hover:text-wk-error transition-colors cursor-pointer"
                            title="Hapus Produk"
                          >
                            <Trash2 size={16} />
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

        {/* Table Footer */}
        {filteredProducts.length > 0 && (
          <div className="p-wk-md bg-wk-surface-container-low/40 border-t border-wk-surface-container flex items-center justify-between text-xs text-wk-on-surface-variant">
            <div>
              Menampilkan{' '}
              <span className="font-semibold text-wk-on-surface">
                {filteredProducts.length}
              </span>{' '}
              dari{' '}
              <span className="font-semibold text-wk-on-surface">
                {totalProducts}
              </span>{' '}
              produk
            </div>
            <div>
              Status: Aman ({products.filter((p) => p.stock > 5).length}) •
              Menipis ({lowStockCount}) • Habis ({outOfStockCount})
            </div>
          </div>
        )}
      </div>

      {/* MODAL: Tambah / Edit Produk */}
      {(isAddModalOpen || editingProduct) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-wk-md animate-in fade-in duration-200">
          <div className="bg-wk-surface-container-lowest rounded-2xl max-w-lg w-full p-wk-xl shadow-2xl border border-wk-surface-container max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-wk-lg">
              <div>
                <h3 className="font-wk-heading text-xl font-bold text-wk-on-surface">
                  {editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}
                </h3>
                <p className="text-xs text-wk-on-surface-variant mt-0.5">
                  {editingProduct
                    ? `Perbarui rincian untuk kode PRD-${String(editingProduct.id).padStart(3, '0')}`
                    : 'Lengkapi formulir untuk menambahkan produk ke katalog warung.'}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsAddModalOpen(false)
                  setEditingProduct(null)
                }}
                className="p-1.5 rounded-xl text-wk-on-surface-variant hover:bg-wk-surface-container transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div className="mb-wk-md p-wk-sm rounded-xl bg-wk-error-container text-wk-error text-xs flex items-center gap-wk-xs">
                <AlertCircle size={16} className="shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProduct} className="space-y-wk-md">
              {/* Nama Produk */}
              <div>
                <label className="block text-xs font-semibold text-wk-on-surface mb-1">
                  Nama Produk <span className="text-wk-error">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Indomie Goreng Special"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-wk-md py-2.5 bg-wk-surface rounded-xl text-wk-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-wk-primary border border-wk-surface-container"
                  required
                />
              </div>

              {/* Kategori */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-wk-on-surface">
                    Kategori <span className="text-wk-error">*</span>
                  </label>
                  {!isAddingNewCategory && (
                    <button
                      type="button"
                      onClick={() => setIsAddingNewCategory(true)}
                      className="text-xs text-wk-primary font-medium hover:underline cursor-pointer flex items-center gap-0.5"
                    >
                      <Plus size={12} /> Tambah Kategori
                    </button>
                  )}
                </div>

                {isAddingNewCategory ? (
                  <div className="p-2.5 bg-wk-surface-container-low rounded-xl border border-wk-surface-container space-y-2">
                    <div className="text-xs font-medium text-wk-on-surface">
                      Kategori Baru:
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Nama kategori baru..."
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-wk-surface rounded-lg text-xs text-wk-on-surface focus:outline-none focus:ring-2 focus:ring-wk-primary border border-wk-surface-container"
                      />
                      <button
                        type="button"
                        onClick={handleCreateCategory}
                        disabled={isSubmitting}
                        className="bg-wk-primary text-wk-on-primary px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-wk-primary-container transition-colors disabled:opacity-50"
                      >
                        Simpan
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingNewCategory(false)
                          setNewCatName('')
                        }}
                        className="bg-wk-surface-container hover:bg-wk-surface-container-high text-wk-on-surface px-2.5 py-1.5 rounded-lg text-xs transition-colors"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                ) : (
                  <select
                    value={formCategoryId}
                    onChange={(e) => setFormCategoryId(Number(e.target.value))}
                    className="w-full px-wk-md py-2.5 bg-wk-surface rounded-xl text-wk-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-wk-primary border border-wk-surface-container cursor-pointer"
                    required
                  >
                    <option value="" disabled>
                      Pilih Kategori
                    </option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Harga & Satuan Grid */}
              <div className="grid grid-cols-2 gap-wk-md">
                {/* Harga Jual */}
                <div>
                  <label className="block text-xs font-semibold text-wk-on-surface mb-1">
                    Harga Jual (Rp) <span className="text-wk-error">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-wk-on-surface-variant font-medium">
                      Rp
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      placeholder="0"
                      value={formPrice}
                      onChange={(e) =>
                        setFormPrice(
                          e.target.value === '' ? '' : Number(e.target.value),
                        )
                      }
                      className="w-full pl-9 pr-wk-md py-2.5 bg-wk-surface rounded-xl text-wk-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-wk-primary border border-wk-surface-container"
                      required
                    />
                  </div>
                </div>

                {/* Satuan */}
                <div>
                  <label className="block text-xs font-semibold text-wk-on-surface mb-1">
                    Satuan <span className="text-wk-error">*</span>
                  </label>
                  <select
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    className="w-full px-wk-md py-2.5 bg-wk-surface rounded-xl text-wk-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-wk-primary border border-wk-surface-container cursor-pointer"
                  >
                    {COMMON_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Stok */}
              <div>
                <label className="block text-xs font-semibold text-wk-on-surface mb-1">
                  Jumlah Stok <span className="text-wk-error">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formStock}
                  onChange={(e) =>
                    setFormStock(
                      e.target.value === '' ? '' : Number(e.target.value),
                    )
                  }
                  className="w-full px-wk-md py-2.5 bg-wk-surface rounded-xl text-wk-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-wk-primary border border-wk-surface-container"
                  required
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-wk-sm pt-wk-md border-t border-wk-surface-container">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false)
                    setEditingProduct(null)
                  }}
                  className="px-wk-lg py-2.5 rounded-xl text-wk-on-surface-variant hover:bg-wk-surface-container text-sm font-medium transition-colors cursor-pointer"
                  disabled={isSubmitting}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-wk-lg py-2.5 rounded-xl bg-wk-primary text-wk-on-primary font-medium text-sm hover:bg-wk-primary-container transition-colors shadow-sm cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting && (
                    <Loader2 size={16} className="animate-spin" />
                  )}
                  <span>
                    {editingProduct ? 'Simpan Perubahan' : 'Simpan Produk'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Konfirmasi Hapus Produk */}
      {deletingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-wk-md animate-in fade-in duration-200">
          <div className="bg-wk-surface-container-lowest rounded-2xl max-w-md w-full p-wk-xl shadow-2xl border border-wk-surface-container">
            <div className="w-12 h-12 rounded-full bg-wk-error-container text-wk-error flex items-center justify-center mb-wk-md mx-auto">
              <Trash2 size={24} />
            </div>
            <h3 className="font-wk-heading text-lg font-bold text-wk-on-surface text-center mb-1">
              Hapus Produk?
            </h3>
            <p className="text-sm text-wk-on-surface-variant text-center mb-wk-lg">
              Apakah Anda yakin ingin menghapus produk{' '}
              <strong className="text-wk-on-surface">
                {deletingProduct.name}
              </strong>
              ? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex items-center justify-center gap-wk-sm">
              <button
                type="button"
                onClick={() => setDeletingProduct(null)}
                disabled={isSubmitting}
                className="px-wk-lg py-2.5 rounded-xl text-wk-on-surface-variant hover:bg-wk-surface-container text-sm font-medium transition-colors cursor-pointer flex-1"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isSubmitting}
                className="px-wk-lg py-2.5 rounded-xl bg-wk-error text-white text-sm font-medium hover:bg-red-700 transition-colors shadow-sm cursor-pointer flex-1 flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                <span>Ya, Hapus</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Update Stok Cepat */}
      {quickStockProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-wk-md animate-in fade-in duration-200">
          <div className="bg-wk-surface-container-lowest rounded-2xl max-w-sm w-full p-wk-xl shadow-2xl border border-wk-surface-container">
            <div className="flex items-center justify-between mb-wk-md">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-wk-primary-fixed/30 text-wk-primary flex items-center justify-center">
                  <Layers size={18} />
                </div>
                <h3 className="font-wk-heading text-base font-bold text-wk-on-surface">
                  Update Stok Cepat
                </h3>
              </div>
              <button
                onClick={() => setQuickStockProduct(null)}
                className="p-1 rounded-lg text-wk-on-surface-variant hover:bg-wk-surface-container transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-wk-on-surface-variant mb-wk-md">
              Sesuaikan stok untuk{' '}
              <strong className="text-wk-on-surface">
                {quickStockProduct.name}
              </strong>{' '}
              ({quickStockProduct.unit}):
            </p>

            <div className="flex items-center justify-center gap-3 mb-wk-lg">
              <button
                type="button"
                onClick={() =>
                  setQuickStockValue((prev) => Math.max(0, prev - 1))
                }
                className="w-10 h-10 rounded-xl bg-wk-surface-container hover:bg-wk-surface-container-high text-wk-on-surface font-bold text-lg flex items-center justify-center transition-colors cursor-pointer"
              >
                -
              </button>
              <input
                type="number"
                min="0"
                value={quickStockValue}
                onChange={(e) =>
                  setQuickStockValue(Math.max(0, Number(e.target.value)))
                }
                className="w-24 text-center py-2 bg-wk-surface rounded-xl font-wk-heading text-xl font-bold text-wk-on-surface border border-wk-surface-container focus:ring-2 focus:ring-wk-primary focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setQuickStockValue((prev) => prev + 1)}
                className="w-10 h-10 rounded-xl bg-wk-surface-container hover:bg-wk-surface-container-high text-wk-on-surface font-bold text-lg flex items-center justify-center transition-colors cursor-pointer"
              >
                +
              </button>
            </div>

            <div className="flex items-center justify-end gap-wk-sm">
              <button
                type="button"
                onClick={() => setQuickStockProduct(null)}
                disabled={isSubmitting}
                className="px-wk-md py-2 rounded-xl text-wk-on-surface-variant hover:bg-wk-surface-container text-xs font-medium transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveQuickStock}
                disabled={isSubmitting}
                className="px-wk-lg py-2 rounded-xl bg-wk-primary text-wk-on-primary font-medium text-xs hover:bg-wk-primary-container transition-colors shadow-sm cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                <span>Simpan Stok</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
