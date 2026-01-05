import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/'

  if (code) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase environment variables')
      return NextResponse.redirect(new URL('/?error=config_error', request.url))
    }

    try {
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })

      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Auth callback error:', error)
        return NextResponse.redirect(new URL('/auth/verify-email?error=auth_failed', request.url))
      }

      // Set cookies for the session
      if (data?.session) {
        const cookieStore = cookies()
        const maxAge = 60 * 60 * 24 * 7 // 7 days

        cookieStore.set('sb-access-token', data.session.access_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge,
          path: '/',
        })

        cookieStore.set('sb-refresh-token', data.session.refresh_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge,
          path: '/',
        })

        // Check if this is an email verification
        // Check if email was just confirmed (within last 2 minutes to account for processing time)
        const emailConfirmedAt = data.session.user.email_confirmed_at
        const isEmailVerification = emailConfirmedAt && 
          new Date(emailConfirmedAt).getTime() > Date.now() - 120000 // Within last 2 minutes
        
        // Also check the type parameter from URL if available
        const type = requestUrl.searchParams.get('type')
        const isEmailType = type === 'signup' || type === 'email'
        
        // If email was just verified, redirect to verification success page
        if (isEmailVerification || (isEmailType && emailConfirmedAt)) {
          // Redirect to verification success page
          return NextResponse.redirect(new URL('/auth/verify-email?verified=true', request.url))
        }
      }
    } catch (error) {
      console.error('Unexpected error in auth callback:', error)
      return NextResponse.redirect(new URL('/?error=unexpected_error', request.url))
    }
  }

  return NextResponse.redirect(new URL(next, request.url))
}

