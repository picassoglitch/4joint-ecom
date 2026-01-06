/**
 * Telegram Notification Service
 * Handles sending notifications to stores via Telegram
 */

import { createClient } from '@supabase/supabase-js'

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const TELEGRAM_API_URL = 'https://api.telegram.org/bot'

/**
 * Escape special characters for Telegram MarkdownV2
 */
function escapeMarkdownV2(text) {
  if (!text) return ''
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/_/g, '\\_')
    .replace(/\*/g, '\\*')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/~/g, '\\~')
    .replace(/`/g, '\\`')
    .replace(/>/g, '\\>')
    .replace(/#/g, '\\#')
    .replace(/\+/g, '\\+')
    .replace(/-/g, '\\-')
    .replace(/=/g, '\\=')
    .replace(/\|/g, '\\|')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/\./g, '\\.')
    .replace(/!/g, '\\!')
}

/**
 * Send Telegram notification to a store
 * @param {string} storeId - Store/Vendor ID
 * @param {string} text - Message text
 * @param {string} notificationType - Type of notification (newOrder, lowStock, support, test, etc.)
 * @param {string} orderId - Optional: Full order ID for inline keyboard buttons
 * @param {object} orderData - Optional: Order data for Maps link and other features
 * @returns {Promise<{success: boolean, error?: string, messageId?: number}>}
 */
