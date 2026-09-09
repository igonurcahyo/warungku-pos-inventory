import { useState, useEffect, useTransition } from 'react'
import { createFileRoute, redirect, Link } from '@tanstack/react-router'
import { DashboardLayout } from '../components/layout/DashboardLayout'
import {
  Receipt,
  CreditCard,
  TrendingUp,
  ShoppingCart,
  Search,
  Eye,
  Printer,
  X,
  Loader2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react'
import { getSessionFn, getCurrentUserFn } from '@/lib/auth'
import {
  getTransactionsFn,
  getTransactionDetailFn,
} from '@/server/transactions'
import type {
  TransactionListItem,
  TransactionDetail,
  TransactionSummary,
} from '@/server/transactions'

export const Route = createFileRoute('/transactions')({
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

    const initialData = await getTransactionsFn({
      data: {
        page: 1,
        limit: 20,
        period: 'all',
      },
    })

    return { user, initialData }
  },
  head: () => ({
    meta: [
      { title: 'Riwayat Transaksi — WarungKu POS & Inventory' },
      {
        name: 'description',
        content:
          'Kelola dan pantau seluruh transaksi penjualan toko WarungKu secara real-time.',
      },
    ],
  }),
  component: TransactionsPage,
})

function formatRupiah(amount: number): string {
  return `Rp ${Number(amount || 0).toLocaleString('id-ID')}`
}

function formatDateTime(dateInput: Date | string): string {
  const d = new Date(dateInput)
  const day = d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  const time = d.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })
  return `${day}, ${time}`
}

