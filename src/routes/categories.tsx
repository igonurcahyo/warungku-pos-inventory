import { useState, useMemo, useEffect } from 'react'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { DashboardLayout } from '../components/layout/DashboardLayout'
import {
  Tags,
  Plus,
  Pencil,
  Trash2,
  Search,
  Package,
  AlertCircle,
  CheckCircle2,
  X,
  Loader2,
  FolderOpen,
} from 'lucide-react'
import { getSessionFn, getCurrentUserFn } from '@/lib/auth'
import {
  getCategoriesFn,
  createCategoryFn,
  updateCategoryFn,
  deleteCategoryFn,
} from '@/server/categories'

export const Route = createFileRoute('/categories')({
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
    const categoriesList = await getCategoriesFn()
    return { user, categories: categoriesList }
  },
  head: () => ({
    meta: [
      {
        title: 'Manajemen Kategori — WarungKu POS & Inventory',
      },
      {
        name: 'description',
        content:
          'Kelola kelompok produk warung Anda untuk kemudahan pencarian, inventaris, dan transaksi kasir.',
      },
    ],
  }),
  component: CategoriesPage,
})

type CategoryItem = {
  id: number
  storeId: number
  name: string
  createdAt: Date
  updatedAt: Date
  productCount: number
}

function CategoriesPage() {
  const { user, categories } = Route.useLoaderData()
  const router = useRouter()

  // Search filter
  const [searchTerm, setSearchTerm] = useState('')

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<CategoryItem | null>(null)

  // Form States
  const [categoryName, setCategoryName] = useState('')
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Feedback Notifications
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  // Auto-dismiss feedback after 4 seconds
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [feedback])

  // Computed metrics
  const totalCategories = categories.length
  const totalProductsCount = useMemo(
    () => categories.reduce((sum, c) => sum + (c.productCount || 0), 0),
    [categories],
  )
  const emptyCategoriesCount = useMemo(
    () => categories.filter((c) => (c.productCount || 0) === 0).length,
    [categories],
  )

  // Filtered categories
  const filteredCategories = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return categories
    return categories.filter((cat) => cat.name.toLowerCase().includes(term))
  }, [categories, searchTerm])

  // Reset form
  function resetForm() {
    setCategoryName('')
    setFormError('')
    setIsSubmitting(false)
  }

  // Open Add Modal
  function handleOpenAdd() {
    resetForm()
    setIsAddModalOpen(true)
  }

  // Open Edit Modal
  function handleOpenEdit(cat: CategoryItem) {
    resetForm()
    setCategoryName(cat.name)
    setEditingCategory(cat)
  }

  // Close modals
  function handleCloseModals() {
    setIsAddModalOpen(false)
    setEditingCategory(null)
    setDeletingCategory(null)
    resetForm()
  }

  // Client validation
  function validateName(name: string): string | null {
    const trimmed = name.trim()
    if (!trimmed) {
      return 'Nama kategori wajib diisi.'
    }
    if (trimmed.length < 2) {
      return 'Nama kategori minimal 2 karakter.'
    }
    if (trimmed.length > 50) {
      return 'Nama kategori maksimal 50 karakter.'
    }
    return null
  }

  // Submit Create Category
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const error = validateName(categoryName)
    if (error) {
      setFormError(error)
      return
    }

    setIsSubmitting(true)
    setFormError('')

    try {
      await createCategoryFn({
        data: { name: categoryName.trim() },
      })
      await router.invalidate()
      handleCloseModals()
      setFeedback({
        type: 'success',
        message: 'Kategori berhasil ditambahkan.',
      })
    } catch (err: any) {
      setFormError(err.message || 'Gagal menambahkan kategori.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Submit Update Category
  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!editingCategory) return

    const error = validateName(categoryName)
    if (error) {
      setFormError(error)
      return
    }

    setIsSubmitting(true)
    setFormError('')

    try {
      await updateCategoryFn({
        data: {
          id: editingCategory.id,
          name: categoryName.trim(),
        },
      })
      await router.invalidate()
      handleCloseModals()
      setFeedback({
        type: 'success',
        message: 'Kategori berhasil diperbarui.',
      })
    } catch (err: any) {
      setFormError(err.message || 'Gagal memperbarui kategori.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Submit Delete Category
  async function handleDelete() {
    if (!deletingCategory) return

    if ((deletingCategory.productCount || 0) > 0) {
      setFeedback({
        type: 'error',
        message:
          'Kategori masih digunakan oleh produk dan tidak dapat dihapus.',
      })
      handleCloseModals()
      return
    }

    setIsSubmitting(true)
    try {
      await deleteCategoryFn({
        data: { id: deletingCategory.id },
      })
      await router.invalidate()
      handleCloseModals()
      setFeedback({
        type: 'success',
        message: 'Kategori berhasil dihapus.',
      })
    } catch (err: any) {
      handleCloseModals()
      setFeedback({
        type: 'error',
        message:
          err.message ||
          'Kategori masih digunakan oleh produk dan tidak dapat dihapus.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <DashboardLayout user={user}>
      <div className="flex flex-col gap-wk-lg">
        {/* TOP FEEDBACK BANNER */}
        {feedback && (
          <div
            className={`p-wk-md rounded-2xl flex items-center justify-between shadow-sm transition-all duration-300 animate-in fade-in slide-in-from-top-2 ${
              feedback.type === 'success'
                ? 'bg-wk-primary-container text-wk-on-primary border border-wk-on-primary-container/30'
                : 'bg-wk-error-container text-wk-error border border-wk-error/20'
            }`}
          >
            <div className="flex items-center gap-wk-sm">
              {feedback.type === 'success' ? (
                <CheckCircle2 size={20} className="shrink-0 text-wk-on-primary-container" />
              ) : (
                <AlertCircle size={20} className="shrink-0 text-wk-error" />
              )}
              <span className="text-sm font-medium">{feedback.message}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="p-1 rounded-lg hover:bg-black/10 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* PAGE HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-wk-md">
          <div>
            <div className="flex items-center gap-wk-xs">
              <span className="p-2 rounded-xl bg-wk-primary/10 text-wk-primary">
                <Tags size={24} />
              </span>
              <h1 className="font-wk-heading text-2xl sm:text-3xl font-bold tracking-tight text-wk-on-surface">
                Manajemen Kategori
              </h1>
            </div>
            <p className="text-sm text-wk-on-surface-variant mt-wk-xxs">
              Kelola kelompok produk warung Anda untuk kemudahan pencarian dan transaksi POS.
            </p>
          </div>

          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center justify-center gap-wk-xs px-wk-lg py-2.5 rounded-xl bg-wk-primary text-wk-on-primary hover:bg-wk-primary-container font-medium text-sm transition-all shadow-sm active:scale-95 cursor-pointer w-full sm:w-auto"
          >
            <Plus size={18} />
            <span>Tambah Kategori</span>
          </button>
        </div>

        {/* SUMMARY STATS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-wk-md">
          {/* Card 1: Total Kategori */}
          <div className="bg-wk-surface-container-lowest border border-wk-surface-container rounded-2xl p-wk-lg flex items-center justify-between shadow-xs">
            <div>
              <div className="text-xs font-semibold text-wk-on-surface-variant uppercase tracking-wider">
                Total Kategori
              </div>
              <div className="font-wk-heading text-2xl sm:text-3xl font-bold text-wk-on-surface mt-1">
                {totalCategories}
              </div>
              <div className="text-xs text-wk-on-surface-variant mt-0.5">
                Kategori aktif warung
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-wk-surface-container-low flex items-center justify-center text-wk-primary">
              <Tags size={24} />
            </div>
          </div>

          {/* Card 2: Total Produk Terkategori */}
          <div className="bg-wk-surface-container-lowest border border-wk-surface-container rounded-2xl p-wk-lg flex items-center justify-between shadow-xs">
            <div>
              <div className="text-xs font-semibold text-wk-on-surface-variant uppercase tracking-wider">
                Total Produk
              </div>
              <div className="font-wk-heading text-2xl sm:text-3xl font-bold text-wk-primary mt-1">
                {totalProductsCount}
              </div>
              <div className="text-xs text-wk-on-surface-variant mt-0.5">
                Produk di seluruh kategori
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-wk-surface-container-low flex items-center justify-center text-wk-primary">
              <Package size={24} />
            </div>
          </div>

          {/* Card 3: Kategori Tanpa Produk */}
          <div className="bg-wk-surface-container-lowest border border-wk-surface-container rounded-2xl p-wk-lg flex items-center justify-between shadow-xs">
            <div>
              <div className="text-xs font-semibold text-wk-on-surface-variant uppercase tracking-wider">
                Belum Ada Produk
              </div>
              <div className="font-wk-heading text-2xl sm:text-3xl font-bold text-wk-secondary mt-1">
                {emptyCategoriesCount}
              </div>
              <div className="text-xs text-wk-on-surface-variant mt-0.5">
                Dapat dihapus kapan saja
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-wk-surface-container-low flex items-center justify-center text-wk-secondary">
              <FolderOpen size={24} />
            </div>
          </div>
        </div>

        {/* SEARCH & CONTROLS */}
        <div className="bg-wk-surface-container-lowest border border-wk-surface-container rounded-2xl p-wk-md flex flex-col sm:flex-row items-center justify-between gap-wk-md shadow-xs">
          <div className="relative w-full sm:w-80">
            <Search
              size={18}
              className="absolute left-wk-sm top-1/2 -translate-y-1/2 text-wk-outline pointer-events-none"
            />
            <input
              type="text"
              placeholder="Cari kategori..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-wk-md py-2 bg-wk-surface-container-low border border-wk-outline-variant/60 rounded-xl text-sm text-wk-on-surface placeholder:text-wk-outline focus:outline-none focus:ring-2 focus:ring-wk-primary/30 focus:border-wk-primary transition-all"
            />
          </div>

          <div className="text-xs text-wk-on-surface-variant self-end sm:self-center">
            Menampilkan{' '}
            <span className="font-semibold text-wk-on-surface">
              {filteredCategories.length}
            </span>{' '}
            dari {totalCategories} kategori
          </div>
        </div>

        {/* CATEGORY LIST / TABLE */}
        {categories.length === 0 ? (
          /* EMPTY STATE (No categories in store) */
          <div className="bg-wk-surface-container-lowest border border-wk-surface-container rounded-2xl p-wk-xxl flex flex-col items-center justify-center text-center shadow-xs">
            <div className="w-16 h-16 rounded-full bg-wk-surface-container-high flex items-center justify-center text-wk-outline mb-wk-md">
              <Tags size={32} />
            </div>
            <h3 className="font-wk-heading text-lg font-bold text-wk-on-surface mb-1">
              Tidak ada kategori
            </h3>
            <p className="text-sm text-wk-on-surface-variant max-w-md mb-wk-lg">
              Warung Anda belum memiliki kategori produk. Kategori memudahkan pengelompokan produk, stok, dan pencarian cepat saat transaksi di kasir.
            </p>
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-wk-xs px-wk-lg py-2.5 rounded-xl bg-wk-primary text-wk-on-primary hover:bg-wk-primary-container font-medium text-sm transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <Plus size={18} />
              <span>Tambah Kategori</span>
            </button>
          </div>
        ) : filteredCategories.length === 0 ? (
          /* SEARCH EMPTY STATE */
          <div className="bg-wk-surface-container-lowest border border-wk-surface-container rounded-2xl p-wk-xl flex flex-col items-center justify-center text-center shadow-xs">
            <div className="w-14 h-14 rounded-full bg-wk-surface-container-high flex items-center justify-center text-wk-outline mb-wk-md">
              <Search size={28} />
            </div>
            <h3 className="font-wk-heading text-base font-bold text-wk-on-surface mb-1">
              Kategori tidak ditemukan
            </h3>
            <p className="text-xs text-wk-on-surface-variant mb-wk-md">
              Tidak ada kategori yang cocok dengan kata kunci &quot;{searchTerm}&quot;.
            </p>
            <button
              onClick={() => setSearchTerm('')}
              className="text-xs font-semibold text-wk-primary hover:underline cursor-pointer"
            >
              Reset Pencarian
            </button>
          </div>
        ) : (
          <div className="bg-wk-surface-container-lowest border border-wk-surface-container rounded-2xl overflow-hidden shadow-xs">
            {/* Desktop & Tablet Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-wk-surface-container-low/60 border-b border-wk-surface-container text-xs font-semibold text-wk-on-surface-variant uppercase tracking-wider">
                    <th className="py-3.5 px-wk-lg">Nama Kategori</th>
                    <th className="py-3.5 px-wk-lg text-center">Jumlah Produk</th>
                    <th className="py-3.5 px-wk-lg text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-wk-surface-container">
                  {filteredCategories.map((cat) => (
                    <tr
                      key={cat.id}
                      className="hover:bg-wk-surface-container-low/40 transition-colors"
                    >
                      {/* Nama Kategori */}
                      <td className="py-wk-md px-wk-lg">
                        <div className="flex items-center gap-wk-sm">
                          <div className="w-9 h-9 rounded-xl bg-wk-primary/10 text-wk-primary flex items-center justify-center shrink-0">
                            <Tags size={18} />
                          </div>
                          <div>
                            <span className="font-semibold text-wk-on-surface text-sm">
                              {cat.name}
                            </span>
                            <div className="text-xs text-wk-on-surface-variant">
                              ID: #{cat.id}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Jumlah Produk */}
                      <td className="py-wk-md px-wk-lg text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                            (cat.productCount || 0) > 0
                              ? 'bg-wk-primary-fixed/20 text-wk-primary'
                              : 'bg-wk-surface-container-high text-wk-on-surface-variant'
                          }`}
                        >
                          <Package size={14} />
                          <span>{cat.productCount || 0} produk</span>
                        </span>
                      </td>

                      {/* Aksi */}
                      <td className="py-wk-md px-wk-lg text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <button
                            onClick={() => handleOpenEdit(cat)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-wk-on-surface-variant hover:text-wk-on-surface hover:bg-wk-surface-container transition-colors cursor-pointer"
                            title="Edit Kategori"
                          >
                            <Pencil size={15} />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => setDeletingCategory(cat)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-wk-error hover:bg-wk-error-container/40 transition-colors cursor-pointer"
                            title="Hapus Kategori"
                          >
                            <Trash2 size={15} />
                            <span>Hapus</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards (zero horizontal overflow) */}
            <div className="block sm:hidden divide-y divide-wk-surface-container">
              {filteredCategories.map((cat) => (
                <div
                  key={cat.id}
                  className="p-wk-md flex flex-col gap-wk-sm hover:bg-wk-surface-container-low/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-wk-sm">
                    <div className="flex items-center gap-wk-xs">
                      <div className="w-8 h-8 rounded-lg bg-wk-primary/10 text-wk-primary flex items-center justify-center shrink-0">
                        <Tags size={16} />
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-wk-on-surface">
                          {cat.name}
                        </div>
                        <div className="text-[11px] text-wk-on-surface-variant">
                          ID: #{cat.id}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        (cat.productCount || 0) > 0
                          ? 'bg-wk-primary-fixed/20 text-wk-primary'
                          : 'bg-wk-surface-container-high text-wk-on-surface-variant'
                      }`}
                    >
                      <Package size={12} />
                      <span>{cat.productCount || 0} produk</span>
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-wk-surface-container/60">
                    <button
                      onClick={() => handleOpenEdit(cat)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-wk-on-surface-variant hover:bg-wk-surface-container transition-colors cursor-pointer"
                    >
                      <Pencil size={14} />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => setDeletingCategory(cat)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-wk-error hover:bg-wk-error-container/40 transition-colors cursor-pointer"
                    >
                      <Trash2 size={14} />
                      <span>Hapus</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Table Footer */}
            <div className="p-wk-md bg-wk-surface-container-low/40 border-t border-wk-surface-container flex items-center justify-between text-xs text-wk-on-surface-variant">
              <div>
                Total: <span className="font-semibold text-wk-on-surface">{categories.length}</span> kategori
              </div>
              <div>
                Produk: <span className="font-semibold text-wk-primary">{totalProductsCount}</span> unit
              </div>
            </div>
          </div>
        )}

        {/* MODAL: TAMBAH KATEGORI */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-wk-md animate-in fade-in duration-200">
            <div className="bg-wk-surface-container-lowest rounded-2xl max-w-md w-full p-wk-xl shadow-2xl border border-wk-surface-container max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-wk-lg">
                <div>
                  <h3 className="font-wk-heading text-xl font-bold text-wk-on-surface">
                    Tambah Kategori
                  </h3>
                  <p className="text-xs text-wk-on-surface-variant mt-0.5">
                    Buat kelompok baru untuk mengkategorikan produk warung.
                  </p>
                </div>
                <button
                  onClick={handleCloseModals}
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

              <form onSubmit={handleCreate} className="space-y-wk-md">
                <div>
                  <label className="block text-xs font-semibold text-wk-on-surface mb-1">
                    Nama Kategori <span className="text-wk-error">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Minuman, Makanan, Sembako, Snack"
                    value={categoryName}
                    onChange={(e) => {
                      setCategoryName(e.target.value)
                      if (formError) setFormError('')
                    }}
                    className="w-full px-wk-md py-2.5 bg-wk-surface rounded-xl text-wk-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-wk-primary border border-wk-surface-container"
                    required
                    autoFocus
                    maxLength={50}
                  />
                  <p className="text-[11px] text-wk-on-surface-variant mt-1">
                    Minimal 2 karakter, maksimal 50 karakter.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-wk-sm pt-wk-sm border-t border-wk-surface-container">
                  <button
                    type="button"
                    onClick={handleCloseModals}
                    disabled={isSubmitting}
                    className="px-wk-md py-2 rounded-xl text-sm font-medium text-wk-on-surface hover:bg-wk-surface-container transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-wk-xs px-wk-lg py-2 rounded-xl bg-wk-primary text-wk-on-primary hover:bg-wk-primary-container text-sm font-semibold transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                    <span>Simpan</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: EDIT KATEGORI */}
        {editingCategory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-wk-md animate-in fade-in duration-200">
            <div className="bg-wk-surface-container-lowest rounded-2xl max-w-md w-full p-wk-xl shadow-2xl border border-wk-surface-container max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-wk-lg">
                <div>
                  <h3 className="font-wk-heading text-xl font-bold text-wk-on-surface">
                    Edit Kategori
                  </h3>
                  <p className="text-xs text-wk-on-surface-variant mt-0.5">
                    Perbarui nama kategori #{editingCategory.id}
                  </p>
                </div>
                <button
                  onClick={handleCloseModals}
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

              <form onSubmit={handleUpdate} className="space-y-wk-md">
                <div>
                  <label className="block text-xs font-semibold text-wk-on-surface mb-1">
                    Nama Kategori <span className="text-wk-error">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Minuman, Makanan, Sembako"
                    value={categoryName}
                    onChange={(e) => {
                      setCategoryName(e.target.value)
                      if (formError) setFormError('')
                    }}
                    className="w-full px-wk-md py-2.5 bg-wk-surface rounded-xl text-wk-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-wk-primary border border-wk-surface-container"
                    required
                    autoFocus
                    maxLength={50}
                  />
                  <p className="text-[11px] text-wk-on-surface-variant mt-1">
                    Minimal 2 karakter, maksimal 50 karakter.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-wk-sm pt-wk-sm border-t border-wk-surface-container">
                  <button
                    type="button"
                    onClick={handleCloseModals}
                    disabled={isSubmitting}
                    className="px-wk-md py-2 rounded-xl text-sm font-medium text-wk-on-surface hover:bg-wk-surface-container transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-wk-xs px-wk-lg py-2 rounded-xl bg-wk-primary text-wk-on-primary hover:bg-wk-primary-container text-sm font-semibold transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                    <span>Simpan Perubahan</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: KONFIRMASI HAPUS KATEGORI */}
        {deletingCategory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-wk-md animate-in fade-in duration-200">
            <div className="bg-wk-surface-container-lowest rounded-2xl max-w-md w-full p-wk-xl shadow-2xl border border-wk-surface-container">
              <div className="flex items-start gap-wk-md mb-wk-md">
                <div className="w-10 h-10 rounded-full bg-wk-error-container text-wk-error flex items-center justify-center shrink-0">
                  <Trash2 size={20} />
                </div>
                <div>
                  <h3 className="font-wk-heading text-lg font-bold text-wk-on-surface">
                    Hapus Kategori
                  </h3>
                  <p className="text-xs text-wk-on-surface-variant mt-1 leading-relaxed">
                    Apakah Anda yakin ingin menghapus kategori{' '}
                    <span className="font-semibold text-wk-on-surface">
                      &quot;{deletingCategory.name}&quot;
                    </span>
                    ?
                  </p>
                </div>
              </div>

              {(deletingCategory.productCount || 0) > 0 ? (
                <div className="mb-wk-lg p-wk-md rounded-xl bg-wk-error-container/60 border border-wk-error/30 text-xs text-wk-error flex items-start gap-wk-xs">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block mb-0.5">
                      Kategori masih digunakan oleh produk dan tidak dapat dihapus.
                    </span>
                    Terdapat{' '}
                    <span className="font-bold">
                      {deletingCategory.productCount} produk
                    </span>{' '}
                    yang saat ini menggunakan kategori ini. Silakan ubah atau pindahkan kategori produk tersebut terlebih dahulu.
                  </div>
                </div>
              ) : (
                <p className="text-xs text-wk-on-surface-variant mb-wk-lg bg-wk-surface-container-low p-wk-sm rounded-xl">
                  Kategori ini belum digunakan oleh produk apapun dan aman untuk dihapus secara permanen.
                </p>
              )}

              <div className="flex items-center justify-end gap-wk-sm">
                <button
                  type="button"
                  onClick={handleCloseModals}
                  disabled={isSubmitting}
                  className="px-wk-md py-2 rounded-xl text-sm font-medium text-wk-on-surface hover:bg-wk-surface-container transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isSubmitting || (deletingCategory.productCount || 0) > 0}
                  className="inline-flex items-center gap-wk-xs px-wk-lg py-2 rounded-xl bg-wk-error text-white hover:bg-red-700 text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                  <span>Hapus Kategori</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
