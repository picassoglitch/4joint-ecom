'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function CheckoutPendingClient({ orderId }) {
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
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-12 h-12 text-yellow-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Pago en Proceso</h1>
            <p className="text-gray-600">Estamos verificando tu pago. Te notificaremos cuando esté confirmado.</p>
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
                  <span className="font-medium text-yellow-600">En Proceso</span>
                </div>
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              <strong>Nota:</strong> Algunos métodos de pago pueden tardar unos minutos en confirmarse. 
              Revisa tu correo electrónico para recibir la confirmación.
            </p>
          </div>

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



