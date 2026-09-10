import { useState, useEffect, useRef } from 'react'
import { Link } from '@tanstack/react-router'
import { Bell, BellOff, ArrowRight, Loader2, AlertCircle, AlertTriangle } from 'lucide-react'
import { getStockNotificationsFn } from '@/server/stock'
import type { StockNotificationItem } from '@/server/stock'

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<StockNotificationItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)

  async function fetchNotifications(silent = false) {
    try {
      if (!silent) setIsLoading(true)
      const data = await getStockNotificationsFn()
      setNotifications(data)
    } catch (error) {
      console.error('Gagal memuat notifikasi stok:', error)
    } finally {
      if (!silent) setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('pointerdown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('pointerdown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  function handleToggle() {
    const nextState = !isOpen
    setIsOpen(nextState)
    if (nextState) {
      // Refresh notifications when opened
      fetchNotifications(true)
    }
  }

  const alertCount = notifications.length

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={handleToggle}
        className="relative p-1.5 sm:p-wk-xs text-wk-on-surface-variant hover:text-wk-on-surface hover:bg-wk-surface-container-high rounded-full transition-colors cursor-pointer flex items-center justify-center"
        title="Notifikasi Stok"
        aria-label={`Notifikasi Stok (${alertCount} pemberitahuan)`}
        aria-expanded={isOpen}
      >
        <Bell size={18} className="sm:w-5 sm:h-5" />
        {alertCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-wk-error text-white font-semibold text-[10px] sm:text-xs rounded-full flex items-center justify-center px-1 ring-2 ring-wk-surface shadow-xs">
            {alertCount > 99 ? '99+' : alertCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="absolute -right-16 sm:right-0 top-full mt-2 w-[min(20rem,calc(100vw-2rem))] bg-wk-surface-container-lowest border border-wk-surface-container rounded-2xl shadow-xl z-50 overflow-hidden"
          role="region"
          aria-label="Daftar Notifikasi Stok"
        >
          {/* Header */}
          <div className="px-wk-md py-3 border-b border-wk-surface-container flex items-center justify-between bg-wk-surface-container-low/50">
            <div className="flex items-center gap-2">
              <span className="font-wk-heading font-semibold text-sm text-wk-on-surface">
                Notifikasi Stok
              </span>
              {alertCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-wk-error-container text-wk-error">
                  {alertCount}
                </span>
              )}
            </div>
            {isLoading && (
              <Loader2 size={14} className="animate-spin text-wk-on-surface-variant" />
            )}
          </div>

          {/* List Content */}
          <div className="max-h-72 overflow-y-auto divide-y divide-wk-surface-container/60">
            {isLoading && notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-wk-on-surface-variant flex flex-col items-center justify-center gap-2">
                <Loader2 size={20} className="animate-spin text-wk-primary" />
                <span>Memeriksa stok produk...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center flex flex-col items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-wk-surface-container flex items-center justify-center mb-2 text-wk-on-surface-variant">
                  <BellOff size={18} />
                </div>
                <p className="text-sm font-semibold text-wk-on-surface">
                  Tidak ada notifikasi
                </p>
                <p className="text-xs text-wk-on-surface-variant mt-0.5">
                  Semua stok produk dalam kondisi aman
                </p>
              </div>
            ) : (
              notifications.map((item) => {
                const isHabis = item.status === 'Stok habis'
                return (
                  <Link
                    key={item.id}
                    to="/stock"
                    onClick={() => setIsOpen(false)}
                    className="block p-3 hover:bg-wk-surface-container-low transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="text-xs sm:text-sm font-medium text-wk-on-surface group-hover:text-wk-primary transition-colors line-clamp-1">
                        {item.name}
                      </h4>
                      <span
                        className={`shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          isHabis
                            ? 'bg-wk-error-container/40 text-wk-error border-wk-error/30'
                            : 'bg-wk-secondary-container/30 text-wk-secondary border-wk-secondary-container/50'
                        }`}
                      >
                        {isHabis ? (
                          <AlertCircle size={10} />
                        ) : (
                          <AlertTriangle size={10} />
                        )}
                        {item.status}
                      </span>
                    </div>
                    <p className="text-xs text-wk-on-surface-variant">
                      Stok saat ini:{' '}
                      <span
                        className={`font-semibold ${
                          isHabis ? 'text-wk-error' : 'text-wk-secondary'
                        }`}
                      >
                        {item.stock} {item.unit}
                      </span>
                    </p>
                  </Link>
                )
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-2.5 bg-wk-surface-container-low/50 border-t border-wk-surface-container text-center">
              <Link
                to="/stock"
                onClick={() => setIsOpen(false)}
                className="text-xs font-medium text-wk-primary hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Kelola Stok di Manajemen Stok</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
