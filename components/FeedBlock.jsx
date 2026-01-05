'use client'
import { useEffect, useRef, useState } from 'react'
import ProductCard from './ProductCard'
import ProductCardSkeleton from './ProductCardSkeleton'

export default function FeedBlock({ 
    title, 
    products = [], 
    showLabel = false,
    labelType = null,
    className = '',
    subtitle = null,
    isLoading = false,
    skeletonCount = 5 // Number of skeleton cards to show
}) {
    const [isVisible, setIsVisible] = useState(false)
    const blockRef = useRef(null)

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true)
                }
            },
            { threshold: 0.1, rootMargin: '100px' }
        )

        if (blockRef.current) {
            observer.observe(blockRef.current)
        }

        return () => {
            if (blockRef.current) {
                observer.unobserve(blockRef.current)
            }
        }
    }, [])

    // Always show section while loading (prevents blank sections on first load)
    // Only hide if not loading AND no products (genuinely empty)
    if (!isLoading && (!products || products.length === 0)) {
        return null
    }
    
    // Show skeletons while loading
    const showSkeletons = isLoading

    return (
        <section 
            ref={blockRef}
            className={`py-4 sm:py-5 transition-all duration-700 ease-out ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            } ${className}`}
        >
            <div className="px-4 sm:mx-6">
                <div className="max-w-7xl mx-auto">
                    {/* Compact header - Reduced spacing */}
                    <div className="mb-4 sm:mb-5">
                        {title && (
                            <h2 className="text-xl sm:text-2xl font-bold text-[#1A1A1A] mb-1">
                                {title}
                            </h2>
                        )}
                        {subtitle && (
                            <p className="text-xs sm:text-sm text-[#1A1A1A]/60">{subtitle}</p>
                        )}
                    </div>

                    {/* Feed-style grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
                        {showSkeletons ? (
                            // Show skeleton loaders while loading
                            Array.from({ length: skeletonCount }).map((_, index) => (
                                <div key={`skeleton-${index}`}>
                                    <ProductCardSkeleton />
                                </div>
                            ))
                        ) : (
                            // Show actual products
                            products.map((product, index) => {
                                // Extract activitySignal if present (passed via product._activitySignal)
                                const activitySignal = product._activitySignal || null
                                // Remove it from product to avoid passing to ProductCard
                                const { _activitySignal, ...cleanProduct } = product
                                
                                return (
                                    <div
                                        key={cleanProduct.id || index}
                                        style={{ 
                                            animationDelay: `${Math.min(index * 50, 500)}ms` 
                                        }}
                                    >
                                        <ProductCard 
                                            product={cleanProduct} 
                                            showLabel={showLabel}
                                            labelType={labelType}
                                            activitySignal={activitySignal}
                                        />
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            </div>
        </section>
    )
}

