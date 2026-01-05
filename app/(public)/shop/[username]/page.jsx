'use client'
import ProductCard from "@/components/ProductCard"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { MapPinIcon } from "lucide-react"
import Loading from "@/components/Loading"
import Image from "next/image"
import { getProducts } from "@/lib/supabase/database"
import { supabase } from "@/lib/supabase/client"

export default function StoreShop() {

    const { username } = useParams()
    const [products, setProducts] = useState([])
    const [storeInfo, setStoreInfo] = useState(null)
    const [loading, setLoading] = useState(true)

    const fetchStoreData = async () => {
        try {
            // Try to get vendor by username first, then by ID if username doesn't work
            let vendor = null
            let vendorError = null
            
            // First try by username
            const { data: vendorByUsername, error: errorByUsername } = await supabase
                .from('vendors')
                .select('*')
                .eq('username', username)
                .eq('approved', true)
                .single()

            if (vendorByUsername && !errorByUsername) {
                vendor = vendorByUsername
            } else {
                // If username doesn't work, try by ID (in case username is not set)
                const { data: vendorById, error: errorById } = await supabase
                    .from('vendors')
                    .select('*')
                    .eq('id', username) // username param might actually be an ID
                    .eq('approved', true)
                    .single()
                
                if (vendorById && !errorById) {
                    vendor = vendorById
                } else {
                    vendorError = errorById || errorByUsername
                }
            }

            if (vendorError || !vendor) {
                console.error('Error fetching vendor:', vendorError || { message: 'Vendor not found' })
                setLoading(false)
                return
            }

            setStoreInfo({
                id: vendor.id,
                name: vendor.name,
                description: vendor.description,
                logo: vendor.logo || '/placeholder-store.png',
                email: vendor.email,
                address: vendor.address || 'Dirección no disponible',
            })

            // Get products from this vendor
            const vendorProducts = await getProducts({ vendor_id: vendor.id })
            
            // Remove duplicates and format
            const uniqueProducts = vendorProducts
                .filter((product, index, self) => index === self.findIndex(p => p.id === product.id))
                .map(product => ({
                    id: product.id,
                    name: product.name,
                    description: product.description,
                    price: parseFloat(product.price) || 0,
                    mrp: parseFloat(product.mrp) || 0,
                    images: Array.isArray(product.images) ? product.images : (product.images ? [product.images] : []),
                    category: product.category || 'Sin categoría',
                    storeId: product.vendor_id,
                    inStock: product.in_stock !== false,
                    createdAt: product.created_at || new Date().toISOString(),
                    updatedAt: product.updated_at || new Date().toISOString(),
                    variants: product.variants || [],
                }))

            setProducts(uniqueProducts)
        } catch (error) {
            console.error('Error fetching store data:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (username) {
            fetchStoreData()
        }
    }, [username])

    return !loading ? (
        <div className="min-h-[70vh] mx-6">

            {/* Store Info Banner */}
            {storeInfo && (
                <div className="max-w-7xl mx-auto bg-slate-50 rounded-xl p-6 md:p-10 mt-6 flex flex-col md:flex-row items-center gap-6 shadow-xs">
                    <Image
                        src={storeInfo.logo}
                        alt={storeInfo.name}
                        className="size-32 sm:size-38 object-cover border-2 border-slate-100 rounded-md"
                        width={200}
                        height={200}
                    />
                    <div className="text-center md:text-left">
                        <h1 className="text-3xl font-semibold text-slate-800">{storeInfo.name}</h1>
                        <p className="text-sm text-slate-600 mt-2 max-w-lg">{storeInfo.description}</p>
                        <div className="text-xs text-slate-500 mt-4 space-y-1"></div>
                        <div className="space-y-2 text-sm text-slate-500">
                            <div className="flex items-center">
                                <MapPinIcon className="w-4 h-4 text-gray-500 mr-2" />
                                <span>{storeInfo.address}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Products */}
            <div className=" max-w-7xl mx-auto mb-40">
                <h1 className="text-2xl mt-12">Shop <span className="text-slate-800 font-medium">Products</span></h1>
                <div className="mt-5 grid grid-cols-2 sm:flex flex-wrap gap-6 xl:gap-12 mx-auto">
                    {products.map((product) => <ProductCard key={product.id} product={product} />)}
                </div>
            </div>
        </div>
    ) : <Loading />
}