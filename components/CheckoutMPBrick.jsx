'use client'

// DEPRECATED: This component uses Payment Brick which can cause card-form conflicts
// Use MercadoPagoCheckout (Wallet Brick) instead
// import { Payment } from '@mercadopago/sdk-react'
import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { initializeMercadoPago, isMercadoPagoInitialized } from '@/lib/mercadopago/init'

/**
 * Mercado Pago Payment Brick Component (Production-Ready)
 * 
 * This component:
 * 1. Fetches preferenceId from backend (server-side preference creation)
 * 2. Initializes Mercado Pago SDK once globally
 * 3. Renders Payment Brick ONLY after preferenceId is available
 * 4. Handles errors with visible UI feedback
 * 
 * @param {Object} props
 * @param {Array} props.items - Cart items: [{ name, quantity, price }]
 * @param {number} props.total - Total amount (MXN)
 * @param {string} props.orderId - Order ID (optional, for external_reference)
 * @param {string} props.buyerEmail - Buyer email (optional)
 * @param {string} props.buyerName - Buyer name (optional)
 * @param {string} props.buyerPhone - Buyer phone (optional)
 * @param {Object} props.shippingAddress - Shipping address (optional)
 * @param {Function} props.onPaymentSuccess - Callback when payment succeeds
 * @param {Function} props.onPaymentError - Callback when payment fails
 */
