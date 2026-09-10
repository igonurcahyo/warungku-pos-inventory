import { createFileRoute, redirect, Link } from '@tanstack/react-router'
import { DashboardLayout } from '../components/layout/DashboardLayout'
import { 
  Calendar, Download, ShoppingCart, CreditCard, TrendingUp, WalletCards, 
  Package, Warehouse, TriangleAlert, CalendarRange, ArrowRight, Receipt 
} from 'lucide-react'
import { getSessionFn, getCurrentUserFn } from '@/lib/auth'
import { getDashboardStatsFn } from '@/server/dashboard'

export const Route = createFileRoute('/dashboard')({
  beforeLoad: async () => {
    const session = await getSessionFn()
    if (!session) {
      throw redirect({ to: '/login' })
    }
  },
  loader: async () => {
    const [user, stats] = await Promise.all([
      getCurrentUserFn(),
      getDashboardStatsFn(),
    ])
    if (!user) {
      throw redirect({ to: '/login' })
    }
    return { user, stats }
  },
  component: DashboardPage
})

function DashboardPage() {
  const { user, stats } = Route.useLoaderData()

  return (
    <DashboardLayout user={user}>
      {/* Top Welcome & Quick Actions Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 sm:mb-wk-xl gap-4">
        <div>
          <div className="flex items-center gap-wk-xs text-xs sm:text-sm font-medium text-wk-on-surface-variant mb-wk-xxs flex-wrap">
            <Calendar size={15} className="text-wk-primary shrink-0" />
            <span>
              {new Date().toLocaleDateString('id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
            <span className="mx-wk-xxs hidden xs:inline">•</span>
            <span className="text-wk-primary font-medium">Shift Aktif</span>
          </div>
          <h1 className="font-wk-heading text-2xl sm:text-3xl font-bold tracking-tight text-wk-on-surface">
            Dashboard {user.store ? user.store.name : 'Warung Anda'}
          </h1>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-wk-sm w-full sm:w-auto">
          <button className="flex items-center justify-center gap-wk-xs bg-wk-surface-container-high hover:bg-wk-surface-container-highest text-wk-on-surface px-wk-md py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm cursor-pointer w-full sm:w-auto">
            <Download size={18} />
            <span>Unduh Laporan</span>
          </button>
          <Link
            className="flex items-center justify-center gap-wk-xs bg-wk-primary text-wk-on-primary px-wk-md py-2.5 rounded-xl text-sm font-medium hover:bg-wk-primary-container transition-all shadow-sm w-full sm:w-auto"
            to="/pos"
          >
            <ShoppingCart size={18} />
            <span>Buka Kasir POS</span>
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-wk-md mb-6 sm:mb-wk-xl">
        {/* Card 1 */}
        <div className="bg-wk-surface-container-low rounded-xl p-4 sm:p-wk-lg shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group border border-wk-surface-container/40">
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-wk-primary/5 rounded-full group-hover:scale-125 transition-transform"></div>
          <div className="flex items-center justify-between mb-wk-md">
            <span className="text-xs sm:text-sm text-wk-on-surface-variant font-medium">
              Penjualan Hari Ini
            </span>
            <div className="w-10 h-10 rounded-xl bg-wk-primary-container text-wk-primary flex items-center justify-center">
              <CreditCard size={20} />
            </div>
          </div>
          <div>
            <div className="font-wk-heading text-2xl sm:text-3xl font-bold text-wk-on-surface mb-wk-xxs truncate">
              Rp {stats.todaySales.toLocaleString('id-ID')}
            </div>
            <div className="flex items-center gap-wk-xxs text-xs text-wk-primary font-medium">
              <TrendingUp size={15} />
              <span>{stats.todayTransactionCount} transaksi hari ini</span>
            </div>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-wk-surface-container-low rounded-xl p-4 sm:p-wk-lg shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group border border-wk-surface-container/40">
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-wk-secondary/5 rounded-full group-hover:scale-125 transition-transform"></div>
          <div className="flex items-center justify-between mb-wk-md">
            <span className="text-xs sm:text-sm text-wk-on-surface-variant font-medium">
              Pendapatan Hari Ini
            </span>
            <div className="w-10 h-10 rounded-xl bg-wk-secondary-container/50 text-wk-secondary flex items-center justify-center">
              <WalletCards size={20} />
            </div>
          </div>
          <div>
            <div className="font-wk-heading text-2xl sm:text-3xl font-bold text-wk-on-surface mb-wk-xxs truncate">
              Rp {stats.todaySales.toLocaleString('id-ID')}
            </div>
            <div className="flex items-center gap-wk-xxs text-xs text-wk-secondary font-medium">
              <TrendingUp size={15} />
              <span>Total omzet hari ini</span>
            </div>
            <div className="text-[11px] text-wk-on-surface-variant mt-1 truncate">
              Cash: <span className="font-semibold text-wk-on-surface">Rp {(stats.cashSales || 0).toLocaleString('id-ID')}</span> • QRIS: <span className="font-semibold text-wk-on-surface">Rp {(stats.qrisSales || 0).toLocaleString('id-ID')}</span>
            </div>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-wk-surface-container-low rounded-xl p-4 sm:p-wk-lg shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group border border-wk-surface-container/40">
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-wk-primary/5 rounded-full group-hover:scale-125 transition-transform"></div>
          <div className="flex items-center justify-between mb-wk-md">
            <span className="text-xs sm:text-sm text-wk-on-surface-variant font-medium">
              Estimasi Keuntungan
            </span>
            <div className="w-10 h-10 rounded-xl bg-wk-primary-container text-wk-primary flex items-center justify-center">
              <TrendingUp size={20} />
            </div>
          </div>
          <div>
            <div className="font-wk-heading text-2xl sm:text-3xl font-bold text-wk-on-surface mb-wk-xxs truncate">
              Rp {Math.round(stats.todaySales * 0.2).toLocaleString('id-ID')}
            </div>
            <div className="flex items-center gap-wk-xxs text-xs text-wk-on-surface-variant">
              <span>Estimasi margin ~20%</span>
            </div>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-wk-surface-container-low rounded-xl p-4 sm:p-wk-lg shadow-sm hover:shadow-md transition-all flex flex-col justify-between border border-wk-surface-container/40">
          <div className="flex items-center justify-between mb-wk-md">
            <span className="text-xs sm:text-sm text-wk-on-surface-variant font-medium">
              Total Produk
            </span>
            <div className="w-10 h-10 rounded-xl bg-wk-surface-container-high text-wk-on-surface-variant flex items-center justify-center">
              <Package size={20} />
            </div>
          </div>
          <div>
            <div className="font-wk-heading text-2xl sm:text-3xl font-bold text-wk-on-surface mb-wk-xxs truncate">
              {stats.totalProducts}
            </div>
            <div className="text-xs text-wk-on-surface-variant">
              Jenis barang aktif terdaftar
            </div>
          </div>
        </div>

        {/* Card 5 */}
        <div className="bg-wk-surface-container-low rounded-xl p-4 sm:p-wk-lg shadow-sm hover:shadow-md transition-all flex flex-col justify-between border border-wk-surface-container/40">
          <div className="flex items-center justify-between mb-wk-md">
            <span className="text-xs sm:text-sm text-wk-on-surface-variant font-medium">
              Total Stok Barang
            </span>
            <div className="w-10 h-10 rounded-xl bg-wk-surface-container-high text-wk-on-surface-variant flex items-center justify-center">
              <Warehouse size={20} />
            </div>
          </div>
          <div>
            <div className="font-wk-heading text-2xl sm:text-3xl font-bold text-wk-on-surface mb-wk-xxs truncate">
              {stats.totalStock.toLocaleString('id-ID')}
            </div>
            <div className="text-xs text-wk-on-surface-variant">
              Total unit dalam gudang & etalase
            </div>
          </div>
        </div>

        {/* Card 6 (Alert) */}
        <div className={`rounded-xl p-4 sm:p-wk-lg shadow-sm hover:shadow-md transition-all flex flex-col justify-between border ${
          stats.lowStockCount > 0 ? 'bg-wk-error-container/40 border-wk-error/30' : 'bg-wk-surface-container-low border-wk-surface-container/40'
        }`}>
          <div className="flex items-center justify-between mb-wk-md">
            <span className={`text-xs sm:text-sm font-medium ${stats.lowStockCount > 0 ? 'text-wk-error' : 'text-wk-on-surface-variant'}`}>
              Stok Menipis
            </span>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              stats.lowStockCount > 0 ? 'bg-wk-error-container text-wk-error' : 'bg-wk-surface-container-high text-wk-primary'
            }`}>
              <TriangleAlert size={20} />
            </div>
          </div>
          <div>
            <div className={`font-wk-heading text-2xl sm:text-3xl font-bold mb-wk-xxs truncate ${stats.lowStockCount > 0 ? 'text-wk-error' : 'text-wk-on-surface'}`}>
              {stats.lowStockCount} items
            </div>
            <div className="flex items-center gap-wk-xs mt-wk-xxs">
              <span className={`px-wk-xs py-0.5 rounded text-xs font-medium ${
                stats.lowStockCount > 0
                  ? 'bg-wk-error text-wk-on-error'
                  : 'bg-wk-primary-fixed/40 text-wk-primary'
              }`}>
                {stats.lowStockCount > 0 ? 'Segera Restock' : 'Stok Terkendali'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Section: Chart & Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-wk-lg mb-6 sm:mb-wk-xl">
        {/* Chart Section */}
        <div className="lg:col-span-2 bg-wk-surface-container-low rounded-xl p-4 sm:p-wk-lg shadow-sm flex flex-col justify-between border border-wk-surface-container/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-wk-lg gap-2">
            <div>
              <h2 className="font-wk-heading text-lg sm:text-xl font-semibold text-wk-on-surface">
                Grafik Penjualan 7 Hari Terakhir
              </h2>
              <p className="text-xs sm:text-sm text-wk-on-surface-variant">
                Tren omzet harian warung dari tanggal 18 - 24 Oktober
              </p>
            </div>
            <div className="flex items-center gap-wk-xs bg-wk-surface-container-high px-2.5 py-1 rounded-xl text-xs font-medium text-wk-on-surface self-start sm:self-auto">
              <CalendarRange size={14} />
              <span>Mingguan</span>
            </div>
          </div>

          <div className="h-56 sm:h-64 w-full flex items-end justify-between gap-1 sm:gap-wk-sm pt-4 sm:pt-wk-xl px-1 sm:px-wk-sm">
            {/* Bar 1 */}
            <div className="flex-1 flex flex-col items-center gap-1 h-full justify-end group min-w-0">
              <div className="text-[9px] sm:text-[10px] text-wk-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity">
                1.1M
              </div>
              <div className="w-full bg-wk-primary/20 group-hover:bg-wk-primary transition-all rounded-t-md sm:rounded-t-lg h-[65%] relative"></div>
              <span className="text-[10px] sm:text-xs text-wk-on-surface-variant truncate w-full text-center">Rab</span>
            </div>
            {/* Bar 2 */}
            <div className="flex-1 flex flex-col items-center gap-1 h-full justify-end group min-w-0">
              <div className="text-[9px] sm:text-[10px] text-wk-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity">
                950rb
              </div>
              <div className="w-full bg-wk-primary/20 group-hover:bg-wk-primary transition-all rounded-t-md sm:rounded-t-lg h-[55%] relative"></div>
              <span className="text-[10px] sm:text-xs text-wk-on-surface-variant truncate w-full text-center">Kam</span>
            </div>
            {/* Bar 3 */}
            <div className="flex-1 flex flex-col items-center gap-1 h-full justify-end group min-w-0">
              <div className="text-[9px] sm:text-[10px] text-wk-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity">
                1.3M
              </div>
              <div className="w-full bg-wk-primary/20 group-hover:bg-wk-primary transition-all rounded-t-md sm:rounded-t-lg h-[75%] relative"></div>
              <span className="text-[10px] sm:text-xs text-wk-on-surface-variant truncate w-full text-center">Jum</span>
            </div>
            {/* Bar 4 */}
            <div className="flex-1 flex flex-col items-center gap-1 h-full justify-end group min-w-0">
              <div className="text-[9px] sm:text-[10px] text-wk-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity">
                1.8M
              </div>
              <div className="w-full bg-wk-primary/20 group-hover:bg-wk-primary transition-all rounded-t-md sm:rounded-t-lg h-[95%] relative"></div>
              <span className="text-[10px] sm:text-xs text-wk-on-surface-variant truncate w-full text-center">Sab</span>
            </div>
            {/* Bar 5 */}
            <div className="flex-1 flex flex-col items-center gap-1 h-full justify-end group min-w-0">
              <div className="text-[9px] sm:text-[10px] text-wk-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity">
                1.6M
              </div>
              <div className="w-full bg-wk-primary/20 group-hover:bg-wk-primary transition-all rounded-t-md sm:rounded-t-lg h-[85%] relative"></div>
              <span className="text-[10px] sm:text-xs text-wk-on-surface-variant truncate w-full text-center">Min</span>
            </div>
            {/* Bar 6 */}
            <div className="flex-1 flex flex-col items-center gap-1 h-full justify-end group min-w-0">
              <div className="text-[9px] sm:text-[10px] text-wk-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity">
                1.2M
              </div>
              <div className="w-full bg-wk-primary/20 group-hover:bg-wk-primary transition-all rounded-t-md sm:rounded-t-lg h-[70%] relative"></div>
              <span className="text-[10px] sm:text-xs text-wk-on-surface-variant truncate w-full text-center">Sen</span>
            </div>
            {/* Bar 7 (Today) */}
            <div className="flex-1 flex flex-col items-center gap-1 h-full justify-end group min-w-0">
              <div className="text-[9px] sm:text-[10px] text-wk-primary font-bold opacity-100">
                1.45M
              </div>
              <div className="w-full bg-wk-primary rounded-t-md sm:rounded-t-lg h-[80%] relative shadow-md"></div>
              <span className="text-[10px] sm:text-xs text-wk-primary font-bold truncate w-full text-center">
                Hari Ini
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-3 sm:pt-wk-lg mt-3 sm:mt-wk-md border-t border-wk-surface-container-high text-xs sm:text-sm text-wk-on-surface-variant gap-1 sm:gap-0">
            <div>
              Rata-rata harian:{' '}
              <span className="font-medium text-wk-on-surface">
                Rp 1.300.000
              </span>
            </div>
            <div className="text-wk-primary font-medium flex items-center gap-wk-xxs">
              <span>Puncak Penjualan: Sabtu</span>
            </div>
          </div>
        </div>

        {/* Low Stock Alert Panel */}
        <div className="bg-wk-surface-container-low rounded-xl p-wk-lg shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-wk-md">
              <h2 className="font-wk-heading text-xl font-semibold text-wk-on-surface">
                Stok Menipis
              </h2>
              <span className={`text-xs px-wk-xs py-0.5 rounded font-medium ${
                stats.lowStockCount > 0
                  ? 'bg-wk-error-container text-wk-error'
                  : 'bg-wk-primary-fixed/40 text-wk-primary'
              }`}>
                {stats.lowStockCount} Barang
              </span>
            </div>
            <p className="text-sm text-wk-on-surface-variant mb-wk-md">
              Segera lakukan pemesanan ulang ke distributor agar tidak kehabisan.
            </p>
            {stats.lowStockItems.length === 0 ? (
              <div className="py-8 text-center text-wk-on-surface-variant text-sm bg-wk-surface-container-lowest rounded-xl border border-wk-surface-container-high/50 p-4">
                <p className="font-medium text-wk-on-surface">Semua Stok Aman</p>
                <p className="text-xs mt-1">Tidak ada produk dengan stok menipis saat ini.</p>
              </div>
            ) : (
              <div className="space-y-wk-sm">
                {stats.lowStockItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-wk-sm bg-wk-surface-container-lowest rounded-xl border border-wk-surface-container-high/50"
                  >
                    <div className="flex items-center gap-wk-sm">
                      <div className="w-10 h-10 rounded-lg bg-wk-surface-container-high flex items-center justify-center overflow-hidden shrink-0 text-wk-on-surface-variant font-bold text-xs">
                        {item.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-wk-on-surface line-clamp-1">
                          {item.name}
                        </div>
                        <div className="text-xs text-wk-error font-medium">
                          Sisa: {item.stock} {item.unit}
                        </div>
                      </div>
                    </div>
                    <Link
                      to="/stock"
                      className="bg-wk-primary/10 hover:bg-wk-primary hover:text-wk-on-primary text-wk-primary px-wk-sm py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 ml-wk-sm"
                    >
                      Restock
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="pt-wk-md mt-wk-md border-t border-wk-surface-container-high">
            <Link
              className="w-full flex items-center justify-center gap-wk-xs text-wk-primary font-medium text-sm hover:underline"
              to="/stock"
            >
              <span>Kelola Semua Stok</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>

      {/* Lower Grid: Top Selling Products & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-wk-lg">
        {/* Top-Selling Products Table */}
        <div className="bg-wk-surface-container-low rounded-xl p-4 sm:p-wk-lg shadow-sm flex flex-col justify-between overflow-hidden border border-wk-surface-container/40">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-wk-heading text-lg sm:text-xl font-semibold text-wk-on-surface">
                Produk Terlaris Hari Ini
              </h2>
              <p className="text-xs sm:text-sm text-wk-on-surface-variant">
                Berdasarkan volume penjualan terbanyak
              </p>
            </div>
            <Link to="/laporan" className="text-wk-primary text-xs sm:text-sm font-medium hover:underline cursor-pointer shrink-0 ml-wk-sm">
              Lihat Semua
            </Link>
          </div>

          {/* Mobile Card View (sm:hidden) */}
          <div className="block sm:hidden space-y-2.5">
            {stats.topProducts.length === 0 ? (
              <div className="py-6 text-center text-wk-on-surface-variant text-xs">
                Belum ada penjualan hari ini.
              </div>
            ) : (
              stats.topProducts.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-wk-surface-container-lowest rounded-xl border border-wk-surface-container-high/60 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-wk-surface-container-high flex items-center justify-center overflow-hidden shrink-0 text-wk-on-surface-variant font-bold text-xs">
                      {item.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-xs text-wk-on-surface truncate">
                        {item.name}
                      </div>
                      <div className="text-[11px] text-wk-on-surface-variant">
                        Rp {item.price.toLocaleString('id-ID')} • Terjual {item.quantity}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-semibold text-wk-primary">
                      Rp {item.total.toLocaleString('id-ID')}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table View (hidden sm:block) */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-wk-surface-container-high text-xs text-wk-on-surface-variant">
                  <th className="py-wk-sm px-2 font-medium">Produk</th>
                  <th className="py-wk-sm px-2 font-medium">Kategori</th>
                  <th className="py-wk-sm px-2 font-medium text-right">
                    Terjual
                  </th>
                  <th className="py-wk-sm px-2 font-medium text-right">
                    Total Pendapatan
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-wk-surface-container-high text-sm text-wk-on-surface">
                {stats.topProducts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-wk-on-surface-variant text-sm">
                      Belum ada penjualan hari ini.
                    </td>
                  </tr>
                ) : (
                  stats.topProducts.map((item, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-wk-surface-container-high/50 transition-colors"
                    >
                      <td className="py-wk-sm px-2 flex items-center gap-wk-sm">
                        <div className="w-8 h-8 rounded bg-wk-surface-container-high flex items-center justify-center overflow-hidden shrink-0 text-wk-on-surface-variant font-bold text-xs">
                          {item.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-wk-on-surface line-clamp-1">
                            {item.name}
                          </div>
                          <div className="text-xs text-wk-on-surface-variant">
                            Rp {item.price.toLocaleString('id-ID')}
                          </div>
                        </div>
                      </td>
                      <td className="py-wk-sm px-2 text-wk-on-surface-variant">
                        Produk
                      </td>
                      <td className="py-wk-sm px-2 text-right font-medium">
                        {item.quantity}
                      </td>
                      <td className="py-wk-sm px-2 text-right font-medium text-wk-primary">
                        Rp {item.total.toLocaleString('id-ID')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Transactions List */}
        <div className="bg-wk-surface-container-low rounded-xl p-4 sm:p-wk-lg shadow-sm flex flex-col justify-between border border-wk-surface-container/40">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-wk-heading text-lg sm:text-xl font-semibold text-wk-on-surface">
                Transaksi Terbaru
              </h2>
              <p className="text-xs sm:text-sm text-wk-on-surface-variant">
                Aktivitas kasir live hari ini
              </p>
            </div>
            <Link
              className="text-wk-primary text-xs sm:text-sm font-medium hover:underline cursor-pointer shrink-0 ml-wk-sm"
              to="/pos"
            >
              Buka Kasir
            </Link>
          </div>

          <div className="space-y-wk-sm">
            {stats.recentTransactions.length === 0 ? (
              <div className="py-8 text-center text-wk-on-surface-variant text-sm bg-wk-surface-container-lowest rounded-xl border border-wk-surface-container-high/50 p-4">
                <p className="font-medium text-wk-on-surface">Belum Ada Transaksi</p>
                <p className="text-xs mt-1">Transaksi baru di Kasir POS akan otomatis tercatat di sini.</p>
              </div>
            ) : (
              stats.recentTransactions.map((trx) => (
                <div
                  key={trx.id}
                  className="flex items-center justify-between p-wk-sm bg-wk-surface-container-lowest rounded-xl border border-wk-surface-container-high/50"
                >
                  <div className="flex items-center gap-wk-sm sm:gap-wk-md min-w-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-wk-primary-fixed/30 text-wk-primary">
                      <Receipt size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-wk-xs flex-wrap">
                        <span className="font-medium text-xs sm:text-sm text-wk-on-surface">
                          #TRX-{trx.id.toString().padStart(4, '0')}
                        </span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                            trx.paymentMethod === 'qris'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {trx.paymentMethod === 'qris' ? 'QRIS' : 'Cash'}
                        </span>
                      </div>
                      <div className="text-[11px] text-wk-on-surface-variant">
                        {new Date(trx.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2 sm:ml-wk-sm">
                    <div className="font-semibold text-xs sm:text-sm text-wk-on-surface">
                      Rp {trx.total.toLocaleString('id-ID')}
                    </div>
                    <span className="inline-block text-[10px] px-2 py-0.5 rounded-full font-medium bg-wk-primary-fixed/40 text-wk-on-primary-fixed">
                      Selesai
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="pt-3 sm:pt-wk-md mt-3 sm:mt-wk-md border-t border-wk-surface-container-high flex flex-col sm:flex-row sm:items-center justify-between text-xs sm:text-sm text-wk-on-surface-variant gap-1 sm:gap-0">
            <span>Total {stats.todayTransactionCount} transaksi hari ini</span>
            <span className="text-wk-primary font-medium">
              Kasir Drawer Seimbang
            </span>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
