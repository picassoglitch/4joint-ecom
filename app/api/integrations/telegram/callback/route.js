import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { editTelegramMessage, answerCallbackQuery, formatOrderNotification } from '@/lib/services/telegram'

export const runtime = 'nodejs'

export async function POST(request) {
  try {
    const body = await request.json()
    console.log('Received Telegram callback:', JSON.stringify(body, null, 2))

    // Verify secret token if configured
    const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET
    if (secretToken) {
      const providedToken = request.headers.get('X-Telegram-Bot-Api-Secret-Token')
      if (providedToken !== secretToken) {
        console.warn('Unauthorized Telegram callback access attempt.')
        return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
      }
    }

    if (!body.callback_query) {
      return NextResponse.json({ ok: true })
    }

    const callback = body.callback_query
    const chatId = callback.message?.chat?.id
    const messageId = callback.message?.message_id
    const callbackData = callback.data
    const callbackQueryId = callback.id

    console.log(`Processing callback: ${callbackData} from chat ${chatId}`)

    // Parse callback data: order_accept_<orderId>, order_reject_<orderId>, order_contact_<orderId>
    const match = callbackData?.match(/^order_(accept|reject|contact)_(.+)$/)
    if (!match) {
      await answerCallbackQuery(callbackQueryId, '❌ Acción no reconocida', true)
      return NextResponse.json({ ok: true })
    }

    const [, action, orderId] = match

    // Get Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      await answerCallbackQuery(callbackQueryId, '❌ Error de configuración', true)
      return NextResponse.json({ ok: true })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items:order_items (
          *,
          product:products (
            name,
            price
          )
        )
      `)
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      await answerCallbackQuery(callbackQueryId, '❌ Orden no encontrada', true)
      return NextResponse.json({ ok: true })
    }

    // Get vendor to verify ownership
    const { data: vendor } = await supabase
      .from('vendors')
      .select('id, telegram_chat_id')
      .eq('id', order.vendor_id)
      .single()

    if (!vendor || vendor.telegram_chat_id !== chatId.toString()) {
      await answerCallbackQuery(callbackQueryId, '❌ No autorizado', true)
      return NextResponse.json({ ok: true })
    }

    // Handle different actions
    let newStatus = order.status
    let responseText = ''

    if (action === 'accept') {
      newStatus = 'PREPARING'
      responseText = '✅ Pedido aceptado'
      
      // Update order status
      await supabase
        .from('orders')
        .update({ status: 'PREPARING' })
        .eq('id', orderId)
    } else if (action === 'reject') {
      newStatus = 'REJECTED'
      responseText = '❌ Pedido rechazado'
      
      // Update order status
      await supabase
        .from('orders')
        .update({ status: 'REJECTED' })
        .eq('id', orderId)
    } else if (action === 'contact') {
      // For contact, just show customer info
      const customerInfo = []
      if (order.guest_name) customerInfo.push(`👤 ${order.guest_name}`)
      if (order.guest_email) customerInfo.push(`📧 ${order.guest_email}`)
      if (order.guest_phone) customerInfo.push(`📱 ${order.guest_phone}`)
      
      responseText = customerInfo.length > 0 
        ? `📞 Contacto:\n${customerInfo.join('\n')}`
        : '📞 Información de contacto no disponible'
      
      await answerCallbackQuery(callbackQueryId, responseText, true)
      return NextResponse.json({ ok: true })
    }

    // Answer callback query
    await answerCallbackQuery(callbackQueryId, responseText, false)

    // Update message with new status
    if (action === 'accept' || action === 'reject') {
      // Update order status in order object for formatting
      const updatedOrder = { ...order, status: newStatus }
      
      // Format order items
      const formattedItems = (order.order_items || []).map(item => ({
        product: item.product || { name: 'Producto' },
        quantity: item.quantity || 1,
        price: parseFloat(item.price) || 0,
        variant: item.variant || null,
      }))

      const updatedMessage = formatOrderNotification(updatedOrder, formattedItems)

      // Edit the message
      await editTelegramMessage(chatId.toString(), messageId, updatedMessage)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error in Telegram callback:', error)
    return NextResponse.json({ ok: true }) // Always return ok to prevent Telegram retries
  }
}

