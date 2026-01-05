'use client'
import { useEffect, useState } from "react"
import { toast } from "react-hot-toast"
import Image from "next/image"
import Loading from "@/components/Loading"
import { getProducts, updateProduct } from "@/lib/supabase/database"
import { getCurrentUser } from "@/lib/supabase/auth"
import { getSafeImageSource } from "@/lib/utils/image"

export default function StoreManageProducts() {

    const currency = 'MXN $'

    const [loading, setLoading] = useState(true)
    const [products, setProducts] = useState([])
    // FIX: Track image errors per product
    const [thumbnailErrors, setThumbnailErrors] = useState({})

    const fetchProducts = async () => {
        try {
            const { user } = await getCurrentUser()
            if (!user) {
                toast.error('Debes estar autenticado')
                setLoading(false)
                return
            }

            // Get only products from current vendor
            const vendorProducts = await getProducts({ vendor_id: user.id })
            setProducts(vendorProducts || [])
        } catch (error) {
            console.error('Error fetching products:', error)
            toast.error('Error al cargar los productos')
            setProducts([])
        } finally {
            setLoading(false)
        }
    }

    const toggleStock = async (productId) => {
        try {
            const product = products.find(p => p.id === productId)
            if (!product) return

            const newStockStatus = !product.in_stock
            await updateProduct(productId, { in_stock: newStockStatus })
            
            // Update local state
            setProducts(products.map(p => 
                p.id === productId ? { ...p, in_stock: newStockStatus } : p
            ))
            
            toast.success(`Producto ${newStockStatus ? 'activado' : 'desactivado'}`)
        } catch (error) {
            console.error('Error toggling stock:', error)
            toast.error('Error al actualizar el estado del producto')
            throw error
        }
    }

    useEffect(() => {
            fetchProducts()
    }, [])

    if (loading) return <Loading />

    return (
        <>
            <h1 className="text-2xl text-slate-500 mb-5">Gestionar <span className="text-slate-800 font-medium">Productos</span></h1>
            <table className="w-full max-w-4xl text-left  ring ring-slate-200  rounded overflow-hidden text-sm">
                <thead className="bg-slate-50 text-gray-700 uppercase tracking-wider">
                    <tr>
                        <th className="px-4 py-3">Nombre</th>
                        <th className="px-4 py-3 hidden md:table-cell">Descripción</th>
                        <th className="px-4 py-3 hidden md:table-cell">Precio Original</th>
                        <th className="px-4 py-3">Precio</th>
                        <th className="px-4 py-3">Acciones</th>
                    </tr>
                </thead>
                <tbody className="text-slate-700">
                    {products.map((product) => (
                        <tr key={product.id} className="border-t border-gray-200 hover:bg-gray-50">
                            <td className="px-4 py-3">
                                <div className="flex gap-2 items-center">
                                    {product.images && product.images.length > 0 ? (() => {
                                        const imageUrl = getSafeImageSource(product.images[0], product.id)
                                        const hasError = thumbnailErrors[product.id] || false
                                        
                                        return hasError ? (
                                            <div className="w-10 h-10 bg-red-50 border border-red-200 rounded flex items-center justify-center">
                                                <span className="text-xs text-red-600">Error</span>
                                            </div>
                                        ) : (
                                            <Image 
                                                width={40} 
                                                height={40}
                                                className='p-1 shadow rounded cursor-pointer' 
                                                src={imageUrl}
                                                alt={product.name}
                                                onLoad={() => {
                                                    // FIX: Reset error on successful load
                                                    if (thumbnailErrors[product.id]) {
                                                        setThumbnailErrors(prev => {
                                                            const updated = { ...prev }
                                                            delete updated[product.id]
                                                            return updated
                                                        })
                                                    }
                                                }}
                                                onError={(e) => {
                                                    // FIX: Show error when image fails to load - no placeholder fallback
                                                    if (imageUrl && !thumbnailErrors[product.id] && e?.currentTarget) {
                                                        const currentSrc = e.currentTarget.src || ''
                                                        if (currentSrc.includes(imageUrl) || currentSrc === imageUrl) {
                                                            setThumbnailErrors(prev => ({ ...prev, [product.id]: true }))
                                                            toast.error(`Error al cargar imagen: ${product.name}`)
                                                        }
                                                    }
                                                }}
                                            />
                                        )
                                    })() : (
                                        <div className="w-10 h-10 bg-slate-200 rounded flex items-center justify-center">
                                            <span className="text-xs text-slate-400">Sin img</span>
                                        </div>
                                    )}
                                    {product.name}
                                </div>
                            </td>
                            <td className="px-4 py-3 max-w-md text-slate-600 hidden md:table-cell truncate">{product.description || 'Sin descripción'}</td>
                            <td className="px-4 py-3 hidden md:table-cell">{currency} {product.mrp ? product.mrp.toLocaleString() : '-'}</td>
                            <td className="px-4 py-3">{currency} {product.price ? product.price.toLocaleString() : '0'}</td>
                            <td className="px-4 py-3">
                                <div className="flex items-center gap-3 justify-center">
                                    <button
                                        onClick={() => window.location.href = `/store/edit-product/${product.id}`}
                                        className="px-3 py-1 bg-[#00C6A2] text-white text-xs rounded-lg hover:bg-[#00B894] transition-colors"
                                    >
                                        Editar
                                    </button>
                                    <label className="relative inline-flex items-center cursor-pointer text-gray-900 gap-2">
                                        <input type="checkbox" className="sr-only peer" onChange={() => toast.promise(toggleStock(product.id), { loading: "Actualizando datos..." })} checked={product.in_stock || false} />
                                        <div className="w-9 h-5 bg-slate-300 rounded-full peer peer-checked:bg-green-600 transition-colors duration-200"></div>
                                        <span className="dot absolute left-1 top-1 w-3 h-3 bg-white rounded-full transition-transform duration-200 ease-in-out peer-checked:translate-x-4"></span>
                                    </label>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </>
    )
}