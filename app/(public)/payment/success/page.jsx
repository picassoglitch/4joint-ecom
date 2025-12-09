'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { useDispatch } from 'react-redux'
import { clearCart } from '@/lib/features/cart/cartSlice'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

function PaymentSuccessContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const dispatch = useDispatch()
    const [loading, setLoading] = useState(true)
    const paymentId = searchParams.get('payment_id')
    const status = searchParams.get('status')

    useEffect(() => {
        // Clear cart when payment is successful
        if (status === 'approved' && paymentId) {
            dispatch(clearCart())
            setLoading(false)
        } else {
            setLoading(false)
        }
    }, [paymentId, status, dispatch])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00C6A2]"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#FAFAF6]">
            <div className="max-w-md w-full mx-6 bg-white rounded-3xl shadow-lg p-8 text-center">
                {status === 'approved' ? (
                    <>
                        <div className="flex justify-center mb-4">
                            <CheckCircle size={64} className="text-[#00C6A2]" />
                        </div>
                        <h1 className="text-3xl font-bold text-[#1A1A1A] mb-4">
                            ¡Pago Exitoso!
                        </h1>
                        <p className="text-[#1A1A1A]/70 mb-6">
                            Tu pago ha sido procesado correctamente. Recibirás un correo de confirmación pronto.
                        </p>
                        {paymentId && (
                            <p className="text-sm text-[#1A1A1A]/50 mb-6">
                                ID de pago: {paymentId}
                            </p>
                        )}
                        <Link
                            href="/orders"
                            className="inline-block bg-[#00C6A2] hover:bg-[#00B894] text-white px-8 py-3 rounded-full font-semibold transition-all hover:scale-105 active:scale-95"
                        >
                            Ver Mis Pedidos
                        </Link>
                    </>
                ) : (
                    <>
                        <h1 className="text-3xl font-bold text-[#1A1A1A] mb-4">
                            Pago Pendiente
                        </h1>
                        <p className="text-[#1A1A1A]/70 mb-6">
                            Tu pago está siendo procesado. Te notificaremos cuando se complete.
                        </p>
                        <Link
                            href="/"
                            className="inline-block bg-[#00C6A2] hover:bg-[#00B894] text-white px-8 py-3 rounded-full font-semibold transition-all hover:scale-105 active:scale-95"
                        >
                            Volver al Inicio
                        </Link>
                    </>
                )}
            </div>
        </div>
    )
}

export default function PaymentSuccess() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00C6A2]"></div>
            </div>
        }>
            <PaymentSuccessContent />
        </Suspense>
    )
}

