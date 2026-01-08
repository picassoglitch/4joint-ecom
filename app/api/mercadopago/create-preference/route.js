import { NextResponse } from 'next/server'
import { MercadoPagoConfig, Preference } from 'mercadopago'

/**
 * Create Mercado Pago Preference API Route
 * 
 * This endpoint creates a preference in Mercado Pago for Checkout Pro (redirect flow)
 * and returns the init_point URL to redirect the user.
 */
export async function POST(request) {
  try {
    const { orderId, items, total, buyerEmail, buyerName, buyerPhone, shippingAddress } = await request.json()

    // Validate input
    if (!orderId) {
      return NextResponse.json(
        { error: 'El ID de la orden es requerido' },
        { status: 400 }
      )
    }

    if (!total || total <= 0) {
      return NextResponse.json(
        { error: 'El monto debe ser mayor a 0' },
        { status: 400 }
      )
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Los items de la orden son requeridos' },
        { status: 400 }
      )
    }

    // Get Mercado Pago credentials
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

    // Build preference items
    const preferenceItems = items.map(item => ({
      title: item.name || item.title || 'Producto',
      quantity: item.quantity || 1,
      unit_price: Number(item.price) || 0,
      currency_id: 'MXN',
    }))

    // Build preference body
    const preferenceBody = {
      items: preferenceItems,
      external_reference: String(orderId), // Our database order ID
      notification_url: `${siteUrl}/api/mercadopago/webhook`,
      back_urls: {
        success: `${siteUrl}/payment/success?orderId=${orderId}`,
        failure: `${siteUrl}/payment/failure?orderId=${orderId}`,
        pending: `${siteUrl}/payment/pending?orderId=${orderId}`,
      },
      auto_return: 'approved',
      statement_descriptor: '4joint',
    }

    // Add payer information if available
    if (buyerEmail) {
      preferenceBody.payer = {
        email: buyerEmail,
        ...(buyerName && { name: buyerName }),
        ...(buyerPhone && { phone: { number: buyerPhone.replace(/\D/g, '') } }),
      }
    }

    // Add shipping address if available
    if (shippingAddress && shippingAddress.street && shippingAddress.city && shippingAddress.zip) {
      preferenceBody.shipments = {
        receiver_address: {
          zip_code: shippingAddress.zip,
          street_name: shippingAddress.street,
          street_number: shippingAddress.streetNumber || 'N/A',
          city_name: shippingAddress.city,
          state_name: shippingAddress.state || '',
          country_name: 'México',
        },
      }
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('📤 Creating Mercado Pago preference:', {
        orderId,
        total,
        itemsCount: items.length,
      })
    }

    // Create preference
    const response = await preference.create({ body: preferenceBody })

    if (!response || !response.id) {
      throw new Error('Error al crear la preferencia de Mercado Pago')
    }

    const preferenceId = response.id
    const initPoint = response.init_point

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Mercado Pago preference created:', preferenceId)
    }

    return NextResponse.json({
      preferenceId,
      initPoint,
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

    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

