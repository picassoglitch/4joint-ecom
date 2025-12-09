'use client'
import { useState, useEffect } from 'react'
import { signIn, signUp, signInWithGoogle, getCurrentUser } from '@/lib/supabase/auth'
import { toast } from 'react-hot-toast'
import { X } from 'lucide-react'

export default function AuthModal({ isOpen, onClose, initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode) // 'login' or 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode)
      setEmail('')
      setPassword('')
      setName('')
    }
  }, [isOpen, initialMode])

  const handleEmailAuth = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (mode === 'signup') {
        const { data, error } = await signUp(email, password, { name })
        if (error) {
          toast.error(error.message || 'Error al crear la cuenta')
          return
        }
        
        // Check if email confirmation is required
        if (data?.user && !data.session) {
          toast.success('¡Cuenta creada! Revisa tu email para verificar tu cuenta.', {
            duration: 5000,
          })
        } else {
          toast.success('¡Cuenta creada exitosamente!')
        }
        onClose()
      } else {
        const { data, error } = await signIn(email, password)
        if (error) {
          toast.error(error.message || 'Error al iniciar sesión')
          return
        }
        
        if (data?.session) {
          toast.success('¡Bienvenido de vuelta!')
          onClose()
        } else {
          toast.error('No se pudo iniciar sesión. Intenta de nuevo.')
        }
      }
    } catch (error) {
      console.error('Auth error:', error)
      toast.error(error.message || 'Error al autenticar')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleAuth = async () => {
    setLoading(true)
    try {
      const { data, error } = await signInWithGoogle()
      if (error) {
        console.error('Google OAuth error:', error)
        toast.error(error.message || 'Error al autenticar con Google')
        setLoading(false)
        return
      }
      
      // If successful, signInWithOAuth returns a URL and Supabase will redirect
      // The redirect happens automatically via window.location
      // Set a timeout to reset loading in case redirect doesn't happen
      setTimeout(() => {
        setLoading(false)
      }, 2000)
    } catch (error) {
      console.error('Google auth error:', error)
      toast.error(error.message || 'Error al autenticar con Google')
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A1A]/60 backdrop-blur-sm">
      <div className="bg-[#FAFAF6] rounded-3xl p-8 max-w-md w-full mx-4 relative border border-[#00C6A2]/20 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#1A1A1A]/60 hover:text-[#1A1A1A] transition-colors"
        >
          <X size={24} />
        </button>

        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-[#1A1A1A] mb-2">
            {mode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
          </h2>
          <p className="text-[#1A1A1A]/60">
            {mode === 'login' 
              ? 'Bienvenido de vuelta a 4joint' 
              : 'Únete a la comunidad 420'}
          </p>
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                Nombre
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[#00C6A2]/20 focus:border-[#00C6A2] focus:ring-2 focus:ring-[#00C6A2]/20 outline-none transition-all"
                placeholder="Tu nombre"
                required={mode === 'signup'}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[#00C6A2]/20 focus:border-[#00C6A2] focus:ring-2 focus:ring-[#00C6A2]/20 outline-none transition-all"
              placeholder="tu@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[#00C6A2]/20 focus:border-[#00C6A2] focus:ring-2 focus:ring-[#00C6A2]/20 outline-none transition-all"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-8 py-3 bg-[#00C6A2] hover:bg-[#00B894] text-white rounded-full font-semibold transition-all hover:scale-105 active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Cargando...' : mode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#00C6A2]/20"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-[#FAFAF6] text-[#1A1A1A]/60">o</span>
          </div>
        </div>

        <button
          onClick={handleGoogleAuth}
          disabled={loading}
          className="w-full px-8 py-3 bg-white hover:bg-[#00C6A2]/5 border-2 border-[#00C6A2]/20 text-[#1A1A1A] rounded-full font-semibold transition-all hover:scale-105 active:scale-95 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continuar con Google
        </button>

        <div className="mt-6 text-center">
          <button
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            className="text-sm text-[#00C6A2] hover:text-[#00B894] font-medium"
          >
            {mode === 'login' 
              ? '¿No tienes cuenta? Regístrate' 
              : '¿Ya tienes cuenta? Inicia sesión'}
          </button>
        </div>
      </div>
    </div>
  )
}

