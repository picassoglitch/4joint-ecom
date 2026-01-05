'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { getCurrentUser } from '@/lib/supabase/auth'
import Link from 'next/link'

function VerifyEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'already-verified'>('loading')
  const [message, setMessage] = useState('')
  const token = searchParams.get('token')
  const type = searchParams.get('type')
  const verified = searchParams.get('verified')

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        // Check if we're coming from the callback route with verified=true
        // This is the primary indicator that email was just verified
        if (verified === 'true') {
          setStatus('success')
          setMessage('¡Email verificado exitosamente! Tu cuenta está lista.')
          return
        }

        // If we have a token in the URL, wait for callback to process
        if (token && type === 'email') {
          // Wait a moment for the callback to process
          setTimeout(async () => {
            try {
              // Try to get the current session directly
              const supabaseModule = await import('@/lib/supabase/client')
              const supabase = supabaseModule.supabase || supabaseModule.default
              
              if (!supabase) {
                throw new Error('Supabase client not available')
              }

              const { data: { session }, error } = await supabase.auth.getSession()
              
              if (error) {
                console.error('Session error:', error)
                setStatus('error')
                setMessage('Error al verificar tu email. Por favor, intenta iniciar sesión nuevamente.')
                return
              }
              
              if (session && session.user) {
                if (session.user.email_confirmed_at) {
                  setStatus('success')
                  setMessage('¡Email verificado exitosamente! Tu cuenta está lista.')
                } else {
                  setStatus('error')
                  setMessage('El enlace de verificación puede haber expirado. Por favor, solicita uno nuevo.')
                }
              } else {
                setStatus('error')
                setMessage('No se pudo verificar tu email. Por favor, intenta iniciar sesión nuevamente.')
              }
            } catch (err) {
              console.error('Error checking session:', err)
              setStatus('error')
              setMessage('Error al verificar tu email. Por favor, intenta iniciar sesión nuevamente.')
            }
          }, 1500)
          return
        }

        // No token and not verified - check current user status
        try {
          const result = await getCurrentUser()
          // Ensure result is an object with user property
          if (result && typeof result === 'object' && 'user' in result) {
            const currentUser = result.user
            if (currentUser) {
              if (currentUser.email_confirmed_at) {
                setStatus('already-verified')
                setMessage('Tu email ya está verificado.')
              } else {
                setStatus('error')
                setMessage('Tu email aún no está verificado. Por favor, revisa tu correo para el enlace de verificación.')
              }
            } else {
              setStatus('error')
              setMessage('No se encontró información de verificación. Por favor, inicia sesión.')
            }
          } else {
            // If getCurrentUser returns something unexpected
            setStatus('error')
            setMessage('No se encontró información de verificación. Por favor, inicia sesión.')
          }
        } catch (userError) {
          console.error('Error getting current user:', userError)
          setStatus('error')
          setMessage('No se encontró información de verificación. Por favor, inicia sesión.')
        }
      } catch (err) {
        console.error('Error in verifyEmail:', err)
        setStatus('error')
        setMessage('Error al verificar tu email. Por favor, intenta iniciar sesión nuevamente.')
      }
    }

    verifyEmail()
  }, [token, type, verified])

  const handleSignIn = async () => {
    router.push('/?signin=true')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAF6] px-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-lg p-8 text-center">
        {status === 'loading' && (
          <>
            <div className="flex justify-center mb-4">
              <Loader2 size={64} className="text-[#00C6A2] animate-spin" />
            </div>
            <h1 className="text-3xl font-bold text-[#1A1A1A] mb-4">
              Verificando tu email...
            </h1>
            <p className="text-[#1A1A1A]/70">
              Por favor espera mientras verificamos tu cuenta.
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="flex justify-center mb-4">
              <CheckCircle size={64} className="text-[#00C6A2]" />
            </div>
            <h1 className="text-3xl font-bold text-[#1A1A1A] mb-4">
              ¡Email Verificado!
            </h1>
            <p className="text-[#1A1A1A]/70 mb-6">
              {message || 'Tu cuenta ha sido verificada exitosamente. Ya puedes comenzar a comprar.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Link
                href="/shop"
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-[#00C6A2] to-[#00B894] hover:from-[#00B894] hover:to-[#00A885] text-white px-6 py-3.5 rounded-lg font-semibold transition-all hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl"
              >
                Comenzar a Comprar
              </Link>
              <Link
                href="/"
                className="flex-1 flex items-center justify-center gap-2 bg-white border-2 border-[#00C6A2] text-[#00C6A2] hover:bg-[#00C6A2]/5 px-6 py-3.5 rounded-lg font-semibold transition-all hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
              >
                Ir al Inicio
              </Link>
            </div>
          </>
        )}

        {status === 'already-verified' && (
          <>
            <div className="flex justify-center mb-4">
              <CheckCircle size={64} className="text-[#00C6A2]" />
            </div>
            <h1 className="text-3xl font-bold text-[#1A1A1A] mb-4">
              Email Ya Verificado
            </h1>
            <p className="text-[#1A1A1A]/70 mb-6">
              {message || 'Tu email ya está verificado. ¡Bienvenido de nuevo!'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Link
                href="/shop"
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-[#00C6A2] to-[#00B894] hover:from-[#00B894] hover:to-[#00A885] text-white px-6 py-3.5 rounded-lg font-semibold transition-all hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl"
              >
                Comenzar a Comprar
              </Link>
              <Link
                href="/"
                className="flex-1 flex items-center justify-center gap-2 bg-white border-2 border-[#00C6A2] text-[#00C6A2] hover:bg-[#00C6A2]/5 px-6 py-3.5 rounded-lg font-semibold transition-all hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
              >
                Ir al Inicio
              </Link>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="flex justify-center mb-4">
              <XCircle size={64} className="text-red-500" />
            </div>
            <h1 className="text-3xl font-bold text-[#1A1A1A] mb-4">
              Error de Verificación
            </h1>
            <p className="text-[#1A1A1A]/70 mb-6">
              {message || 'No se pudo verificar tu email. El enlace puede haber expirado.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button
                onClick={handleSignIn}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-[#00C6A2] to-[#00B894] hover:from-[#00B894] hover:to-[#00A885] text-white px-6 py-3.5 rounded-lg font-semibold transition-all hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl"
              >
                Iniciar Sesión
              </button>
              <Link
                href="/"
                className="flex-1 flex items-center justify-center gap-2 bg-white border-2 border-[#00C6A2] text-[#00C6A2] hover:bg-[#00C6A2]/5 px-6 py-3.5 rounded-lg font-semibold transition-all hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
              >
                Volver al Inicio
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAF6]">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-lg p-8 text-center">
          <div className="flex justify-center mb-4">
            <Loader2 size={64} className="text-[#00C6A2] animate-spin" />
          </div>
          <h1 className="text-3xl font-bold text-[#1A1A1A] mb-4">
            Cargando...
          </h1>
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}

