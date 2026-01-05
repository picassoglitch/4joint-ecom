import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { rateLimitMiddleware, getClientIdentifier } from '@/lib/rate-limit'

export async function POST(request) {
  try {
    // Rate limiting: 3 requests per 15 minutes per IP
    const rateLimit = rateLimitMiddleware(request, 3, 15 * 60 * 1000)
    if (rateLimit) {
      return NextResponse.json(
        { 
          error: rateLimit.error,
          message: rateLimit.message,
          resetAt: rateLimit.resetAt
        },
        { 
          status: rateLimit.status,
          headers: {
            'Retry-After': Math.ceil((rateLimit.resetAt - Date.now()) / 1000).toString(),
            'X-RateLimit-Limit': '3',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimit.resetAt.toISOString()
          }
        }
      )
    }

    const body = await request.json()
    const { user_id, user_email, user_name } = body

    // Validate inputs
    if (!user_id || !user_email) {
      return NextResponse.json(
        { error: 'user_id y user_email son requeridos' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(user_email)) {
      return NextResponse.json(
        { error: 'Formato de email inválido' },
        { status: 400 }
      )
    }

    // Validate user_id is a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(user_id)) {
      return NextResponse.json(
        { error: 'user_id inválido' },
        { status: 400 }
      )
    }

    // Use service role key to bypass RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables')
      return NextResponse.json(
        { error: 'Error de configuración del servidor' },
        { status: 500 }
      )
    }

    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Verify user exists and email is confirmed (security check)
    const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(user_id)
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    // SECURITY: Only allow store requests from verified emails
    if (!user.email_confirmed_at) {
      return NextResponse.json(
        { 
          error: 'Debes verificar tu email antes de solicitar ser tienda',
          code: 'EMAIL_NOT_VERIFIED'
        },
        { status: 403 }
      )
    }

    // Check if request already exists for this user
    const { data: existing } = await supabaseAdmin
      .from('store_requests')
      .select('id, status, created_at')
      .eq('user_id', user_id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { 
          message: 'Ya existe una solicitud de tienda para este usuario',
          data: existing 
        },
        { status: 200 }
      )
    }

    // Insert the store request
    const { data, error } = await supabaseAdmin
      .from('store_requests')
      .insert({
        user_id,
        user_email,
        user_name: user_name || user_email.split('@')[0],
        status: 'pending'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating store request:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })

      // Check if table doesn't exist (multiple error codes)
      if (error.code === '42P01' || 
          error.code === 'PGRST205' ||
          error.message?.includes('does not exist') ||
          error.message?.includes('Could not find the table')) {
        return NextResponse.json(
          { 
            error: 'La tabla store_requests no existe. Por favor ejecuta la migración SQL en Supabase.',
            code: 'TABLE_NOT_FOUND',
            hint: 'Ve a Supabase Dashboard → SQL Editor y ejecuta el SQL de STORE_REQUESTS_SETUP.md'
          },
          { status: 500 }
        )
      }

      return NextResponse.json(
        { 
          error: error.message || 'Error al crear la solicitud de tienda',
          code: error.code
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { 
        message: 'Solicitud de tienda creada exitosamente',
        data 
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Unexpected error in create store request:', error)
    return NextResponse.json(
      { error: 'Error inesperado al crear la solicitud' },
      { status: 500 }
    )
  }
}

