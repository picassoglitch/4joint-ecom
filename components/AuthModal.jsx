'use client'
import { useState, useEffect } from 'react'
import { signIn, signUp, getCurrentUser } from '@/lib/supabase/auth'
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

