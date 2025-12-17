'use client'
import { useState, useEffect } from 'react'
import { MapPin, Clock, Package, Truck, Navigation, Filter, X } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/supabase/auth'
import { supabase } from '@/lib/supabase/client'
import LocationOnboarding from '@/components/LocationOnboarding'
import Loading from '@/components/Loading'

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
            // First check localStorage (works for both authenticated and non-authenticated users)
            const savedLocation = localStorage.getItem('user_location')
            if (savedLocation) {
                try {
                    const location = JSON.parse(savedLocation)
                    if (location.lat && location.lng) {
                        setUserLocation({
                            lat: location.lat,
                            lng: location.lng,
                            place: location.place || 'Ubicación guardada'
                        })
                        setLoading(false)
                        return
                    }
                } catch (e) {
                    // Invalid JSON in localStorage, continue to check server
                }
            }

            // If no localStorage, try to get from server (only for authenticated users)
            const { user } = await getCurrentUser()
            if (user) {
                const session = await supabase.auth.getSession()
                const token = session?.data?.session?.access_token || ''
                
                if (token) {
                    const response = await fetch('/api/user/location', {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    })
                    
                    if (response.ok) {
                        const { data } = await response.json()
                        if (data?.latitude && data?.longitude) {
                            setUserLocation({
                                lat: data.latitude,
                                lng: data.longitude,
                                place: data.location_place || 'Ubicación guardada'
                            })
                            // Also save to localStorage for consistency
                            localStorage.setItem('user_location', JSON.stringify({
                                lat: data.latitude,
                                lng: data.longitude,
                                place: data.location_place
                            }))
                            setLoading(false)
                            return
                        }
                    }
                }
            }

            // No location found, show onboarding
            setShowOnboarding(true)
        } catch (error) {
            console.error('Error checking user location:', error)
            // On error, show onboarding so user can set location
            setShowOnboarding(true)
        }
    }

    const fetchNearbyStores = async () => {
        if (!userLocation) return

        setLoading(true)
        try {
            const params = new URLSearchParams({
                lat: userLocation.lat.toString(),
                lng: userLocation.lng.toString(),
                maxDistance: '50',
            })

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
        <div className="min-h-screen bg-gradient-to-b from-[#FAFAF6] to-white py-8 px-4">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-2 bg-gradient-to-r from-[#1A1A1A] to-[#00C6A2] bg-clip-text text-transparent">
                        Tiendas cerca de ti
                    </h1>
                    {userLocation && (
                        <p className="text-[#1A1A1A]/70 flex items-center gap-2 text-lg">
                            <MapPin size={18} className="text-[#00C6A2]" />
                            {userLocation.place}
                        </p>
                    )}
                </div>

                {/* Filters */}
                <div className="mb-6 flex flex-wrap gap-3 items-center">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-slate-300 rounded-full hover:bg-slate-50 hover:border-[#00C6A2] transition-all font-semibold shadow-sm"
                    >
                        <Filter size={18} />
                        Filtros
                    </button>

                    {filters.fulfillment && (
                        <button
                            onClick={() => setFilters({ ...filters, fulfillment: null })}
                            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#00C6A2] to-[#00B894] text-white rounded-full hover:from-[#00B894] hover:to-[#00A885] transition-all font-semibold shadow-md"
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
                            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#00C6A2] to-[#00B894] text-white rounded-full hover:from-[#00B894] hover:to-[#00A885] transition-all font-semibold shadow-md"
                        >
                            Abierto ahora
                            <X size={16} />
                        </button>
                    )}
                </div>

                {/* Filter Panel */}
                {showFilters && (
                    <div className="mb-6 p-6 bg-white rounded-2xl border-2 border-slate-200 shadow-lg">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-3">
                                    Tipo de entrega
                                </label>
                                <div className="flex flex-wrap gap-3">
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
                                            className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
                                                filters.fulfillment === option.value
                                                    ? 'bg-gradient-to-r from-[#00C6A2] to-[#00B894] text-white shadow-md'
                                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                            }`}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-3">
                                    Disponibilidad
                                </label>
                                <button
                                    onClick={() => setFilters({ ...filters, openNow: !filters.openNow })}
                                    className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
                                        filters.openNow
                                            ? 'bg-gradient-to-r from-[#00C6A2] to-[#00B894] text-white shadow-md'
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
                    <Loading />
                ) : stores.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-2xl border-2 border-slate-200">
                        <div className="text-6xl mb-4">🏪</div>
                        <p className="text-xl font-semibold text-[#1A1A1A] mb-2">
                            No se encontraron tiendas cerca de ti
                        </p>
                        <p className="text-slate-500">
                            Intenta ajustar los filtros o ampliar el radio de búsqueda
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {stores.map((store) => {
                            const badges = getFulfillmentBadges(store.fulfillment_modes)
                            return (
                                <div
                                    key={store.id}
                                    className="bg-white rounded-2xl border-2 border-slate-200 p-6 hover:shadow-2xl hover:border-[#00C6A2] transition-all cursor-pointer group"
                                    onClick={() => router.push(`/shop/${store.username || store.id}`)}
                                >
                                    {/* Store Header */}
                                    <div className="flex items-start gap-4 mb-4">
                                        {store.logo && (
                                            <img
                                                src={store.logo}
                                                alt={store.name}
                                                className="w-20 h-20 rounded-xl object-cover border-2 border-slate-200 group-hover:border-[#00C6A2] transition-colors"
                                            />
                                        )}
                                        <div className="flex-1">
                                            <h3 className="font-bold text-xl text-[#1A1A1A] mb-2 group-hover:text-[#00C6A2] transition-colors">
                                                {store.name}
                                            </h3>
                                            <div className="flex items-center gap-2 text-sm text-slate-600 font-semibold">
                                                <Navigation size={16} className="text-[#00C6A2]" />
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
                                                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold ${badge.color}`}
                                                >
                                                    <Icon size={14} />
                                                    {badge.label}
                                                </span>
                                            )
                                        })}
                                    </div>

                                    {/* Store Info */}
                                    <div className="space-y-2 text-sm text-slate-600 mb-4">
                                        <div className="flex items-center gap-2">
                                            <Clock size={16} className="text-[#00C6A2]" />
                                            <span className="font-medium">{formatOperatingHours(store.operating_hours)}</span>
                                        </div>
                                        {store.min_order > 0 && (
                                            <div className="flex items-center gap-2">
                                                <Package size={16} className="text-[#00C6A2]" />
                                                <span className="font-medium">Pedido mínimo: ${store.min_order}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2">
                                            <span className="text-yellow-500 text-lg">★</span>
                                            <span className="font-bold">{store.rating?.toFixed(1) || '4.5'}</span>
                                        </div>
                                    </div>

                                    {/* CTA */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            router.push(`/shop/${store.username || store.id}`)
                                        }}
                                        className="w-full mt-4 px-6 py-3 bg-gradient-to-r from-[#00C6A2] to-[#00B894] text-white rounded-full font-bold hover:from-[#00B894] hover:to-[#00A885] transition-all shadow-lg hover:shadow-xl hover:scale-105"
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