export default function CheckoutMPBrick({
  items,
  total,
  orderId,
  buyerEmail,
  buyerName,
  buyerPhone,
  shippingAddress,
  onPaymentSuccess,
  onPaymentError,
}) {
  // State management
  const [preferenceId, setPreferenceId] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isBrickReady, setIsBrickReady] = useState(false)
  const containerRef = useRef(null)

  // Validate inputs
  const numericTotal = useMemo(() => {
    const num = Number(total)
    return Number.isFinite(num) && num > 0 ? num : null
  }, [total])

  const isValidItems = useMemo(() => {
    return Array.isArray(items) && items.length > 0 && items.every(item => 
      item.name && Number.isFinite(Number(item.quantity)) && Number.isFinite(Number(item.price))
    )
  }, [items])

  // Initialize Mercado Pago SDK globally (once)
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Initialize SDK if not already done
    if (!isMercadoPagoInitialized()) {
      const publicKey = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY
      
      if (process.env.NODE_ENV === 'development') {
        const maskedKey = publicKey && publicKey.length > 14
          ? `${publicKey.substring(0, 10)}...${publicKey.substring(publicKey.length - 4)}`
          : 'not configured'
        console.log('🔑 Mercado Pago Public Key:', maskedKey)
      }

      const initialized = initializeMercadoPago()
      
      if (!initialized) {
        setError('Error al inicializar Mercado Pago. Verifica la configuración.')
        setIsLoading(false)
      }
    }
  }, [])

  // Fetch preferenceId from backend
  useEffect(() => {
    // Don't fetch if already have preferenceId or if inputs are invalid
    if (preferenceId || !numericTotal || !isValidItems) {
      if (!numericTotal || !isValidItems) {
        setError('El carrito está vacío o tiene datos inválidos')
        setIsLoading(false)
      }
      return
    }

    // Don't fetch if SDK not initialized
    if (!isMercadoPagoInitialized()) {
      return
    }

    const fetchPreference = async () => {
      setIsLoading(true)
      setError(null)

      try {
        if (process.env.NODE_ENV === 'development') {
          console.log('📤 Fetching Mercado Pago preference from backend...', {
            total: numericTotal,
            itemsCount: items.length,
            orderId: orderId || 'none',
          })
        }

        const response = await fetch('/api/mercadopago/preference', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            items: items.map(item => ({
              name: item.name || item.title,
              quantity: Number(item.quantity) || 1,
              price: Number(item.price) || 0,
            })),
            total: numericTotal,
            orderId,
            buyerEmail,
            buyerName,
            buyerPhone,
            shippingAddress,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Error al crear la preferencia de Mercado Pago')
        }

        if (!data.preferenceId || typeof data.preferenceId !== 'string') {
          throw new Error('La respuesta del servidor no contiene un preferenceId válido')
        }

        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Mercado Pago preferenceId received:', data.preferenceId)
        }

        setPreferenceId(data.preferenceId)
        setIsLoading(false)
      } catch (err) {
        console.error('❌ Error fetching Mercado Pago preference:', err)
        setError(err.message || 'Error al crear la preferencia de pago')
        setIsLoading(false)
        
        if (onPaymentError) {
          onPaymentError(err)
        }
      }
    }

    fetchPreference()
  }, [numericTotal, isValidItems, items, orderId, buyerEmail, buyerName, buyerPhone, shippingAddress, preferenceId, onPaymentError])

  // Handle Brick ready
  const handleReady = useCallback(() => {
    setIsBrickReady(true)
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Mercado Pago Payment Brick ready')
    }
  }, [])

  // Handle Brick errors
  const handleError = useCallback((error) => {
    console.error('❌ Mercado Pago Payment Brick error:', error)
    const errorMessage = error?.message || error?.toString() || 'Error desconocido en el formulario de pago'
    setError(errorMessage)
    
    if (onPaymentError) {
      onPaymentError(error)
    }
  }, [onPaymentError])

  // Handle payment submission (from Brick)
  // Note: When using preferenceId, the Payment Brick handles payment internally
  // and redirects based on back_urls. This callback is optional.
  const handleSubmit = useCallback(async ({ selectedPaymentMethod, formData }) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('📤 Payment form submitted:', {
        selectedPaymentMethod,
        hasFormData: !!formData,
        preferenceId,
      })
    }

    // Payment will be processed by Mercado Pago and user will be redirected
    // Payment status will be updated via webhook
  }, [preferenceId])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }
    }
  }, [])

  // Loading state
  if (isLoading) {
    return (
      <div className="w-full min-h-[620px] flex items-center justify-center border border-gray-300 rounded-lg bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00C6A2] mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando formulario de pago...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="w-full min-h-[620px] flex items-center justify-center border border-red-300 rounded-lg bg-red-50">
        <div className="text-center p-6">
          <div className="text-red-600 text-xl mb-2">⚠️</div>
          <p className="text-red-700 font-semibold mb-2">Error al cargar el formulario de pago</p>
          <p className="text-red-600 text-sm">{error}</p>
          <button
            onClick={() => {
              setError(null)
              setPreferenceId(null)
              setIsLoading(true)
            }}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Intentar de nuevo
          </button>
        </div>
      </div>
    )
  }

  // Don't render Brick until preferenceId is available
  if (!preferenceId) {
    return (
      <div className="w-full min-h-[620px] flex items-center justify-center border border-gray-300 rounded-lg bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00C6A2] mx-auto mb-4"></div>
          <p className="text-gray-600">Preparando formulario de pago...</p>
        </div>
      </div>
    )
  }

  // Render Payment Brick
  return (
    <div 
      className="w-full" 
      style={{ 
        contain: 'layout style paint',
        isolation: 'isolate',
        position: 'relative',
        overflow: 'visible',
      }}
    >
      <div 
        ref={containerRef}
        id="paymentBrick_container"
        className="w-full"
        style={{
          minWidth: '360px',
          width: '100%',
          height: '620px',
          minHeight: '620px',
          maxHeight: '620px',
          overflow: 'hidden',
          position: 'relative',
          contain: 'strict',
          isolation: 'isolate',
          boxSizing: 'border-box',
          display: 'block',
          flexShrink: 0,
          flexGrow: 0,
        }}
      >
        <Payment
          key={`mp-payment-${preferenceId}`}
          initialization={{ preferenceId }}
          onReady={handleReady}
          onError={handleError}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  )
}

