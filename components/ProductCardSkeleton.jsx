'use client'
import React from 'react'

/**
 * Skeleton loader for ProductCard
 * Shows animated placeholder while products are loading
 */
const ProductCardSkeleton = () => {
    return (
        <div className="animate-pulse">
            {/* Image skeleton */}
            <div className='bg-gradient-to-br from-slate-200 to-slate-300 h-40 sm:h-48 md:h-60 w-full rounded-2xl flex items-center justify-center overflow-hidden border border-slate-200/50 shadow-sm'>
                <div className="w-16 h-16 bg-slate-400/30 rounded-full"></div>
            </div>
            
            {/* Text container skeleton */}
            <div className='pt-3 w-full space-y-2'>
                {/* Title and price */}
                <div className='flex justify-between items-start gap-2'>
                    <div className='flex-1 space-y-1'>
                        <div className='h-4 bg-slate-200 rounded w-3/4'></div>
                        <div className='h-4 bg-slate-200 rounded w-1/2'></div>
                    </div>
                    <div className='h-5 bg-slate-200 rounded w-16 flex-shrink-0'></div>
                </div>
                
                {/* Attributes skeleton */}
                <div className='flex items-center gap-2'>
                    <div className='h-4 bg-slate-200 rounded-full w-16'></div>
                    <div className='h-4 bg-slate-200 rounded-full w-20'></div>
                </div>
                
                {/* Rating skeleton */}
                <div className='flex items-center gap-1.5'>
                    <div className='flex items-center gap-0.5'>
                        {Array(5).fill('').map((_, index) => (
                            <div 
                                key={index} 
                                className='w-3 h-3 bg-slate-200 rounded'
                            />
                        ))}
                    </div>
                    <div className='h-3 bg-slate-200 rounded w-8'></div>
                </div>
            </div>
        </div>
    )
}

export default ProductCardSkeleton

