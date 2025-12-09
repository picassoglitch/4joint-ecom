'use client'
import { supabase } from './client'
import { toast } from 'react-hot-toast'

// User roles
export const ROLES = {
  USER: 'user',
  VENDOR: 'vendor',
  ADMIN: 'admin',
}

/**
 * Generate a random secure password
 */
function generateRandomPassword() {
  const length = 16
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  let password = ''
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length))
  }
  return password
}

/**
 * Sign up with email and password
 */
export async function signUp(email, password, userData = {}) {
  try {
    // Validate inputs
    if (!email || !password) {
      return { 
        data: null, 
        error: { message: 'Por favor completa todos los campos' } 
      }
    }

    if (password.length < 6) {
      return { 
        data: null, 
        error: { message: 'La contraseña debe tener al menos 6 caracteres' } 
      }
    }

    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          role: ROLES.USER,
          ...userData,
        },
        emailRedirectTo: process.env.NEXT_PUBLIC_SITE_URL 
          ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
          : `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`,
      },
    })

    if (error) {
      let userMessage = error.message
      
      if (error.message.includes('already registered')) {
        userMessage = 'Este email ya está registrado. Inicia sesión en su lugar.'
      } else if (error.message.includes('Password')) {
        userMessage = 'La contraseña no cumple con los requisitos.'
      } else if (error.message.includes('Email')) {
        userMessage = 'Por favor ingresa un email válido.'
      }
      
      return { 
        data: null, 
        error: { ...error, message: userMessage } 
      }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Sign up error:', error)
    return { 
      data: null, 
      error: { 
        message: error.message || 'Error al crear la cuenta. Intenta de nuevo.' 
      } 
    }
  }
}

/**
 * Auto-register user with email (generates random password)
 * User will need to use "forgot password" to set their password
 */
export async function autoRegisterUser(email, userData = {}) {
  try {
    if (!email) {
      return { 
        data: null, 
        error: { message: 'Email es requerido' } 
      }
    }

    // Generate a secure random password
    const randomPassword = generateRandomPassword()

    // Sign up the user
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password: randomPassword,
      options: {
        data: {
          role: ROLES.USER,
          auto_registered: true, // Flag to indicate auto-registration
          ...userData,
        },
        emailRedirectTo: process.env.NEXT_PUBLIC_SITE_URL 
          ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
          : `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`,
      },
    })

    if (error) {
      // If user already exists, try to sign in with password reset
      if (error.message.includes('already registered') || error.message.includes('User already registered')) {
        // User exists, trigger password reset email
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
          redirectTo: process.env.NEXT_PUBLIC_SITE_URL 
            ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password`
            : `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/reset-password`,
        })
        
        if (resetError) {
          return { 
            data: null, 
            error: { 
              message: 'Este email ya está registrado. Usa "Olvidé mi contraseña" para acceder.' 
            } 
          }
        }
        
        return { 
          data: null, 
          error: { 
            message: 'Este email ya está registrado. Te hemos enviado un email para restablecer tu contraseña.' 
          } 
        }
      }
      
      return { 
        data: null, 
        error: { ...error, message: error.message } 
      }
    }

    // If signup was successful, send password reset email so user can set their password
    if (data?.user) {
      // Send password reset email
      await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: process.env.NEXT_PUBLIC_SITE_URL 
          ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password`
          : `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/reset-password`,
      })
    }

    return { data, error: null }
  } catch (error) {
    console.error('Auto register error:', error)
    return { 
      data: null, 
      error: { 
        message: error.message || 'Error al crear la cuenta. Intenta de nuevo.' 
      } 
    }
  }
}

/**
 * Sign in with email and password
 */
export async function signIn(email, password) {
  try {
    // Validate inputs
    if (!email || !password) {
      return { 
        data: null, 
        error: { message: 'Por favor completa todos los campos' } 
      }
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })

    if (error) {
      // Provide user-friendly error messages
      let userMessage = error.message
      
      if (error.message === 'Invalid login credentials') {
        userMessage = 'Email o contraseña incorrectos. Verifica tus credenciales.'
      } else if (error.message.includes('Email not confirmed')) {
        userMessage = 'Por favor verifica tu email antes de iniciar sesión.'
      } else if (error.message.includes('Too many requests')) {
        userMessage = 'Demasiados intentos. Por favor espera un momento.'
      }
      
      return { 
        data: null, 
        error: { ...error, message: userMessage } 
      }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Sign in error:', error)
    return { 
      data: null, 
      error: { 
        message: error.message || 'Error al iniciar sesión. Intenta de nuevo.' 
      } 
    }
  }
}

/**
 * Sign in with Google OAuth
 */
export async function signInWithGoogle() {
  try {
    // Use production URL if available, otherwise use current origin
    const redirectUrl = process.env.NEXT_PUBLIC_SITE_URL 
      ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
      : `${window.location.origin}/auth/callback`

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
      },
    })

    if (error) throw error

    return { data, error: null }
  } catch (error) {
    console.error('Google sign in error:', error)
    return { data: null, error }
  }
}

/**
 * Sign out
 */
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    return { error: null }
  } catch (error) {
    console.error('Sign out error:', error)
    return { error }
  }
}

/**
 * Get current user
 */
export async function getCurrentUser() {
  try {
    // First try to get session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('Get session error:', sessionError)
      return { user: null, error: sessionError }
    }

    if (session?.user) {
      return { user: session.user, error: null }
    }

    // If no session, try to get user (this will fail if no session, but handles it gracefully)
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error && error.message !== 'Auth session missing!') {
      throw error
    }

    return { user: user || null, error: null }
  } catch (error) {
    // Silently handle "Auth session missing" errors
    if (error.message === 'Auth session missing!') {
      return { user: null, error: null }
    }
    console.error('Get user error:', error)
    return { user: null, error }
  }
}

/**
 * Get user role from metadata
 */
export function getUserRole(user) {
  return user?.user_metadata?.role || ROLES.USER
}

/**
 * Check if user is admin
 */
export function isAdmin(user) {
  return getUserRole(user) === ROLES.ADMIN
}

/**
 * Check if user is vendor
 */
export function isVendor(user) {
  return getUserRole(user) === ROLES.VENDOR
}

/**
 * Update user role (admin only)
 * Note: This function is deprecated. Use the API route instead.
 * @deprecated Use updateUserRole from lib/supabase/users.js
 */
export async function updateUserRole(userId, newRole) {
  try {
    // This requires service role key, so we'll use the API route
    const response = await fetch('/api/admin/users/role', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ userId, role: newRole }),
    })

    if (!response.ok) {
      throw new Error('Failed to update user role')
    }

    const { data, error } = await response.json()
    if (error) throw error

    return { data, error: null }
  } catch (error) {
    console.error('Update role error:', error)
    return { data: null, error }
  }
}

/**
 * Register as vendor
 */
export async function registerAsVendor(vendorData) {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.user) {
      throw new Error('User must be logged in')
    }

    const user = session.user

    // Update user role to vendor
    const { error: roleError } = await supabase.auth.updateUser({
      data: { role: ROLES.VENDOR },
    })

    if (roleError) throw roleError

    // Create vendor record
    const { data, error } = await supabase
      .from('vendors')
      .insert({
        id: user.id,
        email: user.email,
        approved: false,
        ...vendorData,
      })
      .select()
      .single()

    if (error) throw error

    return { data, error: null }
  } catch (error) {
    console.error('Vendor registration error:', error)
    return { data: null, error }
  }
}

