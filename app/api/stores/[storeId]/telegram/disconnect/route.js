import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
      .select('id')
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

    // Clear Telegram connection
    const { error: updateError } = await supabaseAdmin
      .from('vendors')
      .update({
        telegram_chat_id: null,
        telegram_enabled: false,
      })
      .eq('id', storeId)

    if (updateError) {
      console.error('Error disconnecting Telegram:', updateError)
      return NextResponse.json(
        { error: 'Error al desconectar Telegram' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Telegram desconectado correctamente',
    })
  } catch (error) {
    console.error('Error in disconnect API:', error)
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    )
  }
}

