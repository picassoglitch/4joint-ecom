'use client'
import FeedBlock from './FeedBlock'
import { useSelector } from 'react-redux'
import { useRouter } from 'next/navigation'
import { Package, TrendingUp, Eye } from 'lucide-react'

export default function ExplorationBlocks() {
    const products = useSelector(state => state.product.list)
    const router = useRouter()
    
    // Get recently viewed from localStorage (if available)
    const getRecentlyViewed = () => {
        if (typeof window === 'undefined') return []
        try {
            const viewed = localStorage.getItem('recently_viewed_products')
            if (viewed) {
                const productIds = JSON.parse(viewed)
                return products.filter(p => productIds.includes(p.id)).slice(0, 6)
            }
        } catch (e) {
            console.error('Error reading recently viewed:', e)
        }
        return []
    }
    
    // Get categories for exploration
    const getCategories = () => {
        const categories = [...new Set(products.map(p => p.category).filter(Boolean))]
        return categories.slice(0, 4)
    }
    
    const recentlyViewed = getRecentlyViewed()
    const categories = getCategories()
    const recommendedProducts = products.length > 0
        ? [...products].sort(() => Math.random() - 0.5).slice(0, 8)
        : []
    
    return (
        <div className="space-y-0">
            {/* Explorar categorías */}
            {categories.length > 0 && (
                <section className="py-6 sm:py-8 px-4 sm:mx-6">
                    <div className="max-w-7xl mx-auto">
                        <h2 className="text-xl sm:text-2xl font-bold text-[#1A1A1A] mb-4">
                            Explorar categorías
                        </h2>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                            {categories.map((category, index) => (
                                <button
                                    key={index}
                                    onClick={() => router.push(`/shop?category=${encodeURIComponent(category)}`)}
                                    className="px-4 py-3 bg-white/80 backdrop-blur-sm border border-[#00C6A2]/20 rounded-xl hover:bg-[#00C6A2] hover:text-white hover:border-[#00C6A2] transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm hover:shadow-md text-sm font-medium text-left"
                                >
                                    {category}
                                </button>
                            ))}
                        </div>
                    </div>
                </section>
            )}
            
            {/* Recomendado para ti */}
            {recommendedProducts.length > 0 && (
                <FeedBlock
                    title="Recomendado para ti"
                    subtitle="Basado en tus preferencias"
                    products={recommendedProducts}
                    showLabel={true}
                    labelType={{ text: 'Recomendado', icon: TrendingUp, color: 'bg-purple-500' }}
                />
            )}
            
            {/* Vuelve a ver productos */}
            {recentlyViewed.length > 0 && (
                <FeedBlock
                    title="Vuelve a ver"
                    subtitle="Productos que viste recientemente"
                    products={recentlyViewed}
                    showLabel={true}
                    labelType={{ text: 'Visto', icon: Eye, color: 'bg-slate-500' }}
                />
            )}
        </div>
    )
}







