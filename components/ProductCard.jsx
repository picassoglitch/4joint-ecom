'use client'
import { StarIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

const ProductCard = ({ product }) => {

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

    return (
        <Link href={`/product/${product.id}`} className=' group max-xl:mx-auto'>
            <div className='bg-[#F5F5F5] h-40  sm:w-60 sm:h-68 rounded-lg flex items-center justify-center'>
                <Image width={500} height={500} className='max-h-30 sm:max-h-40 w-auto group-hover:scale-115 transition duration-300' src={product.images?.[0] || '/placeholder.png'} alt="" />
            </div>
            <div className='flex justify-between gap-3 text-sm text-slate-800 pt-2 max-w-60'>
                <div>
                    <p>{product.name}</p>
                    <div className='flex'>
                        {Array(5).fill('').map((_, index) => (
                            <StarIcon key={index} size={14} className='text-transparent mt-0.5' fill={rating >= index + 1 ? "#00C950" : "#D1D5DB"} />
                        ))}
                    </div>
                </div>
                <div className="text-right">
                    {hasVariants && <p className="text-xs text-slate-500">Desde</p>}
                    <p>{currency}{displayPrice}</p>
                </div>
            </div>
        </Link>
    )
}

export default ProductCard