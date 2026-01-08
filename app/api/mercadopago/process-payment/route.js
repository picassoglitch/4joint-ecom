import { NextResponse } from 'next/server'
import { MercadoPagoConfig, Payment } from 'mercadopago'
import { updateOrderPayment } from '@/lib/supabase/database'
import { randomUUID } from 'crypto'

/**
 * Process Payment API Route
 * 
 * This endpoint processes payments from the Payment Brick.
 * Receives formData from the Brick and creates the payment in Mercado Pago.
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const {
      token,
      transaction_amount,
      description,
      installments,
      payment_method_id,
      issuer_id,
      payer,
      orderId,
    } = body

    // Validate required fields
    if (!token) {
      return NextResponse.json(
        { error: 'Token es requerido' },
        { status: 400 }
      )
    }

    if (!transaction_amount || transaction_amount <= 0) {
      return NextResponse.json(
        { error: 'El monto de la transacción es requerido' },
        { status: 400 }
      )
    }

    if (!payment_method_id) {
      return NextResponse.json(
        { error: 'El método de pago es requerido' },
        { status: 400 }
      )
    }

    if (!orderId) {
      return NextResponse.json(
        { error: 'El ID de la orden es requerido' },
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
    const payment = new Payment(client)

    // Generate idempotency key
    const idempotencyKey = randomUUID()

    // Build payment request
    const numericAmount = Number(transaction_amount);
    const paymentRequest = {
      transaction_amount: numericAmount,
      token: token,
      description: description || `Orden #${orderId}`,
      installments: installments ? Number(installments) : 1,
      payment_method_id: payment_method_id,
      ...(issuer_id && { issuer_id: String(issuer_id) }),
      payer: {
        email: payer?.email || payer?.cardholderEmail,
        ...(payer?.identification && {
          identification: {
            type: payer.identification.type,
            number: payer.identification.number,
          },
        }),
        ...(payer?.firstName && { first_name: payer.firstName }),
        ...(payer?.lastName && { last_name: payer.lastName }),
      },
      external_reference: String(orderId),
      statement_descriptor: '4joint',
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('📤 Creating payment in Mercado Pago:', {
        orderId,
        amount: transaction_amount,
        payment_method_id,
        installments,
      })
    }

    // Create payment with idempotency key
    const paymentResponse = await payment.create({
      body: paymentRequest,
    }, {
      customHeaders: {
        'X-Idempotency-Key': idempotencyKey,
      },
    })

    if (!paymentResponse || !paymentResponse.id) {
      throw new Error('Error al crear el pago en Mercado Pago')
    }

    const paymentId = paymentResponse.id
    const paymentStatus = paymentResponse.status

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Payment created:', {
        paymentId,
        status: paymentStatus,
        orderId,
      })
    }

    // Update order in database
    try {
      await updateOrderPayment(orderId, {
        paymentId: paymentId,
        payment_provider: 'MERCADOPAGO',
        status: paymentStatus, // 'approved', 'pending', 'rejected', etc.
        dateApproved: paymentResponse.date_approved || null,
        transactionAmount: transaction_amount,
      })
    } catch (dbError) {
      console.error('❌ Error updating order in database:', dbError)
      // Don't fail the payment if DB update fails
    }

    // Return payment result
    return NextResponse.json({
      id: paymentId,
      status: paymentStatus,
      status_detail: paymentResponse.status_detail,
      orderId: orderId,
    })
  } catch (error) {
    console.error('❌ Error processing payment:', error)

    // Handle Mercado Pago API errors
    if (error.message?.includes('invalid_access_token') || error.message?.includes('401')) {
      return NextResponse.json(
        { error: 'Token de acceso de Mercado Pago inválido. Verifica las credenciales.' },
        { status: 401 }
      )
    }

    // Handle payment errors
    if (error.cause || error.status) {
      return NextResponse.json(
        {
          error: error.message || 'Error al procesar el pago',
          cause: error.cause,
          status: error.status,
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

