'use client'
import { ArrowRight, StarIcon } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"

const ProductDescription = ({ product }) => {

    const [selectedTab, setSelectedTab] = useState('Description')
    const [storeInfo, setStoreInfo] = useState(null)
    const [loadingStore, setLoadingStore] = useState(true)

    // Fetch store information from Supabase
    useEffect(() => {
        const fetchStoreInfo = async () => {
            if (!product?.storeId && !product?.vendor_id) {
                setLoadingStore(false)
                return
            }

            try {
                const vendorId = product.storeId || product.vendor_id
                
                const { data: vendor, error } = await supabase
                    .from('vendors')
                    .select('id, name, logo, username, email')
                    .eq('id', vendorId)
                    .single()

                if (error) {
                    console.error('Error fetching vendor:', error)
                    setStoreInfo(null)
                } else {
                    setStoreInfo(vendor)
                }
            } catch (error) {
                console.error('Error fetching store info:', error)
                setStoreInfo(null)
            } finally {
                setLoadingStore(false)
            }
        }

        fetchStoreInfo()
    }, [product])

    // Safely get ratings
    const ratings = product.rating && Array.isArray(product.rating) && product.rating.length > 0
        ? product.rating
        : []

    return (
        <div className="my-18 text-sm text-slate-600">

            {/* Tabs */}
            <div className="flex border-b border-slate-200 mb-6 max-w-2xl">
                {['Description', 'Reviews'].map((tab, index) => (
                    <button className={`${tab === selectedTab ? 'border-b-[1.5px] font-semibold' : 'text-slate-400'} px-3 py-2 font-medium`} key={index} onClick={() => setSelectedTab(tab)}>
                        {tab}
                    </button>
                ))}
            </div>

            {/* Description */}
            {selectedTab === "Description" && (
                <p className="max-w-xl">{product.description || 'Sin descripción disponible'}</p>
            )}

            {/* Reviews */}
            {selectedTab === "Reviews" && (
                <div className="flex flex-col gap-3 mt-14">
                    {ratings.length > 0 ? (
                        ratings.map((item, index) => (
                            <div key={index} className="flex gap-5 mb-10">
                                <Image 
                                    src={item.user?.image || '/placeholder-user.png'} 
                                    alt={item.user?.name || 'Usuario'} 
                                    className="size-10 rounded-full" 
                                    width={100} 
                                    height={100} 
                                />
                                <div>
                                    <div className="flex items-center" >
                                        {Array(5).fill('').map((_, starIndex) => (
                                            <StarIcon 
                                                key={starIndex} 
                                                size={18} 
                                                className='text-transparent mt-0.5' 
                                                fill={(item.rating || 0) >= starIndex + 1 ? "#00C950" : "#D1D5DB"} 
                                            />
                                        ))}
                                    </div>
                                    <p className="text-sm max-w-lg my-4">{item.review || 'Sin comentario'}</p>
                                    <p className="font-medium text-slate-800">{item.user?.name || 'Usuario'}</p>
                                    <p className="mt-3 font-light">
                                        {item.createdAt ? new Date(item.createdAt).toDateString() : 'Fecha no disponible'}
                                    </p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-slate-500 py-8">No hay reseñas disponibles para este producto.</p>
                    )}
                </div>
            )}

            {/* Store Page */}
            {storeInfo && !loadingStore && (
                <div className="flex gap-3 mt-14">
                    <Image 
                        src={storeInfo.logo || '/placeholder-store.png'} 
                        alt={storeInfo.name || 'Tienda'} 
                        className="size-11 rounded-full ring ring-slate-400" 
                        width={100} 
                        height={100} 
                    />
                    <div>
                        <p className="font-medium text-slate-600">Producto de {storeInfo.name || 'Tienda'}</p>
                        {storeInfo.username && (
                            <Link 
                                href={`/shop/${storeInfo.username}`} 
                                className="flex items-center gap-1.5 text-green-500 hover:text-green-600"
                            >
                                Ver tienda <ArrowRight size={14} />
                            </Link>
                        )}
                    </div>
                </div>
            )}
            
            {!storeInfo && !loadingStore && (
                <div className="flex gap-3 mt-14">
                    <div className="size-11 rounded-full ring ring-slate-400 bg-slate-200 flex items-center justify-center">
                        <span className="text-xs text-slate-400">?</span>
                    </div>
                    <div>
                        <p className="font-medium text-slate-600">Información de tienda no disponible</p>
                    </div>
                </div>
            )}
        </div>
    )
}

export default ProductDescription