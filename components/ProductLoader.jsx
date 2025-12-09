'use client'
import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { setProduct } from '@/lib/features/product/productSlice'
import { getProducts } from '@/lib/supabase/database'

/**
 * Component that loads products from Supabase and sets them in Redux store
 * Only loads products from approved vendors that are in stock
 */
export default function ProductLoader() {
    const dispatch = useDispatch()

    useEffect(() => {
        const loadProducts = async () => {
            try {
                console.log('🔄 Loading products from Supabase...')
                
                // Get all products from approved vendors that are in stock
                // getProducts() already filters by approved vendors and in_stock
                const allProducts = await getProducts()
                
                console.log(`✅ Loaded ${allProducts?.length || 0} products from database`)
                
                if (!allProducts || allProducts.length === 0) {
                    console.warn('⚠️ No products found. Check if:')
                    console.warn('  1. Vendor is approved (vendors.approved = true)')
                    console.warn('  2. Product is in stock (products.in_stock = true)')
                    dispatch(setProduct([]))
                    return
                }
                
                // Remove duplicates based on product ID (safety check)
                const uniqueProducts = allProducts.filter((product, index, self) =>
                    index === self.findIndex(p => p.id === product.id)
                )
                
                console.log(`📦 Processed ${uniqueProducts.length} unique products`)
                
                // Transform products to match expected format
                const formattedProducts = uniqueProducts.map(product => ({
                    id: product.id,
                    name: product.name,
                    description: product.description,
                    price: parseFloat(product.price) || 0,
                    mrp: parseFloat(product.mrp) || 0,
                    images: Array.isArray(product.images) ? product.images : (product.images ? [product.images] : []),
                    category: product.category || 'Sin categoría',
                    storeId: product.vendor_id,
                    inStock: product.in_stock !== false, // Default to true if not set
                    createdAt: product.created_at || new Date().toISOString(),
                    updatedAt: product.updated_at || new Date().toISOString(),
                    variants: product.variants || [],
                }))
                
                console.log('✅ Products formatted and dispatched to Redux')
                dispatch(setProduct(formattedProducts))
            } catch (error) {
                console.error('❌ Error loading products:', error)
                // Set empty array on error
                dispatch(setProduct([]))
            }
        }

        loadProducts()
        
        // Reload products every 30 seconds to catch new products
        const interval = setInterval(loadProducts, 30000)
        
        return () => clearInterval(interval)
    }, [dispatch])

    return null // This component doesn't render anything
}

