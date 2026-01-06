import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Disable body parsing, we'll handle it manually
export const runtime = 'nodejs'

export async function POST(request) {
  try {
    const body = await request.json()

    // Verify request is from Telegram (optional: verify secret token)
    // For production, you should verify the secret token
    const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET
    if (secretToken) {
      const providedToken = request.headers.get('X-Telegram-Bot-Api-Secret-Token')
      if (providedToken !== secretToken) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }
    }

    // Handle message updates
    if (body.message) {
      const message = body.message
      const text = message.text || ''
      const chatId = message.chat.id.toString()

      console.log(`📨 Telegram webhook received: ${text} from chat_id: ${chatId}`)

      // Check if it's a /start command
      if (text.startsWith('/start')) {
        const token = text.split(' ')[1] // Get token if exists

        if (!token) {
          // No token provided, just send welcome message
          console.log(`⚠️ /start received without token from chat_id: ${chatId}`)
          await sendTelegramMessage(
            chatId, 
            '👋 ¡Hola! Para conectar tu tienda a 4Joint:\n\n' +
            '1. Ve a tu panel de vendedor → Store Settings\n' +
            '2. Busca "Notificaciones de Telegram"\n' +
            '3. Haz clic en "Conectar Telegram"\n' +
            '4. Se abrirá Telegram con un enlace especial\n' +
            '5. Presiona "Start" cuando se abra\n\n' +
            '⚠️ No uses /start directamente aquí. Debes usar el enlace desde tu panel.'
          )
          return NextResponse.json({ ok: true })
        }

        console.log(`🔑 Processing connection token: ${token.substring(0, 8)}...`)

        // Validate and use token
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!supabaseUrl || !supabaseServiceKey) {
          console.error('Supabase not configured')
          await sendTelegramMessage(chatId, '❌ Error de configuración. Por favor contacta al soporte.')
          return NextResponse.json({ ok: true })
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Find token
        const { data: tokenRecord, error: tokenError } = await supabase
          .from('telegram_connect_tokens')
          .select('*, store:vendors(id, name)')
          .eq('token', token)
          .is('used_at', null)
          .single()

        if (tokenError || !tokenRecord) {
          console.log(`❌ Token not found or error:`, tokenError)
          await sendTelegramMessage(
            chatId, 
            '❌ Token inválido o ya utilizado.\n\n' +
            'Para conectar tu tienda:\n' +
            '1. Ve a Store Settings → Notificaciones de Telegram\n' +
            '2. Haz clic en "Conectar Telegram"\n' +
            '3. Usa el enlace que se abre (incluye el token)\n\n' +
            '⚠️ No uses /start directamente. Debes usar el enlace desde tu panel.'
          )
          return NextResponse.json({ ok: true })
        }

        console.log(`✅ Token found for store: ${tokenRecord.store_id}`)

        // Check if token is expired
        const now = new Date()
        const expiresAt = new Date(tokenRecord.expires_at)
        if (now > expiresAt) {
          console.log(`⏰ Token expired for store: ${tokenRecord.store_id}`)
          await sendTelegramMessage(
            chatId, 
            '❌ El token ha expirado.\n\n' +
            'Genera un nuevo enlace de conexión desde tu panel:\n' +
            'Store Settings → Notificaciones de Telegram → "Conectar Telegram"'
          )
          return NextResponse.json({ ok: true })
        }

        // Update store with chat_id
        console.log(`💾 Updating store ${tokenRecord.store_id} with chat_id: ${chatId}`)
        const { error: updateError } = await supabase
          .from('vendors')
          .update({
            telegram_chat_id: chatId,
            telegram_enabled: true,
          })
          .eq('id', tokenRecord.store_id)

        if (updateError) {
          console.error('❌ Error updating store:', updateError)
          await sendTelegramMessage(chatId, '❌ Error al conectar tu tienda. Por favor intenta de nuevo.')
          return NextResponse.json({ ok: true })
        }

        console.log(`✅ Store ${tokenRecord.store_id} updated successfully`)

        // Mark token as used
        await supabase
          .from('telegram_connect_tokens')
          .update({ used_at: new Date().toISOString() })
          .eq('id', tokenRecord.id)

        // Send success message
        const storeName = tokenRecord.store?.name || 'tu tienda'
        await sendTelegramMessage(
          chatId,
          `✅ 4Joint conectado. Ya recibirás notificaciones de ${storeName}.\n\n` +
          `Ahora recibirás notificaciones cuando:\n` +
          `• Se cree una nueva orden\n` +
          `• Haya productos con bajo stock\n` +
          `• Recibas mensajes de soporte`
        )

        console.log(`🎉 Telegram connection completed for store: ${storeName} (${tokenRecord.store_id})`)
        return NextResponse.json({ ok: true })
      }
    }

    // Handle other update types (optional)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error in Telegram webhook:', error)
    return NextResponse.json({ ok: true }) // Always return ok to Telegram
  }
}

// Helper function to send Telegram message
async function sendTelegramMessage(chatId, text) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  if (!botToken) {
    console.error('TELEGRAM_BOT_TOKEN not configured')
    return
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Telegram API error:', errorData)
    }
  } catch (error) {
    console.error('Error sending Telegram message:', error)
  }
}

