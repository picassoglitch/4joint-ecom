'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function CheckoutSuccessClient({ orderId }) {
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!orderId) {
      console.error('No orderId provided')
      setLoading(false)
      return
    }

    const fetchOrder = async () => {
      try {
        const response = await fetch(`/api/orders/${orderId}`)
        if (!response.ok) {
          throw new Error('Order not found')
        }
        const orderData = await response.json()
        setOrder(orderData)
      } catch (error) {
        console.error('Error fetching order:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchOrder()
  }, [orderId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00C6A2] mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando información del pedido...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAFAF6] py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="mb-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">¡Pago Aprobado!</h1>
            <p className="text-gray-600">Tu pedido ha sido procesado correctamente</p>
          </div>

          {order && (
            <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Detalles del Pedido</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Número de Pedido:</span>
                  <span className="font-medium text-gray-900">{order.id.slice(0, 8)}...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total:</span>
                  <span className="font-medium text-gray-900">MXN ${parseFloat(order.total).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Estado:</span>
                  <span className="font-medium text-green-600">
                    {order.is_paid ? 'Pagado' : order.status || 'Procesando'}
                  </span>
                </div>
                {order.payment_id && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">ID de Pago:</span>
                    <span className="font-medium text-gray-900 text-xs">{order.payment_id}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <Link
              href="/shop"
              className="block w-full bg-[#00C6A2] text-white py-3 px-6 rounded-full hover:bg-[#00B894] transition-all font-medium"
            >
              Volver a la Tienda
            </Link>
            {orderId && (
              <Link
                href={`/order-success?orderId=${orderId}`}
                className="block w-full bg-gray-200 text-gray-800 py-3 px-6 rounded-full hover:bg-gray-300 transition-all font-medium"
              >
                Ver Detalles del Pedido
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