export async function sendTelegramNotification(storeId, text, notificationType = 'general', orderId = null, orderData = null) {
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
    
    // Prepare request body
    const requestBody = {
      chat_id: store.telegram_chat_id,
      text,
      parse_mode: 'MarkdownV2',
    }
    
    // Add inline keyboard for order notifications
    if (notificationType === 'newOrder' && orderId) {
      // Build Maps URL from order address
      let mapsUrl = 'https://www.google.com/maps/search/?api=1'
      if (orderData?.guest_address) {
        const addr = orderData.guest_address
        const addressParts = [
          addr.street || addr.address,
          addr.city,
          addr.state,
          addr.zip
        ].filter(Boolean)
        if (addressParts.length > 0) {
          mapsUrl += `&query=${encodeURIComponent(addressParts.join(', '))}`
        }
      }
      
      requestBody.reply_markup = {
        inline_keyboard: [
          [
            { text: '✅ Aceptar pedido', callback_data: `order_accept_${orderId}` },
            { text: '❌ Rechazar', callback_data: `order_reject_${orderId}` }
          ],
          [
            { text: '📞 Contactar cliente', callback_data: `order_contact_${orderId}` }
          ],
          [
            { text: '🗺️ Abrir en Maps', url: mapsUrl }
          ]
        ]
      }
    }
    
    const response = await fetch(`${TELEGRAM_API_URL}${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
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

    return { 
      success: true, 
      data: responseData,
      messageId: responseData.result?.message_id // Return message ID for future edits
    }
  } catch (error) {
    console.error('Error sending Telegram notification:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}

/**
 * Edit Telegram message (for status updates)
 * @param {string} chatId - Telegram chat ID
 * @param {number} messageId - Message ID to edit
 * @param {string} newText - New message text
 * @param {object} newKeyboard - Optional: New inline keyboard
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function editTelegramMessage(chatId, messageId, newText, newKeyboard = null) {
  if (!TELEGRAM_BOT_TOKEN) {
    return { success: false, error: 'Telegram bot token not configured' }
  }

  try {
    const requestBody = {
      chat_id: chatId,
      message_id: messageId,
      text: newText,
      parse_mode: 'MarkdownV2',
    }

    if (newKeyboard) {
      requestBody.reply_markup = newKeyboard
    }

    const response = await fetch(`${TELEGRAM_API_URL}${TELEGRAM_BOT_TOKEN}/editMessageText`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    const responseData = await response.json()

    if (!response.ok) {
      const errorMessage = responseData.description || response.statusText
      console.error(`❌ Telegram editMessage error:`, errorMessage)
      return { success: false, error: errorMessage }
    }

    return { success: true, data: responseData }
  } catch (error) {
    console.error('Error editing Telegram message:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}

/**
 * Answer callback query (for button feedback)
 * @param {string} callbackQueryId - Callback query ID
 * @param {string} text - Optional: Text to show to user
 * @param {boolean} showAlert - Whether to show as alert (true) or notification (false)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function answerCallbackQuery(callbackQueryId, text = '', showAlert = false) {
  if (!TELEGRAM_BOT_TOKEN) {
    return { success: false, error: 'Telegram bot token not configured' }
  }

  try {
    const response = await fetch(`${TELEGRAM_API_URL}${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: text || undefined,
        show_alert: showAlert,
      }),
    })

    const responseData = await response.json()

    if (!response.ok) {
      const errorMessage = responseData.description || response.statusText
      console.error(`❌ Telegram answerCallbackQuery error:`, errorMessage)
      return { success: false, error: errorMessage }
    }

    return { success: true, data: responseData }
  } catch (error) {
    console.error('Error answering callback query:', error)
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
 * Format order notification message with MarkdownV2
 */
export function formatOrderNotification(order, orderItems) {
  const orderId = order.id?.slice(0, 8).toUpperCase() || order.id
  const total = parseFloat(order.total) || 0
  const status = order.status || 'ORDER_PLACED'
  const paymentMethod = order.payment_method || order.payment_provider || 'COD'
  
  // Format status badge
  const statusBadges = {
    'ORDER_PLACED': '🟡 ORDER PLACED',
    'PREPARING': '🔵 PREPARANDO',
    'IN_TRANSIT': '🟢 EN CAMINO',
    'DELIVERED': '✅ ENTREGADO',
    'REJECTED': '🔴 RECHAZADO',
    'CANCELLED': '🔴 CANCELADO'
  }
  const statusBadge = statusBadges[status] || `🟡 ${status}`

  // Format items list
  const itemsList = orderItems
    .map(item => {
      const productName = escapeMarkdownV2(item.product?.name || 'Producto')
      const variant = item.variant?.name ? ` \\(${escapeMarkdownV2(item.variant.name)}\\)` : ''
      const quantity = item.quantity || 1
      const price = parseFloat(item.price) || 0
      const total = price * quantity
      const totalFormatted = escapeMarkdownV2(total.toFixed(2))
      return `• ${productName}${variant} ×${quantity} \\- \\$${totalFormatted}`
    })
    .join('\n')

  // Format date: DD/MM/YYYY · HH:MM AM/PM
  const orderDate = order.created_at 
    ? (() => {
        const date = new Date(order.created_at)
        const day = String(date.getDate()).padStart(2, '0')
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const year = date.getFullYear()
        const hours = date.getHours()
        const minutes = String(date.getMinutes()).padStart(2, '0')
        const ampm = hours >= 12 ? 'PM' : 'AM'
        const displayHours = hours % 12 || 12
        return `${day}/${month}/${year} · ${displayHours}:${minutes} ${ampm}`
      })()
    : 'N/A'

  // Build message with MarkdownV2
  let message = `🛒 *Nueva Orden Recibida*\n`
  message += `━━━━━━━━━━━━━━\n`
  message += `🆔 *ID:* ${escapeMarkdownV2(orderId)}\n`
  message += `🕒 *Hora:* ${escapeMarkdownV2(orderDate)}\n\n`
  
  const totalFormatted = escapeMarkdownV2(total.toFixed(2))
  message += `💰 *Total:* \\$${totalFormatted} MXN\n`
  
  // Payment method with warning for COD
  const paymentDisplay = paymentMethod === 'COD' 
    ? `⚠️ Contra entrega \\(COD\\)`
    : escapeMarkdownV2(paymentMethod)
  message += `💳 *Pago:* ${paymentDisplay}\n`
  
  // Delivery type
  const deliveryType = order.fulfillment_type || order.delivery_option || 'On\\-demand'
  const deliveryDisplay = deliveryType === 'on_demand' || deliveryType === 'courierExterno'
    ? `🚨 ${escapeMarkdownV2(deliveryType)}`
    : escapeMarkdownV2(deliveryType)
  message += `🚚 *Entrega:* ${deliveryDisplay}\n\n`
  
  // Products section
  message += `📦 *Productos*\n${itemsList}\n\n`
  
  // Customer info
  if (order.guest_name || order.guest_email || order.guest_phone) {
    if (order.guest_name) message += `👤 *Cliente:* ${escapeMarkdownV2(order.guest_name)}\n`
    if (order.guest_email) message += `${order.guest_email ? `📧 *Email:* ${escapeMarkdownV2(order.guest_email)}\n` : ''}`
    if (order.guest_phone) message += `${order.guest_phone ? `📱 *Teléfono:* ${escapeMarkdownV2(order.guest_phone)}\n` : ''}`
    message += `\n`
  }
  
  // Address
  if (order.guest_address) {
    const addr = order.guest_address
    const street = escapeMarkdownV2(addr.street || addr.address || '')
    const city = escapeMarkdownV2(addr.city || '')
    const state = escapeMarkdownV2(addr.state || '')
    const zip = escapeMarkdownV2(addr.zip || '')
    
    message += `📍 *Dirección*\n`
    if (street) message += `${street}\n`
    if (city || state || zip) {
      // Join escaped values - comma and space don't need escaping in MarkdownV2
      const addressParts = [city, state, zip].filter(Boolean)
      if (addressParts.length > 0) {
        const addressLine = addressParts.join(', ')
        message += `${addressLine}\n`
      }
    }
    message += `\n`
  }
  
  // Tip
  if (order.tip_amount && parseFloat(order.tip_amount) > 0) {
    const tipFormatted = escapeMarkdownV2(parseFloat(order.tip_amount).toFixed(2))
    message += `💵 *Propina:* \\$${tipFormatted} MXN\n\n`
  }
  
  // Status badge (highlighted)
  message += `📌 *Estado:* ${statusBadge}`

  return message
}

/**
 * Create inline keyboard for order actions
 */
export function createOrderKeyboard(orderId, mapsUrl = '') {
  return {
    inline_keyboard: [
      [
        { text: '✅ Aceptar pedido', callback_data: `order_accept_${orderId}` },
        { text: '❌ Rechazar', callback_data: `order_reject_${orderId}` }
      ],
      [
        { text: '📞 Contactar cliente', callback_data: `order_contact_${orderId}` }
      ],
      [
        { text: '🗺️ Abrir en Maps', url: mapsUrl || 'https://www.google.com/maps' }
      ]
    ]
  }
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
