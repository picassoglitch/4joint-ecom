import { NextResponse } from 'next/server'
import { MercadoPagoConfig, Payment } from 'mercadopago'
import { updateOrderPayment } from '@/lib/supabase/database'

/**
 * Mercado Pago Webhook API Route
 * 
 * This endpoint receives payment notifications from Mercado Pago
 * and updates the order status in our database.
 */
export async function POST(request) {
  try {
    const body = await request.json()

    // Mercado Pago sends different notification formats
    // Format 1: { type: 'payment', data: { id: 'payment_id' } }
    // Format 2: { topic: 'payment', resource: 'payment_id' }
    let paymentId = null

    if (body.type === 'payment' && body.data?.id) {
      paymentId = body.data.id
    } else if (body.topic === 'payment' && body.resource) {
      paymentId = body.resource
    } else if (body.data?.id) {
      paymentId = body.data.id
    } else if (body.id) {
      paymentId = body.id
    }

    if (!paymentId) {
      console.warn('⚠️ Webhook received without payment ID:', body)
      return NextResponse.json({ received: true }, { status: 200 })
    }

    // Get Mercado Pago credentials (support both variable names)
    const accessToken = process.env.MP_ACCESS_TOKEN || process.env.MERCADOPAGO_ACCESS_TOKEN

    if (!accessToken) {
      console.error('❌ Mercado Pago Access Token not configured')
      return NextResponse.json({ received: true }, { status: 200 }) // Return 200 to avoid retries
    }

    // Initialize Mercado Pago SDK
    const client = new MercadoPagoConfig({ accessToken })
    const payment = new Payment(client)

    // Fetch payment details from Mercado Pago API
    let paymentData
    try {
      paymentData = await payment.get({ id: paymentId })
    } catch (error) {
      console.error('❌ Error fetching payment from Mercado Pago:', error)
      return NextResponse.json({ received: true }, { status: 200 }) // Return 200 to avoid retries
    }

    if (!paymentData || !paymentData.external_reference) {
      console.warn('⚠️ Payment data missing external_reference:', paymentData)
      return NextResponse.json({ received: true }, { status: 200 })
    }

    const orderId = paymentData.external_reference
    const paymentStatus = paymentData.status
    const transactionAmount = paymentData.transaction_amount

    if (process.env.NODE_ENV === 'development') {
      console.log('📥 Webhook received:', {
        paymentId,
        orderId,
        status: paymentStatus,
        amount: transactionAmount,
      })
    }

    // Update order in database
    try {
      await updateOrderPayment(orderId, {
        paymentId: paymentId,
        payment_provider: 'MERCADOPAGO',
        status: paymentStatus, // 'approved', 'pending', 'rejected', etc. (will be mapped to ORDER_*)
        dateApproved: paymentData.date_approved || null,
        transactionAmount: transactionAmount,
      })

      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Order updated:', orderId)
      }
    } catch (dbError) {
      console.error('❌ Error updating order in database:', dbError)
      // Still return 200 to avoid webhook retries
    }

    // Always return 200 to acknowledge receipt
    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error) {
    console.error('❌ Webhook error:', error)
    // Always return 200 to avoid webhook retries
    return NextResponse.json({ received: true }, { status: 200 })
  }
}

