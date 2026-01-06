import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export async function POST(request, { params }) {
  try {
    // Next.js 13+ app router: params is a Promise
    const resolvedParams = await params
    const { storeId } = resolvedParams || {}
    
    console.log('Connect token request - storeId:', storeId)
    
    if (!storeId) {
      return NextResponse.json(
        { error: 'storeId es requerido' },
        { status: 400 }
      )
    }

    // Get authorization header
    const authHeader = request.headers.get('authorization')
    const authToken = authHeader?.replace('Bearer ', '')

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
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    // Get user from token
    const { data: { user }, error: authError } = await supabase.auth.getUser(authToken)

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

    // Generate one-time token
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24) // Token expires in 24 hours

    // Save token to database
    const { data: tokenRecord, error: tokenError } = await supabaseAdmin
      .from('telegram_connect_tokens')
      .insert({
        store_id: storeId,
        token,
        expires_at: expiresAt.toISOString(),
        created_by: user.id,
      })
      .select()
      .single()

    if (tokenError) {
      console.error('Error creating token:', tokenError)
      // Check if table doesn't exist
      if (tokenError.code === '42P01' || tokenError.message?.includes('does not exist')) {
        return NextResponse.json(
          { 
            error: 'La tabla de tokens de Telegram no existe. Por favor ejecuta la migración SQL primero.',
            details: 'Ejecuta el archivo supabase/migration_telegram_notifications.sql en Supabase SQL Editor'
          },
          { status: 500 }
        )
      }
      return NextResponse.json(
        { 
          error: 'Error al generar token de conexión',
          details: tokenError.message 
        },
        { status: 500 }
      )
    }

    // Generate deep link
    const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'orders4jointbot'
    const deepLink = `https://t.me/${botUsername}?start=${token}`

    return NextResponse.json({
      token,
      deepLink,
      expiresAt: expiresAt.toISOString(),
    })
  } catch (error) {
    console.error('Error in connect-token API:', error)
    return NextResponse.json(
      { 
        error: 'Error al procesar la solicitud',
        details: error.message || 'Error desconocido'
      },
      { status: 500 }
    )
  }
}

