import { useState, useTransition } from 'react'
import { createFileRoute, redirect, Link } from '@tanstack/react-router'
import { DashboardLayout } from '../components/layout/DashboardLayout'
import {
  TrendingUp,
  Receipt,
  Package,
  Calendar,
  DollarSign,
  ArrowRight,
  ChevronRight,
  CalendarRange,
  ShoppingBag,
  Award,
  AlertCircle,
  Loader2,
  Filter,
} from 'lucide-react'
import { getSessionFn, getCurrentUserFn } from '@/lib/auth'
import { getSalesReportFn } from '@/server/reports'
import type { ReportPeriod, SalesReportData } from '@/server/reports'

export const Route = createFileRoute('/laporan')({
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

    const initialReport = await getSalesReportFn({
      data: { period: '7days' },
    })

    return { user, initialReport }
  },
  head: () => ({
    meta: [
      {
        title: 'Laporan Penjualan — WarungKu POS & Inventory',
      },
      {
        name: 'description',
        content:
          'Pantau performa penjualan warung Anda berdasarkan transaksi yang telah terjadi.',
      },
    ],
  }),
  component: LaporanPage,
})

function formatRupiah(amount: number): string {
  return `Rp ${Number(amount || 0).toLocaleString('id-ID')}`
}

function formatShortRupiah(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `${(amount / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}M`
  }
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1).replace(/\.0$/, '')}jt`
  }
  if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(0)}rb`
  }
  return String(amount)
}

