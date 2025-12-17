'use client'
import { Suspense, useEffect, useState } from "react"
import ProductCard from "@/components/ProductCard"
import { MoveLeftIcon, Store, ShoppingBag } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSelector } from "react-redux"
import { getProducts } from "@/lib/supabase/database"
import { getCurrentUser } from "@/lib/supabase/auth"
import { supabase } from "@/lib/supabase/client"
import { MapPin } from "lucide-react"
import { toast } from "react-hot-toast"

 function ShopContent() {

    // get query params ?search=abc&category=xyz
    const searchParams = useSearchParams()
    const search = searchParams.get('search')
    const category = searchParams.get('category')
    const router = useRouter()

    const [viewMode, setViewMode] = useState('products') // 'stores' or 'products'
    const [stores, setStores] = useState([])
    const [userLocation, setUserLocation] = useState(null)
    const [loadingStores, setLoadingStores] = useState(false)

    const products = useSelector(state => state.product.list)

    // Debug logging
    useEffect(() => {
        console.log(`🛍️ Shop page: ${products.length} products in Redux store`)
        if (products.length === 0) {
            console.warn('⚠️ No products in Redux. Check ProductLoader component.')
        }
    }, [products])

    // Fetch user location for stores view
    useEffect(() => {
        if (viewMode === 'stores') {
            checkUserLocation()
        }
    }, [viewMode])

    // Fetch stores when location is available
    useEffect(() => {
        if (viewMode === 'stores' && userLocation) {
            fetchNearbyStores()
        }
    }, [userLocation, viewMode])

    const checkUserLocation = async () => {
        try {
            const { user } = await getCurrentUser()
            if (!user) {
                toast.error('Debes iniciar sesión para ver tiendas')
                setViewMode('products')
                return
            }

            const session = await supabase.auth.getSession()
            const token = session?.data?.session?.access_token || ''
            
            const response = await fetch('/api/user/location', {
                headers: token ? {
                    'Authorization': `Bearer ${token}`
                } : {}
            })
            
            if (response.ok) {
                const { data } = await response.json()
                if (data?.latitude && data?.longitude) {
                    setUserLocation({
                        lat: data.latitude,
                        lng: data.longitude,
                        place: data.location_place
                    })
                } else {
                    toast.error('Configura tu ubicación para ver tiendas')
                    setViewMode('products')
                }
            }
        } catch (error) {
            console.error('Error checking user location:', error)
            setViewMode('products')
        }
    }

    const fetchNearbyStores = async () => {
        if (!userLocation) return

        setLoadingStores(true)
        try {
            const params = new URLSearchParams({
                lat: userLocation.lat.toString(),
                lng: userLocation.lng.toString(),
                maxDistance: '50',
            })

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
            setLoadingStores(false)
        }
    }

    const formatDistance = (km) => {
        if (km < 1) {
            return `${Math.round(km * 1000)}m`
        }
        return `${km.toFixed(1)}km`
    }

    let filteredProducts = products;

    // Filter by category if provided
    if (category) {
        filteredProducts = filteredProducts.filter(product =>
            product.category === category
        );
    }

    // Filter by search if provided
    if (search) {
        filteredProducts = filteredProducts.filter(product =>
            product.name.toLowerCase().includes(search.toLowerCase())
        );
    }

    return (
        <div className="min-h-[70vh] mx-6">
            <div className="max-w-7xl mx-auto">
                {/* Header with Toggle */}
                <div className="my-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h1 onClick={() => router.push('/shop')} className="text-2xl text-slate-500 flex items-center gap-2 cursor-pointer">
                            {(search || category) && <MoveLeftIcon size={20} />}
                            {category ? (
                                <span>Categoría: <span className="text-slate-700 font-medium">{category}</span></span>
                            ) : (
                                <span>Todos los <span className="text-slate-700 font-medium">Productos</span></span>
                            )}
                        </h1>
                        {viewMode === 'stores' && userLocation && (
                            <p className="text-sm text-slate-500 flex items-center gap-2 mt-2">
                                <MapPin size={14} />
                                {userLocation.place}
                            </p>
                        )}
                    </div>
                    
                    {/* View Mode Toggle */}
                    <div className="flex items-center gap-3 bg-white p-1.5 rounded-full shadow-lg border-2 border-slate-200">
                        <button
                            onClick={() => setViewMode('stores')}
                            className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all ${
                                viewMode === 'stores'
                                    ? 'bg-gradient-to-r from-[#00C6A2] to-[#00B894] text-white shadow-md scale-105'
                                    : 'text-slate-600 hover:text-[#00C6A2] hover:bg-slate-50'
                            }`}
                        >
                            <Store size={20} />
                            <span className="hidden sm:inline">Tiendas</span>
                            <span className="sm:hidden">Tiendas</span>
                        </button>
                        <button
                            onClick={() => setViewMode('products')}
                            className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all ${
                                viewMode === 'products'
                                    ? 'bg-gradient-to-r from-[#00C6A2] to-[#00B894] text-white shadow-md scale-105'
                                    : 'text-slate-600 hover:text-[#00C6A2] hover:bg-slate-50'
                            }`}
                        >
                            <ShoppingBag size={20} />
                            <span className="hidden sm:inline">Productos</span>
                            <span className="sm:hidden">Productos</span>
                        </button>
                    </div>
                </div>

                {/* Content based on view mode */}
                {viewMode === 'stores' ? (
                    loadingStores ? (
                        <div className="text-center py-20">
                            <p className="text-slate-500">Cargando tiendas...</p>
                        </div>
                    ) : stores.length === 0 ? (
                        <div className="w-full text-center py-20">
                            <div className="text-6xl mb-4">🏪</div>
                            <p className="text-xl font-semibold text-[#1A1A1A] mb-2">No se encontraron tiendas</p>
                            <p className="text-slate-500">Intenta cambiar a la vista de productos</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-32">
                            {stores.map((store) => (
                                <div
                                    key={store.id}
                                    className="bg-white rounded-2xl border-2 border-slate-200 p-6 hover:shadow-2xl hover:border-[#00C6A2] transition-all cursor-pointer group"
                                    onClick={() => router.push(`/shop/${store.username || store.id}`)}
                                >
                                    <div className="flex items-start gap-4 mb-4">
                                        {store.logo && (
                                            <img
                                                src={store.logo}
                                                alt={store.name}
                                                className="w-16 h-16 rounded-xl object-cover border-2 border-slate-200"
                                            />
                                        )}
                                        <div className="flex-1">
                                            <h3 className="font-bold text-lg text-[#1A1A1A] mb-2 group-hover:text-[#00C6A2] transition-colors">
                                                {store.name}
                                            </h3>
                                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                                <MapPin size={14} className="text-[#00C6A2]" />
                                                {formatDistance(store.distance_km)}
                                            </div>
                                        </div>
                                    </div>
                                    {store.description && (
                                        <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                                            {store.description}
                                        </p>
                                    )}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            router.push(`/shop/${store.username || store.id}`)
                                        }}
                                        className="w-full mt-4 px-6 py-3 bg-gradient-to-r from-[#00C6A2] to-[#00B894] text-white rounded-full font-bold hover:from-[#00B894] hover:to-[#00A885] transition-all shadow-lg hover:shadow-xl"
                                    >
                                        Ver tienda
                                    </button>
                                </div>
                            ))}
                        </div>
                    )
                ) : (
                    <>
                        {filteredProducts.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 lg:gap-8 mx-auto mb-32">
                                {filteredProducts.map((product) => <ProductCard key={product.id} product={product} />)}
                            </div>
                        ) : (
                            <div className="w-full text-center py-20">
                                <div className="text-6xl mb-4">🔍</div>
                                <p className="text-xl font-semibold text-[#1A1A1A] mb-2">No se encontraron productos</p>
                                <p className="text-slate-500">{category ? `en la categoría "${category}"` : 'Intenta ajustar tus filtros de búsqueda'}</p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}


export default function Shop() {
  return (
    <Suspense fallback={<div>Cargando tienda...</div>}>
      <ShopContent />
    </Suspense>
  );
}