import { NextResponse } from 'next/server'
import { MercadoPagoConfig, Preference } from 'mercadopago'

/**
 * Create Mercado Pago Preference API Route for Payment Bricks
 * 
 * This endpoint creates a preference in Mercado Pago server-side using Access Token.
 * Returns preferenceId for use in Payment Brick initialization.
 * 
 * SECURITY: Access Token is NEVER exposed to client - only used server-side.
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const {
      items,           // Array of cart items: [{ name, quantity, price }]
      total,           // Total amount (number)
      orderId,         // Our database order ID (optional, for external_reference)
      buyerEmail,      // Buyer email (optional)
      buyerName,       // Buyer name (optional)
      buyerPhone,      // Buyer phone (optional)
      shippingAddress, // Shipping address object (optional)
    } = body

    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Los items del carrito son requeridos' },
        { status: 400 }
      )
    }

    if (!total || typeof total !== 'number' || total <= 0) {
      return NextResponse.json(
        { error: 'El monto total debe ser un número mayor a 0' },
        { status: 400 }
      )
    }

    // Get Mercado Pago Access Token from environment (server-side only)
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN

    if (!accessToken) {
      console.error('❌ Mercado Pago Access Token not configured')
      return NextResponse.json(
        { error: 'Mercado Pago no está configurado en el servidor' },
        { status: 500 }
      )
    }

    // Initialize Mercado Pago SDK
    const client = new MercadoPagoConfig({ accessToken })
    const preference = new Preference(client)

    // Get site URL for callbacks
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

    // Build preference items - ensure all prices are numbers and in MXN
    const preferenceItems = items.map(item => ({
      title: item.name || item.title || 'Producto',
      quantity: Number(item.quantity) || 1,
      unit_price: Number(item.price) || 0,
      currency_id: 'MXN',
    }))

    // Validate items have valid prices
    const invalidItems = preferenceItems.filter(item => item.unit_price <= 0)
    if (invalidItems.length > 0) {
      return NextResponse.json(
        { error: 'Uno o más productos tienen precios inválidos' },
        { status: 400 }
      )
    }

    // Build preference body
    const preferenceBody = {
      items: preferenceItems,
      currency_id: 'MXN',
      statement_descriptor: '4joint',
      ...(orderId && { external_reference: String(orderId) }),
      notification_url: `${siteUrl}/api/mercadopago/webhook`,
      back_urls: {
        success: `${siteUrl}/payment/success${orderId ? `?orderId=${orderId}` : ''}`,
        failure: `${siteUrl}/payment/failure${orderId ? `?orderId=${orderId}` : ''}`,
        pending: `${siteUrl}/payment/pending${orderId ? `?orderId=${orderId}` : ''}`,
      },
      auto_return: 'approved',
    }

    // Add payer information if available
    if (buyerEmail) {
      preferenceBody.payer = {
        email: buyerEmail,
        ...(buyerName && { name: buyerName }),
        ...(buyerPhone && { phone: { number: String(buyerPhone).replace(/\D/g, '') } }),
      }
    }

    // Add shipping address if available
    if (shippingAddress && shippingAddress.zip) {
      preferenceBody.shipments = {
        receiver_address: {
          zip_code: String(shippingAddress.zip),
          street_name: shippingAddress.street || shippingAddress.address || '',
          street_number: shippingAddress.streetNumber || 'N/A',
          city_name: shippingAddress.city || '',
          state_name: shippingAddress.state || '',
          country_name: 'México',
        },
      }
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('📤 Creating Mercado Pago preference for Bricks:', {
        orderId: orderId || 'none',
        total,
        itemsCount: items.length,
        hasBuyerEmail: !!buyerEmail,
      })
    }

    // Create preference
    const response = await preference.create({ body: preferenceBody })

    if (!response || !response.id) {
      throw new Error('Error al crear la preferencia de Mercado Pago')
    }

    const preferenceId = String(response.id)

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Mercado Pago preference created:', preferenceId)
    }

    // Return ONLY preferenceId (no init_point needed for Bricks)
    return NextResponse.json({
      preferenceId,
    })
  } catch (error) {
    console.error('❌ Error creating Mercado Pago preference:', error)

    // Handle Mercado Pago API errors
    if (error.message?.includes('invalid_access_token') || error.message?.includes('401')) {
      return NextResponse.json(
        { error: 'Token de acceso de Mercado Pago inválido. Verifica las credenciales.' },
        { status: 401 }
      )
    }

    // Handle validation errors from Mercado Pago
    if (error.cause || error.status) {
      return NextResponse.json(
        {
          error: error.message || 'Error al crear la preferencia',
          cause: error.cause,
        },
        { status: error.status || 500 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

