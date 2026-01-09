import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { rateLimitMiddleware } from '@/lib/rate-limit'

/**
 * API endpoint for user signup with rate limiting and security checks
 * This endpoint should be used instead of direct client-side signup for better security
 */
export async function POST(request) {
  try {
    // Rate limiting: 5 signups per hour per IP
    const rateLimit = rateLimitMiddleware(request, 5, 60 * 60 * 1000)
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
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimit.resetAt.toISOString()
          }
        }
      )
    }

    const body = await request.json()
    const { email, password, name } = body

    // Validate inputs
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña son requeridos' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Formato de email inválido' },
        { status: 400 }
      )
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 8 caracteres' },
        { status: 400 }
      )
    }

    // Check for common weak passwords
    const weakPasswords = ['password', '12345678', 'qwerty', 'abc123']
    if (weakPasswords.includes(password.toLowerCase())) {
      return NextResponse.json(
        { error: 'La contraseña es demasiado débil. Por favor elige una contraseña más segura' },
        { status: 400 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Error de configuración del servidor' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Check if email already exists
    const { data: existingUser } = await supabase.auth.admin.listUsers()
    const emailExists = existingUser?.users?.some(u => u.email === email.toLowerCase())

    if (emailExists) {
      return NextResponse.json(
        { error: 'Este email ya está registrado' },
        { status: 409 }
      )
    }

    // Sign up user - Supabase will require email confirmation by default
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          role: 'user',
          name: name || email.split('@')[0],
        },
        emailRedirectTo: process.env.NEXT_PUBLIC_SITE_URL 
          ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
          : `${request.headers.get('origin') || ''}/auth/callback`,
        // Force email confirmation
        captchaToken: undefined, // Add CAPTCHA in production
      },
    })

    if (error) {
      console.error('Signup error:', error)
      
      // Don't expose internal errors
      let userMessage = 'Error al crear la cuenta. Intenta de nuevo.'
      
      if (error.message.includes('already registered')) {
        userMessage = 'Este email ya está registrado'
      } else if (error.message.includes('Password')) {
        userMessage = 'La contraseña no cumple con los requisitos'
      } else if (error.message.includes('Email')) {
        userMessage = 'Por favor ingresa un email válido'
      }

      return NextResponse.json(
        { error: userMessage },
        { status: 400 }
      )
    }

    // User is created but email is not confirmed yet
    // Account is inactive until email is verified
    return NextResponse.json(
      { 
        message: 'Cuenta creada. Por favor verifica tu email para activar tu cuenta.',
        user: data.user,
        session: null, // No session until email is confirmed
        requiresEmailConfirmation: true
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Unexpected error in signup:', error)
    return NextResponse.json(
      { error: 'Error inesperado al crear la cuenta' },
      { status: 500 }
    )
  }
}





