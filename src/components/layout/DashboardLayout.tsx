import { Link, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import type { ReactNode } from 'react'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Tags,
  Warehouse,
  Receipt,
  ChartNoAxesCombined,
  Settings,
  CreditCard,
  Bell,
  User,
  Menu,
  X,
  LogOut,
} from 'lucide-react'
import { logoutFn } from '@/lib/auth'

interface DashboardLayoutProps {
  children: ReactNode
  user?: any
}

export function DashboardLayout({ children, user }: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const router = useRouter()

  async function handleLogout() {
    await logoutFn()
    router.navigate({ to: '/login' })
  }

  return (
    <div className="bg-wk-surface font-wk-body text-wk-on-surface min-h-screen flex">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full w-64 bg-wk-surface-container-low z-50 flex flex-col pt-wk-xl pb-wk-lg transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        <div className="px-wk-lg mb-wk-xl flex items-center justify-between gap-wk-sm">
          <div className="flex items-center gap-wk-sm">
            <img
              alt="Warung Logo"
              className="h-8 w-auto object-contain"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuA2wf_FLuqsVUU6fM4TgJQVfhlrASiXj1F8eIJiiJjwBQgU36Nj3BH-uA_t5d0KstB08LHbedBTsHB4Ba1WkUwNXlPt-IoSfLGDtJVaFzAQzjx3Knh2bDsLg7sYnu83VE3PfYA7O3jExLzdkcOPqwhuKhmAmtii5jELZwEbrRvbeaFIEQaDI7CSJZaugdP_vJUFE7kMlpudVN7vhp2l19XrsymNmBqPSUOlmNMhtUM0M998EPlkZ9o"
            />
            <span className="font-wk-heading font-semibold text-wk-primary tracking-tight truncate">
              {user?.store?.name || 'Warung Anda'}
            </span>
          </div>
          <button
            className="lg:hidden text-wk-on-surface-variant hover:text-wk-on-surface"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-wk-md space-y-wk-xxs overflow-y-auto">
          <Link
            to="/dashboard"
            className="flex items-center px-wk-md py-wk-sm rounded-xl transition-all hover:bg-wk-surface-container-high hover:text-wk-on-surface text-wk-on-surface-variant [&.active]:bg-wk-primary-container [&.active]:text-wk-on-primary-container [&.active]:font-medium"
            onClick={() => setIsSidebarOpen(false)}
          >
            <LayoutDashboard size={20} className="mr-wk-sm" />
            Dashboard
          </Link>
          <Link
            to="/pos"
            className="flex items-center px-wk-md py-wk-sm rounded-xl transition-all hover:bg-wk-surface-container-high hover:text-wk-on-surface text-wk-on-surface-variant [&.active]:bg-wk-primary-container [&.active]:text-wk-on-primary-container [&.active]:font-medium"
            onClick={() => setIsSidebarOpen(false)}
          >
            <ShoppingCart size={20} className="mr-wk-sm" />
            Kasir (POS)
          </Link>
          <Link
            to="/products"
            className="flex items-center px-wk-md py-wk-sm rounded-xl transition-all hover:bg-wk-surface-container-high hover:text-wk-on-surface text-wk-on-surface-variant [&.active]:bg-wk-primary-container [&.active]:text-wk-on-primary-container [&.active]:font-medium"
            onClick={() => setIsSidebarOpen(false)}
          >
            <Package size={20} className="mr-wk-sm" />
            Produk
          </Link>
          <a
            href="#"
            className="flex items-center px-wk-md py-wk-sm rounded-xl text-wk-on-surface-variant hover:bg-wk-surface-container-high hover:text-wk-on-surface transition-all"
          >
            <Tags size={20} className="mr-wk-sm" />
            Kategori
          </a>
          <Link
            to="/stock"
            className="flex items-center px-wk-md py-wk-sm rounded-xl transition-all hover:bg-wk-surface-container-high hover:text-wk-on-surface text-wk-on-surface-variant [&.active]:bg-wk-primary-container [&.active]:text-wk-on-primary-container [&.active]:font-medium"
            onClick={() => setIsSidebarOpen(false)}
          >
            <Warehouse size={20} className="mr-wk-sm" />
            Stok
          </Link>
          <a
            href="#"
            className="flex items-center px-wk-md py-wk-sm rounded-xl text-wk-on-surface-variant hover:bg-wk-surface-container-high hover:text-wk-on-surface transition-all"
          >
            <Receipt size={20} className="mr-wk-sm" />
            Transaksi
          </a>
          <a
            href="#"
            className="flex items-center px-wk-md py-wk-sm rounded-xl text-wk-on-surface-variant hover:bg-wk-surface-container-high hover:text-wk-on-surface transition-all"
          >
            <ChartNoAxesCombined size={20} className="mr-wk-sm" />
            Laporan
          </a>
          <a
            href="#"
            className="flex items-center px-wk-md py-wk-sm rounded-xl text-wk-on-surface-variant hover:bg-wk-surface-container-high hover:text-wk-on-surface transition-all"
          >
            <Settings size={20} className="mr-wk-sm" />
            Pengaturan
          </a>
        </nav>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 lg:pl-64 flex flex-col w-full min-h-screen overflow-x-hidden">
        {/* Header */}
        <header className="fixed top-0 left-0 lg:left-64 right-0 h-16 bg-wk-surface/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-30 flex items-center justify-between px-wk-md sm:px-wk-lg lg:px-wk-xl transition-all duration-300">
          <div className="flex items-center gap-wk-xs sm:gap-wk-md">
            <button
              className="lg:hidden p-2 -ml-2 text-wk-on-surface-variant hover:bg-wk-surface-container-high rounded-lg transition-colors"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={24} />
            </button>
            <div className="hidden sm:flex items-center gap-wk-xs bg-wk-primary-fixed/20 text-wk-on-primary-fixed px-wk-sm py-wk-xxs rounded-full text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-wk-primary animate-pulse"></span>
              Buka / Open
            </div>
            <div className="hidden sm:flex items-center gap-wk-xs bg-wk-secondary-container/20 text-wk-on-secondary-container px-wk-sm py-wk-xxs rounded-full text-xs font-medium">
              <CreditCard size={14} />
              Kasir Drawer: Aktif
            </div>
          </div>

          <div className="flex items-center gap-wk-sm sm:gap-wk-lg">
            <button className="relative p-wk-xs text-wk-on-surface-variant hover:text-wk-on-surface hover:bg-wk-surface-container-high rounded-full transition-colors cursor-pointer">
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-wk-error rounded-full ring-2 ring-wk-surface"></span>
            </button>
            <div className="flex items-center gap-wk-sm hover:opacity-80 transition-opacity">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-medium text-wk-on-surface">
                  {user?.name || 'Owner'}
                </div>
                <div className="text-xs text-wk-on-surface-variant">Owner</div>
              </div>
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-wk-primary flex items-center justify-center shrink-0">
                <User size={18} className="text-wk-on-primary" />
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="relative p-wk-xs text-wk-error hover:bg-wk-error-container/50 rounded-full transition-colors cursor-pointer ml-wk-sm flex items-center justify-center"
              title="Keluar"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="relative mt-16 bg-wk-surface flex-1 p-wk-md sm:p-wk-lg lg:p-wk-xl max-w-full">
          <div className="flex flex-col w-full pb-wk-xxl max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
