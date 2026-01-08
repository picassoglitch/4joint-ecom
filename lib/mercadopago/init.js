/**
 * Global Mercado Pago SDK Initialization
 * 
 * This module ensures initMercadoPago is called only once globally,
 * preventing multiple initializations and potential issues.
 */

import { initMercadoPago } from '@mercadopago/sdk-react'

let isInitialized = false
let initializationError = null

/**
 * Initialize Mercado Pago SDK globally (only once)
 * 
 * @returns {boolean} True if initialized successfully, false otherwise
 */
export function initializeMercadoPago() {
  // Return early if already initialized
  if (isInitialized) {
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Mercado Pago SDK already initialized')
    }
    return true
  }

  // Return early if there was a previous error
  if (initializationError) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ Mercado Pago SDK initialization previously failed:', initializationError)
    }
    return false
  }

  // Get public key from environment
  const publicKey = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY

  if (!publicKey) {
    const error = new Error('Mercado Pago Public Key is not configured')
    initializationError = error
    console.error('❌ Mercado Pago Public Key is not configured')
    return false
  }

  try {
    // Mask public key for logging (show first 10 and last 4 characters)
    const maskedKey = publicKey.length > 14
      ? `${publicKey.substring(0, 10)}...${publicKey.substring(publicKey.length - 4)}`
      : '***'

    if (process.env.NODE_ENV === 'development') {
      console.log('🔑 Initializing Mercado Pago SDK with public key:', maskedKey)
    }

    // Initialize SDK
    initMercadoPago(publicKey, {
      locale: 'es-MX',
    })

    isInitialized = true

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Mercado Pago SDK initialized successfully')
    }

    return true
  } catch (error) {
    initializationError = error
    console.error('❌ Error initializing Mercado Pago SDK:', error)
    return false
  }
}

/**
 * Check if Mercado Pago SDK is initialized
 */
export function isMercadoPagoInitialized() {
  return isInitialized
}

/**
 * Get initialization error if any
 */
export function getInitializationError() {
  return initializationError
}

