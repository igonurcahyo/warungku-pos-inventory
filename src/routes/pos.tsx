import { useState, useMemo } from 'react'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { DashboardLayout } from '../components/layout/DashboardLayout'
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Package,
  X,
  Banknote,
} from 'lucide-react'
import { getSessionFn, getCurrentUserFn } from '@/lib/auth'
import { getCategoriesFn } from '@/server/products'
import { getPosProductsFn, createTransactionFn } from '@/server/pos'

export const Route = createFileRoute('/pos')({
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
      getPosProductsFn(),
      getCategoriesFn(),
    ])
    return { user, products: productsList, categories: categoriesList }
  },
  head: () => ({
    meta: [
      { title: 'Kasir / POS — WarungKu POS & Inventory' },
      {
        name: 'description',
        content: 'Kasir POS WarungKu — Point of Sale untuk warung Anda',
      },
    ],
  }),
  component: PosPage,
})

interface CartItem {
  productId: number
  name: string
  price: number
  quantity: number
  stock: number
  unit: string
}

interface SuccessData {
  transactionId: number
  total: number
  paidAmount: number
  changeAmount: number
}

function PosPage() {
  const { user, products: initialProducts, categories } = Route.useLoaderData()
  const router = useRouter()

  const [cart, setCart] = useState<CartItem[]>([])
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [paidAmountStr, setPaidAmountStr] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [successData, setSuccessData] = useState<SuccessData | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false)

  // Filter products client-side from loaded data
  const filteredProducts = useMemo(() => {
    let result = initialProducts
    if (search.trim()) {
      const term = search.trim().toLowerCase()
      result = result.filter((p) => p.name.toLowerCase().includes(term))
    }
    if (selectedCategory) {
      result = result.filter((p) => p.categoryId === selectedCategory)
    }
    return result
  }, [initialProducts, search, selectedCategory])

  // Cart computed values
  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart],
  )
  const paidAmount = Number(paidAmountStr) || 0
  const changeAmount = paidAmount - cartTotal
  const isPaymentInsufficient = cart.length > 0 && paidAmount < cartTotal
  const canPay = cart.length > 0 && paidAmount >= cartTotal && !isProcessing

  // Cart operations
  function addToCart(product: (typeof initialProducts)[0]) {
    if (product.stock <= 0) return

    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id)
      if (existing) {
        if (existing.quantity >= product.stock) return prev
        return prev.map((i) =>
          i.productId === product.id
            ? { ...i, quantity: i.quantity + 1 }
            : i,
        )
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          stock: product.stock,
          unit: product.unit,
        },
      ]
    })
    setErrorMsg('')
  }

  function updateQuantity(productId: number, delta: number) {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.productId !== productId) return item
          const newQty = item.quantity + delta
          if (newQty <= 0) return null
          if (newQty > item.stock) return item
          return { ...item, quantity: newQty }
        })
        .filter(Boolean) as CartItem[]
    })
  }

  function removeFromCart(productId: number) {
    setCart((prev) => prev.filter((i) => i.productId !== productId))
  }

  function clearCart() {
    setCart([])
    setPaidAmountStr('')
    setErrorMsg('')
    setIsMobileCartOpen(false)
  }

  async function handlePay() {
    if (!canPay) return
    setIsProcessing(true)
    setErrorMsg('')

    try {
      const result = await createTransactionFn({
        data: {
          items: cart.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
          })),
          paidAmount,
        },
      })

      setSuccessData(result)
      setCart([])
      setPaidAmountStr('')
      setIsMobileCartOpen(false)
      // Refresh loader data to get updated stock
      router.invalidate()
    } catch (err: any) {
      setErrorMsg(err.message || 'Transaksi gagal. Silakan coba lagi.')
    } finally {
      setIsProcessing(false)
    }
  }

  function formatRp(amount: number) {
    return `Rp${amount.toLocaleString('id-ID')}`
  }

  // Common Cart Items & Checkout Section Component
  const cartBodyContent = (
    <>
      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-wk-md space-y-2.5 sm:space-y-wk-sm min-h-0">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 sm:py-wk-xl text-wk-on-surface-variant">
            <ShoppingCart size={36} className="mb-2 opacity-30" />
            <p className="text-sm font-medium">Keranjang kosong</p>
            <p className="text-xs mt-0.5">Klik produk untuk menambahkan</p>
          </div>
        ) : (
          cart.map((item) => (
            <div
              key={item.productId}
              className="flex items-start gap-2.5 sm:gap-wk-sm p-2.5 sm:p-wk-sm bg-wk-surface-container-lowest rounded-xl border border-wk-surface-container-high/50"
            >
              <div className="flex-1 min-w-0">
                <div className="text-xs sm:text-sm font-medium text-wk-on-surface line-clamp-1">
                  {item.name}
                </div>
                <div className="text-[11px] sm:text-xs text-wk-on-surface-variant mt-0.5">
                  {formatRp(item.price)} × {item.quantity}
                </div>
                <div className="text-xs sm:text-sm font-semibold text-wk-primary mt-1">
                  {formatRp(item.price * item.quantity)}
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => updateQuantity(item.productId, -1)}
                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-wk-surface-container-high text-wk-on-surface-variant hover:bg-wk-surface-container-highest flex items-center justify-center transition-colors cursor-pointer"
                  title="Kurangi"
                >
                  <Minus size={13} />
                </button>
                <span className="w-6 sm:w-7 text-center text-xs sm:text-sm font-semibold text-wk-on-surface">
                  {item.quantity}
                </span>
                <button
                  onClick={() => updateQuantity(item.productId, 1)}
                  disabled={item.quantity >= item.stock}
                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-wk-surface-container-high text-wk-on-surface-variant hover:bg-wk-surface-container-highest flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  title={
                    item.quantity >= item.stock
                      ? 'Stok tidak mencukupi'
                      : 'Tambah'
                  }
                >
                  <Plus size={13} />
                </button>
                <button
                  onClick={() => removeFromCart(item.productId)}
                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg text-wk-error hover:bg-wk-error-container/50 flex items-center justify-center transition-colors cursor-pointer ml-1"
                  title="Hapus"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))
        )}
        {/* Stock warning */}
        {cart.some((item) => item.quantity >= item.stock) && (
          <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 p-2 rounded-lg">
            <AlertCircle size={14} className="shrink-0" />
            <span>Stok tidak mencukupi untuk beberapa item.</span>
          </div>
        )}
      </div>

      {/* Payment Section */}
      <div className="border-t border-wk-outline-variant/30 p-3 sm:p-wk-md space-y-2.5 sm:space-y-wk-sm bg-wk-surface-container-low/50">
        {/* Summary */}
        <div className="flex items-center justify-between">
          <span className="text-xs sm:text-sm text-wk-on-surface-variant">
            Total Belanja
          </span>
          <span className="font-wk-heading text-lg sm:text-xl font-bold text-wk-on-surface">
            {formatRp(cartTotal)}
          </span>
        </div>

        {/* Payment Input */}
        <div>
          <label className="text-xs font-medium text-wk-on-surface-variant mb-1 block">
            Uang Dibayar
          </label>
          <div className="relative">
            <Banknote
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-wk-outline"
            />
            <input
              type="number"
              placeholder="0"
              value={paidAmountStr}
              onChange={(e) => setPaidAmountStr(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-wk-surface-container-lowest border border-wk-outline-variant rounded-xl text-sm text-wk-on-surface placeholder:text-wk-outline focus:outline-none focus:ring-2 focus:ring-wk-primary/30 focus:border-wk-primary transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              min={0}
            />
          </div>
        </div>

        {/* Change */}
        {cart.length > 0 && paidAmount > 0 && (
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs sm:text-sm text-wk-on-surface-variant">
              Kembalian
            </span>
            <span
              className={`font-wk-heading text-base sm:text-lg font-bold ${
                changeAmount >= 0 ? 'text-wk-primary' : 'text-wk-error'
              }`}
            >
              {changeAmount >= 0
                ? formatRp(changeAmount)
                : `-${formatRp(Math.abs(changeAmount))}`}
            </span>
          </div>
        )}

        {/* Payment warning */}
        {isPaymentInsufficient && paidAmount > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-wk-error bg-wk-error-container/30 p-2 rounded-lg">
            <AlertCircle size={14} className="shrink-0" />
            <span>Pembayaran kurang.</span>
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="flex items-start gap-1.5 text-xs text-wk-error bg-wk-error-container/30 p-2 rounded-lg">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Pay Button */}
        <button
          onClick={handlePay}
          disabled={!canPay}
          className="w-full py-2.5 sm:py-wk-sm rounded-xl font-medium text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-wk-primary text-wk-on-primary hover:bg-wk-primary-container active:scale-[0.98] shadow-sm"
        >
          {isProcessing ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Memproses...
            </>
          ) : (
            <>
              <Banknote size={16} />
              Bayar {cart.length > 0 ? formatRp(cartTotal) : ''}
            </>
          )}
        </button>
      </div>
    </>
  )

  return (
    <DashboardLayout user={user}>
      <div className="flex flex-col lg:flex-row gap-4 sm:gap-wk-md lg:gap-wk-lg min-h-[calc(100vh-8rem)] pb-20 lg:pb-0">
        {/* LEFT — Product Catalog */}
        <div className="flex-1 lg:w-7/12 flex flex-col gap-3.5 sm:gap-wk-md">
          {/* Header */}
          <div>
            <h1 className="font-wk-heading text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-wk-on-surface">
              Kasir / POS
            </h1>
            <p className="text-xs sm:text-sm text-wk-on-surface-variant mt-0.5">
              Pilih produk untuk ditambahkan ke keranjang
            </p>
          </div>

          {/* Search */}
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-wk-outline"
            />
            <input
              type="text"
              placeholder="Cari produk..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2.5 bg-wk-surface-container-low border border-wk-outline-variant rounded-xl text-sm text-wk-on-surface placeholder:text-wk-outline focus:outline-none focus:ring-2 focus:ring-wk-primary/30 focus:border-wk-primary transition-all"
            />
          </div>

          {/* Category Filter — Scrollable on mobile, wrapping on tablet/desktop */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 sm:flex-wrap [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all cursor-pointer shrink-0 ${
                selectedCategory === null
                  ? 'bg-wk-primary text-wk-on-primary'
                  : 'bg-wk-surface-container-high text-wk-on-surface-variant hover:bg-wk-surface-container-highest'
              }`}
            >
              Semua
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() =>
                  setSelectedCategory(
                    selectedCategory === cat.id ? null : cat.id,
                  )
                }
                className={`px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all cursor-pointer shrink-0 ${
                  selectedCategory === cat.id
                    ? 'bg-wk-primary text-wk-on-primary'
                    : 'bg-wk-surface-container-high text-wk-on-surface-variant hover:bg-wk-surface-container-highest'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Product Grid */}
          {filteredProducts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 sm:py-wk-xxl text-wk-on-surface-variant">
              <Package size={42} className="mb-2 opacity-40" />
              <p className="text-sm font-medium">Tidak ada produk ditemukan</p>
              <p className="text-xs mt-1">
                Coba ubah kata kunci atau filter kategori
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 min-[360px]:grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-wk-sm">
              {filteredProducts.map((product) => {
                const inCart = cart.find((i) => i.productId === product.id)
                const outOfStock = product.stock <= 0
                return (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    disabled={outOfStock}
                    className={`text-left bg-wk-surface-container-low rounded-xl p-3 sm:p-wk-md shadow-xs transition-all group relative overflow-hidden border cursor-pointer ${
                      outOfStock
                        ? 'opacity-60 cursor-not-allowed border-wk-outline-variant/30'
                        : inCart
                          ? 'border-wk-primary ring-1 ring-wk-primary/20 shadow-sm'
                          : 'border-transparent hover:shadow-sm hover:border-wk-outline-variant/50 active:scale-[0.98]'
                    }`}
                  >
                    {/* In-cart badge */}
                    {inCart && (
                      <div className="absolute top-2 right-2 bg-wk-primary text-wk-on-primary text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-xs">
                        {inCart.quantity}
                      </div>
                    )}

                    <div className="flex items-start gap-2.5">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-wk-surface-container-high flex items-center justify-center shrink-0">
                        <Package
                          size={18}
                          className="text-wk-on-surface-variant"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-xs sm:text-sm text-wk-on-surface line-clamp-1">
                          {product.name}
                        </div>
                        <div className="text-[11px] text-wk-on-surface-variant mt-0.5 truncate">
                          {product.categoryName || 'Tanpa Kategori'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-wk-outline-variant/20">
                      <span className="font-wk-heading font-semibold text-xs sm:text-sm text-wk-primary">
                        {formatRp(product.price)}
                      </span>
                      {outOfStock ? (
                        <span className="bg-wk-error-container text-wk-error text-[10px] font-medium px-2 py-0.5 rounded-full">
                          Habis
                        </span>
                      ) : (
                        <span className="text-[11px] text-wk-on-surface-variant">
                          Stok: {product.stock}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* RIGHT — Cart Panel (Desktop view) */}
        <div className="hidden lg:block lg:w-5/12 xl:w-4/12">
          <div className="bg-wk-surface-container-low rounded-xl shadow-sm border border-wk-outline-variant/30 sticky top-20 flex flex-col max-h-[calc(100vh-6rem)]">
            {/* Cart Header */}
            <div className="flex items-center justify-between p-wk-md border-b border-wk-outline-variant/30">
              <div className="flex items-center gap-2">
                <ShoppingCart size={20} className="text-wk-primary" />
                <h2 className="font-wk-heading font-semibold text-wk-on-surface">
                  Keranjang
                </h2>
                {cart.length > 0 && (
                  <span className="bg-wk-primary text-wk-on-primary text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {cart.length}
                  </span>
                )}
              </div>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-xs text-wk-error hover:text-wk-error/80 font-medium cursor-pointer transition-colors"
                >
                  Kosongkan
                </button>
              )}
            </div>

            {cartBodyContent}
          </div>
        </div>
      </div>

      {/* MOBILE STICKY BOTTOM CHECKOUT BAR */}
      {cart.length > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-wk-surface-container-lowest/95 backdrop-blur-md border-t border-wk-outline-variant/30 px-3.5 py-2.5 shadow-lg flex items-center justify-between gap-3 animate-in slide-in-from-bottom duration-150">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="bg-wk-primary text-wk-on-primary text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                {cart.reduce((s, i) => s + i.quantity, 0)} item
              </span>
              <span className="text-xs text-wk-on-surface-variant font-medium">Total:</span>
            </div>
            <div className="font-wk-heading font-bold text-base text-wk-primary truncate">
              {formatRp(cartTotal)}
            </div>
          </div>
          <button
            onClick={() => setIsMobileCartOpen(true)}
            className="px-4 py-2 rounded-xl bg-wk-primary hover:bg-wk-primary-container text-wk-on-primary font-semibold text-xs sm:text-sm shadow-sm flex items-center gap-1.5 shrink-0 transition-all cursor-pointer active:scale-95"
          >
            <ShoppingCart size={15} />
            <span>Lihat & Bayar</span>
          </button>
        </div>
      )}

      {/* MOBILE CART SLIDE-UP DRAWER */}
      {isMobileCartOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex flex-col justify-end">
          <div className="bg-wk-surface rounded-t-2xl max-h-[88vh] flex flex-col shadow-2xl border-t border-wk-outline-variant/30 animate-in slide-in-from-bottom duration-200">
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-3.5 border-b border-wk-outline-variant/30">
              <div className="flex items-center gap-2">
                <ShoppingCart size={18} className="text-wk-primary" />
                <h3 className="font-wk-heading font-bold text-base text-wk-on-surface">
                  Keranjang Belanja
                </h3>
                <span className="bg-wk-primary text-wk-on-primary text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                  {cart.length} item
                </span>
              </div>
              <div className="flex items-center gap-2">
                {cart.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-xs text-wk-error hover:underline font-medium"
                  >
                    Kosongkan
                  </button>
                )}
                <button
                  onClick={() => setIsMobileCartOpen(false)}
                  className="p-1 text-wk-on-surface-variant hover:text-wk-on-surface rounded-full hover:bg-wk-surface-container"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Content */}
            {cartBodyContent}
          </div>
        </div>
      )}

      {/* Success Modal */}
      {successData && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-wk-surface-container-lowest rounded-2xl shadow-2xl max-w-md w-full p-4 sm:p-wk-lg relative animate-in fade-in zoom-in-95 duration-200 border border-wk-outline-variant/30">
            <button
              onClick={() => setSuccessData(null)}
              className="absolute top-3.5 right-3.5 text-wk-on-surface-variant hover:text-wk-on-surface cursor-pointer p-1 rounded-full hover:bg-wk-surface-container"
            >
              <X size={20} />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-wk-primary/10 flex items-center justify-center mb-3 sm:mb-wk-md">
                <CheckCircle2 size={32} className="text-wk-primary" />
              </div>
              <h3 className="font-wk-heading text-lg sm:text-xl font-bold text-wk-on-surface">
                Transaksi Berhasil!
              </h3>
              <p className="text-xs text-wk-on-surface-variant mt-1">
                Nomor Transaksi
              </p>
              <span className="font-wk-heading text-base sm:text-lg font-bold text-wk-primary mt-0.5">
                TRX-{String(successData.transactionId).padStart(4, '0')}
              </span>
            </div>

            <div className="mt-4 sm:mt-wk-lg space-y-2.5 bg-wk-surface-container rounded-xl p-3 sm:p-wk-md">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="text-wk-on-surface-variant">
                  Total Belanja
                </span>
                <span className="font-semibold text-wk-on-surface">
                  {formatRp(successData.total)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="text-wk-on-surface-variant">
                  Uang Dibayar
                </span>
                <span className="font-semibold text-wk-on-surface">
                  {formatRp(successData.paidAmount)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs sm:text-sm border-t border-wk-outline-variant/30 pt-2 sm:pt-wk-sm">
                <span className="text-wk-on-surface-variant font-medium">
                  Kembalian
                </span>
                <span className="font-wk-heading text-base sm:text-lg font-bold text-wk-primary">
                  {formatRp(successData.changeAmount)}
                </span>
              </div>
            </div>

            <button
              onClick={() => setSuccessData(null)}
              className="w-full mt-4 sm:mt-wk-lg py-2.5 rounded-xl bg-wk-primary text-wk-on-primary font-medium text-xs sm:text-sm hover:bg-wk-primary-container transition-all cursor-pointer"
            >
              Transaksi Baru
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
