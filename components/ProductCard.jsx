'use client'
import { StarIcon, MapPin } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import React, { useState, useEffect } from 'react'

const ProductCard = ({ product, storeId, userLocation }) => {
    const currency = 'MXN $'
    const [deliveryStatus, setDeliveryStatus] = useState(null)
    const [checkingDelivery, setCheckingDelivery] = useState(false)

    // Calculate the average rating of the product
    const rating = product.rating && product.rating.length > 0
        ? Math.round(product.rating.reduce((acc, curr) => acc + curr.rating, 0) / product.rating.length)
        : 0;

    // Check if product has variants
    const hasVariants = product.variants && Array.isArray(product.variants) && product.variants.length > 0;
    const displayPrice = hasVariants 
        ? Math.min(...product.variants.map(v => v.price))
        : product.price;

    // Check delivery radius if storeId and userLocation are provided
    useEffect(() => {
        const checkDelivery = async () => {
            if (!storeId || !userLocation?.lat || !userLocation?.lng) {
                setDeliveryStatus(null)
                return
            }

            setCheckingDelivery(true)
            try {
                const response = await fetch(
                    `/api/stores/check-delivery?storeId=${storeId}&userLat=${userLocation.lat}&userLng=${userLocation.lng}`
                )
                if (response.ok) {
                    const data = await response.json()
                    setDeliveryStatus(data)
                }
            } catch (error) {
                console.error('Error checking delivery:', error)
            } finally {
                setCheckingDelivery(false)
            }
        }

        checkDelivery()
    }, [storeId, userLocation])

    const isOutsideRadius = deliveryStatus && !deliveryStatus.withinRadius

    return (
        <div className='group max-xl:mx-auto block relative'>
            <Link href={`/product/${product.id}`} className={isOutsideRadius ? 'pointer-events-none opacity-60' : ''}>
                <div className={`relative bg-gradient-to-br from-slate-50 to-slate-100 h-40 sm:w-60 sm:h-68 rounded-2xl flex items-center justify-center overflow-hidden border shadow-sm transition-all duration-300 ${
                    isOutsideRadius 
                        ? 'border-red-200' 
                        : 'border-slate-200/50 hover:shadow-lg'
                }`}>
                    <Image 
                        width={500} 
                        height={500} 
                        className={`max-h-30 sm:max-h-40 w-auto transition-transform duration-500 ease-out ${
                            isOutsideRadius ? '' : 'group-hover:scale-110'
                        }`}
                        src={product.images?.[0] || '/placeholder.png'} 
                        alt={product.name}
                    />
                    {!isOutsideRadius && (
                        <div className='absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300'></div>
                    )}
                    {isOutsideRadius && (
                        <div className='absolute inset-0 bg-black/20 flex items-center justify-center'>
                            <div className='bg-white/90 px-3 py-1.5 rounded-full text-xs font-bold text-red-600 flex items-center gap-1'>
                                <MapPin size={12} />
                                Fuera de área
                            </div>
                        </div>
                    )}
                </div>
                <div className='flex justify-between gap-3 text-sm text-slate-800 pt-3 max-w-60'>
                    <div className='flex-1 min-w-0'>
                        <p className={`font-medium truncate transition-colors ${
                            isOutsideRadius 
                                ? 'text-slate-400' 
                                : 'text-[#1A1A1A] group-hover:text-[#00C6A2]'
                        }`}>
                            {product.name}
                        </p>
                        {product.quantity && product.unit && (
                            <p className='text-xs text-slate-500 mt-0.5'>
                                {product.quantity}{product.unit}
                            </p>
                        )}
                        <div className='flex items-center gap-1 mt-1'>
                            {Array(5).fill('').map((_, index) => (
                                <StarIcon 
                                    key={index} 
                                    size={14} 
                                    className='text-transparent' 
                                    fill={rating >= index + 1 ? "#FFD95E" : "#E5E7EB"} 
                                />
                            ))}
                            {rating > 0 && <span className='text-xs text-slate-500 ml-1'>({rating})</span>}
                        </div>
                        {isOutsideRadius && deliveryStatus && (
                            <p className='text-xs text-red-500 font-medium mt-1 flex items-center gap-1'>
                                <MapPin size={10} />
                                Entregamos hasta {deliveryStatus.serviceRadius}km
                            </p>
                        )}
                    </div>
                    <div className="text-right flex-shrink-0">
                        {hasVariants && <p className="text-xs text-slate-500 font-medium">Desde</p>}
                        <p className={`font-bold text-lg ${
                            isOutsideRadius ? 'text-slate-400' : 'text-[#1A1A1A]'
                        }`}>
                            {currency}{displayPrice?.toLocaleString('es-MX')}
                        </p>
                    </div>
                </div>
            </Link>
        </div>
    )
}

export default ProductCard