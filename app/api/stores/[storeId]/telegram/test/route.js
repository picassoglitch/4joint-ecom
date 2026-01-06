import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendTelegramNotification } from '@/lib/services/telegram'

export async function POST(request, { params }) {
  try {
    // Next.js 13+ app router: params is a Promise
    const resolvedParams = await params
    const { storeId } = resolvedParams || {}
    
    if (!storeId) {
      return NextResponse.json(
        { error: 'storeId es requerido' },
        { status: 400 }
      )
    }

    // Get authorization header
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      )
    }

    // Create client with the provided token
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    // Get user from token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Verify user owns this store (use service role for verification)
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Supabase service role key not configured' },
        { status: 500 }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Verify store ownership
    // Note: vendors.id IS the user_id (it references auth.users(id))
    const { data: store, error: storeError } = await supabaseAdmin
      .from('vendors')
      .select('id, name')
      .eq('id', storeId)
      .single()

    if (storeError || !store) {
      return NextResponse.json(
        { error: 'Tienda no encontrada' },
        { status: 404 }
      )
    }

    if (store.id !== user.id) {
      return NextResponse.json(
        { error: 'No tienes permiso para acceder a esta tienda' },
        { status: 403 }
      )
    }

    // Check if Telegram is connected
    const { data: storeWithTelegram } = await supabaseAdmin
      .from('vendors')
      .select('telegram_chat_id, telegram_enabled')
      .eq('id', storeId)
      .single()

    if (!storeWithTelegram?.telegram_chat_id) {
      return NextResponse.json(
        { error: 'Telegram no está conectado. Conecta Telegram primero.' },
        { status: 400 }
      )
    }

    if (!storeWithTelegram?.telegram_enabled) {
      return NextResponse.json(
        { error: 'Las notificaciones de Telegram están deshabilitadas.' },
        { status: 400 }
      )
    }

    // Send test notification
    const testMessage = `🧪 <b>Notificación de Prueba</b>\n\n` +
      `Esta es una notificación de prueba de ${store.name}.\n\n` +
      `Si recibes este mensaje, tu conexión con Telegram está funcionando correctamente. ✅`

    const result = await sendTelegramNotification(storeId, testMessage, 'test')

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Error al enviar notificación de prueba' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Notificación de prueba enviada correctamente',
    })
  } catch (error) {
    console.error('Error in test notification API:', error)
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    )
  }
}

