'use client'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

const Title = ({ title, description, visibleButton = true, href = '' }) => {

    return (
        <div className='flex flex-col items-center'>
            <h2 className='text-3xl sm:text-4xl font-bold text-[#1A1A1A] mb-2 bg-gradient-to-r from-[#1A1A1A] to-[#1A1A1A]/80 bg-clip-text'>{title}</h2>
            <Link href={href} className='flex items-center gap-3 text-sm text-slate-600 mt-2 group'>
                <p className='max-w-lg text-center font-medium'>{description}</p>
                {visibleButton && (
                    <button className='text-[#00C6A2] hover:text-[#00B894] flex items-center gap-1 font-semibold transition-all group-hover:gap-2'>
                        Ver más <ArrowRight size={16} className='group-hover:translate-x-1 transition-transform' />
                    </button>
                )}
            </Link>
        </div>
    )
}

export default Title