'use client'
import React from 'react'
import ProductCard from './ProductCard'

const FeedBlock = ({ title, subtitle, products = [], showLabel = false, labelType = null }) => {
    if (!products || products.length === 0) {
        return null
    }

    return (
        <section className="py-6 sm:py-8 px-4 sm:mx-6">
            <div className="max-w-7xl mx-auto">
                <div className="mb-6">
                    <h2 className="text-xl sm:text-2xl font-bold text-[#1A1A1A] mb-1">
                        {title}
                    </h2>
                    {subtitle && (
                        <p className="text-sm text-slate-600">
                            {subtitle}
                        </p>
                    )}
                </div>
                
                {/* RESPONSIVE FIX: Mobile 1 column, tablet 2, desktop 3-4 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                    {products.map((product, index) => (
                        <ProductCard
                            key={product.id || index}
                            product={product}
                            showLabel={showLabel}
                            labelType={labelType}
                        />
                    ))}
                </div>
            </div>
        </section>
    )
}

export default FeedBlock
