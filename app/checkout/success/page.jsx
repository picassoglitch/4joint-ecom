import { Suspense } from 'react'
import CheckoutSuccessClient from './CheckoutSuccessClient'

export const dynamic = 'force-dynamic'

export default function CheckoutSuccessPage({ searchParams }) {
  const orderId = searchParams?.orderId || null

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00C6A2] mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando...</p>
          </div>
        </div>
      }
    >
      <CheckoutSuccessClient orderId={orderId} />
    </Suspense>
  )
}
