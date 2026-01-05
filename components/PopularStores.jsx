'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

export default function PopularStores() {
    const router = useRouter()
    const [stores, setStores] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchPopularStores()
    }, [])

    const fetchPopularStores = async () => {
        try {
            // Fetch approved vendors directly from Supabase
            const { supabase } = await import('@/lib/supabase/client')
            const { data, error } = await supabase
                .from('vendors')
                .select('id, name, description, logo, username, email')
                .eq('approved', true)
                .limit(10)
            
            if (error) {
                console.error('Error fetching stores:', error)
                return
            }
            
            if (data && data.length > 0) {
                // Add default rating for display
                const storesWithRating = data.map(store => ({
                    ...store,
                    rating: 4.5 // Default rating, can be enhanced with real data
                }))
                setStores(storesWithRating)
            }
        } catch (error) {
            console.error('Error fetching popular stores:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading || stores.length === 0) return null

    return (
        <section className="py-4 sm:py-5 px-4 sm:mx-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-[#1A1A1A] mb-1">
                            Tiendas Populares
                        </h2>
                        <p className="text-xs sm:text-sm text-[#1A1A1A]/60">
                            Explora las tiendas más destacadas
                        </p>
                    </div>
                    <Link
                        href="/tiendas-cerca"
                        className="text-sm font-medium text-[#00C6A2] hover:text-[#00B894] transition-colors flex items-center gap-1"
                    >
                        Ver todas
                        <ChevronRight size={16} />
                    </Link>
                </div>

                {/* Horizontal scroll container */}
                <div className="overflow-x-auto no-scrollbar">
                    <div className="flex gap-4 pb-4" style={{ width: 'max-content' }}>
                        {stores.map((store) => (
                            <div
                                key={store.id}
                                onClick={() => router.push(`/shop/${store.username || store.id}`)}
                                className="flex-shrink-0 w-48 sm:w-56 bg-white rounded-xl border border-slate-200 p-4 hover:shadow-lg hover:border-[#00C6A2]/30 hover:scale-105 transition-all duration-300 cursor-pointer"
                            >
                                <div className="flex flex-col items-center text-center">
                                    {store.logo ? (
                                        <div className="w-20 h-20 rounded-lg overflow-hidden mb-3 bg-slate-100">
                                            <Image
                                                src={store.logo}
                                                alt={store.name}
                                                width={80}
                                                height={80}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    ) : (
                                        <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-[#00C6A2]/20 to-[#00C6A2]/10 flex items-center justify-center mb-3">
                                            <span className="text-2xl font-bold text-[#00C6A2]">
                                                {store.name?.charAt(0) || 'T'}
                                            </span>
                                        </div>
                                    )}
                                    <h3 className="font-semibold text-sm text-[#1A1A1A] mb-1 line-clamp-2">
                                        {store.name}
                                    </h3>
                                    {store.description && (
                                        <p className="text-xs text-slate-500 line-clamp-2 mb-2">
                                            {store.description}
                                        </p>
                                    )}
                                    <div className="flex items-center gap-1 text-xs text-slate-400">
                                        <span className="text-yellow-500">★</span>
                                        <span>{store.rating?.toFixed(1) || '4.5'}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}

