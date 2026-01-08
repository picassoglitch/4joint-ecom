'use client'

// DEPRECATED: This component uses Payment Brick which can cause card-form conflicts
// Use MercadoPagoCheckout (Wallet Brick) instead
// import { initMercadoPago, Payment } from '@mercadopago/sdk-react'
import { useEffect, useState, useRef, useMemo, useCallback } from 'react'

/**
 * Mercado Pago Payment Brick Component
 * 
 * This component renders the Payment Brick for embedded checkout.
 * Uses dynamic import to avoid SSR issues in Next.js.
 * 
 * @param {Object} props
 * @param {number} props.amount - Total amount to charge (in MXN)
 * @param {string} props.preferenceId - Mercado Pago preference ID (optional, required for wallet/credits)
 * @param {string} props.payerEmail - Payer email (optional)
 * @param {Function} props.onSubmit - Callback when payment form is submitted
 * @param {Function} props.onReady - Callback when Brick is ready
 * @param {Function} props.onError - Callback when error occurs
 */
export default function MercadoPagoPaymentBrick({
  amount,
  preferenceId,
  payerEmail,
  onSubmit,
  onReady,
  onError,
}) {
  // All hooks must be called in the same order every render
  // CRITICAL: All hooks below must be called unconditionally, in the same order, on every render
  const [isInitialized, setIsInitialized] = useState(false)
  const containerRef = useRef(null)
  const initializedRef = useRef(false)

  // Get public key from environment
  const publicKey = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY

  // Validate amount (must be done before early return)
  const numericAmount = Number.isFinite(Number(amount)) && Number(amount) > 0 
    ? Number(amount) 
    : null

  // Initialize Mercado Pago SDK once - MUST be called before any early returns
  useEffect(() => {
    if (!publicKey) {
      console.error('❌ Mercado Pago Public Key is not configured')
      if (onError) {
        onError(new Error('Mercado Pago no está configurado'))
      }
      return
    }

    if (initializedRef.current) {
      return // Already initialized
    }

    try {
      initMercadoPago(publicKey, {
        locale: 'es-MX',
      })
      initializedRef.current = true
      setIsInitialized(true)

      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Mercado Pago SDK initialized')
      }
    } catch (error) {
      console.error('❌ Error initializing Mercado Pago SDK:', error)
      if (onError) {
        onError(error)
      }
    }
  }, [publicKey, onError])

  // Build initialization object - memoized to prevent re-renders - MUST be before early return
  const initialization = useMemo(() => {
    if (!numericAmount) return { amount: 0 }
    
    const init = {
      amount: numericAmount,
    }

    // Add preferenceId if provided (required for wallet/credits)
    if (preferenceId) {
      init.preferenceId = preferenceId
    }

    // Add payer email if provided
    if (payerEmail) {
      init.payer = {
        email: payerEmail,
      }
    }

    return init
  }, [numericAmount, preferenceId, payerEmail])

  // Customization - only cards for now - memoized - MUST be before early return
  const customization = useMemo(() => ({
    paymentMethods: {
      creditCard: 'all',
      debitCard: 'all',
      // Uncomment if you want to enable other methods:
      // ticket: 'all',
      // bankTransfer: 'all',
      // mercadoPago: 'all', // Requires preferenceId
    },
  }), [])

  // Handle form submission - useCallback to prevent re-renders - MUST be before early return
  const handleSubmit = useCallback(async ({ selectedPaymentMethod, formData }) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('📤 Payment form submitted:', {
        selectedPaymentMethod,
        formData: {
          ...formData,
          // Don't log sensitive data
          token: formData.token ? '***' : undefined,
        },
      })
    }

    if (onSubmit) {
      try {
        await onSubmit({ selectedPaymentMethod, formData })
      } catch (error) {
        console.error('❌ Error in onSubmit callback:', error)
        throw error // Re-throw to let Brick handle it
      }
    }
  }, [onSubmit])

  // Handle Brick ready - useCallback - MUST be before early return
  const handleReady = useCallback(async () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Mercado Pago Payment Brick ready')
    }
    if (onReady) {
      onReady()
    }
  }, [onReady])

  // Handle errors - useCallback - MUST be before early return
  const handleError = useCallback(async (error) => {
    console.error('❌ Mercado Pago Payment Brick error:', error)
    if (onError) {
      onError(error)
    }
  }, [onError])

  // Suppress non-critical warnings from Mercado Pago SDK (only in production to reduce noise)
  // MUST be called before early return to follow Rules of Hooks
  useEffect(() => {
    // Only suppress in production to avoid hiding real errors in development
    if (process.env.NODE_ENV !== 'production') {
      return
    }

    const originalError = console.error
    const originalWarn = console.warn
    
    const suppressMercadoPagoSVGErrors = (...args) => {
      const errorMessage = args[0]?.toString() || ''
      // Suppress SVG attribute errors from Mercado Pago SDK (internal SDK issue)
      if (errorMessage.includes('<svg> attribute') && 
          (errorMessage.includes('Unexpected end of attribute') || 
           errorMessage.includes('Expected length'))) {
        return // Suppress this error - it's from Mercado Pago SDK internals
      }
      originalError.apply(console, args)
    }
    
    const suppressMercadoPagoCustomizationWarnings = (...args) => {
      const warningMessage = args[0]?.toString() || ''
      // Suppress customization warnings about empty CSS property values (internal SDK validation)
      if (warningMessage.includes('Bricks Customization') && 
          (warningMessage.includes('empty value for property') || 
           warningMessage.includes('is not valid'))) {
        return // Suppress this warning - it's from Mercado Pago SDK internals
      }
      originalWarn.apply(console, args)
    }
    
    console.error = suppressMercadoPagoSVGErrors
    console.warn = suppressMercadoPagoCustomizationWarnings

    return () => {
      console.error = originalError
      console.warn = originalWarn
    }
  }, [])

  // Prevent layout shifts - completely isolate container from document flow
  // MUST be called unconditionally - early return is inside the effect, not before it
  useEffect(() => {
    // Early return INSIDE the effect (not before calling useEffect)
    if (!containerRef.current || !isInitialized) return

    const container = containerRef.current
    
    // Force fixed dimensions immediately - prevent any changes
    const forceFixedDimensions = () => {
      if (container) {
        // Get initial dimensions once and lock them
        const rect = container.getBoundingClientRect()
        const width = rect.width > 0 ? `${rect.width}px` : '100%'
        const height = '620px'
        
        // Lock all dimensions with !important
        container.style.cssText = `
          width: ${width} !important;
          height: ${height} !important;
          min-width: ${width} !important;
          min-height: ${height} !important;
          max-width: ${width} !important;
          max-height: ${height} !important;
          overflow: hidden !important;
          position: relative !important;
          contain: strict !important;
          isolation: isolate !important;
          flex-shrink: 0 !important;
          flex-grow: 0 !important;
          box-sizing: border-box !important;
        `
      }
    }

    // Lock immediately
    forceFixedDimensions()

    // Lock all iframes and SVGs inside
    const lockAllElements = () => {
      const iframes = container.querySelectorAll('iframe')
      iframes.forEach(iframe => {
        iframe.style.cssText = `
          width: 100% !important;
          height: 620px !important;
          min-height: 620px !important;
          max-height: 620px !important;
          overflow: hidden !important;
          border: none !important;
          flex-shrink: 0 !important;
          flex-grow: 0 !important;
        `
      })

      // Also lock any SVG elements that might be causing issues
      const svgs = container.querySelectorAll('svg')
      svgs.forEach(svg => {
        if (!svg.getAttribute('width') || !svg.getAttribute('height')) {
          svg.setAttribute('width', '100%')
          svg.setAttribute('height', '100%')
        }
      })
    }

    // Lock elements immediately
    lockAllElements()

    // Use MutationObserver with throttling to prevent excessive updates
    let mutationTimeout = null
    const mutationObserver = new MutationObserver(() => {
      // Throttle mutations to max once per 500ms
      if (mutationTimeout) return
      mutationTimeout = setTimeout(() => {
        forceFixedDimensions()
        lockAllElements()
        mutationTimeout = null
      }, 500)
    })

    mutationObserver.observe(container, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class', 'width', 'height'],
    })

    // Throttle resize events to prevent excessive updates
    let resizeTimeout = null
    const handleResize = () => {
      if (resizeTimeout) return
      resizeTimeout = setTimeout(() => {
        forceFixedDimensions()
        lockAllElements()
        resizeTimeout = null
      }, 300)
    }
    window.addEventListener('resize', handleResize, { passive: true })

    return () => {
      if (mutationTimeout) clearTimeout(mutationTimeout)
      mutationObserver.disconnect()
      if (resizeTimeout) clearTimeout(resizeTimeout)
      window.removeEventListener('resize', handleResize)
      // Clean up iframe when component unmounts
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }
    }
  }, [isInitialized])

  // Early return AFTER all hooks are called
  if (!isInitialized || !publicKey || !numericAmount) {
    return (
      <div className="w-full min-h-[620px] flex items-center justify-center border border-gray-300 rounded-lg bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00C6A2] mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando formulario de pago...</p>
        </div>
      </div>
    )
  }

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
          willChange: 'auto',
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          // Prevent any layout shifts
          boxSizing: 'border-box',
          display: 'block',
          // Force stable layout
          flexShrink: 0,
          flexGrow: 0,
        }}
      >
        {isInitialized && (
          <div style={{ 
            width: '100%', 
            height: '620px',
            minHeight: '620px',
            maxHeight: '620px',
            contain: 'strict',
            isolation: 'isolate',
            position: 'relative',
            overflow: 'hidden',
            flexShrink: 0,
            flexGrow: 0,
          }}>
            <Payment
              key={`mp-payment-${numericAmount}-${preferenceId || 'no-pref'}`}
              initialization={initialization}
              customization={customization}
              onSubmit={handleSubmit}
              onReady={handleReady}
              onError={handleError}
            />
          </div>
        )}
      </div>
    </div>
  )
}