function formatDateOnly(dateInput: Date | string): string {
  const d = new Date(dateInput)
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function TransactionsPage() {
  const { user, initialData } = Route.useLoaderData()

  // Transactions & Summary states
  const [transactions, setTransactions] = useState<TransactionListItem[]>(
    initialData.transactions,
  )
  const [summary, setSummary] = useState<TransactionSummary>(
    initialData.summary,
  )
  const [pagination, setPagination] = useState(initialData.pagination)

  // Filter States
  const [search, setSearch] = useState('')
  const [period, setPeriod] = useState<
    'all' | 'today' | 'yesterday' | '7days' | '30days' | 'custom'
  >('all')
  const [customDate, setCustomDate] = useState('')

  // UI States
  const [isPending, startTransition] = useTransition()
  const [errorMessage, setErrorMessage] = useState('')

  // Modals
  const [selectedDetail, setSelectedDetail] = useState<TransactionDetail | null>(
    null,
  )
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)

  const [receiptDetail, setReceiptDetail] = useState<TransactionDetail | null>(
    null,
  )
  const [receiptModalOpen, setReceiptModalOpen] = useState(false)

  // Fetch transactions with current filters
  async function loadTransactions(
    targetPage: number = 1,
    newPeriod = period,
    newCustomDate = customDate,
    newSearch = search,
  ) {
    setErrorMessage('')
    startTransition(async () => {
      try {
        const res = await getTransactionsFn({
          data: {
            page: targetPage,
            limit: 20,
            search: newSearch.trim(),
            period: newPeriod,
            startDate: newPeriod === 'custom' ? newCustomDate : undefined,
            endDate: newPeriod === 'custom' ? newCustomDate : undefined,
          },
        })
        setTransactions(res.transactions)
        setPagination(res.pagination)
        setSummary(res.summary)
      } catch (err: any) {
        setErrorMessage(
          err?.message || 'Gagal memuat riwayat transaksi. Silakan coba lagi.',
        )
      }
    })
  }

  // Handle Search submit
  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    loadTransactions(1, period, customDate, search)
  }

  // Handle Period change
  function handlePeriodChange(
    newPeriod: 'all' | 'today' | 'yesterday' | '7days' | '30days' | 'custom',
  ) {
    setPeriod(newPeriod)
    if (newPeriod !== 'custom') {
      setCustomDate('')
      loadTransactions(1, newPeriod, '', search)
    }
  }

  // Handle Custom Date change
  function handleCustomDateApply() {
    if (!customDate) return
    loadTransactions(1, 'custom', customDate, search)
  }

  // Reset all filters
  function handleResetFilters() {
    setSearch('')
    setPeriod('all')
    setCustomDate('')
    loadTransactions(1, 'all', '', '')
  }

  // Open transaction detail
  async function handleOpenDetail(id: number) {
    setIsDetailLoading(true)
    setDetailModalOpen(true)
    try {
      const data = await getTransactionDetailFn({ data: { id } })
      setSelectedDetail(data)
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'Gagal memuat rincian transaksi atau akses ditolak.',
      )
      setDetailModalOpen(false)
    } finally {
      setIsDetailLoading(false)
    }
  }

  // Open receipt preview modal
  async function handleOpenReceipt(id: number) {
    if (selectedDetail && selectedDetail.id === id) {
      setReceiptDetail(selectedDetail)
      setReceiptModalOpen(true)
      return
    }

    setIsDetailLoading(true)
    try {
      const data = await getTransactionDetailFn({ data: { id } })
      setReceiptDetail(data)
      setReceiptModalOpen(true)
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'Gagal memuat struk transaksi atau akses ditolak.',
      )
    } finally {
      setIsDetailLoading(false)
    }
  }

  const isFilterActive =
    Boolean(search.trim()) || period !== 'all' || Boolean(customDate)

  const paginationFrom =
    pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1
  const paginationTo = Math.min(
    pagination.page * pagination.limit,
    pagination.total,
  )

  return (
    <DashboardLayout user={user}>
      <div className="flex flex-col w-full space-y-wk-lg">
        {/* Top Header & Action */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-wk-md">
          <div>
            <div className="flex items-center gap-wk-xs text-sm font-medium text-wk-on-surface-variant mb-wk-xxs">
              <Receipt size={16} className="text-wk-primary" />
              <span>Riwayat Transaksi Penjualan</span>
            </div>
            <h1 className="font-wk-heading text-2xl lg:text-3xl font-bold tracking-tight text-wk-on-surface">
              Riwayat Transaksi
            </h1>
            <p className="text-sm text-wk-on-surface-variant mt-wk-xxs">
              Kelola dan pantau seluruh transaksi penjualan harian{' '}
              <span className="font-semibold text-wk-on-surface">
                {user.store?.name || 'Warung Anda'}
              </span>
              .
            </p>
          </div>

          <div className="flex items-center gap-wk-sm">
            <Link
              to="/pos"
              className="flex items-center gap-wk-xs bg-wk-primary hover:bg-wk-primary/90 text-wk-on-primary px-wk-md py-wk-sm rounded-xl text-sm font-medium transition-all shadow-sm"
            >
              <ShoppingCart size={18} />
              <span>Buka Kasir POS</span>
            </Link>
          </div>
        </div>

        {/* Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-wk-md">
          {/* Card 1: Total Transaksi */}
          <div className="bg-wk-surface-container-low rounded-xl p-wk-lg shadow-sm hover:shadow transition-all relative overflow-hidden group border border-wk-outline-variant/30">
            <div className="flex items-center justify-between mb-wk-sm">
              <span className="text-xs font-semibold text-wk-on-surface-variant uppercase tracking-wider">
                Total Transaksi
              </span>
              <div className="w-10 h-10 rounded-lg bg-wk-primary-fixed/20 text-wk-primary flex items-center justify-center">
                <Receipt size={20} />
              </div>
            </div>
            <div className="text-2xl lg:text-3xl font-bold font-wk-heading text-wk-on-surface">
              {summary.totalTransactions.toLocaleString('id-ID')}
            </div>
            <div className="flex items-center gap-wk-xxs mt-wk-xs text-xs text-wk-on-surface-variant">
              <span>Semua transaksi tercatat</span>
            </div>
          </div>

          {/* Card 2: Total Pendapatan */}
          <div className="bg-wk-surface-container-low rounded-xl p-wk-lg shadow-sm hover:shadow transition-all relative overflow-hidden group border border-wk-outline-variant/30">
            <div className="flex items-center justify-between mb-wk-sm">
              <span className="text-xs font-semibold text-wk-on-surface-variant uppercase tracking-wider">
                Total Pendapatan
              </span>
              <div className="w-10 h-10 rounded-lg bg-wk-secondary-container/20 text-wk-secondary flex items-center justify-center">
                <CreditCard size={20} />
              </div>
            </div>
            <div className="text-2xl lg:text-3xl font-bold font-wk-heading text-wk-on-surface truncate">
              {formatRupiah(summary.totalRevenue)}
            </div>
            <div className="flex items-center gap-wk-xxs mt-wk-xs text-xs text-wk-secondary font-medium">
              <TrendingUp size={14} />
              <span>Rata-rata {formatRupiah(summary.averagePerTransaction)} / trx</span>
            </div>
          </div>

          {/* Card 3: Transaksi Hari Ini */}
          <div className="bg-wk-surface-container-low rounded-xl p-wk-lg shadow-sm hover:shadow transition-all relative overflow-hidden group border border-wk-outline-variant/30">
            <div className="flex items-center justify-between mb-wk-sm">
              <span className="text-xs font-semibold text-wk-on-surface-variant uppercase tracking-wider">
                Transaksi Hari Ini
              </span>
              <div className="w-10 h-10 rounded-lg bg-wk-primary/10 text-wk-primary flex items-center justify-center">
                <Calendar size={20} />
              </div>
            </div>
            <div className="text-2xl lg:text-3xl font-bold font-wk-heading text-wk-on-surface">
              {summary.todayTransactions.toLocaleString('id-ID')}
            </div>
            <div className="flex items-center gap-wk-xxs mt-wk-xs text-xs text-wk-primary font-medium">
              <CheckCircle2 size={14} />
              <span>Transaksi selesai hari ini</span>
            </div>
          </div>

          {/* Card 4: Pendapatan Hari Ini */}
          <div className="bg-wk-surface-container-low rounded-xl p-wk-lg shadow-sm hover:shadow transition-all relative overflow-hidden group border border-wk-outline-variant/30">
            <div className="flex items-center justify-between mb-wk-sm">
              <span className="text-xs font-semibold text-wk-on-surface-variant uppercase tracking-wider">
                Pendapatan Hari Ini
              </span>
              <div className="w-10 h-10 rounded-lg bg-wk-surface-container-high text-wk-on-surface flex items-center justify-center">
                <TrendingUp size={20} />
              </div>
            </div>
            <div className="text-2xl lg:text-3xl font-bold font-wk-heading text-wk-on-surface truncate">
              {formatRupiah(summary.todayRevenue)}
            </div>
            <div className="flex items-center gap-wk-xxs mt-wk-xs text-xs text-wk-on-surface-variant">
              <span>Penerimaan tunai hari ini</span>
            </div>
          </div>
        </div>

        {/* Filter & Search Card */}
        <div className="bg-wk-surface-container-low rounded-xl p-wk-md shadow-sm border border-wk-outline-variant/30 flex flex-col gap-wk-md">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-wk-md">
            {/* Search Input */}
            <form
              onSubmit={handleSearchSubmit}
              className="relative flex-1 max-w-full lg:max-w-md"
            >
              <span className="absolute inset-y-0 left-0 flex items-center pl-wk-md pointer-events-none text-wk-on-surface-variant">
                <Search size={18} />
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari transaksi..."
                className="w-full bg-wk-surface py-2.5 pl-10 pr-10 rounded-lg text-sm text-wk-on-surface border border-wk-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-wk-primary focus:border-transparent transition-all"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('')
                    loadTransactions(1, period, customDate, '')
                  }}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-wk-on-surface-variant hover:text-wk-on-surface"
                >
                  <X size={16} />
                </button>
              )}
            </form>

            {/* Custom Date & Reset */}
            <div className="flex flex-wrap items-center gap-wk-sm justify-end">
              <div className="flex items-center gap-wk-xs bg-wk-surface p-1 rounded-lg border border-wk-outline-variant/40">
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => {
                    setCustomDate(e.target.value)
                    setPeriod('custom')
                  }}
                  className="bg-transparent py-1.5 px-wk-sm text-sm text-wk-on-surface focus:outline-none"
                />
                <button
                  type="button"
                  disabled={!customDate || isPending}
                  onClick={handleCustomDateApply}
                  className="bg-wk-primary text-wk-on-primary px-wk-sm py-1.5 rounded text-xs font-medium hover:bg-wk-primary/90 disabled:opacity-50 transition-colors"
                >
                  Terapkan
                </button>
              </div>

              {isFilterActive && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="flex items-center gap-1 text-xs font-medium text-wk-error hover:bg-wk-error-container/40 px-wk-sm py-2 rounded-lg transition-colors cursor-pointer"
                >
                  <RotateCcw size={14} />
                  <span>Reset Filter</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Period Filter Buttons */}
          <div className="flex flex-wrap items-center gap-wk-xs pt-wk-xs border-t border-wk-outline-variant/20">
            <span className="text-xs text-wk-on-surface-variant font-medium mr-wk-xs">
              Periode:
            </span>
            {(
              [
                { key: 'all', label: 'Semua' },
                { key: 'today', label: 'Hari Ini' },
                { key: 'yesterday', label: 'Kemarin' },
                { key: '7days', label: '7 Hari Terakhir' },
                { key: '30days', label: '30 Hari Terakhir' },
              ] as const
            ).map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => handlePeriodChange(item.key)}
                className={`px-wk-sm py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  period === item.key && !customDate
                    ? 'bg-wk-primary text-wk-on-primary'
                    : 'bg-wk-surface text-wk-on-surface-variant hover:bg-wk-surface-container-high hover:text-wk-on-surface'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Feedback Alert if Error */}
        {errorMessage && (
          <div className="p-wk-md bg-wk-error-container text-wk-error rounded-xl flex items-center gap-wk-sm text-sm">
            <AlertCircle size={18} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Transactions Table Container */}
        <div className="bg-wk-surface-container-low rounded-xl shadow-sm border border-wk-outline-variant/30 overflow-hidden relative">
          {/* Loading Overlay */}
          {isPending && (
            <div className="absolute inset-0 bg-wk-surface/60 backdrop-blur-xs z-10 flex items-center justify-center">
              <div className="flex items-center gap-wk-sm bg-wk-surface-container-lowest px-wk-lg py-wk-md rounded-xl shadow-lg border border-wk-outline-variant/40">
                <Loader2 size={20} className="animate-spin text-wk-primary" />
                <span className="text-sm font-medium text-wk-on-surface">
                  Memuat data...
                </span>
              </div>
            </div>
          )}

          {transactions.length === 0 ? (
            /* Empty State */
            <div className="p-wk-xxl text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-wk-surface-container-high text-wk-on-surface-variant flex items-center justify-center mb-wk-md">
                <Receipt size={32} />
              </div>
              <h3 className="text-lg font-bold font-wk-heading text-wk-on-surface mb-wk-xxs">
                Tidak ada transaksi
              </h3>
              <p className="text-sm text-wk-on-surface-variant max-w-sm mb-wk-lg">
                {isFilterActive
                  ? 'Tidak ditemukan transaksi yang cocok dengan kriteria filter atau pencarian Anda.'
                  : 'Belum ada transaksi penjualan yang tercatat di warung ini. Mulai transaksi pertama melalui kasir POS.'}
              </p>
              {isFilterActive ? (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="bg-wk-surface-container-high hover:bg-wk-surface-container-highest text-wk-on-surface px-wk-md py-wk-sm rounded-lg text-sm font-medium transition-colors cursor-pointer"
                >
                  Reset Filter
                </button>
              ) : (
                <Link
                  to="/pos"
                  className="bg-wk-primary hover:bg-wk-primary/90 text-wk-on-primary px-wk-md py-wk-sm rounded-lg text-sm font-medium transition-colors flex items-center gap-wk-xs"
                >
                  <ShoppingCart size={16} />
                  <span>Buka Kasir POS</span>
                </Link>
              )}
            </div>
          ) : (
            /* Data Table */
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-wk-surface-container-high text-wk-on-surface-variant text-xs uppercase tracking-wider font-semibold">
                    <th className="py-wk-md px-wk-lg">Nomor Transaksi</th>
                    <th className="py-wk-md px-wk-lg">Tanggal & Waktu</th>
                    <th className="py-wk-md px-wk-lg">Jumlah Item</th>
                    <th className="py-wk-md px-wk-lg">Total Pembayaran</th>
                    <th className="py-wk-md px-wk-lg">Status</th>
                    <th className="py-wk-md px-wk-lg text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-wk-surface-container-high text-sm text-wk-on-surface">
                  {transactions.map((trx) => (
                    <tr
                      key={trx.id}
                      className="hover:bg-wk-surface-container transition-colors"
                    >
                      {/* ID / Nomor Transaksi */}
                      <td className="py-wk-md px-wk-lg font-semibold text-wk-primary font-mono">
                        {trx.transactionNumber}
                      </td>

                      {/* Tanggal & Waktu */}
                      <td className="py-wk-md px-wk-lg text-wk-on-surface-variant">
                        {formatDateTime(trx.createdAt)}
                      </td>

                      {/* Jumlah Item */}
                      <td className="py-wk-md px-wk-lg">
                        <span className="font-medium">{trx.itemCount} item</span>{' '}
                        <span className="text-xs text-wk-on-surface-variant">
                          ({trx.totalQuantity} pcs)
                        </span>
                      </td>

                      {/* Total */}
                      <td className="py-wk-md px-wk-lg font-semibold text-wk-on-surface">
                        {formatRupiah(trx.total)}
                      </td>

                      {/* Status */}
                      <td className="py-wk-md px-wk-lg">
                        <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 px-wk-sm py-1 rounded-full text-xs font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                          Selesai
                        </span>
                      </td>

                      {/* Aksi */}
                      <td className="py-wk-md px-wk-lg text-right">
                        <div className="flex items-center justify-end gap-wk-xs">
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(trx.id)}
                            title="Lihat Detail Transaksi"
                            className="p-1.5 text-wk-on-surface-variant hover:text-wk-primary hover:bg-wk-surface-container-high rounded-lg transition-colors cursor-pointer"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenReceipt(trx.id)}
                            title="Preview & Cetak Struk"
                            className="p-1.5 text-wk-on-surface-variant hover:text-wk-primary hover:bg-wk-surface-container-high rounded-lg transition-colors cursor-pointer"
                          >
                            <Printer size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          {transactions.length > 0 && (
            <div className="px-wk-lg py-wk-md bg-wk-surface-container border-t border-wk-surface-container-high flex flex-col sm:flex-row items-center justify-between gap-wk-sm">
              <div className="text-xs text-wk-on-surface-variant">
                Menampilkan{' '}
                <span className="font-semibold text-wk-on-surface">
                  {paginationFrom}-{paginationTo}
                </span>{' '}
                dari{' '}
                <span className="font-semibold text-wk-on-surface">
                  {pagination.total}
                </span>{' '}
                transaksi
              </div>

              <div className="flex items-center gap-wk-xs">
                <button
                  type="button"
                  disabled={pagination.page <= 1 || isPending}
                  onClick={() =>
                    loadTransactions(
                      pagination.page - 1,
                      period,
                      customDate,
                      search,
                    )
                  }
                  className="px-wk-sm py-1.5 bg-wk-surface text-wk-on-surface-variant rounded-lg text-xs font-medium hover:bg-wk-surface-container-high disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
                >
                  <ChevronLeft size={14} />
                  <span>Sebelumnya</span>
                </button>

                {/* Page numbers */}
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                  .filter((p) => {
                    if (pagination.totalPages <= 7) return true
                    if (p === 1 || p === pagination.totalPages) return true
                    return Math.abs(p - pagination.page) <= 1
                  })
                  .map((p, idx, arr) => {
                    const prev = arr[idx - 1]
                    const showEllipsis = prev && p - prev > 1

                    return (
                      <div key={p} className="flex items-center">
                        {showEllipsis && (
                          <span className="px-1 text-xs text-wk-on-surface-variant">
                            ...
                          </span>
                        )}
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() =>
                            loadTransactions(p, period, customDate, search)
                          }
                          className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                            pagination.page === p
                              ? 'bg-wk-primary text-wk-on-primary font-bold'
                              : 'bg-wk-surface text-wk-on-surface hover:bg-wk-surface-container-high'
                          }`}
                        >
                          {p}
                        </button>
                      </div>
                    )
                  })}

                <button
                  type="button"
                  disabled={
                    pagination.page >= pagination.totalPages || isPending
                  }
                  onClick={() =>
                    loadTransactions(
                      pagination.page + 1,
                      period,
                      customDate,
                      search,
                    )
                  }
                  className="px-wk-sm py-1.5 bg-wk-surface text-wk-on-surface-variant rounded-lg text-xs font-medium hover:bg-wk-surface-container-high disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
                >
                  <span>Selanjutnya</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* DETAIL MODAL */}
      {detailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-wk-md animate-in fade-in duration-150">
          <div className="bg-wk-surface rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-wk-outline-variant/30 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-wk-lg py-wk-md bg-wk-surface-container-low border-b border-wk-surface-container-high">
              <div className="flex items-center gap-wk-xs">
                <Receipt className="text-wk-primary" size={20} />
                <h3 className="font-wk-heading text-lg font-bold text-wk-on-surface">
                  {selectedDetail
                    ? `Detail Transaksi ${selectedDetail.transactionNumber}`
                    : 'Memuat Transaksi...'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="p-1 text-wk-on-surface-variant hover:text-wk-on-surface rounded-lg hover:bg-wk-surface-container-high transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-wk-lg space-y-wk-md overflow-y-auto flex-1">
              {isDetailLoading || !selectedDetail ? (
                <div className="py-wk-xxl flex flex-col items-center justify-center text-wk-on-surface-variant">
                  <Loader2 size={32} className="animate-spin text-wk-primary mb-wk-sm" />
                  <p className="text-sm">Mengambil data transaksi...</p>
                </div>
              ) : (
                <>
                  {/* Meta Info */}
                  <div className="flex justify-between items-center text-xs text-wk-on-surface-variant border-b border-wk-surface-container-high pb-wk-sm">
                    <div>
                      <span className="font-semibold text-wk-on-surface">
                        {selectedDetail.storeName}
                      </span>{' '}
                      • Kasir: {user.name}
                    </div>
                    <div>{formatDateTime(selectedDetail.createdAt)}</div>
                  </div>

                  {/* Items List (using transaction_items snapshots!) */}
                  <div className="space-y-wk-sm">
                    <h4 className="text-xs font-semibold text-wk-on-surface-variant uppercase tracking-wider">
                      Daftar Produk ({selectedDetail.items.length} item)
                    </h4>
                    <div className="space-y-2">
                      {selectedDetail.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex justify-between items-start text-sm bg-wk-surface-container-low p-wk-sm rounded-lg border border-wk-outline-variant/20"
                        >
                          <div>
                            <div className="font-medium text-wk-on-surface">
                              {item.productName}
                            </div>
                            <div className="text-xs text-wk-on-surface-variant mt-0.5">
                              {item.quantity} × {formatRupiah(item.price)}
                            </div>
                          </div>
                          <span className="font-semibold text-wk-on-surface">
                            {formatRupiah(item.subtotal)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Payment Breakdown */}
                  <div className="bg-wk-surface-container p-wk-md rounded-xl space-y-wk-xs border border-wk-outline-variant/30">
                    <div className="flex justify-between text-sm text-wk-on-surface-variant">
                      <span>Subtotal</span>
                      <span className="font-medium text-wk-on-surface">
                        {formatRupiah(selectedDetail.total)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm text-wk-on-surface-variant">
                      <span>Status</span>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                        <CheckCircle2 size={13} />
                        Selesai
                      </span>
                    </div>
                    <div className="flex justify-between text-sm text-wk-on-surface-variant">
                      <span>Uang Dibayar (Tunai)</span>
                      <span className="font-medium text-wk-on-surface">
                        {formatRupiah(selectedDetail.paidAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm text-wk-on-surface-variant">
                      <span>Kembalian</span>
                      <span className="font-medium text-wk-on-surface">
                        {formatRupiah(selectedDetail.changeAmount)}
                      </span>
                    </div>

                    <div className="pt-wk-xs border-t border-wk-outline-variant/40 flex justify-between text-base font-bold text-wk-on-surface">
                      <span>Total Akhir</span>
                      <span className="text-wk-primary">
                        {formatRupiah(selectedDetail.total)}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-wk-lg py-wk-md bg-wk-surface-container-low border-t border-wk-surface-container-high flex justify-end gap-wk-sm">
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="px-wk-md py-wk-sm bg-wk-surface text-wk-on-surface rounded-lg text-sm font-medium hover:bg-wk-surface-container-high transition-colors cursor-pointer border border-wk-outline-variant/40"
              >
                Tutup
              </button>
              {selectedDetail && (
                <button
                  type="button"
                  onClick={() => {
                    setDetailModalOpen(false)
                    setReceiptDetail(selectedDetail)
                    setReceiptModalOpen(true)
                  }}
                  className="px-wk-md py-wk-sm bg-wk-primary text-wk-on-primary rounded-lg text-sm font-medium hover:bg-wk-primary/90 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Printer size={16} />
                  <span>Cetak Struk</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RECEIPT PREVIEW MODAL */}
      {receiptModalOpen && receiptDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-wk-md animate-in fade-in duration-150">
          <div className="bg-wk-surface rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-wk-outline-variant/30 flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-wk-md py-wk-sm bg-wk-surface-container-low border-b border-wk-surface-container-high">
              <div className="flex items-center gap-1.5 text-sm font-semibold text-wk-on-surface">
                <FileText size={16} className="text-wk-primary" />
                <span>Preview Struk Kasir</span>
              </div>
              <button
                type="button"
                onClick={() => setReceiptModalOpen(false)}
                className="p-1 text-wk-on-surface-variant hover:text-wk-on-surface rounded-lg hover:bg-wk-surface-container-high transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Thermal Printable Receipt Mockup */}
            <div className="p-wk-md overflow-y-auto max-h-[70vh]">
              <div
                id="printable-receipt"
                className="bg-white p-wk-lg rounded-xl font-mono text-xs text-gray-800 leading-relaxed border border-dashed border-gray-300 shadow-inner space-y-wk-sm"
              >
                {/* Store Header */}
                <div className="text-center space-y-0.5">
                  <div className="font-bold text-base tracking-wide text-gray-900 uppercase">
                    {receiptDetail.storeName}
                  </div>
                  <div className="text-[11px] text-gray-500">
                    Warung POS & Inventory
                  </div>
                </div>

                {/* Metadata */}
                <div className="border-t border-dashed border-gray-400 pt-wk-xs text-[11px] space-y-0.5">
                  <div className="flex justify-between">
                    <span>No:</span>
                    <span className="font-semibold">{receiptDetail.transactionNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tgl:</span>
                    <span>{formatDateTime(receiptDetail.createdAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Kasir:</span>
                    <span>{user.name}</span>
                  </div>
                </div>

                {/* Items */}
                <div className="border-t border-dashed border-gray-400 pt-wk-xs space-y-1 text-[11px]">
                  {receiptDetail.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-start">
                      <div className="pr-2">
                        <div>{item.productName}</div>
                        <div className="text-gray-500 text-[10px]">
                          {item.quantity} × {item.price.toLocaleString('id-ID')}
                        </div>
                      </div>
                      <span className="font-semibold shrink-0">
                        {item.subtotal.toLocaleString('id-ID')}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Total & Payment */}
                <div className="border-t border-dashed border-gray-400 pt-wk-xs space-y-1 text-[11px]">
                  <div className="flex justify-between font-bold text-xs pt-0.5">
                    <span>TOTAL</span>
                    <span>{formatRupiah(receiptDetail.total)}</span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <span>TUNAI</span>
                    <span>{formatRupiah(receiptDetail.paidAmount)}</span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <span>KEMBALI</span>
                    <span>{formatRupiah(receiptDetail.changeAmount)}</span>
                  </div>
                </div>

                {/* Footer Note */}
                <div className="text-center pt-wk-sm border-t border-dashed border-gray-300 text-[10px] text-gray-500 space-y-0.5">
                  <div>Terima Kasih Atas Kunjungan Anda</div>
                  <div>Barang yang dibeli tidak dapat ditukar</div>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="px-wk-md py-wk-sm bg-wk-surface-container-low border-t border-wk-surface-container-high flex justify-end gap-wk-xs">
              <button
                type="button"
                onClick={() => setReceiptModalOpen(false)}
                className="px-wk-md py-1.5 bg-wk-surface text-wk-on-surface rounded-lg text-xs font-medium hover:bg-wk-surface-container-high transition-colors border border-wk-outline-variant/40 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-wk-md py-1.5 bg-wk-primary text-wk-on-primary rounded-lg text-xs font-medium hover:bg-wk-primary/90 transition-colors flex items-center gap-1 cursor-pointer shadow-sm"
              >
                <Printer size={14} />
                <span>Print Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
