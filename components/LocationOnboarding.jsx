'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Navigation, X } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { getCurrentUser } from '@/lib/supabase/auth'

export default function LocationOnboarding({ isOpen, onComplete }) {
    const [step, setStep] = useState(1) // 1: explanation, 2: permission request
    const [locationMethod, setLocationMethod] = useState(null) // 'geolocation' or 'manual'
    const [loading, setLoading] = useState(false)
    const [location, setLocation] = useState({ lat: null, lng: null, place: '' })
    const [manualInput, setManualInput] = useState('')

    useEffect(() => {
        if (isOpen) {
            setStep(1)
            setLocationMethod(null)
            setLocation({ lat: null, lng: null, place: '' })
            setManualInput('')
        }
    }, [isOpen])

    const handleUseCurrentLocation = async () => {
        setLoading(true)
        try {
            if (!navigator.geolocation) {
                toast.error('Tu navegador no soporta geolocalización')
                setLoading(false)
                return
            }

            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    try {
                        const { latitude, longitude } = position.coords
                        
                        // Reverse geocode to get human-readable place
                        try {
                            const response = await fetch(
                                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
                            )
                            const data = await response.json()
                            
                            const place = data.display_name || 
                                `${data.address?.postcode || ''} ${data.address?.city || data.address?.town || ''}`.trim() ||
                                `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`

                            setLocation({
                                lat: latitude,
                                lng: longitude,
                                place: place
                            })
                            
                            // Save to user profile
                            await saveUserLocation(latitude, longitude, place)
                            
                            toast.success('Ubicación guardada exitosamente')
                            onComplete({ lat: latitude, lng: longitude, place })
                    } catch (error) {
                        // Safe error logging
                        if (error?.message) {
                            console.warn('Error reverse geocoding:', error.message)
                        }
                        // Save with coordinates as place name
                        const place = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
                        setLocation({ lat: latitude, lng: longitude, place })
                        await saveUserLocation(latitude, longitude, place)
                        toast.success('Ubicación guardada exitosamente')
                        onComplete({ lat: latitude, lng: longitude, place })
                    }
                } catch (error) {
                    // Safe error logging
                    if (error?.message) {
                        console.warn('Error processing location:', error.message)
                    }
                    toast.error('Error al procesar la ubicación. Intenta de nuevo.')
                    setLoading(false)
                }
                },
                (error) => {
                    // Improved error handling - avoid logging empty objects
                    let errorCode = null
                    let errorMessage = null
                    
                    // Safely extract error information
                    if (error && typeof error === 'object') {
                        // Check if error has enumerable properties
                        const hasProperties = Object.keys(error).length > 0
                        if (hasProperties) {
                            errorCode = error.code
                            errorMessage = error.message
                        }
                    } else if (typeof error === 'string' && error.trim()) {
                        errorMessage = error
                    }
                    
                    // Only log if we have meaningful information
                    if (errorCode !== null || (errorMessage && errorMessage.trim())) {
                        const errorType = errorCode === 1 ? 'PERMISSION_DENIED' :
                                        errorCode === 2 ? 'POSITION_UNAVAILABLE' :
                                        errorCode === 3 ? 'TIMEOUT' : 'UNKNOWN'
                        
                        const logMessage = errorMessage || `Error code: ${errorCode}`
                        console.warn(`Geolocation ${errorType}:`, logMessage)
                    }
                    // If error object is empty, don't log anything
                    
                    // Provide user-friendly error messages based on error code
                    let errorToast = ''
                    if (errorCode === 1) {
                        errorToast = 'Permiso de ubicación denegado. Usa la opción manual abajo.'
                    } else if (errorCode === 2) {
                        errorToast = 'No se pudo determinar tu ubicación. Usa la opción manual abajo.'
                    } else if (errorCode === 3) {
                        errorToast = 'Tiempo de espera agotado. Usa la opción manual abajo.'
                    } else {
                        errorToast = 'No se pudo obtener tu ubicación automáticamente. Usa la opción manual abajo.'
                    }
                    
                    // Show toast and automatically switch to manual input
                    toast.error(errorToast, { duration: 4000 })
                    setLocationMethod('manual')
                    setLoading(false)
                },
                {
                    enableHighAccuracy: true,
                    timeout: 15000, // Increased timeout
                    maximumAge: 300000 // 5 minutes cache
                }
            )
        } catch (error) {
            // Safe error logging - only log if there's meaningful information
            if (error && typeof error === 'object' && error.message) {
                console.warn('Error getting location:', error.message)
            } else if (typeof error === 'string') {
                console.warn('Error getting location:', error)
            }
            // Don't log empty objects
            
            toast.error('Error al obtener ubicación. Usa la opción manual abajo.', { duration: 4000 })
            setLocationMethod('manual')
            setLoading(false)
        }
    }

    const handleManualLocation = async () => {
        if (!manualInput.trim()) {
            toast.error('Por favor ingresa tu ubicación')
            return
        }

        setLoading(true)
        try {
            // Geocode the manual input
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(manualInput)}&limit=1&countrycodes=mx`
            )
            const data = await response.json()

            if (data && data.length > 0) {
                const result = data[0]
                const lat = parseFloat(result.lat)
                const lng = parseFloat(result.lon)
                const place = result.display_name || manualInput

                setLocation({ lat, lng, place })
                await saveUserLocation(lat, lng, place)
                toast.success('Ubicación guardada exitosamente')
                onComplete({ lat, lng, place })
            } else {
                toast.error('No se encontró la ubicación. Intenta con un código postal o dirección más específica.')
            }
        } catch (error) {
            console.error('Error geocoding:', error)
            toast.error('Error al buscar la ubicación. Intenta de nuevo.')
        } finally {
            setLoading(false)
        }
    }

    const saveUserLocation = async (lat, lng, place) => {
        // Always save to localStorage first (works for both authenticated and non-authenticated users)
        localStorage.setItem('user_location', JSON.stringify({ lat, lng, place }))
        localStorage.setItem('user_location_set', 'true')
        
        try {
            const { user } = await getCurrentUser()
            if (!user) {
                // User not logged in - location is already saved to localStorage, that's fine
                return
            }

            // Get session token for API call
            const { supabase } = await import('@/lib/supabase/client')
            const { data: { session } } = await supabase.auth.getSession()

            if (!session?.access_token) {
                // No session token - location is already saved to localStorage, that's fine
                return
            }

            // Try to save to server, but don't fail if it doesn't work
            const response = await fetch('/api/user/location', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    latitude: lat,
                    longitude: lng,
                    locationPlace: place,
                    hasCompletedOnboarding: true,
                }),
            })

            if (!response.ok) {
                // If server save fails, that's okay - we already saved to localStorage
                console.warn('Could not save location to server, but saved locally')
            }
        } catch (error) {
            // If anything fails, that's okay - we already saved to localStorage
            console.warn('Could not save location to server, but saved locally:', error?.message || 'Unknown error')
        }
    }

    if (!isOpen) return null

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#1A1A1A]/95 backdrop-blur-sm"
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-[#FAFAF6] rounded-3xl p-8 md:p-12 max-w-md mx-4 shadow-2xl relative"
                >
                    {step === 1 && (
                        <div className="text-center">
                            <div className="text-6xl mb-6">📍</div>
                            <h2 className="text-3xl md:text-4xl font-semibold text-[#1A1A1A] mb-4">
                                Encuentra tiendas cerca de ti
                            </h2>
                            <p className="text-lg text-[#1A1A1A]/70 mb-6">
                                Para mostrarte las mejores tiendas y opciones de entrega disponibles en tu zona, necesitamos conocer tu ubicación.
                            </p>
                            <p className="text-sm text-[#1A1A1A]/60 mb-8">
                                Tu privacidad es importante. Solo usamos tu ubicación para encontrar tiendas cercanas.
                            </p>
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={handleUseCurrentLocation}
                                    disabled={loading}
                                    className="flex items-center justify-center gap-2 px-8 py-4 bg-[#00C6A2] hover:bg-[#00B894] text-white font-semibold rounded-full transition-all hover:scale-105 active:scale-95 shadow-lg disabled:opacity-50"
                                >
                                    <Navigation size={20} />
                                    {loading ? 'Obteniendo ubicación...' : 'Usar mi ubicación actual'}
                                </button>
                                <button
                                    onClick={() => setLocationMethod('manual')}
                                    disabled={loading}
                                    className="flex items-center justify-center gap-2 px-8 py-4 bg-[#1A1A1A]/10 hover:bg-[#1A1A1A]/20 text-[#1A1A1A] font-semibold rounded-full transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                                >
                                    <MapPin size={20} />
                                    Ingresar ubicación manualmente
                                </button>
                            </div>
                        </div>
                    )}

                    {(step === 1 && locationMethod === 'manual') && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-6"
                        >
                            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-sm font-semibold text-blue-800 mb-1">
                                    📍 Ingresa tu ubicación
                                </p>
                                <p className="text-xs text-blue-700">
                                    Puedes usar código postal, colonia, ciudad o dirección
                                </p>
                            </div>
                            <p className="text-sm text-[#1A1A1A]/70 mb-3 font-medium">
                                Ingresa tu código postal, colonia o ciudad:
                            </p>
                            <input
                                type="text"
                                value={manualInput}
                                onChange={(e) => setManualInput(e.target.value)}
                                placeholder="Ej: 06700, Roma Norte, CDMX, Ciudad de México"
                                className="w-full border-2 border-slate-300 rounded-xl px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-[#00C6A2] focus:border-[#00C6A2] text-base"
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter' && manualInput.trim()) {
                                        handleManualLocation()
                                    }
                                }}
                                autoFocus={locationMethod === 'manual'}
                            />
                            <div className="flex gap-3">
                                <button
                                    onClick={handleManualLocation}
                                    disabled={loading || !manualInput.trim()}
                                    className="flex-1 px-6 py-3 bg-gradient-to-r from-[#00C6A2] to-[#00B894] hover:from-[#00B894] hover:to-[#00A885] text-white font-bold rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                                >
                                    {loading ? 'Buscando...' : 'Buscar ubicación'}
                                </button>
                                <button
                                    onClick={() => {
                                        setLocationMethod(null)
                                        setManualInput('')
                                    }}
                                    className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-[#1A1A1A] font-semibold rounded-full transition-all"
                                >
                                    Volver
                                </button>
                            </div>
                            <p className="text-xs text-slate-500 mt-3 text-center">
                                💡 Tip: Usa tu código postal para resultados más precisos
                            </p>
                        </motion.div>
                    )}

                    {location.lat && location.lng && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-6 p-4 bg-[#00C6A2]/10 rounded-lg border border-[#00C6A2]/30"
                        >
                            <p className="text-sm font-medium text-[#1A1A1A] mb-1">
                                Ubicación encontrada:
                            </p>
                            <p className="text-sm text-[#1A1A1A]/70">
                                {location.place}
                            </p>
                        </motion.div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}