function formatDateTime(dateInput: Date | string): string {
  const d = new Date(dateInput)
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function LaporanPage() {
  const { user, initialReport } = Route.useLoaderData()
  const [report, setReport] = useState<SalesReportData>(initialReport)
  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod>('7days')
  const [customStart, setCustomStart] = useState(initialReport.startDateStr)
  const [customEnd, setCustomEnd] = useState(initialReport.endDateStr)
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()
  const [errorMessage, setErrorMessage] = useState('')

  async function handleFilterChange(
    newPeriod: ReportPeriod,
    customS?: string,
    customE?: string,
  ) {
    setSelectedPeriod(newPeriod)
    setErrorMessage('')

    startTransition(async () => {
      try {
        const updated = await getSalesReportFn({
          data: {
            period: newPeriod,
            startDate: newPeriod === 'custom' ? customS || customStart : undefined,
            endDate: newPeriod === 'custom' ? customE || customEnd : undefined,
          },
        })
        setReport(updated)
      } catch (err: any) {
        setErrorMessage(
          err.message || 'Gagal memuat laporan penjualan. Silakan coba lagi.',
        )
      }
    })
  }

  function handleCustomSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!customStart || !customEnd) return
    handleFilterChange('custom', customStart, customEnd)
  }

  const { summary, chartData, topProducts, recentTransactions } = report
  const maxRevenue = Math.max(...chartData.map((d) => d.revenue), 1)
  const maxProductQty = Math.max(...topProducts.map((p) => p.quantitySold), 1)

  return (
    <DashboardLayout user={user}>
      <div className="flex flex-col gap-wk-lg">
        {/* PAGE HEADER */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-wk-md">
          <div>
            <div className="flex items-center gap-wk-xs">
              <span className="p-2 rounded-xl bg-wk-primary/10 text-wk-primary">
                <TrendingUp size={24} />
              </span>
              <h1 className="font-wk-heading text-2xl sm:text-3xl font-bold tracking-tight text-wk-on-surface">
                Laporan Penjualan
              </h1>
            </div>
            <p className="text-sm text-wk-on-surface-variant mt-wk-xxs">
              Pantau performa penjualan warung Anda berdasarkan transaksi yang telah terjadi.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-wk-on-surface-variant bg-wk-surface-container-low px-wk-md py-2 rounded-xl border border-wk-surface-container">
            <Calendar size={16} className="text-wk-primary shrink-0" />
            <span>
              Periode:{' '}
              <strong className="text-wk-on-surface">
                {report.startDateStr} s/d {report.endDateStr}
              </strong>
            </span>
          </div>
        </div>

        {/* ERROR ALERT */}
        {errorMessage && (
          <div className="p-wk-md rounded-2xl bg-wk-error-container text-wk-error border border-wk-error/20 flex items-center gap-wk-sm text-sm">
            <AlertCircle size={20} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* PERIOD FILTER TABS */}
        <div className="bg-wk-surface-container-lowest border border-wk-surface-container rounded-2xl p-wk-md flex flex-col gap-wk-md shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-wk-sm">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-semibold text-wk-on-surface-variant mr-1 flex items-center gap-1">
                <Filter size={14} /> Filter:
              </span>
              {(
                [
                  { key: 'today', label: 'Hari Ini' },
                  { key: '7days', label: '7 Hari Terakhir' },
                  { key: '30days', label: '30 Hari Terakhir' },
                  { key: 'month', label: 'Bulan Ini' },
                  { key: 'custom', label: 'Custom' },
                ] as const
              ).map((tab) => {
                const isActive = selectedPeriod === tab.key
                return (
                  <button
                    key={tab.key}
                    onClick={() => handleFilterChange(tab.key)}
                    disabled={isPending}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                      isActive
                        ? 'bg-wk-primary text-wk-on-primary shadow-xs font-semibold'
                        : 'bg-wk-surface-container-low text-wk-on-surface-variant hover:bg-wk-surface-container hover:text-wk-on-surface'
                    } disabled:opacity-60`}
                  >
                    {tab.label}
                  </button>
                )
              })}
            </div>

            {isPending && (
              <div className="flex items-center gap-1.5 text-xs text-wk-primary animate-pulse">
                <Loader2 size={14} className="animate-spin" />
                <span>Memuat data...</span>
              </div>
            )}
          </div>

          {/* CUSTOM DATE PICKER */}
          {selectedPeriod === 'custom' && (
            <form
              onSubmit={handleCustomSubmit}
              className="pt-wk-sm border-t border-wk-surface-container flex flex-wrap items-center gap-wk-sm text-xs"
            >
              <div className="flex items-center gap-2">
                <label className="font-medium text-wk-on-surface-variant">
                  Dari:
                </label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="px-3 py-1.5 bg-wk-surface rounded-xl border border-wk-surface-container text-wk-on-surface focus:outline-none focus:ring-2 focus:ring-wk-primary"
                  required
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="font-medium text-wk-on-surface-variant">
                  Sampai:
                </label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="px-3 py-1.5 bg-wk-surface rounded-xl border border-wk-surface-container text-wk-on-surface focus:outline-none focus:ring-2 focus:ring-wk-primary"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-1.5 rounded-xl bg-wk-primary text-wk-on-primary hover:bg-wk-primary-container font-medium transition-colors cursor-pointer disabled:opacity-50"
              >
                Terapkan
              </button>
            </form>
          )}
        </div>

        {/* SUMMARY CARDS (4 CARDS) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-wk-md">
          {/* Card 1: Total Penjualan */}
          <div className="bg-wk-surface-container-lowest border border-wk-surface-container rounded-2xl p-wk-lg flex flex-col justify-between shadow-xs">
            <div className="flex items-center justify-between mb-wk-sm">
              <span className="text-xs font-semibold text-wk-on-surface-variant uppercase tracking-wider">
                Total Penjualan
              </span>
              <div className="w-10 h-10 rounded-xl bg-wk-primary/10 text-wk-primary flex items-center justify-center">
                <DollarSign size={20} />
              </div>
            </div>
            <div>
              <div className="font-wk-heading text-2xl lg:text-3xl font-bold text-wk-primary mb-1">
                {formatRupiah(summary.totalRevenue)}
              </div>
              <div className="text-xs text-wk-on-surface-variant">
                Total omzet pada periode ini
              </div>
            </div>
          </div>

          {/* Card 2: Jumlah Transaksi */}
          <div className="bg-wk-surface-container-lowest border border-wk-surface-container rounded-2xl p-wk-lg flex flex-col justify-between shadow-xs">
            <div className="flex items-center justify-between mb-wk-sm">
              <span className="text-xs font-semibold text-wk-on-surface-variant uppercase tracking-wider">
                Jumlah Transaksi
              </span>
              <div className="w-10 h-10 rounded-xl bg-wk-surface-container-high text-wk-on-surface-variant flex items-center justify-center">
                <Receipt size={20} />
              </div>
            </div>
            <div>
              <div className="font-wk-heading text-2xl lg:text-3xl font-bold text-wk-on-surface mb-1">
                {summary.totalTransactions.toLocaleString('id-ID')}
              </div>
              <div className="text-xs text-wk-on-surface-variant">
                Transaksi berhasil diselesaikan
              </div>
            </div>
          </div>

          {/* Card 3: Produk Terjual */}
          <div className="bg-wk-surface-container-lowest border border-wk-surface-container rounded-2xl p-wk-lg flex flex-col justify-between shadow-xs">
            <div className="flex items-center justify-between mb-wk-sm">
              <span className="text-xs font-semibold text-wk-on-surface-variant uppercase tracking-wider">
                Produk Terjual
              </span>
              <div className="w-10 h-10 rounded-xl bg-wk-surface-container-high text-wk-on-surface-variant flex items-center justify-center">
                <Package size={20} />
              </div>
            </div>
            <div>
              <div className="font-wk-heading text-2xl lg:text-3xl font-bold text-wk-on-surface mb-1">
                {summary.totalItemsSold.toLocaleString('id-ID')}
              </div>
              <div className="text-xs text-wk-on-surface-variant">
                Total quantity produk keluar
              </div>
            </div>
          </div>

          {/* Card 4: Rata-rata Transaksi */}
          <div className="bg-wk-surface-container-lowest border border-wk-surface-container rounded-2xl p-wk-lg flex flex-col justify-between shadow-xs">
            <div className="flex items-center justify-between mb-wk-sm">
              <span className="text-xs font-semibold text-wk-on-surface-variant uppercase tracking-wider">
                Rata-rata Transaksi
              </span>
              <div className="w-10 h-10 rounded-xl bg-wk-secondary-container/20 text-wk-secondary flex items-center justify-center">
                <ShoppingBag size={20} />
              </div>
            </div>
            <div>
              <div className="font-wk-heading text-2xl lg:text-3xl font-bold text-wk-secondary mb-1">
                {formatRupiah(summary.averageTransaction)}
              </div>
              <div className="text-xs text-wk-on-surface-variant">
                Nilai belanja rata-rata pelanggan
              </div>
            </div>
          </div>
        </div>

        {/* SALES TREND CHART SECTION */}
        <div className="bg-wk-surface-container-lowest border border-wk-surface-container rounded-2xl p-wk-lg shadow-xs flex flex-col gap-wk-md">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-wk-xs">
            <div>
              <h2 className="font-wk-heading text-lg sm:text-xl font-bold text-wk-on-surface">
                Grafik Penjualan Harian
              </h2>
              <p className="text-xs text-wk-on-surface-variant">
                Tren omzet penjualan dari {report.startDateStr} hingga {report.endDateStr}
              </p>
            </div>
            <div className="flex items-center gap-wk-xs text-xs font-medium text-wk-on-surface-variant bg-wk-surface-container-low px-3 py-1.5 rounded-xl self-start sm:self-auto">
              <CalendarRange size={14} className="text-wk-primary" />
              <span>{chartData.length} hari dalam periode</span>
            </div>
          </div>

          {/* Chart Display */}
          {summary.totalTransactions === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-wk-lg bg-wk-surface-container-low/30 rounded-xl border border-dashed border-wk-surface-container">
              <TrendingUp size={36} className="text-wk-outline mb-2 opacity-40" />
              <div className="text-sm font-semibold text-wk-on-surface">
                Belum ada transaksi
              </div>
              <p className="text-xs text-wk-on-surface-variant mt-1">
                Belum ada transaksi penjualan pada periode ini.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[600px] pt-4 pb-2">
                {/* Bar Chart Container */}
                <div className="h-64 flex items-end justify-between gap-2 sm:gap-3 px-2 border-b border-wk-surface-container relative">
                  {/* Background grid lines */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-40">
                    <div className="border-b border-dashed border-wk-surface-container text-[10px] text-wk-outline -mt-2">
                      {formatShortRupiah(maxRevenue)}
                    </div>
                    <div className="border-b border-dashed border-wk-surface-container text-[10px] text-wk-outline -mt-2">
                      {formatShortRupiah(Math.round(maxRevenue / 2))}
                    </div>
                    <div className="border-b border-wk-surface-container text-[10px] text-wk-outline -mt-2">
                      Rp 0
                    </div>
                  </div>

                  {chartData.map((d, index) => {
                    const heightPercent =
                      maxRevenue > 0 ? Math.max((d.revenue / maxRevenue) * 85, 3) : 3
                    const isHovered = hoveredBarIndex === index
                    const hasRevenue = d.revenue > 0

                    return (
                      <div
                        key={d.date}
                        className="flex-1 flex flex-col items-center justify-end h-full relative group cursor-pointer z-10"
                        onMouseEnter={() => setHoveredBarIndex(index)}
                        onMouseLeave={() => setHoveredBarIndex(null)}
                      >
                        {/* Hover Tooltip */}
                        {isHovered && (
                          <div className="absolute -top-14 bg-wk-on-surface text-wk-surface px-3 py-1.5 rounded-xl shadow-lg text-[11px] whitespace-nowrap z-30 pointer-events-none animate-in fade-in zoom-in-95 flex flex-col items-center">
                            <span className="font-semibold text-wk-on-primary-container">
                              {formatRupiah(d.revenue)}
                            </span>
                            <span className="text-[10px] text-wk-surface-container-high opacity-80">
                              {d.label} ({d.transactionCount} transaksi)
                            </span>
                            <div className="w-2 h-2 bg-wk-on-surface rotate-45 -mb-1 mt-0.5"></div>
                          </div>
                        )}

                        {/* Top value badge on high screens */}
                        {hasRevenue && (
                          <span className="text-[10px] font-semibold text-wk-primary mb-1 opacity-80 group-hover:opacity-100 transition-opacity hidden md:block">
                            {formatShortRupiah(d.revenue)}
                          </span>
                        )}

                        {/* Bar */}
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className={`w-full max-w-[48px] rounded-t-lg transition-all duration-300 ${
                            hasRevenue
                              ? isHovered
                                ? 'bg-wk-primary shadow-md scale-y-105'
                                : 'bg-wk-primary-container/80 hover:bg-wk-primary'
                              : 'bg-wk-surface-container-high/60'
                          }`}
                        />
                      </div>
                    )
                  })}
                </div>

                {/* X-axis Labels */}
                <div className="flex justify-between items-center gap-2 sm:gap-3 px-2 pt-2 text-[11px] text-wk-on-surface-variant font-medium">
                  {chartData.map((d) => (
                    <div
                      key={d.date}
                      className="flex-1 text-center truncate"
                      title={d.label}
                    >
                      {d.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* TWO-COLUMN SECTION: TOP PRODUCTS & RECENT TRANSACTIONS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-wk-lg">
          {/* LEFT: PRODUK TERLARIS */}
          <div className="bg-wk-surface-container-lowest border border-wk-surface-container rounded-2xl p-wk-lg shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-wk-md">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                    <Award size={18} />
                  </div>
                  <div>
                    <h3 className="font-wk-heading text-lg font-bold text-wk-on-surface">
                      Produk Terlaris
                    </h3>
                    <p className="text-xs text-wk-on-surface-variant">
                      Item dengan penjualan terbanyak di periode ini
                    </p>
                  </div>
                </div>
                <span className="text-xs font-medium text-wk-on-surface-variant bg-wk-surface-container-low px-2.5 py-1 rounded-lg">
                  Top {topProducts.length}
                </span>
              </div>

              {topProducts.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center text-wk-on-surface-variant">
                  <Package size={36} className="mb-2 opacity-40" />
                  <p className="text-sm font-medium">Belum ada data penjualan produk</p>
                  <p className="text-xs mt-0.5">
                    Transaksi yang terjadi akan menampilkan produk terlaris di sini.
                  </p>
                </div>
              ) : (
                <div className="space-y-wk-sm">
                  {topProducts.map((prod, idx) => {
                    const percent = Math.round((prod.quantitySold / maxProductQty) * 100)
                    return (
                      <div
                        key={prod.productId}
                        className="p-wk-sm rounded-xl bg-wk-surface-container-low/50 hover:bg-wk-surface-container-low transition-colors flex flex-col gap-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                idx === 0
                                  ? 'bg-amber-400 text-amber-950 shadow-xs'
                                  : idx === 1
                                    ? 'bg-slate-300 text-slate-800'
                                    : idx === 2
                                      ? 'bg-amber-700/20 text-amber-900'
                                      : 'bg-wk-surface-container-high text-wk-on-surface-variant'
                              }`}
                            >
                              {idx + 1}
                            </span>
                            <span className="font-semibold text-sm text-wk-on-surface truncate max-w-[200px] sm:max-w-[280px]">
                              {prod.productName}
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-bold text-sm text-wk-primary">
                              {formatRupiah(prod.totalRevenue)}
                            </div>
                            <div className="text-[11px] text-wk-on-surface-variant">
                              {prod.quantitySold.toLocaleString('id-ID')} unit terjual
                            </div>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="w-full bg-wk-surface-container-high h-1.5 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${percent}%` }}
                            className="bg-wk-primary h-full rounded-full transition-all duration-500"
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="pt-wk-md mt-wk-md border-t border-wk-surface-container text-xs text-wk-on-surface-variant flex items-center justify-between">
              <span>Berdasarkan quantity item transaksi</span>
              <Link
                to="/products"
                className="text-wk-primary font-medium hover:underline flex items-center gap-0.5"
              >
                Katalog Produk <ChevronRight size={14} />
              </Link>
            </div>
          </div>

          {/* RIGHT: TRANSAKSI TERBARU */}
          <div className="bg-wk-surface-container-lowest border border-wk-surface-container rounded-2xl p-wk-lg shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-wk-md">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-wk-primary/10 text-wk-primary flex items-center justify-center">
                    <Receipt size={18} />
                  </div>
                  <div>
                    <h3 className="font-wk-heading text-lg font-bold text-wk-on-surface">
                      Transaksi Terbaru
                    </h3>
                    <p className="text-xs text-wk-on-surface-variant">
                      Daftar penjualan terbaru di warung Anda
                    </p>
                  </div>
                </div>
                <Link
                  to="/transactions"
                  className="text-xs font-semibold text-wk-primary hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Lihat Semua</span>
                  <ArrowRight size={14} />
                </Link>
              </div>

              {recentTransactions.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center text-wk-on-surface-variant">
                  <Receipt size={36} className="mb-2 opacity-40" />
                  <p className="text-sm font-medium">Belum ada transaksi</p>
                  <p className="text-xs mt-0.5">
                    Transaksi baru yang dibuat di kasir akan muncul di sini.
                  </p>
                  <Link
                    to="/pos"
                    className="mt-wk-md inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-wk-primary text-wk-on-primary text-xs font-medium hover:bg-wk-primary-container transition-colors"
                  >
                    Buka Kasir / POS
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="p-wk-sm rounded-xl bg-wk-surface-container-low/40 hover:bg-wk-surface-container-low transition-colors flex items-center justify-between gap-wk-sm border border-wk-surface-container/60"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-wk-surface-container-high flex items-center justify-center text-wk-on-surface-variant shrink-0">
                          <Receipt size={16} />
                        </div>
                        <div>
                          <div className="font-semibold text-xs text-wk-on-surface">
                            {tx.transactionNumber}
                          </div>
                          <div className="text-[11px] text-wk-on-surface-variant mt-0.5">
                            {formatDateTime(tx.createdAt)} • {tx.itemCount} item ({tx.totalQuantity} unit)
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-bold text-xs sm:text-sm text-wk-primary">
                          {formatRupiah(tx.total)}
                        </div>
                        <span className="inline-block text-[10px] font-medium px-2 py-0.5 rounded-full bg-wk-primary-fixed/30 text-wk-primary mt-0.5">
                          Tunai / Selesai
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-wk-md mt-wk-md border-t border-wk-surface-container flex items-center justify-between text-xs text-wk-on-surface-variant">
              <span>Menampilkan maksimal 10 transaksi terbaru</span>
              <Link
                to="/transactions"
                className="text-wk-primary font-semibold hover:underline flex items-center gap-1"
              >
                Riwayat Lengkap <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
