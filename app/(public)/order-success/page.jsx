'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle, ShoppingBag, Package } from 'lucide-react'
import Link from 'next/link'
import { getOrderById } from '@/lib/supabase/database'
import { supabase } from '@/lib/supabase/client'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

function OrderSuccessContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const [orderId, setOrderId] = useState(null)
    const [orderInfo, setOrderInfo] = useState(null)
    const [storeContact, setStoreContact] = useState(null)
    const [paymentStatus, setPaymentStatus] = useState(null) // success, failure, pending

    useEffect(() => {
        const id = searchParams.get('orderId')
        const status = searchParams.get('status') // Get status from URL
        if (id) {
            setOrderId(id)
            loadOrderInfo(id)
        }
        if (status) {
            setPaymentStatus(status)
        }
    }, [searchParams])

    const loadOrderInfo = async (id) => {
        try {
            const order = await getOrderById(id)
            setOrderInfo(order)
            
            // If courier externo, get store contact info and verify it's enabled
            if (order?.fulfillment_type === 'courierExterno' && order?.vendor_id) {
                const { data: vendor } = await supabase
                    .from('vendors')
                    .select('contact, name, fulfillment_modes')
                    .eq('id', order.vendor_id)
                    .single()
                
                // Only show WhatsApp if store has courierExterno enabled and has contact
                if (vendor?.contact && vendor?.fulfillment_modes?.courierExterno) {
                    setStoreContact({
                        contact: vendor.contact,
                        storeName: vendor.name
                    })
                }
            }
        } catch (error) {
            console.error('Error loading order info:', error)
        }
    }

    // Determine status display based on paymentStatus
    const isSuccess = !paymentStatus || paymentStatus === 'success' || paymentStatus === 'approved'
    const isFailure = paymentStatus === 'failure' || paymentStatus === 'rejected' || paymentStatus === 'cancelled'
    const isPending = paymentStatus === 'pending'

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#FAFAF6] px-4 py-8">
            <div className="max-w-lg w-full bg-white rounded-3xl shadow-xl p-8 sm:p-10 text-center">
                {/* Status Icon */}
                <div className="flex justify-center mb-6">
                    <div className="relative">
                        {isSuccess && (
                            <>
                                <div className="absolute inset-0 bg-[#00C6A2]/20 rounded-full animate-ping"></div>
                                <div className="relative bg-[#00C6A2]/10 rounded-full p-4">
                                    <CheckCircle size={64} className="text-[#00C6A2]" />
                                </div>
                            </>
                        )}
                        {isFailure && (
                            <div className="relative bg-red-100 rounded-full p-4">
                                <svg className="w-16 h-16 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                        )}
                        {isPending && (
                            <div className="relative bg-yellow-100 rounded-full p-4">
                                <svg className="w-16 h-16 text-yellow-500 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            </div>
                        )}
                    </div>
                </div>

                {/* Title */}
                <h1 className="text-3xl sm:text-4xl font-bold text-[#1A1A1A] mb-3">
                    {isSuccess && '¡Tu compra fue exitosa!'}
                    {isFailure && 'Pago rechazado'}
                    {isPending && 'Pago pendiente'}
                </h1>

                {/* Message */}
                <p className="text-[#1A1A1A]/70 mb-2 text-sm sm:text-base">
                    {isSuccess && 'Tu pedido ha sido procesado correctamente.'}
                    {isFailure && 'El pago no pudo ser procesado. Por favor, intenta nuevamente.'}
                    {isPending && 'Tu pago está siendo procesado. Te notificaremos cuando se confirme.'}
                </p>
                {orderId && (
                    <p className="text-xs text-[#1A1A1A]/50 mb-8">
                        ID de pedido: {orderId}
                    </p>
                )}
                <p className="text-sm text-[#1A1A1A]/60 mb-8">
                    Recibirás un correo de confirmación con los detalles de tu pedido.
                </p>

                {/* WhatsApp info for courier externo */}
                {orderInfo?.fulfillment_type === 'courierExterno' && storeContact?.contact && (
                    <div className='bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6'>
                        <p className='text-sm font-semibold text-blue-900 mb-2'>📱 Contacta a la tienda para coordinar la entrega</p>
                        <p className='text-xs text-blue-700 mb-3'>
                            Para envío coordinado, contacta directamente a <strong>{storeContact.storeName}</strong> para acordar los detalles de entrega.
                        </p>
                        <a 
                            href={`https://wa.me/${storeContact.contact.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className='inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105 active:scale-95'
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                            </svg>
                            Contactar por WhatsApp
                        </a>
                    </div>
                )}

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



