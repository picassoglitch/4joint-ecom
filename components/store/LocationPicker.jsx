'use client'
import { useState, useEffect, useRef } from 'react'
import { MapPin, Navigation } from 'lucide-react'
import { toast } from 'react-hot-toast'

export default function LocationPicker({ 
    latitude, 
    longitude, 
    onLocationChange,
    showStoreLocation = true 
}) {
    const [mapLoaded, setMapLoaded] = useState(false)
    const [selectedLocation, setSelectedLocation] = useState({ lat: latitude, lng: longitude })
    const [searchQuery, setSearchQuery] = useState('')
    const mapRef = useRef(null)
    const markerRef = useRef(null)
    const mapInstanceRef = useRef(null)

    useEffect(() => {
        if (latitude && longitude) {
            setSelectedLocation({ lat: latitude, lng: longitude })
        }
    }, [latitude, longitude])

    useEffect(() => {
        // Load Leaflet CSS and JS
        if (typeof window !== 'undefined' && !mapLoaded && !window.L) {
            const link = document.createElement('link')
            link.rel = 'stylesheet'
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
            document.head.appendChild(link)

            const script = document.createElement('script')
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
            script.onload = () => {
                setMapLoaded(true)
                // Small delay to ensure L is available
                setTimeout(() => {
                    initializeMap()
                }, 100)
            }
            document.body.appendChild(script)

            return () => {
                // Cleanup
                if (mapInstanceRef.current) {
                    mapInstanceRef.current.remove()
                }
            }
        } else if (typeof window !== 'undefined' && window.L && !mapLoaded) {
            // Leaflet already loaded
            setMapLoaded(true)
            setTimeout(() => {
                initializeMap()
            }, 100)
        }
    }, [])

    useEffect(() => {
        if (mapLoaded && mapInstanceRef.current) {
            updateMap()
        }
    }, [selectedLocation, mapLoaded])

    const initializeMap = () => {
        if (!mapRef.current || !window.L) return

        const L = window.L
        const defaultLat = selectedLocation.lat || 19.4326
        const defaultLng = selectedLocation.lng || -99.1332

        // Initialize map centered on CDMX
        const map = L.map(mapRef.current).setView([defaultLat, defaultLng], 13)

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(map)

        // Add marker
        if (selectedLocation.lat && selectedLocation.lng) {
            markerRef.current = L.marker([selectedLocation.lat, selectedLocation.lng], {
                draggable: true
            }).addTo(map)

            markerRef.current.on('dragend', (e) => {
                const { lat, lng } = e.target.getLatLng()
                handleLocationSelect(lat, lng)
            })
        }

        // Add click handler to map
        map.on('click', (e) => {
            const { lat, lng } = e.latlng
            handleLocationSelect(lat, lng)
        })

        mapInstanceRef.current = map
    }

    const updateMap = () => {
        if (!mapInstanceRef.current || !selectedLocation.lat || !selectedLocation.lng || !window.L) return

        const L = window.L
        const { lat, lng } = selectedLocation

        // Update map view
        mapInstanceRef.current.setView([lat, lng], 13)

        // Update or create marker
        if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng])
        } else {
            markerRef.current = L.marker([lat, lng], {
                draggable: true
            }).addTo(mapInstanceRef.current)

            markerRef.current.on('dragend', (e) => {
                const { lat, lng } = e.target.getLatLng()
                handleLocationSelect(lat, lng)
            })
        }
    }

    const handleLocationSelect = async (lat, lng) => {
        setSelectedLocation({ lat, lng })
        
        // Reverse geocode to get address
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
            )
            const data = await response.json()
            const address = data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`
            setSearchQuery(address)
        } catch (error) {
            console.error('Error reverse geocoding:', error)
            setSearchQuery(`${lat.toFixed(4)}, ${lng.toFixed(4)}`)
        }

        onLocationChange({ lat, lng })
    }

    const handleSearch = async () => {
        if (!searchQuery.trim()) return

        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1&countrycodes=mx`
            )
            const data = await response.json()

            if (data && data.length > 0) {
                const result = data[0]
                const lat = parseFloat(result.lat)
                const lng = parseFloat(result.lon)
                handleLocationSelect(lat, lng)
            } else {
                toast.error('No se encontró la ubicación')
            }
        } catch (error) {
            console.error('Error geocoding:', error)
            toast.error('Error al buscar la ubicación')
        }
    }

    const handleUseCurrentLocation = () => {
        if (!navigator.geolocation) {
            toast.error('Tu navegador no soporta geolocalización')
            return
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords
                handleLocationSelect(latitude, longitude)
            },
            (error) => {
                toast.error('No se pudo obtener tu ubicación')
            }
        )
    }

    return (
        <div className="space-y-4">
            {/* Search Bar */}
            <div className="flex gap-2">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Buscar dirección, colonia o código postal..."
                    className="flex-1 px-4 py-3 rounded-xl border border-[#00C6A2]/20 focus:border-[#00C6A2] focus:ring-2 focus:ring-[#00C6A2]/20 outline-none transition-all"
                />
                <button
                    type="button"
                    onClick={handleSearch}
                    className="px-6 py-3 bg-[#00C6A2] hover:bg-[#00B894] text-white rounded-xl font-semibold transition-all"
                >
                    Buscar
                </button>
                <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-[#1A1A1A] rounded-xl transition-all"
                    title="Usar mi ubicación actual"
                >
                    <Navigation size={20} />
                </button>
            </div>

            {/* Map */}
            <div className="relative">
                <div 
                    ref={mapRef} 
                    className="w-full h-96 rounded-xl border-2 border-slate-200"
                    style={{ zIndex: 1 }}
                />
                {!mapLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-100 rounded-xl">
                        <p className="text-slate-500">Cargando mapa...</p>
                    </div>
                )}
            </div>

            {/* Selected Coordinates */}
            {selectedLocation.lat && selectedLocation.lng && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <div className="flex items-center gap-2 text-sm font-medium text-blue-800">
                        <MapPin size={16} />
                        <span>Ubicación seleccionada:</span>
                    </div>
                    <p className="text-xs text-blue-600 mt-1">
                        Lat: {selectedLocation.lat.toFixed(6)}, Lng: {selectedLocation.lng.toFixed(6)}
                    </p>
                    {searchQuery && (
                        <p className="text-xs text-blue-600 mt-1">{searchQuery}</p>
                    )}
                </div>
            )}
        </div>
    )
}

