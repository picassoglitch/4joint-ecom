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
        <div className="min-h-[70vh] mx-6">
            <div className=" max-w-7xl mx-auto">
                <h1 onClick={() => router.push('/shop')} className="text-2xl text-slate-500 my-6 flex items-center gap-2 cursor-pointer">
                    {(search || category) && <MoveLeftIcon size={20} />}
                    {category ? (
                        <span>Categoría: <span className="text-slate-700 font-medium">{category}</span></span>
                    ) : (
                        <span>Todos los <span className="text-slate-700 font-medium">Productos</span></span>
                    )}
                </h1>
                <div className="grid grid-cols-2 sm:flex flex-wrap gap-6 xl:gap-12 mx-auto mb-32">
                    {filteredProducts.length > 0 ? (
                        filteredProducts.map((product) => <ProductCard key={product.id} product={product} />)
                    ) : (
                        <div className="w-full text-center py-12 text-slate-500">
                            <p>No se encontraron productos{category ? ` en la categoría "${category}"` : ''}.</p>
                        </div>
                    )}
                </div>
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