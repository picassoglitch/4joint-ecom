'use client'
import { useState, useEffect } from 'react'
import { signIn, signUp, getCurrentUser } from '@/lib/supabase/auth'
import { toast } from 'react-hot-toast'
import { X } from 'lucide-react'

export default function AuthModal({ isOpen, onClose, initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode) // 'login' or 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode)
      setEmail('')
      setPassword('')
      setConfirmPassword('')
      setName('')
      setEmailError('')
      setPasswordError('')
    }
  }, [isOpen, initialMode])

  // Email validation to avoid spam
  const validateEmail = (email) => {
    // Basic email regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    
    // Check for common spam patterns
    const spamPatterns = [
      /^[a-z0-9]+@(10minutemail|tempmail|guerrillamail|mailinator|throwaway|trashmail)/i,
      /^test@/i,
      /^admin@/i,
      /^noreply@/i,
      /^no-reply@/i,
    ]
    
    if (!emailRegex.test(email)) {
      return 'Por favor ingresa un email válido'
    }
    
    // Check for spam patterns
    for (const pattern of spamPatterns) {
      if (pattern.test(email)) {
        return 'Este tipo de email no está permitido'
      }
    }
    
    // Check for disposable email domains (basic check)
    const disposableDomains = ['tempmail.com', '10minutemail.com', 'guerrillamail.com']
    const domain = email.split('@')[1]?.toLowerCase()
    if (disposableDomains.includes(domain)) {
      return 'Por favor usa un email permanente'
    }
    
    return ''
  }

  const handleEmailChange = (e) => {
    const value = e.target.value
    setEmail(value)
    if (value && mode === 'signup') {
      const error = validateEmail(value)
      setEmailError(error)
    } else {
      setEmailError('')
    }
  }

  const handleEmailAuth = async (e) => {
    e.preventDefault()
    
    // Validate email for signup
    if (mode === 'signup') {
      const emailValidationError = validateEmail(email)
      if (emailValidationError) {
        setEmailError(emailValidationError)
        toast.error(emailValidationError)
        return
      }
      
      // Validate password confirmation
      if (password !== confirmPassword) {
        setPasswordError('Las contraseñas no coinciden')
        toast.error('Las contraseñas no coinciden')
        return
      }
      
      if (password.length < 6) {
        setPasswordError('La contraseña debe tener al menos 6 caracteres')
        toast.error('La contraseña debe tener al menos 6 caracteres')
        return
      }
    }
    
    setLoading(true)

    try {
      if (mode === 'signup') {
        const { data, error } = await signUp(email, password, { name })
        if (error) {
          toast.error(error.message || 'Error al crear la cuenta')
          return
        }
        
        // Check if email confirmation is required
        // SECURITY: Account is NOT active until email is verified
        if (data?.user && !data.session) {
          toast.success('¡Cuenta creada! Revisa tu email para verificar y activar tu cuenta. Tu cuenta no estará activa hasta que verifiques tu email.', {
            duration: 7000,
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
      
      // Handle network/fetch errors
      if (error.message?.includes('Failed to fetch') || error.name === 'TypeError') {
        toast.error('Error de conexión. Verifica tu internet e intenta de nuevo.')
      } else {
        toast.error(error.message || 'Error al autenticar')
      }
    } finally {
      setLoading(false)
    }
  }


  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A1A]/80 backdrop-blur-md animate-in fade-in duration-200 p-4" style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="bg-[#FAFAF6] rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 max-w-md w-full mx-4 relative border border-[#00C6A2]/20 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-3 sm:top-4 right-3 sm:right-4 text-[#1A1A1A]/60 hover:text-[#1A1A1A] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation"
          aria-label="Cerrar"
        >
          <X size={24} />
        </button>

        <div className="text-center mb-4 sm:mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-2">
            {mode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
          </h2>
          <p className="text-sm sm:text-base text-[#1A1A1A]/60">
            {mode === 'login' 
              ? 'Bienvenido de vuelta a 4joint' 
              : 'Únete a la comunidad 420'}
          </p>
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-3 sm:space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                Nombre
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[#00C6A2]/20 focus:border-[#00C6A2] focus:ring-2 focus:ring-[#00C6A2]/20 outline-none transition-all text-base min-h-[44px] touch-manipulation"
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
              onChange={handleEmailChange}
              className={`w-full px-4 py-3 rounded-xl border ${
                emailError ? 'border-red-300 focus:border-red-500' : 'border-[#00C6A2]/20 focus:border-[#00C6A2]'
              } focus:ring-2 focus:ring-[#00C6A2]/20 outline-none transition-all text-base min-h-[44px] touch-manipulation`}
              placeholder="tu@email.com"
              required
            />
            {emailError && (
              <p className="mt-1 text-xs text-red-600">{emailError}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (confirmPassword && e.target.value !== confirmPassword) {
                  setPasswordError('Las contraseñas no coinciden')
                } else {
                  setPasswordError('')
                }
              }}
              className={`w-full px-4 py-3 rounded-xl border ${
                passwordError ? 'border-red-300 focus:border-red-500' : 'border-[#00C6A2]/20 focus:border-[#00C6A2]'
              } focus:ring-2 focus:ring-[#00C6A2]/20 outline-none transition-all text-base min-h-[44px] touch-manipulation`}
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                Confirmar Contraseña
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  if (password && e.target.value !== password) {
                    setPasswordError('Las contraseñas no coinciden')
                  } else {
                    setPasswordError('')
                  }
                }}
                className={`w-full px-4 py-3 rounded-xl border ${
                  passwordError ? 'border-red-300 focus:border-red-500' : 'border-[#00C6A2]/20 focus:border-[#00C6A2]'
                } focus:ring-2 focus:ring-[#00C6A2]/20 outline-none transition-all text-base min-h-[44px] touch-manipulation`}
                placeholder="••••••••"
                required={mode === 'signup'}
                minLength={6}
              />
              {passwordError && (
                <p className="mt-1 text-xs text-red-600">{passwordError}</p>
              )}
            </div>
          )}


          <button
            type="submit"
            disabled={loading}
            className="w-full px-8 py-3 bg-gradient-to-r from-[#00C6A2] to-[#00B894] hover:from-[#00B894] hover:to-[#00A885] text-white rounded-full font-bold transition-all hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 min-h-[44px] touch-manipulation text-base"
          >
            {loading ? 'Cargando...' : mode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
          </button>
        </form>

        <div className="mt-4 sm:mt-6 text-center">
          <button
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            className="text-sm text-[#00C6A2] hover:text-[#00B894] font-medium min-h-[44px] px-4 py-2 touch-manipulation"
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

