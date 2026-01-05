'use client'
import { StarIcon, TrendingUp, Zap, Package, Flame, AlertCircle } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import React, { useState, useEffect, useRef } from 'react'
import { getSafeImageSource } from '@/lib/utils/image'

const ProductCard = ({ product, showLabel = false, labelType = null, activitySignal = null }) => {
    const [imageError, setImageError] = useState(false)
    const [isHovered, setIsHovered] = useState(false)
    const [isVisible, setIsVisible] = useState(false)
    const cardRef = useRef(null)
    const currency = 'MXN $'

    // calculate the average rating of the product
    const rating = product.rating && product.rating.length > 0
        ? Math.round(product.rating.reduce((acc, curr) => acc + curr.rating, 0) / product.rating.length)
        : 0;

    // Check if product has variants
    const hasVariants = product.variants && Array.isArray(product.variants) && product.variants.length > 0;
    const displayPrice = hasVariants 
        ? Math.min(...product.variants.map(v => v.price))
        : product.price;

    // Normalize image source
    const PLACEHOLDER_PATH = '/img/placeholder-product.svg'
    const imageSrc = imageError 
        ? PLACEHOLDER_PATH
        : getSafeImageSource(product.images?.[0], product.id, PLACEHOLDER_PATH)
    
    const secondaryImageSrc = product.images?.[1] 
        ? getSafeImageSource(product.images[1], product.id, PLACEHOLDER_PATH)
        : null

    // Scroll reveal effect
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true)
                }
            },
            { threshold: 0.1, rootMargin: '50px' }
        )

        if (cardRef.current) {
            observer.observe(cardRef.current)
        }

        return () => {
            if (cardRef.current) {
                observer.unobserve(cardRef.current)
            }
        }
    }, [])

    // Determine micro-label with enhanced logic
    const getMicroLabel = () => {
        if (labelType) return labelType
        if (showLabel) {
            // Enhanced logic for marketplace feel
            if (rating >= 4.5) return { text: 'Popular', icon: TrendingUp, color: 'bg-[#00C6A2]' }
            if (product.price < 200) return { text: 'Oferta', icon: Zap, color: 'bg-[#FFD95E]' }
            if (product.in_stock === false || (product.stock !== undefined && product.stock < 5)) {
                return { text: 'Últimas piezas', icon: AlertCircle, color: 'bg-red-500' }
            }
            // Check if product is new (created in last 7 days)
            if (product.createdAt) {
                const daysSinceCreation = (Date.now() - new Date(product.createdAt).getTime()) / (1000 * 60 * 60 * 24)
                if (daysSinceCreation < 7) return { text: 'Nuevo', icon: Package, color: 'bg-blue-500' }
            }
            if (rating >= 4) return { text: 'Tendencia', icon: Flame, color: 'bg-orange-500' }
            return { text: 'Nuevo', icon: Package, color: 'bg-blue-500' }
        }
        return null
    }

    const microLabel = getMicroLabel()
    
    // Extract product attributes for display
    const getProductAttributes = () => {
        const attrs = []
        // Check for intensity (if stored in description or metadata)
        if (product.intensity) {
            const intensityMap = { 'suave': 'Suave', 'medio': 'Medio', 'fuerte': 'Fuerte' }
            attrs.push({ label: intensityMap[product.intensity.toLowerCase()] || product.intensity, color: 'text-blue-600' })
        }
        // Check for use case
        if (product.uso) {
            const usoMap = { 'relajacion': 'Relajación', 'social': 'Social', 'dormir': 'Dormir', 'energia': 'Energía' }
            attrs.push({ label: usoMap[product.uso.toLowerCase()] || product.uso, color: 'text-purple-600' })
        }
        // Fallback: use category as attribute
        if (attrs.length === 0 && product.category) {
            attrs.push({ label: product.category, color: 'text-slate-600' })
        }
        return attrs
    }

    const attributes = getProductAttributes()

    const handleImageError = (e) => {
        // Prevent infinite loop: only handle error once using dataset flag
        if (e.currentTarget.dataset.fallbackApplied) return
        e.currentTarget.dataset.fallbackApplied = '1'
        
        if (!imageError) {
            if (process.env.NODE_ENV !== 'production') {
                console.error('Image failed to load:', { productId: product.id, attemptedSrc: product.images?.[0] })
            }
            setImageError(true)
            // Update src to placeholder only if not already set
            if (e.currentTarget.src !== PLACEHOLDER_PATH && !e.currentTarget.src.includes('placeholder-product')) {
                e.currentTarget.src = PLACEHOLDER_PATH
            }
        }
    }

    return (
        <div 
            ref={cardRef}
            className={`opacity-0 translate-y-4 transition-all duration-500 ease-out ${
                isVisible ? 'opacity-100 translate-y-0' : ''
            }`}
        >
            <Link 
                href={`/product/${product.id}`} 
                className='group block w-full'
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {/* Enhanced image container with hover effects */}
                <div className='relative bg-gradient-to-br from-slate-50 to-slate-100 h-40 sm:h-48 md:h-60 w-full rounded-2xl flex items-center justify-center overflow-hidden border border-slate-200/50 shadow-sm hover:shadow-xl hover:border-[#00C6A2]/30 transition-all duration-300 hover:scale-[1.02]'>
                    {/* Primary image */}
                    <div className={`absolute inset-0 transition-opacity duration-500 ${isHovered && secondaryImageSrc ? 'opacity-0' : 'opacity-100'}`}>
                        <Image 
                            width={500} 
                            height={500} 
                            className='max-h-32 sm:max-h-40 md:max-h-48 w-auto h-auto group-hover:scale-110 transition-transform duration-500 ease-out' 
                            src={imageSrc} 
                            alt={product.name}
                            onError={handleImageError}
                        />
                    </div>
                    
                    {/* Secondary image on hover */}
                    {secondaryImageSrc && (
                        <div className={`absolute inset-0 transition-opacity duration-500 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
                            <Image 
                                width={500} 
                                height={500} 
                                className='max-h-32 sm:max-h-40 md:max-h-48 w-auto h-auto scale-110 transition-transform duration-500 ease-out' 
                                src={secondaryImageSrc} 
                                alt={product.name}
                            />
                        </div>
                    )}
                    
                    {/* Micro-label badge */}
                    {microLabel && (
                        <div className={`absolute top-2 left-2 ${microLabel.color} text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-md z-10`}>
                            <microLabel.icon size={10} />
                            {microLabel.text}
                        </div>
                    )}
                    
                    {/* Activity signal badge */}
                    {activitySignal && (
                        <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm text-white text-[9px] font-semibold px-2 py-1 rounded-full z-10">
                            {activitySignal}
                        </div>
                    )}
                    
                    {/* Hover overlay */}
                    <div className='absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300'></div>
                </div>
                
                {/* Enhanced text container - Denser information */}
                <div className='pt-3 w-full'>
                    <div className='flex justify-between items-start gap-2 mb-1.5'>
                        <p className='font-semibold text-sm text-[#1A1A1A] line-clamp-2 group-hover:text-[#00C6A2] transition-colors duration-200 flex-1 min-w-0'>{product.name}</p>
                        <div className="text-right flex-shrink-0">
                            {hasVariants && <p className="text-[10px] text-slate-500 font-medium">Desde</p>}
                            <p className='font-bold text-base sm:text-lg text-[#1A1A1A] group-hover:text-[#00C6A2] transition-colors duration-200'>{currency}{displayPrice?.toLocaleString('es-MX')}</p>
                        </div>
                    </div>
                    
                    {/* Attributes row */}
                    {attributes.length > 0 && (
                        <div className='flex items-center gap-2 mb-1.5 flex-wrap'>
                            {attributes.slice(0, 2).map((attr, idx) => (
                                <span key={idx} className={`text-[10px] font-medium ${attr.color} bg-slate-100 px-2 py-0.5 rounded-full`}>
                                    {attr.label}
                                </span>
                            ))}
                        </div>
                    )}
                    
                    {/* Rating row */}
                    <div className='flex items-center gap-1.5'>
                        <div className='flex items-center gap-0.5'>
                            {Array(5).fill('').map((_, index) => (
                                <StarIcon 
                                    key={index} 
                                    size={12} 
                                    className='text-transparent transition-all duration-200' 
                                    fill={rating >= index + 1 ? "#FFD95E" : "#E5E7EB"} 
                                />
                            ))}
                        </div>
                        {rating > 0 && <span className='text-[10px] text-slate-500'>({rating})</span>}
                        {product.category && (
                            <span className='text-[10px] text-slate-400 ml-auto'>• {product.category}</span>
                        )}
                    </div>
                </div>
            </Link>
        </div>
    )
}

export default ProductCard