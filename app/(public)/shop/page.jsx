'use client'
import { Suspense, useEffect } from "react"
import ProductCard from "@/components/ProductCard"
import { MoveLeftIcon } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSelector } from "react-redux"

 function ShopContent() {

    // get query params ?search=abc&category=xyz
    const searchParams = useSearchParams()
    const search = searchParams.get('search')
    const category = searchParams.get('category')
    const router = useRouter()

    const products = useSelector(state => state.product.list)

    // Debug logging
    useEffect(() => {
        console.log(`🛍️ Shop page: ${products.length} products in Redux store`)
        if (products.length === 0) {
            console.warn('⚠️ No products in Redux. Check ProductLoader component.')
        }
    }, [products])

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
        <div className="min-h-[70vh]">
            {/* Lightweight header */}
            <div className="px-4 sm:mx-6 py-6 border-b border-[#00C6A2]/5">
                <div className="max-w-7xl mx-auto">
                    <h1 onClick={() => router.push('/shop')} className="text-2xl sm:text-3xl font-bold text-[#1A1A1A] flex items-center gap-2 cursor-pointer hover:text-[#00C6A2] transition-colors">
                        {(search || category) && <MoveLeftIcon size={20} className="hover:-translate-x-1 transition-transform" />}
                        {category ? (
                            <span>Categoría: <span className="text-[#00C6A2]">{category}</span></span>
                        ) : search ? (
                            <span>Resultados para: <span className="text-[#00C6A2]">"{search}"</span></span>
                        ) : (
                            <span>Todos los <span className="text-[#00C6A2]">Productos</span></span>
                        )}
                    </h1>
                    {filteredProducts.length > 0 && (
                        <p className="text-sm text-[#1A1A1A]/60 mt-2">
                            {filteredProducts.length} producto{filteredProducts.length !== 1 ? 's' : ''} encontrado{filteredProducts.length !== 1 ? 's' : ''}
                        </p>
                    )}
                </div>
            </div>

            {/* Feed-style product grid */}
            {filteredProducts.length > 0 ? (
                <div className="px-4 sm:mx-6 py-8">
                    <div className="max-w-7xl mx-auto">
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6 mb-32">
                            {filteredProducts.map((product, index) => {
                                // Add activity signals for some products
                                let activitySignal = null
                                if (index < 3 && product.rating?.length >= 5) {
                                    activitySignal = 'Popular hoy'
                                } else if (index < 6 && product.price < 300) {
                                    activitySignal = 'Muy visto'
                                }
                                
                                return (
                                    <div
                                        key={product.id}
                                        style={{ 
                                            animationDelay: `${Math.min(index * 30, 400)}ms` 
                                        }}
                                        className="opacity-0 translate-y-4 animate-fade-in-up"
                                    >
                                        <ProductCard 
                                            product={product} 
                                            showLabel={true}
                                            activitySignal={activitySignal}
                                        />
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="w-full text-center py-20 px-4">
                    <div className="text-6xl mb-4 animate-bounce">🔍</div>
                    <p className="text-xl font-semibold text-[#1A1A1A] mb-2">No se encontraron productos</p>
                    <p className="text-slate-500">{category ? `en la categoría "${category}"` : search ? `para "${search}"` : 'Intenta ajustar tus filtros de búsqueda'}</p>
                </div>
            )}
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