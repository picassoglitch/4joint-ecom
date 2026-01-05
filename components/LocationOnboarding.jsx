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
                    const { latitude, longitude } = position.coords
                    
                    // Reverse geocode to get human-readable place and postal code
                    try {
                        const response = await fetch(
                            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
                        )
                        
                        if (!response.ok) {
                            throw new Error('Reverse geocoding failed')
                        }
                        
                        const data = await response.json()
                        
                        // Extract postal code
                        const postcode = data.address?.postcode || data.address?.postal_code || ''
                        
                        // Build place name with postal code if available
                        const place = data.display_name || 
                            (postcode ? `${postcode}, ${data.address?.city || data.address?.town || data.address?.municipality || ''}`.trim() : '') ||
                            `${data.address?.city || data.address?.town || ''}`.trim() ||
                            `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`

                        setLocation({
                            lat: latitude,
                            lng: longitude,
                            place: place,
                            postcode: postcode
                        })
                        
                        // Save to user profile with postal code
                        await saveUserLocation(latitude, longitude, place, postcode)
                        
                        toast.success('Ubicación guardada exitosamente')
                        onComplete({ lat: latitude, lng: longitude, place, postcode })
                    } catch (error) {
                        console.error('Error reverse geocoding:', error)
                        // Save with coordinates as place name
                        const place = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
                        setLocation({ lat: latitude, lng: longitude, place, postcode: '' })
                        await saveUserLocation(latitude, longitude, place, '')
                        toast.success('Ubicación guardada exitosamente')
                        onComplete({ lat: latitude, lng: longitude, place, postcode: '' })
                    }
                },
                (error) => {
                    // Handle timeout gracefully - this is expected behavior
                    if (error.code === 3) { // TIMEOUT
                        toast.error('La solicitud de ubicación tardó demasiado. Puedes ingresar tu ubicación manualmente.')
                        setLocationMethod('manual')
                        setLoading(false)
                        return
                    }
                    
                    // Handle other errors
                    if (error.code === 1) { // PERMISSION_DENIED
                        toast.error('Permiso de ubicación denegado. Puedes ingresar tu ubicación manualmente.')
                    } else {
                        toast.error('No se pudo obtener tu ubicación. Intenta ingresarla manualmente.')
                    }
                    setLocationMethod('manual')
                    setLoading(false)
                },
                {
                    enableHighAccuracy: false, // Changed to false for faster response
                    timeout: 10000, // 10 seconds timeout
                    maximumAge: 60000 // Accept cached location up to 1 minute old
                }
            )
        } catch (error) {
            console.error('Error getting location:', error)
            toast.error('Error al obtener ubicación')
        } finally {
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
                
                // Extract postal code from result
                const postcode = result.address?.postcode || result.address?.postal_code || 
                                (manualInput.match(/\b\d{5}\b/)?.[0] || '') // Try to extract 5-digit code from input

                setLocation({ lat, lng, place, postcode })
                await saveUserLocation(lat, lng, place, postcode)
                toast.success('Ubicación guardada exitosamente')
                onComplete({ lat, lng, place, postcode })
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

    const saveUserLocation = async (lat, lng, place, postcode = '') => {
        try {
            const { user } = await getCurrentUser()
            if (!user) {
                console.warn('User not logged in, cannot save location')
                // Save to localStorage as fallback
                localStorage.setItem('user_location', JSON.stringify({ lat, lng, place, postcode }))
                return
            }

            // Get session token for API call
            const { supabase } = await import('@/lib/supabase/client')
            const { data: { session } } = await supabase.auth.getSession()

            if (!session?.access_token) {
                console.warn('No session token available')
                localStorage.setItem('user_location', JSON.stringify({ lat, lng, place, postcode }))
                return
            }

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
                    postcode: postcode, // Include postal code
                    hasCompletedOnboarding: true,
                }),
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                // If it's a 500 error about missing column, that's okay - we'll save locally
                if (response.status === 500 && (errorData.error?.includes('column') || errorData.error?.includes('postcode'))) {
                    console.log('Postcode column not available yet, saving to localStorage only')
                    // Don't throw - just save locally and continue
                } else {
                    // For other errors, still save locally but log the error
                    console.warn('Error saving location to database:', errorData.error)
                }
            }
            
            // Always save to localStorage as backup (whether API call succeeded or not)
            localStorage.setItem('user_location', JSON.stringify({ lat, lng, place, postcode }))
            localStorage.setItem('user_location_set', 'true')
            if (postcode) {
                localStorage.setItem('user_postcode', postcode)
            }
        } catch (error) {
            console.error('Error saving location:', error)
            // Save to localStorage as fallback - this ensures location is always saved
            localStorage.setItem('user_location', JSON.stringify({ lat, lng, place, postcode }))
            localStorage.setItem('user_location_set', 'true')
            if (postcode) {
                localStorage.setItem('user_postcode', postcode)
            }
            // Don't throw error - location is saved locally and will work
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

                    {step === 1 && locationMethod === 'manual' && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-6"
                        >
                            <p className="text-sm text-[#1A1A1A]/70 mb-3">
                                Ingresa tu código postal, colonia o ciudad:
                            </p>
                            <input
                                type="text"
                                value={manualInput}
                                onChange={(e) => setManualInput(e.target.value)}
                                placeholder="Ej: 06700, Roma Norte, CDMX"
                                className="w-full border border-slate-300 rounded-lg px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-[#00C6A2]"
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        handleManualLocation()
                                    }
                                }}
                            />
                            <div className="flex gap-3">
                                <button
                                    onClick={handleManualLocation}
                                    disabled={loading || !manualInput.trim()}
                                    className="flex-1 px-6 py-3 bg-[#00C6A2] hover:bg-[#00B894] text-white font-semibold rounded-full transition-all disabled:opacity-50"
                                >
                                    {loading ? 'Buscando...' : 'Buscar'}
                                </button>
                                <button
                                    onClick={() => {
                                        setLocationMethod(null)
                                        setManualInput('')
                                    }}
                                    className="px-6 py-3 bg-[#1A1A1A]/10 hover:bg-[#1A1A1A]/20 text-[#1A1A1A] font-semibold rounded-full transition-all"
                                >
                                    Cancelar
                                </button>
                            </div>
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

