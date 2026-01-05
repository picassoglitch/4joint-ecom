'use client'
import { useState, useEffect } from 'react'
import { MapPin, Clock, Package, Truck, Navigation, Filter, X } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/supabase/auth'
import LocationOnboarding from '@/components/LocationOnboarding'
import Loading from '@/components/Loading'
import { normalizeZip } from '@/lib/utils/zipCode'

export default function TiendasCerca() {
    const router = useRouter()
    const [stores, setStores] = useState([])
    const [loading, setLoading] = useState(true)
    const [userLocation, setUserLocation] = useState(null)
    const [showOnboarding, setShowOnboarding] = useState(false)
    const [filters, setFilters] = useState({
        fulfillment: null, // 'pickup', 'delivery', 'meetupPoint'
        openNow: false,
    })
    const [showFilters, setShowFilters] = useState(false)

    useEffect(() => {
        checkUserLocation()
    }, [])

    useEffect(() => {
        if (userLocation) {
            fetchNearbyStores()
        }
    }, [userLocation, filters])

    const checkUserLocation = async () => {
        try {
            const { user } = await getCurrentUser()
            if (!user) {
                // Show onboarding for non-logged users or users without location
                setShowOnboarding(true)
                return
            }

            // Check if user has location
            try {
                const response = await fetch('/api/user/location')
                // FIX 500: Handle new response format - always returns 200
                if (response.ok) {
                    const result = await response.json()
                    if (result.ok && result.location?.lat && result.location?.lng) {
                        setUserLocation({
                            lat: result.location.lat,
                            lng: result.location.lng,
                            place: result.location.city || result.data?.location_place,
                            postcode: result.location.postcode || result.data?.postcode || null
                        })
                    } else if (result.data?.latitude && result.data?.longitude) {
                        // Backward compatibility with old format
                        setUserLocation({
                            lat: result.data.latitude,
                            lng: result.data.longitude,
                            place: result.data.location_place,
                            postcode: result.data.postcode || null
                        })
                    } else {
                        setShowOnboarding(true)
                    }
                } else {
                    setShowOnboarding(true)
                }
            } catch (fetchError) {
                // FIX 500: Handle fetch errors gracefully
                console.error('Error fetching location:', fetchError)
                setShowOnboarding(true)
            }
        } catch (error) {
            console.error('Error checking user location:', error)
            setShowOnboarding(true)
        }
    }

    const fetchNearbyStores = async () => {
        if (!userLocation) return

        // Show loading immediately for better UX
        setLoading(true)
        
        try {
            // Get user's zip code from multiple sources (optimized order - fastest first)
            let userZipCode = null
            
            // First, try to get from userLocation object (from API response)
            if (userLocation.postcode) {
                userZipCode = userLocation.postcode
            }
            
            // Then try to get from localStorage (saved during onboarding)
            if (!userZipCode) {
                const savedLocation = localStorage.getItem('user_location')
                if (savedLocation) {
                    try {
                        const locationData = JSON.parse(savedLocation)
                        if (locationData.postcode) {
                            userZipCode = locationData.postcode
                        }
                    } catch (e) {
                        // Ignore parse errors
                    }
                }
            }
            
            // Also check direct postcode in localStorage
            if (!userZipCode) {
                const savedPostcode = localStorage.getItem('user_postcode')
                if (savedPostcode) {
                    userZipCode = savedPostcode
                }
            }
            
            // Try to extract from place string (format: "03020, Mexico City..." or "03310, Mexico")
            if (!userZipCode && userLocation.place) {
                // Try multiple patterns to extract zip code
                const zipMatch = userLocation.place.match(/\b(\d{5})\b/) || 
                                userLocation.place.match(/(\d{5})/) ||
                                userLocation.place.match(/,\s*(\d{5})/)
                if (zipMatch) {
                    userZipCode = zipMatch[1]
                    console.log(`Extracted zip code from place string: ${userZipCode}`)
                }
            }
            
            // Skip slow fallback (user addresses API) - use what we have
            // This makes the initial load much faster

            // Normalize zip code before sending to API
            const normalizedZip = userZipCode ? normalizeZip(userZipCode) : null
            console.log(`📍 User zip code for filtering: ${userZipCode || 'NOT FOUND'}${normalizedZip ? ` (normalized: ${normalizedZip})` : ''}`)

            const params = new URLSearchParams({
                lat: userLocation.lat.toString(),
                lng: userLocation.lng.toString(),
                maxDistance: '50',
            })

            if (normalizedZip) {
                params.append('zipCode', normalizedZip)
                console.log(`📍 Sending normalized zip code to API: ${normalizedZip}`)
            } else {
                console.warn(`⚠️ No valid zip code found! User location:`, userLocation)
            }

            if (filters.fulfillment) {
                params.append('fulfillment', filters.fulfillment)
            }
            if (filters.openNow) {
                params.append('openNow', 'true')
            }

            const response = await fetch(`/api/stores/nearby?${params}`)
            if (!response.ok) {
                throw new Error('Error al obtener tiendas')
            }

            const { stores: nearbyStores } = await response.json()
            console.log(`Received ${nearbyStores?.length || 0} stores from API`)
            console.log('Stores:', nearbyStores)
            setStores(nearbyStores || [])
        } catch (error) {
            console.error('Error fetching stores:', error)
            toast.error('Error al cargar las tiendas')
        } finally {
            setLoading(false)
        }
    }

    const handleOnboardingComplete = (location) => {
        setUserLocation(location)
        setShowOnboarding(false)
    }

    const getFulfillmentBadges = (modes) => {
        const badges = []
        if (modes?.pickup) badges.push({ label: 'Pickup', icon: Package, color: 'bg-blue-100 text-blue-700' })
        if (modes?.delivery) badges.push({ label: 'Envío', icon: Truck, color: 'bg-green-100 text-green-700' })
        if (modes?.meetupPoint) badges.push({ label: 'Punto de entrega', icon: MapPin, color: 'bg-purple-100 text-purple-700' })
        return badges
    }

    const formatDistance = (km) => {
        if (km < 1) {
            return `${Math.round(km * 1000)}m`
        }
        return `${km.toFixed(1)}km`
    }

    const formatOperatingHours = (hours) => {
        if (!hours || Object.keys(hours).length === 0) {
            return 'Horario no disponible'
        }
        const now = new Date()
        const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
        const dayHours = hours[currentDay]
        if (dayHours && dayHours.open && dayHours.close) {
            return `${dayHours.open} - ${dayHours.close}`
        }
        return 'Abierto'
    }

    if (showOnboarding) {
        return (
            <LocationOnboarding
                isOpen={showOnboarding}
                onComplete={handleOnboardingComplete}
            />
        )
    }

    return (
        <div className="min-h-screen bg-[#FAFAF6] py-8 px-4">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-2">
                        Tiendas cerca de ti
                    </h1>
                    {userLocation && (
                        <p className="text-[#1A1A1A]/70 flex items-center gap-2">
                            <MapPin size={16} />
                            {userLocation.place}
                        </p>
                    )}
                </div>

                {/* Filters */}
                <div className="mb-6 flex flex-wrap gap-3 items-center">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-full hover:bg-slate-50 transition-all"
                    >
                        <Filter size={18} />
                        Filtros
                    </button>

                    {filters.fulfillment && (
                        <button
                            onClick={() => setFilters({ ...filters, fulfillment: null })}
                            className="flex items-center gap-2 px-4 py-2 bg-[#00C6A2] text-white rounded-full hover:bg-[#00B894] transition-all"
                        >
                            {filters.fulfillment === 'pickup' && 'Pickup'}
                            {filters.fulfillment === 'delivery' && 'Solo envío'}
                            {filters.fulfillment === 'meetupPoint' && 'Punto de entrega'}
                            <X size={16} />
                        </button>
                    )}

                    {filters.openNow && (
                        <button
                            onClick={() => setFilters({ ...filters, openNow: false })}
                            className="flex items-center gap-2 px-4 py-2 bg-[#00C6A2] text-white rounded-full hover:bg-[#00B894] transition-all"
                        >
                            Abierto ahora
                            <X size={16} />
                        </button>
                    )}
                </div>

                {/* Filter Panel */}
                {showFilters && (
                    <div className="mb-6 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Tipo de entrega
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        { value: 'pickup', label: 'Pickup' },
                                        { value: 'delivery', label: 'Solo envío' },
                                        { value: 'meetupPoint', label: 'Punto de entrega' },
                                    ].map((option) => (
                                        <button
                                            key={option.value}
                                            onClick={() => setFilters({
                                                ...filters,
                                                fulfillment: filters.fulfillment === option.value ? null : option.value
                                            })}
                                            className={`px-4 py-2 rounded-full text-sm transition-all ${
                                                filters.fulfillment === option.value
                                                    ? 'bg-[#00C6A2] text-white'
                                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                            }`}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Disponibilidad
                                </label>
                                <button
                                    onClick={() => setFilters({ ...filters, openNow: !filters.openNow })}
                                    className={`px-4 py-2 rounded-full text-sm transition-all ${
                                        filters.openNow
                                            ? 'bg-[#00C6A2] text-white'
                                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                    }`}
                                >
                                    Abierto ahora
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Stores List */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-12 h-12 rounded-full border-4 border-[#00C6A2]/20 border-t-[#00C6A2] animate-spin mb-4"></div>
                        <p className="text-slate-600 text-sm font-medium">Buscando tiendas cerca de ti...</p>
                        <p className="text-slate-400 text-xs mt-1">Esto puede tardar unos segundos</p>
                    </div>
                ) : stores.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-slate-500 text-lg mb-4">
                            No se encontraron tiendas cerca de ti
                        </p>
                        <p className="text-slate-400 text-sm mb-4">
                            {(() => {
                                const userZip = userLocation?.postcode || (typeof window !== 'undefined' && localStorage.getItem('user_postcode'))
                                return userZip
                                    ? `No hay tiendas que entreguen a tu código postal (${userZip}). Intenta ajustar los filtros o verifica que las tiendas tengan tu zona de servicio configurada.`
                                    : 'Intenta ajustar los filtros o ampliar el radio de búsqueda'
                            })()}
                        </p>
                        {userLocation?.postcode && (
                            <p className="text-slate-500 text-xs">
                                💡 Tip: Las tiendas solo aparecen si tienen tu código postal ({userLocation.postcode}) en sus zonas de entrega.
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {stores.map((store, index) => {
                            const badges = getFulfillmentBadges(store.fulfillment_modes)
                            return (
                                <div
                                    key={store.id}
                                    style={{ animationDelay: `${Math.min(index * 50, 400)}ms` }}
                                    className="bg-white/90 backdrop-blur-sm rounded-xl border border-slate-200 p-6 hover:shadow-xl hover:border-[#00C6A2]/30 hover:scale-[1.02] transition-all duration-300 cursor-pointer opacity-0 translate-y-4 animate-fade-in-up"
                                    onClick={() => router.push(`/shop/${store.username || store.id}`)}
                                >
                                    {/* Store Header */}
                                    <div className="flex items-start gap-4 mb-4">
                                        {store.logo && (
                                            <img
                                                src={store.logo}
                                                alt={store.name}
                                                className="w-16 h-16 rounded-lg object-cover"
                                            />
                                        )}
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-lg text-[#1A1A1A] mb-1">
                                                {store.name}
                                            </h3>
                                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                                <Navigation size={14} />
                                                {formatDistance(store.distance_km)}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Description */}
                                    {store.description && (
                                        <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                                            {store.description}
                                        </p>
                                    )}

                                    {/* Fulfillment Badges */}
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {badges.map((badge, idx) => {
                                            const Icon = badge.icon
                                            return (
                                                <span
                                                    key={idx}
                                                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}
                                                >
                                                    <Icon size={12} />
                                                    {badge.label}
                                                </span>
                                            )
                                        })}
                                    </div>

                                    {/* Store Info */}
                                    <div className="space-y-2 text-sm text-slate-600">
                                        <div className="flex items-center gap-2">
                                            <Clock size={14} />
                                            <span>{formatOperatingHours(store.operating_hours)}</span>
                                        </div>
                                        {store.delivery_time_minutes && store.fulfillment_modes?.delivery && (
                                            <div className="flex items-center gap-2 text-[#00C6A2] font-medium">
                                                <Truck size={14} />
                                                <span>Tiempo estimado: {store.delivery_time_minutes} min</span>
                                            </div>
                                        )}
                                        {store.min_order > 0 && (
                                            <div className="flex items-center gap-2">
                                                <Package size={14} />
                                                <span>Pedido mínimo: ${store.min_order}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2">
                                            <span className="text-yellow-500">★</span>
                                            <span>{store.rating?.toFixed(1) || '4.5'}</span>
                                        </div>
                                    </div>

                                    {/* CTA */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            router.push(`/shop/${store.username || store.id}`)
                                        }}
                                        className="w-full mt-4 px-4 py-2 bg-gradient-to-r from-[#00C6A2] to-[#00B894] text-white rounded-full font-medium hover:from-[#00B894] hover:to-[#00A885] transition-all hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
                                    >
                                        Ver tienda
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}

