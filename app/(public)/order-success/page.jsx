'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle, ShoppingBag, Package } from 'lucide-react'
import Link from 'next/link'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

function OrderSuccessContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const [orderId, setOrderId] = useState(null)

    useEffect(() => {
        const id = searchParams.get('orderId')
        if (id) {
            setOrderId(id)
        }
    }, [searchParams])

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#FAFAF6] px-4 py-8">
            <div className="max-w-lg w-full bg-white rounded-3xl shadow-xl p-8 sm:p-10 text-center">
                {/* Success Icon */}
                <div className="flex justify-center mb-6">
                    <div className="relative">
                        <div className="absolute inset-0 bg-[#00C6A2]/20 rounded-full animate-ping"></div>
                        <div className="relative bg-[#00C6A2]/10 rounded-full p-4">
                            <CheckCircle size={64} className="text-[#00C6A2]" />
                        </div>
                    </div>
                </div>

                {/* Title */}
                <h1 className="text-3xl sm:text-4xl font-bold text-[#1A1A1A] mb-3">
                    ¡Tu compra fue exitosa!
                </h1>

                {/* Message */}
                <p className="text-[#1A1A1A]/70 mb-2 text-sm sm:text-base">
                    Tu pedido ha sido procesado correctamente.
                </p>
                {orderId && (
                    <p className="text-xs text-[#1A1A1A]/50 mb-8">
                        ID de pedido: {orderId}
                    </p>
                )}
                <p className="text-sm text-[#1A1A1A]/60 mb-8">
                    Recibirás un correo de confirmación con los detalles de tu pedido.
                </p>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <Link
                        href="/shop"
                        className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-[#00C6A2] to-[#00B894] hover:from-[#00B894] hover:to-[#00A885] text-white px-6 py-3.5 rounded-lg font-semibold transition-all hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl"
                    >
                        <ShoppingBag size={20} />
                        Continuar Comprando
                    </Link>
                    <Link
                        href="/orders"
                        className="flex-1 flex items-center justify-center gap-2 bg-white border-2 border-[#00C6A2] text-[#00C6A2] hover:bg-[#00C6A2]/5 px-6 py-3.5 rounded-lg font-semibold transition-all hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
                    >
                        <Package size={20} />
                        Ver Pedidos
                    </Link>
                </div>
            </div>
        </div>
    )
}

export default function OrderSuccess() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-[#FAFAF6]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00C6A2]"></div>
            </div>
        }>
            <OrderSuccessContent />
        </Suspense>
    )
}


