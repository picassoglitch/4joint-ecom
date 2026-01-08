import { Suspense } from 'react'
import CheckoutFailureClient from './CheckoutFailureClient'

export const dynamic = 'force-dynamic'

export default function CheckoutFailurePage({ searchParams }) {
  const orderId = searchParams?.orderId || null

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00C6A2] mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    }>
      <CheckoutFailureClient orderId={orderId} />
    </Suspense>
  )
}

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
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Pago Rechazado</h1>
            <p className="text-gray-600">No se pudo procesar tu pago. Por favor, intenta de nuevo.</p>
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
                  <span className="font-medium text-red-600">Pago Rechazado</span>
                </div>
              </div>
            </div>
          )}

          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-800">
              <strong>Posibles causas:</strong>
            </p>
            <ul className="text-sm text-red-700 mt-2 text-left list-disc list-inside space-y-1">
              <li>Fondos insuficientes</li>
              <li>Datos de tarjeta incorrectos</li>
              <li>Tarjeta bloqueada o vencida</li>
              <li>Límite de transacción excedido</li>
            </ul>
          </div>

          <div className="space-y-4">
            <Link
              href="/cart"
              className="block w-full bg-[#00C6A2] text-white py-3 px-6 rounded-full hover:bg-[#00B894] transition-all font-medium"
            >
              Intentar de Nuevo
            </Link>
            <Link
              href="/shop"
              className="block w-full bg-gray-200 text-gray-800 py-3 px-6 rounded-full hover:bg-gray-300 transition-all font-medium"
            >
              Volver a la Tienda
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

