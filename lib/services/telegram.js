/**
 * Telegram Notification Service
 * Handles sending notifications to stores via Telegram
 */

import { createClient } from '@supabase/supabase-js'

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const TELEGRAM_API_URL = 'https://api.telegram.org/bot'

/**
 * Send Telegram notification to a store
 * @param {string} storeId - Store/Vendor ID
 * @param {string} text - Message text
 * @param {string} notificationType - Type of notification (newOrder, lowStock, support, test, etc.)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function sendTelegramNotification(storeId, text, notificationType = 'general') {
  if (!TELEGRAM_BOT_TOKEN) {
    console.warn('TELEGRAM_BOT_TOKEN not configured, skipping Telegram notification')
    return { success: false, error: 'Telegram bot token not configured' }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Supabase not configured')
    return { success: false, error: 'Supabase not configured' }
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    console.log(`🔍 Looking up store ${storeId} for Telegram notification`)
    
    // Get store info
    const { data: store, error: storeError } = await supabase
      .from('vendors')
      .select('telegram_chat_id, telegram_enabled, notification_prefs, name, id')
      .eq('id', storeId)
      .single()

    if (storeError || !store) {
      console.error(`❌ Store not found: ${storeId}`, storeError)
      return { success: false, error: 'Store not found' }
    }

    console.log(`📦 Store found: ${store.name} (${store.id})`)
    console.log(`   - telegram_enabled: ${store.telegram_enabled}`)
    console.log(`   - telegram_chat_id: ${store.telegram_chat_id ? 'SET' : 'NOT SET'}`)

    // Check if Telegram is enabled
    if (!store.telegram_enabled) {
      console.log(`⚠️ Telegram notifications disabled for store ${storeId} (${store.name})`)
      console.log(`💡 Tip: Ve a Store Settings → Notificaciones de Telegram y reconecta, o ejecuta:`)
      console.log(`   UPDATE vendors SET telegram_enabled = true WHERE id = '${storeId}';`)
      return { success: false, error: 'Telegram notifications disabled for this store' }
    }

    // Check if chat_id exists
    if (!store.telegram_chat_id) {
      console.log(`⚠️ No Telegram chat_id for store ${storeId} (${store.name}). Store needs to connect Telegram first.`)
      return { success: false, error: 'Store not connected to Telegram' }
    }

    // Check notification preferences (if applicable)
    const prefs = store.notification_prefs || {}
    if (notificationType !== 'test' && prefs[notificationType] === false) {
      console.log(`Notification type ${notificationType} disabled for store ${storeId}`)
      return { success: false, error: `Notification type ${notificationType} is disabled` }
    }

    // Send message via Telegram API
    console.log(`📤 Sending Telegram message to chat_id: ${store.telegram_chat_id} for store: ${store.name}`)
    
    const response = await fetch(`${TELEGRAM_API_URL}${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: store.telegram_chat_id,
        text,
        parse_mode: 'HTML',
      }),
    })

    const responseData = await response.json()

    if (!response.ok) {
      const errorMessage = responseData.description || response.statusText
      console.error(`❌ Telegram API error for store ${storeId}:`, errorMessage)
      console.error('Full response:', responseData)

      // Log failure
      await logTelegramNotification(
        supabase,
        storeId,
        store.telegram_chat_id,
        text,
        notificationType,
        false,
        errorMessage,
        responseData
      )

      return { success: false, error: errorMessage }
    }

    console.log(`✅ Telegram message sent successfully to store ${storeId} (${store.name})`)

    // Log success
    await logTelegramNotification(
      supabase,
      storeId,
      store.telegram_chat_id,
      text,
      notificationType,
      true,
      null,
      responseData
    )

    return { success: true, data: responseData }
  } catch (error) {
    console.error('Error sending Telegram notification:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}

/**
 * Log Telegram notification attempt
 */
async function logTelegramNotification(
  supabase,
  storeId,
  chatId,
  messageText,
  notificationType,
  success,
  errorMessage,
  telegramResponse
) {
  try {
    await supabase.from('telegram_notification_logs').insert({
      store_id: storeId,
      chat_id: chatId,
      message_text: messageText,
      notification_type: notificationType,
      success,
      error_message: errorMessage,
      telegram_response: telegramResponse,
    })
  } catch (error) {
    console.error('Error logging Telegram notification:', error)
    // Don't throw - logging failure shouldn't break the notification
  }
}

/**
 * Format order notification message
 */
export function formatOrderNotification(order, orderItems) {
  const itemsList = orderItems
    .map(item => {
      const productName = item.product?.name || 'Producto'
      const variant = item.variant?.name ? ` (${item.variant.name})` : ''
      const quantity = item.quantity || 1
      const price = parseFloat(item.price) || 0
      const total = price * quantity
      return `  • ${productName}${variant} x${quantity} - $${total.toFixed(2)}`
    })
    .join('\n')

  const orderId = order.id?.slice(0, 8).toUpperCase() || order.id
  const total = parseFloat(order.total) || 0
  const status = order.status || 'ORDER_PLACED'
  const paymentMethod = order.payment_method || order.payment_provider || 'N/A'
  
  let message = (
    `🛒 <b>Nueva Orden</b>\n\n` +
    `ID: <code>${orderId}</code>\n` +
    `Total: <b>$${total.toFixed(2)}</b>\n\n` +
    `<b>Productos:</b>\n${itemsList}\n\n` +
    `Estado: ${status}\n` +
    `Método de pago: ${paymentMethod}`
  )

  // Add guest info if available
  if (order.guest_name || order.guest_email || order.guest_phone) {
    message += '\n\n<b>Cliente:</b>'
    if (order.guest_name) message += `\n👤 ${order.guest_name}`
    if (order.guest_email) message += `\n📧 ${order.guest_email}`
    if (order.guest_phone) message += `\n📱 ${order.guest_phone}`
  }

  // Add address if available
  if (order.guest_address) {
    const addr = order.guest_address
    message += '\n\n<b>Dirección:</b>'
    if (addr.street || addr.address) message += `\n📍 ${addr.street || addr.address || ''}`
    if (addr.city || addr.state || addr.zip) {
      message += `\n${[addr.city, addr.state, addr.zip].filter(Boolean).join(', ')}`
    }
  }

  // Add delivery info
  if (order.delivery_option) {
    message += `\n\n🚚 Entrega: ${order.delivery_option}`
  }
  if (order.tip_amount && parseFloat(order.tip_amount) > 0) {
    message += `\n💵 Propina: $${parseFloat(order.tip_amount).toFixed(2)}`
  }

  // Add date
  if (order.created_at) {
    message += `\n\n📅 ${new Date(order.created_at).toLocaleString('es-MX')}`
  }

  return message
}

/**
 * Format low stock notification message
 */
export function formatLowStockNotification(product, currentStock) {
  return (
    `⚠️ <b>Stock Bajo</b>\n\n` +
    `Producto: <b>${product.name}</b>\n` +
    `Stock actual: <b>${currentStock}</b> unidades\n\n` +
    `Por favor actualiza el inventario.`
  )
}

