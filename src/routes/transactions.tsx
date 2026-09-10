import { useState, useTransition } from 'react'
import { createFileRoute, redirect, Link, useRouter } from '@tanstack/react-router'
import { QRCodeSVG } from 'qrcode.react'
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
  Banknote,
  QrCode,
  Clock,
} from 'lucide-react'
import { getSessionFn, getCurrentUserFn } from '@/lib/auth'
import {
  getTransactionsFn,
  getTransactionDetailFn,
} from '@/server/transactions'
import { simulateQrisPaymentFn } from '@/server/pos'
import type {
  TransactionListItem,
  TransactionDetail,
  TransactionSummary,
} from '@/server/transactions'

interface QrisModalData {
  transactionId: number
  transactionNumber: string
  total: number
  qrPayload: string
}

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

function TransactionsPage() {
  const { user, initialData } = Route.useLoaderData()
  const router = useRouter()

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
  const [successMsg, setSuccessMsg] = useState('')

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

  // QRIS Simulation Modal (Lanjutkan Pembayaran)
  const [qrisModalData, setQrisModalData] = useState<QrisModalData | null>(null)
  const [isSimulatingQris, setIsSimulatingQris] = useState(false)

  function handleOpenContinueQris(trx: TransactionListItem | TransactionDetail) {
    setQrisModalData({
      transactionId: trx.id,
      transactionNumber: trx.transactionNumber,
      total: trx.total,
      qrPayload: `WARUNGKU|${trx.transactionNumber}|${trx.total}`,
    })
  }

  async function handleSimulateQris() {
    if (!qrisModalData || isSimulatingQris) return
    setIsSimulatingQris(true)
    setErrorMessage('')
    setSuccessMsg('')

    try {
      await simulateQrisPaymentFn({
        data: {
          transactionId: qrisModalData.transactionId,
        },
      })

      const paidTrxNumber = qrisModalData.transactionNumber
      setQrisModalData(null)
      setSuccessMsg(`Pembayaran QRIS untuk transaksi ${paidTrxNumber} berhasil diselesaikan!`)
      await loadTransactions(pagination.page)
      router.invalidate()
    } catch (err: any) {
      setErrorMessage(err.message || 'Simulasi pembayaran QRIS gagal.')
    } finally {
      setIsSimulatingQris(false)
    }
  }

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
      <div className="space-y-4 sm:space-y-wk-lg">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-wk-md">
          <div>
            <div className="flex items-center gap-2 text-xs text-wk-primary font-medium mb-1">
              <Receipt size={14} />
              <span>Riwayat Transaksi Penjualan</span>
            </div>
            <h1 className="font-wk-heading text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-wk-on-surface">
              Riwayat Transaksi
            </h1>
            <p className="text-xs sm:text-sm text-wk-on-surface-variant mt-0.5">
              Kelola dan pantau seluruh transaksi penjualan harian{' '}
              <span className="font-semibold text-wk-on-surface">
                {user.store?.name || 'Warung Anda'}
              </span>
              .
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/pos"
              className="flex items-center justify-center gap-1.5 bg-wk-primary hover:bg-wk-primary/90 text-wk-on-primary px-3.5 py-2 sm:px-wk-md sm:py-wk-sm rounded-xl text-xs sm:text-sm font-medium transition-all shadow-xs w-full sm:w-auto"
            >
              <ShoppingCart size={16} />
              <span>Buka Kasir POS</span>
            </Link>
          </div>
        </div>

        {/* Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-wk-md">
          {/* Card 1: Total Transaksi */}
          <div className="bg-wk-surface-container-low rounded-xl p-3.5 sm:p-5 lg:p-wk-lg shadow-xs hover:shadow transition-all relative overflow-hidden group border border-wk-outline-variant/30">
            <div className="flex items-center justify-between mb-2 sm:mb-wk-sm">
              <span className="text-[11px] sm:text-xs font-semibold text-wk-on-surface-variant uppercase tracking-wider">
                Total Transaksi
              </span>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-wk-primary-fixed/20 text-wk-primary flex items-center justify-center">
                <Receipt size={18} />
              </div>
            </div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold font-wk-heading text-wk-on-surface">
              {summary.totalTransactions.toLocaleString('id-ID')}
            </div>
            <div className="flex items-center gap-1 mt-1 text-[11px] sm:text-xs text-wk-on-surface-variant">
              <span>Semua transaksi tercatat</span>
            </div>
          </div>

          {/* Card 2: Total Pendapatan */}
          <div className="bg-wk-surface-container-low rounded-xl p-3.5 sm:p-5 lg:p-wk-lg shadow-xs hover:shadow transition-all relative overflow-hidden group border border-wk-outline-variant/30">
            <div className="flex items-center justify-between mb-2 sm:mb-wk-sm">
              <span className="text-[11px] sm:text-xs font-semibold text-wk-on-surface-variant uppercase tracking-wider">
                Total Pendapatan
              </span>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-wk-secondary-container/20 text-wk-secondary flex items-center justify-center">
                <CreditCard size={18} />
              </div>
            </div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold font-wk-heading text-wk-on-surface truncate">
              {formatRupiah(summary.totalRevenue)}
            </div>
            <div className="flex items-center gap-1 mt-1 text-[11px] sm:text-xs text-wk-secondary font-medium">
              <TrendingUp size={13} />
              <span className="truncate">Rata-rata {formatRupiah(summary.averagePerTransaction)} / trx</span>
            </div>
          </div>

          {/* Card 3: Transaksi Hari Ini */}
          <div className="bg-wk-surface-container-low rounded-xl p-3.5 sm:p-5 lg:p-wk-lg shadow-xs hover:shadow transition-all relative overflow-hidden group border border-wk-outline-variant/30">
            <div className="flex items-center justify-between mb-2 sm:mb-wk-sm">
              <span className="text-[11px] sm:text-xs font-semibold text-wk-on-surface-variant uppercase tracking-wider">
                Transaksi Hari Ini
              </span>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-wk-primary/10 text-wk-primary flex items-center justify-center">
                <Calendar size={18} />
              </div>
            </div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold font-wk-heading text-wk-on-surface">
              {summary.todayTransactions.toLocaleString('id-ID')}
            </div>
            <div className="flex items-center gap-1 mt-1 text-[11px] sm:text-xs text-wk-primary font-medium">
              <CheckCircle2 size={13} />
              <span>Transaksi selesai hari ini</span>
            </div>
          </div>

          {/* Card 4: Pendapatan Hari Ini */}
          <div className="bg-wk-surface-container-low rounded-xl p-3.5 sm:p-5 lg:p-wk-lg shadow-xs hover:shadow transition-all relative overflow-hidden group border border-wk-outline-variant/30">
            <div className="flex items-center justify-between mb-2 sm:mb-wk-sm">
              <span className="text-[11px] sm:text-xs font-semibold text-wk-on-surface-variant uppercase tracking-wider">
                Pendapatan Hari Ini
              </span>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-wk-surface-container-high text-wk-on-surface flex items-center justify-center">
                <TrendingUp size={18} />
              </div>
            </div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold font-wk-heading text-wk-on-surface truncate">
              {formatRupiah(summary.todayRevenue)}
            </div>
            <div className="flex items-center gap-1 mt-1 text-[11px] sm:text-xs text-wk-on-surface-variant">
              <span>Penerimaan tunai hari ini</span>
            </div>
          </div>
        </div>

        {/* Filter & Search Card */}
        <div className="bg-wk-surface-container-low rounded-xl p-3 sm:p-wk-md shadow-xs border border-wk-outline-variant/30 flex flex-col gap-3 sm:gap-wk-md">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 sm:gap-wk-md">
            {/* Search Input */}
            <form
              onSubmit={handleSearchSubmit}
              className="relative flex-1 max-w-full lg:max-w-md"
            >
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-wk-on-surface-variant">
                <Search size={18} />
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari transaksi..."
                className="w-full bg-wk-surface py-2.5 pl-10 pr-10 rounded-xl text-xs sm:text-sm text-wk-on-surface border border-wk-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-wk-primary focus:border-transparent transition-all"
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
            <div className="flex flex-wrap items-center gap-2 sm:gap-wk-sm justify-between sm:justify-end">
              <div className="flex items-center gap-1 bg-wk-surface p-1 rounded-xl border border-wk-outline-variant/40 flex-1 sm:flex-initial">
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => {
                    setCustomDate(e.target.value)
                    setPeriod('custom')
                  }}
                  className="bg-transparent py-1 px-2 text-xs sm:text-sm text-wk-on-surface focus:outline-none flex-1"
                />
                <button
                  type="button"
                  disabled={!customDate || isPending}
                  onClick={handleCustomDateApply}
                  className="bg-wk-primary text-wk-on-primary px-2.5 py-1.5 rounded-lg text-xs font-medium hover:bg-wk-primary/90 disabled:opacity-50 transition-colors shrink-0"
                >
                  Terapkan
                </button>
              </div>

              {isFilterActive && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="flex items-center gap-1 text-xs font-medium text-wk-error hover:bg-wk-error-container/40 px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer"
                >
                  <RotateCcw size={13} />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Period Filter Buttons */}
          <div className="flex items-center gap-1.5 pt-2 border-t border-wk-outline-variant/20 overflow-x-auto pb-1 sm:flex-wrap [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <span className="text-[11px] sm:text-xs text-wk-on-surface-variant font-medium shrink-0 mr-1">
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
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 ${
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

        {/* Feedback Alert if Success */}
        {successMsg && (
          <div className="p-3 sm:p-wk-md bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-xl flex items-center justify-between gap-2 text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setSuccessMsg('')}
              className="text-emerald-700 hover:text-emerald-900 cursor-pointer p-0.5 rounded hover:bg-emerald-200/60"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Feedback Alert if Error */}
        {errorMessage && (
          <div className="p-3 sm:p-wk-md bg-wk-error-container text-wk-error rounded-xl flex items-center gap-2 text-xs sm:text-sm">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Transactions Container */}
        <div className="bg-wk-surface-container-low rounded-xl shadow-xs border border-wk-outline-variant/30 overflow-hidden relative">
          {/* Loading Overlay */}
          {isPending && (
            <div className="absolute inset-0 bg-wk-surface/60 backdrop-blur-xs z-10 flex items-center justify-center">
              <div className="flex items-center gap-2 bg-wk-surface-container-lowest px-4 py-2.5 rounded-xl shadow-lg border border-wk-outline-variant/40">
                <Loader2 size={18} className="animate-spin text-wk-primary" />
                <span className="text-xs sm:text-sm font-medium text-wk-on-surface">
                  Memuat data...
                </span>
              </div>
            </div>
          )}

          {transactions.length === 0 ? (
            /* Empty State */
            <div className="p-8 sm:p-wk-xxl text-center flex flex-col items-center justify-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-wk-surface-container-high text-wk-on-surface-variant flex items-center justify-center mb-3">
                <Receipt size={28} />
              </div>
              <h3 className="text-base sm:text-lg font-bold font-wk-heading text-wk-on-surface mb-1">
                Tidak ada transaksi
              </h3>
              <p className="text-xs sm:text-sm text-wk-on-surface-variant max-w-sm mb-4">
                {isFilterActive
                  ? 'Tidak ditemukan transaksi yang cocok dengan kriteria filter atau pencarian Anda.'
                  : 'Belum ada transaksi penjualan yang tercatat di warung ini. Mulai transaksi pertama melalui kasir POS.'}
              </p>
              {isFilterActive ? (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="bg-wk-surface-container-high hover:bg-wk-surface-container-highest text-wk-on-surface px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer"
                >
                  Reset Filter
                </button>
              ) : (
                <Link
                  to="/pos"
                  className="bg-wk-primary hover:bg-wk-primary/90 text-wk-on-primary px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5"
                >
                  <ShoppingCart size={16} />
                  <span>Buka Kasir POS</span>
                </Link>
              )}
            </div>
          ) : (
            <>
              {/* MOBILE CARD VIEW (< md) */}
              <div className="block md:hidden divide-y divide-wk-outline-variant/20">
                {transactions.map((trx) => (
                  <div key={trx.id} className="p-3.5 space-y-2 hover:bg-wk-surface-container/40 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono font-bold text-xs text-wk-primary">
                          {trx.transactionNumber}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            trx.paymentMethod === 'qris'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {trx.paymentMethod === 'qris' ? (
                            <>
                              <QrCode size={11} />
                              QRIS
                            </>
                          ) : (
                            <>
                              <Banknote size={11} />
                              Cash
                            </>
                          )}
                        </span>
                      </div>

                      {trx.paymentStatus === 'paid' ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                          Lunas
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0">
                          <Clock size={10} className="text-amber-600" />
                          Menunggu Pembayaran
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <div className="text-wk-on-surface-variant text-[11px]">
                        {formatDateTime(trx.createdAt)}
                      </div>
                      <div className="text-wk-on-surface-variant text-[11px]">
                        {trx.itemCount} item ({trx.totalQuantity} pcs)
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-wk-outline-variant/15">
                      <div>
                        <div className="text-[10px] text-wk-on-surface-variant">Total Pembayaran</div>
                        <div className="font-bold text-sm text-wk-on-surface font-wk-heading">
                          {formatRupiah(trx.total)}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {trx.paymentStatus === 'pending' && trx.paymentMethod === 'qris' && (
                          <button
                            type="button"
                            onClick={() => handleOpenContinueQris(trx)}
                            className="px-2 py-1.5 bg-wk-primary text-wk-on-primary hover:bg-wk-primary/90 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                          >
                            <QrCode size={12} />
                            <span>Lanjutkan Pembayaran</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(trx.id)}
                          className="px-2.5 py-1.5 bg-wk-surface-container hover:bg-wk-surface-container-high text-wk-on-surface rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Eye size={13} />
                          <span>Detail</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenReceipt(trx.id)}
                          className="p-1.5 bg-wk-surface-container hover:bg-wk-surface-container-high text-wk-primary rounded-lg transition-colors cursor-pointer"
                          title="Cetak Struk"
                        >
                          <Printer size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* DESKTOP TABLE VIEW (>= md) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-wk-surface-container-high text-wk-on-surface-variant text-xs uppercase tracking-wider font-semibold">
                      <th className="py-3 px-4">Nomor Transaksi</th>
                      <th className="py-3 px-4">Tanggal & Waktu</th>
                      <th className="py-3 px-4">Metode</th>
                      <th className="py-3 px-4">Jumlah Item</th>
                      <th className="py-3 px-4">Total Pembayaran</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-wk-outline-variant/20 text-sm text-wk-on-surface">
                    {transactions.map((trx) => (
                      <tr
                        key={trx.id}
                        className="hover:bg-wk-surface-container/50 transition-colors"
                      >
                        {/* ID / Nomor Transaksi */}
                        <td className="py-3.5 px-4 font-semibold text-wk-primary font-mono text-xs">
                          {trx.transactionNumber}
                        </td>

                        {/* Tanggal & Waktu */}
                        <td className="py-3.5 px-4 text-wk-on-surface-variant text-xs">
                          {formatDateTime(trx.createdAt)}
                        </td>

                        {/* Metode Pembayaran */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              trx.paymentMethod === 'qris'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {trx.paymentMethod === 'qris' ? (
                              <>
                                <QrCode size={12} />
                                QRIS
                              </>
                            ) : (
                              <>
                                <Banknote size={12} />
                                Cash
                              </>
                            )}
                          </span>
                        </td>

                        {/* Jumlah Item */}
                        <td className="py-3.5 px-4 text-xs">
                          <span className="font-medium">{trx.itemCount} item</span>{' '}
                          <span className="text-wk-on-surface-variant">
                            ({trx.totalQuantity} pcs)
                          </span>
                        </td>

                        {/* Total */}
                        <td className="py-3.5 px-4 font-semibold text-wk-on-surface">
                          {formatRupiah(trx.total)}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          {trx.paymentStatus === 'paid' ? (
                            <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full text-xs font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                              Lunas
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full text-xs font-medium">
                              <Clock size={12} className="text-amber-600" />
                              Menunggu Pembayaran
                            </span>
                          )}
                        </td>

                        {/* Aksi */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {trx.paymentStatus === 'pending' && trx.paymentMethod === 'qris' && (
                              <button
                                type="button"
                                onClick={() => handleOpenContinueQris(trx)}
                                className="px-2.5 py-1.5 bg-wk-primary text-wk-on-primary hover:bg-wk-primary/90 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                                title="Lanjutkan Pembayaran QRIS"
                              >
                                <QrCode size={13} />
                                <span>Lanjutkan Pembayaran</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenDetail(trx.id)}
                              title="Lihat Detail Transaksi"
                              className="p-1.5 text-wk-on-surface-variant hover:text-wk-primary hover:bg-wk-surface-container rounded-lg transition-colors cursor-pointer"
                            >
                              <Eye size={17} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenReceipt(trx.id)}
                              title="Preview & Cetak Struk"
                              className="p-1.5 text-wk-on-surface-variant hover:text-wk-primary hover:bg-wk-surface-container rounded-lg transition-colors cursor-pointer"
                            >
                              <Printer size={17} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Pagination Footer */}
          {transactions.length > 0 && (
            <div className="px-3.5 sm:px-4 py-3 bg-wk-surface-container border-t border-wk-outline-variant/30 flex flex-col sm:flex-row items-center justify-between gap-2.5">
              <div className="text-xs text-wk-on-surface-variant text-center sm:text-left">
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

              <div className="flex items-center gap-1.5">
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
                  className="px-2.5 py-1.5 bg-wk-surface text-wk-on-surface-variant rounded-lg text-xs font-medium hover:bg-wk-surface-container-high disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
                >
                  <ChevronLeft size={14} />
                  <span>Sebelumnya</span>
                </button>

                {/* Mobile page indicator */}
                <span className="sm:hidden px-2 text-xs font-medium text-wk-on-surface">
                  {pagination.page} / {pagination.totalPages}
                </span>

                {/* Desktop Page numbers */}
                <div className="hidden sm:flex items-center gap-1">
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
                </div>

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
                  className="px-2.5 py-1.5 bg-wk-surface text-wk-on-surface-variant rounded-lg text-xs font-medium hover:bg-wk-surface-container-high disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-wk-surface rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-wk-outline-variant/30 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-wk-surface-container-low border-b border-wk-surface-container-high">
              <div className="flex items-center gap-2">
                <Receipt className="text-wk-primary shrink-0" size={18} />
                <h3 className="font-wk-heading text-base sm:text-lg font-bold text-wk-on-surface truncate">
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
            <div className="p-3.5 sm:p-5 space-y-3 sm:space-y-4 overflow-y-auto flex-1">
              {isDetailLoading || !selectedDetail ? (
                <div className="py-12 flex flex-col items-center justify-center text-wk-on-surface-variant">
                  <Loader2 size={30} className="animate-spin text-wk-primary mb-2" />
                  <p className="text-xs sm:text-sm">Mengambil data transaksi...</p>
                </div>
              ) : (
                <>
                  {/* Meta Info */}
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center text-xs text-wk-on-surface-variant border-b border-wk-surface-container-high pb-2.5 gap-1">
                    <div>
                      <span className="font-semibold text-wk-on-surface">
                        {selectedDetail.storeName}
                      </span>{' '}
                      • Kasir: {user.name}
                    </div>
                    <div>{formatDateTime(selectedDetail.createdAt)}</div>
                  </div>

                  {/* Items List */}
                  <div className="space-y-2">
                    <h4 className="text-[11px] sm:text-xs font-semibold text-wk-on-surface-variant uppercase tracking-wider">
                      Daftar Produk ({selectedDetail.items.length} item)
                    </h4>
                    <div className="space-y-1.5">
                      {selectedDetail.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex justify-between items-start text-xs sm:text-sm bg-wk-surface-container-low p-2.5 rounded-xl border border-wk-outline-variant/20"
                        >
                          <div className="min-w-0 pr-2">
                            <div className="font-medium text-wk-on-surface truncate">
                              {item.productName}
                            </div>
                            <div className="text-[11px] text-wk-on-surface-variant mt-0.5">
                              {item.quantity} × {formatRupiah(item.price)}
                            </div>
                          </div>
                          <span className="font-semibold text-wk-on-surface shrink-0">
                            {formatRupiah(item.subtotal)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Payment Breakdown */}
                  <div className="bg-wk-surface-container p-3 sm:p-4 rounded-xl space-y-2 border border-wk-outline-variant/30">
                    <div className="flex justify-between text-xs sm:text-sm text-wk-on-surface-variant">
                      <span>Metode Pembayaran</span>
                      <span className="font-semibold text-wk-on-surface inline-flex items-center gap-1">
                        {selectedDetail.paymentMethod === 'qris' ? (
                          <>
                            <QrCode size={13} className="text-wk-primary" />
                            <span>QRIS</span>
                          </>
                        ) : (
                          <>
                            <Banknote size={13} className="text-wk-primary" />
                            <span>Cash / Tunai</span>
                          </>
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm text-wk-on-surface-variant">
                      <span>Status</span>
                      {selectedDetail.paymentStatus === 'paid' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          <CheckCircle2 size={12} />
                          Lunas
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          <Clock size={12} />
                          Menunggu Pembayaran
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm text-wk-on-surface-variant">
                      <span>Subtotal</span>
                      <span className="font-medium text-wk-on-surface">
                        {formatRupiah(selectedDetail.total)}
                      </span>
                    </div>

                    {selectedDetail.paymentMethod === 'cash' ? (
                      <>
                        <div className="flex justify-between text-xs sm:text-sm text-wk-on-surface-variant">
                          <span>Uang Diterima</span>
                          <span className="font-medium text-wk-on-surface">
                            {formatRupiah(selectedDetail.paidAmount)}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs sm:text-sm text-wk-on-surface-variant">
                          <span>Kembalian</span>
                          <span className="font-medium text-wk-on-surface">
                            {formatRupiah(selectedDetail.changeAmount)}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between text-xs sm:text-sm text-wk-on-surface-variant">
                        <span>Dibayar</span>
                        <span className="font-medium text-wk-on-surface">
                          {formatRupiah(selectedDetail.paidAmount)}
                        </span>
                      </div>
                    )}

                    <div className="pt-2 border-t border-wk-outline-variant/40 flex justify-between text-sm sm:text-base font-bold text-wk-on-surface">
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
            <div className="px-4 py-3 bg-wk-surface-container-low border-t border-wk-surface-container-high flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="px-3.5 py-2 bg-wk-surface text-wk-on-surface rounded-xl text-xs sm:text-sm font-medium hover:bg-wk-surface-container-high transition-colors cursor-pointer border border-wk-outline-variant/40"
              >
                Tutup
              </button>
              {selectedDetail && selectedDetail.paymentStatus === 'pending' && selectedDetail.paymentMethod === 'qris' && (
                <button
                  type="button"
                  onClick={() => {
                    const detail = selectedDetail
                    setDetailModalOpen(false)
                    handleOpenContinueQris(detail)
                  }}
                  className="px-3.5 py-2 bg-wk-primary text-wk-on-primary rounded-xl text-xs sm:text-sm font-semibold hover:bg-wk-primary/90 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <QrCode size={15} />
                  <span>Lanjutkan Pembayaran</span>
                </button>
              )}
              {selectedDetail && (
                <button
                  type="button"
                  onClick={() => {
                    setDetailModalOpen(false)
                    setReceiptDetail(selectedDetail)
                    setReceiptModalOpen(true)
                  }}
                  className="px-3.5 py-2 bg-wk-surface-container-high text-wk-on-surface rounded-xl text-xs sm:text-sm font-medium hover:bg-wk-surface-container-highest transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Printer size={15} />
                  <span>Cetak Struk</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RECEIPT PREVIEW MODAL */}
      {receiptModalOpen && receiptDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-wk-surface rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-wk-outline-variant/30 flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-3.5 py-2.5 bg-wk-surface-container-low border-b border-wk-surface-container-high">
              <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-wk-on-surface">
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
            <div className="p-3 overflow-y-auto max-h-[70vh]">
              <div
                id="printable-receipt"
                className="bg-white p-3.5 sm:p-4 rounded-xl font-mono text-[11px] sm:text-xs text-gray-800 leading-relaxed border border-dashed border-gray-300 shadow-inner space-y-2"
              >
                {/* Store Header */}
                <div className="text-center space-y-0.5">
                  <div className="font-bold text-sm sm:text-base tracking-wide text-gray-900 uppercase">
                    {receiptDetail.storeName}
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-gray-500">
                    Warung POS & Inventory
                  </div>
                </div>

                {/* Metadata */}
                <div className="border-t border-dashed border-gray-400 pt-1.5 text-[10px] sm:text-[11px] space-y-0.5">
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
                <div className="border-t border-dashed border-gray-400 pt-1.5 space-y-1 text-[10px] sm:text-[11px]">
                  {receiptDetail.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-start">
                      <div className="pr-2 min-w-0">
                        <div className="truncate">{item.productName}</div>
                        <div className="text-gray-500 text-[9px] sm:text-[10px]">
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
                <div className="border-t border-dashed border-gray-400 pt-1.5 space-y-1 text-[10px] sm:text-[11px]">
                  <div className="flex justify-between font-bold text-xs pt-0.5">
                    <span>TOTAL</span>
                    <span>{formatRupiah(receiptDetail.total)}</span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <span>METODE</span>
                    <span className="font-semibold uppercase">
                      {receiptDetail.paymentMethod === 'qris' ? 'QRIS' : 'CASH / TUNAI'}
                    </span>
                  </div>
                  {receiptDetail.paymentMethod === 'cash' ? (
                    <>
                      <div className="flex justify-between text-gray-700">
                        <span>TUNAI</span>
                        <span>{formatRupiah(receiptDetail.paidAmount)}</span>
                      </div>
                      <div className="flex justify-between text-gray-700">
                        <span>KEMBALI</span>
                        <span>{formatRupiah(receiptDetail.changeAmount)}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between text-gray-700">
                        <span>STATUS</span>
                        <span className="font-semibold text-emerald-700">
                          {receiptDetail.paymentStatus === 'paid' ? 'LUNAS' : 'MENUNGGU PEMBAYARAN'}
                        </span>
                      </div>
                      <div className="flex justify-between text-gray-700">
                        <span>DIBAYAR</span>
                        <span>{formatRupiah(receiptDetail.paidAmount)}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Footer Note */}
                <div className="text-center pt-2 border-t border-dashed border-gray-300 text-[9px] sm:text-[10px] text-gray-500 space-y-0.5">
                  <div>Terima Kasih Atas Kunjungan Anda</div>
                  <div>Barang yang dibeli tidak dapat ditukar</div>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="px-3.5 py-2.5 bg-wk-surface-container-low border-t border-wk-surface-container-high flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReceiptModalOpen(false)}
                className="px-3 py-1.5 bg-wk-surface text-wk-on-surface rounded-xl text-xs font-medium hover:bg-wk-surface-container-high transition-colors border border-wk-outline-variant/40 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-1.5 bg-wk-primary text-wk-on-primary rounded-xl text-xs font-medium hover:bg-wk-primary/90 transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
              >
                <Printer size={14} />
                <span>Print Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QRIS SIMULATION MODAL (CONTINUE PAYMENT) */}
      {qrisModalData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-wk-surface-container-lowest rounded-2xl shadow-2xl max-w-sm w-full p-4 sm:p-5 relative border border-wk-outline-variant/30 flex flex-col items-center">
            {/* Close button */}
            <button
              onClick={() => {
                if (!isSimulatingQris) setQrisModalData(null)
              }}
              disabled={isSimulatingQris}
              className="absolute top-3.5 right-3.5 text-wk-on-surface-variant hover:text-wk-on-surface cursor-pointer p-1 rounded-full hover:bg-wk-surface-container disabled:opacity-40"
              title="Tutup / Batal"
            >
              <X size={20} />
            </button>

            {/* Modal Header */}
            <div className="text-center mb-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-wk-primary/10 text-wk-primary mb-1">
                <QrCode size={13} />
                Pembayaran QRIS
              </span>
              <h3 className="font-wk-heading text-lg font-bold text-wk-on-surface">
                {user.store?.name || 'WarungKu'}
              </h3>
              <p className="text-xs font-mono text-wk-primary font-semibold">
                {qrisModalData.transactionNumber}
              </p>
            </div>

            {/* QR Code Container */}
            <div className="p-3.5 bg-white rounded-2xl border-2 border-dashed border-wk-outline-variant/60 shadow-xs flex flex-col items-center justify-center my-1">
              <QRCodeSVG
                value={qrisModalData.qrPayload}
                size={180}
                level="M"
                includeMargin={false}
                className="rounded-lg"
              />
              <span className="text-[10px] text-gray-400 font-mono mt-2 text-center tracking-wider uppercase">
                NMID: ID1020030040050
              </span>
            </div>

            {/* Total & Status */}
            <div className="w-full mt-3 bg-wk-surface-container rounded-xl p-3 text-center space-y-1">
              <div className="text-xs text-wk-on-surface-variant">Total Tagihan</div>
              <div className="font-wk-heading text-xl font-bold text-wk-on-surface">
                {formatRupiah(qrisModalData.total)}
              </div>
              <div className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full mt-1">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                <span>Menunggu Pembayaran</span>
              </div>
            </div>

            <p className="text-[11px] text-center text-wk-on-surface-variant mt-2 px-1">
              *Hanya untuk visual/simulasi demo, bukan pembayaran QRIS sungguhan.
            </p>

            {/* Action buttons */}
            <div className="w-full mt-4 space-y-2">
              <button
                onClick={handleSimulateQris}
                disabled={isSimulatingQris}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-semibold text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSimulatingQris ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Memproses Pembayaran...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Bayar Sekarang</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setQrisModalData(null)}
                disabled={isSimulatingQris}
                className="w-full py-2 rounded-xl bg-wk-surface-container hover:bg-wk-surface-container-high text-wk-on-surface text-xs sm:text-sm font-medium transition-colors cursor-pointer border border-wk-outline-variant/30 disabled:opacity-50"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
