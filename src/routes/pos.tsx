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

  return (
    <DashboardLayout user={user}>
      <div className="flex flex-col lg:flex-row gap-wk-md lg:gap-wk-lg min-h-[calc(100vh-8rem)]">
        {/* LEFT — Product Catalog */}
        <div className="flex-1 lg:w-7/12 flex flex-col gap-wk-md">
          {/* Header */}
          <div>
            <h1 className="font-wk-heading text-2xl lg:text-3xl font-bold tracking-tight text-wk-on-surface">
              Kasir / POS
            </h1>
            <p className="text-sm text-wk-on-surface-variant mt-wk-xxs">
              Pilih produk untuk ditambahkan ke keranjang
            </p>
          </div>

          {/* Search */}
          <div className="relative">
            <Search
              size={18}
              className="absolute left-wk-sm top-1/2 -translate-y-1/2 text-wk-outline"
            />
            <input
              type="text"
              placeholder="Cari produk..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-wk-md py-wk-sm bg-wk-surface-container-low border border-wk-outline-variant rounded-xl text-sm text-wk-on-surface placeholder:text-wk-outline focus:outline-none focus:ring-2 focus:ring-wk-primary/30 focus:border-wk-primary transition-all"
            />
          </div>

          {/* Category Filter */}
          <div className="flex gap-wk-xs flex-wrap">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-wk-md py-wk-xs rounded-full text-sm font-medium transition-all cursor-pointer ${
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
                className={`px-wk-md py-wk-xs rounded-full text-sm font-medium transition-all cursor-pointer ${
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
            <div className="flex-1 flex flex-col items-center justify-center py-wk-xxl text-wk-on-surface-variant">
              <Package size={48} className="mb-wk-md opacity-40" />
              <p className="text-sm font-medium">Tidak ada produk ditemukan</p>
              <p className="text-xs mt-wk-xxs">
                Coba ubah kata kunci atau filter kategori
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-wk-sm">
              {filteredProducts.map((product) => {
                const inCart = cart.find((i) => i.productId === product.id)
                const outOfStock = product.stock <= 0
                return (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    disabled={outOfStock}
                    className={`text-left bg-wk-surface-container-low rounded-xl p-wk-md shadow-sm transition-all group relative overflow-hidden border cursor-pointer ${
                      outOfStock
                        ? 'opacity-60 cursor-not-allowed border-wk-outline-variant/30'
                        : inCart
                          ? 'border-wk-primary ring-1 ring-wk-primary/20 shadow-md'
                          : 'border-transparent hover:shadow-md hover:border-wk-outline-variant/50 active:scale-[0.98]'
                    }`}
                  >
                    {/* In-cart badge */}
                    {inCart && (
                      <div className="absolute top-wk-xs right-wk-xs bg-wk-primary text-wk-on-primary text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                        {inCart.quantity}
                      </div>
                    )}

                    <div className="flex items-start gap-wk-sm">
                      <div className="w-10 h-10 rounded-lg bg-wk-surface-container-high flex items-center justify-center shrink-0">
                        <Package
                          size={20}
                          className="text-wk-on-surface-variant"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm text-wk-on-surface line-clamp-1">
                          {product.name}
                        </div>
                        <div className="text-xs text-wk-on-surface-variant mt-0.5">
                          {product.categoryName || 'Tanpa Kategori'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-wk-sm">
                      <span className="font-wk-heading font-semibold text-sm text-wk-primary">
                        {formatRp(product.price)}
                      </span>
                      {outOfStock ? (
                        <span className="bg-wk-error-container text-wk-error text-[10px] font-medium px-wk-xs py-0.5 rounded-full">
                          Stok Habis
                        </span>
                      ) : (
                        <span className="text-xs text-wk-on-surface-variant">
                          Stok: {product.stock} {product.unit}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* RIGHT — Cart Panel */}
        <div className="lg:w-5/12 xl:w-4/12">
          <div className="bg-wk-surface-container-low rounded-xl shadow-sm border border-wk-outline-variant/30 lg:sticky lg:top-20 flex flex-col max-h-[calc(100vh-6rem)]">
            {/* Cart Header */}
            <div className="flex items-center justify-between p-wk-md border-b border-wk-outline-variant/30">
              <div className="flex items-center gap-wk-xs">
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

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-wk-md space-y-wk-sm min-h-0">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-wk-xl text-wk-on-surface-variant">
                  <ShoppingCart
                    size={40}
                    className="mb-wk-sm opacity-30"
                  />
                  <p className="text-sm">Keranjang kosong</p>
                  <p className="text-xs mt-wk-xxs">
                    Klik produk untuk menambahkan
                  </p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.productId}
                    className="flex items-start gap-wk-sm p-wk-sm bg-wk-surface-container-lowest rounded-lg border border-wk-surface-container-high/50"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-wk-on-surface line-clamp-1">
                        {item.name}
                      </div>
                      <div className="text-xs text-wk-on-surface-variant mt-0.5">
                        {formatRp(item.price)} × {item.quantity}
                      </div>
                      <div className="text-sm font-semibold text-wk-primary mt-wk-xxs">
                        {formatRp(item.price * item.quantity)}
                      </div>
                    </div>

                    <div className="flex items-center gap-wk-xxs shrink-0">
                      <button
                        onClick={() => updateQuantity(item.productId, -1)}
                        className="w-7 h-7 rounded-lg bg-wk-surface-container-high text-wk-on-surface-variant hover:bg-wk-surface-container-highest flex items-center justify-center transition-colors cursor-pointer"
                        title="Kurangi"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-7 text-center text-sm font-medium text-wk-on-surface">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.productId, 1)}
                        disabled={item.quantity >= item.stock}
                        className="w-7 h-7 rounded-lg bg-wk-surface-container-high text-wk-on-surface-variant hover:bg-wk-surface-container-highest flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        title={
                          item.quantity >= item.stock
                            ? 'Stok tidak mencukupi'
                            : 'Tambah'
                        }
                      >
                        <Plus size={14} />
                      </button>
                      <button
                        onClick={() => removeFromCart(item.productId)}
                        className="w-7 h-7 rounded-lg text-wk-error hover:bg-wk-error-container/50 flex items-center justify-center transition-colors cursor-pointer ml-wk-xxs"
                        title="Hapus"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
              {/* Stock warning */}
              {cart.some((item) => item.quantity >= item.stock) && (
                <div className="flex items-center gap-wk-xs text-xs text-wk-secondary bg-wk-secondary-container/10 p-wk-xs rounded-lg">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>Stok tidak mencukupi untuk beberapa item.</span>
                </div>
              )}
            </div>

            {/* Payment Section */}
            <div className="border-t border-wk-outline-variant/30 p-wk-md space-y-wk-sm">
              {/* Summary */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-wk-on-surface-variant">
                  Total Belanja
                </span>
                <span className="font-wk-heading text-xl font-bold text-wk-on-surface">
                  {formatRp(cartTotal)}
                </span>
              </div>

              {/* Payment Input */}
              <div>
                <label className="text-xs font-medium text-wk-on-surface-variant mb-wk-xxs block">
                  Uang Dibayar
                </label>
                <div className="relative">
                  <Banknote
                    size={16}
                    className="absolute left-wk-sm top-1/2 -translate-y-1/2 text-wk-outline"
                  />
                  <input
                    type="number"
                    placeholder="0"
                    value={paidAmountStr}
                    onChange={(e) => setPaidAmountStr(e.target.value)}
                    className="w-full pl-9 pr-wk-md py-wk-sm bg-wk-surface-container-lowest border border-wk-outline-variant rounded-lg text-sm text-wk-on-surface placeholder:text-wk-outline focus:outline-none focus:ring-2 focus:ring-wk-primary/30 focus:border-wk-primary transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    min={0}
                  />
                </div>
              </div>

              {/* Change */}
              {cart.length > 0 && paidAmount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-wk-on-surface-variant">
                    Kembalian
                  </span>
                  <span
                    className={`font-wk-heading text-lg font-bold ${
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
                <div className="flex items-center gap-wk-xs text-xs text-wk-error bg-wk-error-container/30 p-wk-xs rounded-lg">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>Pembayaran kurang.</span>
                </div>
              )}

              {/* Error message */}
              {errorMsg && (
                <div className="flex items-start gap-wk-xs text-xs text-wk-error bg-wk-error-container/30 p-wk-sm rounded-lg">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Pay Button */}
              <button
                onClick={handlePay}
                disabled={!canPay}
                className="w-full py-wk-sm rounded-xl font-medium text-sm transition-all cursor-pointer flex items-center justify-center gap-wk-xs disabled:opacity-50 disabled:cursor-not-allowed bg-wk-primary text-wk-on-primary hover:bg-wk-primary-container active:scale-[0.98]"
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <Banknote size={18} />
                    Bayar {cart.length > 0 ? formatRp(cartTotal) : ''}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {successData && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-wk-md">
          <div className="bg-wk-surface-container-lowest rounded-2xl shadow-2xl max-w-md w-full p-wk-xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setSuccessData(null)}
              className="absolute top-wk-md right-wk-md text-wk-on-surface-variant hover:text-wk-on-surface cursor-pointer"
            >
              <X size={20} />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-wk-primary/10 flex items-center justify-center mb-wk-md">
                <CheckCircle2 size={36} className="text-wk-primary" />
              </div>
              <h3 className="font-wk-heading text-xl font-bold text-wk-on-surface">
                Transaksi Berhasil!
              </h3>
              <p className="text-sm text-wk-on-surface-variant mt-wk-xxs">
                Nomor Transaksi
              </p>
              <span className="font-wk-heading text-lg font-bold text-wk-primary mt-wk-xxs">
                TRX-{String(successData.transactionId).padStart(4, '0')}
              </span>
            </div>

            <div className="mt-wk-lg space-y-wk-sm bg-wk-surface-container rounded-xl p-wk-md">
              <div className="flex items-center justify-between text-sm">
                <span className="text-wk-on-surface-variant">
                  Total Belanja
                </span>
                <span className="font-semibold text-wk-on-surface">
                  {formatRp(successData.total)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-wk-on-surface-variant">
                  Uang Dibayar
                </span>
                <span className="font-semibold text-wk-on-surface">
                  {formatRp(successData.paidAmount)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm border-t border-wk-outline-variant/30 pt-wk-sm">
                <span className="text-wk-on-surface-variant font-medium">
                  Kembalian
                </span>
                <span className="font-wk-heading text-lg font-bold text-wk-primary">
                  {formatRp(successData.changeAmount)}
                </span>
              </div>
            </div>

            <button
              onClick={() => setSuccessData(null)}
              className="w-full mt-wk-lg py-wk-sm rounded-xl bg-wk-primary text-wk-on-primary font-medium text-sm hover:bg-wk-primary-container transition-all cursor-pointer"
            >
              Transaksi Baru
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
