'use client'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

const Title = ({ title, description, visibleButton = true, href = '' }) => {

    return (
        <div className='flex flex-col items-center mb-4'>
            <h2 className='text-4xl sm:text-5xl font-semibold text-[#1A1A1A] mb-4 tracking-tight leading-tight'>{title}</h2>
            <Link href={href} className='flex items-center gap-3 text-sm text-[#1A1A1A]/50 mt-1 group'>
                <p className='max-w-lg text-center font-normal leading-relaxed'>{description}</p>
                {visibleButton && (
                    <button className='text-[#00C6A2] hover:text-[#00B894] flex items-center gap-1.5 font-medium transition-all duration-300 group-hover:gap-2'>
                        Ver más <ArrowRight size={14} className='group-hover:translate-x-0.5 transition-transform duration-300' />
                    </button>
                )}
            </Link>
        </div>
    )
}

export default Title