'use client'
import { assets } from '@/assets/assets'
import { ChevronRightIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import React, { useEffect, useState } from 'react'
import CategoriesMarquee from './CategoriesMarquee'
import { getHeroConfig } from '@/lib/supabase/siteConfig'

const Hero = () => {
    const currency = 'MXN $'
    const [heroConfig, setHeroConfig] = useState({
        title: 'Productos 420 que amas. Precios que confías.',
        bannerImage: '',
        showPrice: false
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadHeroConfig()
    }, [])

    const loadHeroConfig = async () => {
        try {
            const config = await getHeroConfig()
            setHeroConfig(config)
        } catch (error) {
            // Only log meaningful errors
            if (error?.message && error.message.trim()) {
                console.warn('Error loading hero config:', error.message)
            }
            // Use default config on error
            setHeroConfig({
                title: 'Productos 420 que amas. Precios que confías.',
                bannerImage: '',
                showPrice: false
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className='mx-6'>
            <div className='flex max-xl:flex-col gap-12 max-w-7xl mx-auto my-16'>
                <div className='relative flex-1 flex flex-col bg-white/60 backdrop-blur-md rounded-[2rem] xl:min-h-[500px] group overflow-hidden border border-[#00C6A2]/8 shadow-[0_8px_32px_rgba(0,198,162,0.06)] hover:shadow-[0_12px_48px_rgba(0,198,162,0.1)] transition-all duration-500'>
                    {/* Soft gradient overlay */}
                    <div className='absolute inset-0 bg-gradient-to-br from-[#00C6A2]/5 via-transparent to-[#00C6A2]/3'></div>
                    
                    {/* Image with fade effect */}
                    {heroConfig.bannerImage && heroConfig.bannerImage.trim() !== '' && (
                        <div className='absolute inset-0 overflow-hidden'>
                            <div className='absolute inset-0 bg-gradient-to-r from-white/90 via-white/70 to-transparent z-10'></div>
                            <div className='absolute bottom-0 right-0 md:right-12 w-full sm:max-w-md opacity-40 group-hover:opacity-50 transition-opacity duration-500'>
                                <Image 
                                    className='w-full h-auto object-contain' 
                                    src={heroConfig.bannerImage} 
                                    alt="" 
                                    width={500} 
                                    height={500}
                                    style={{ filter: 'blur(0.5px)' }}
                                />
                            </div>
                        </div>
                    )}
                    
                    <div className='p-8 sm:p-20 relative z-20'>
                        {/* Subtle badge */}
                        <div className='inline-flex items-center gap-2.5 bg-white/90 backdrop-blur-sm text-[#1A1A1A]/80 px-4 py-2 rounded-full text-xs sm:text-sm border border-[#FFD95E]/20 shadow-sm mb-6 group-hover:shadow-md transition-shadow duration-300'>
                            <span className='bg-gradient-to-r from-[#FFD95E]/20 to-[#FFD044]/20 px-3 py-1 rounded-full text-[#1A1A1A] text-xs font-medium'>NUEVO</span> 
                            <span className='font-normal text-[#1A1A1A]/70'>Envío gratis en pedidos mayores a $800 MXN</span>
                            <ChevronRightIcon className='text-[#1A1A1A]/40 group-hover:translate-x-0.5 transition-transform duration-300' size={14} />
                        </div>
                        
                        {/* Editorial headline */}
                        <h2 className='text-4xl sm:text-5xl lg:text-7xl leading-[1.15] my-6 sm:my-8 font-semibold text-[#1A1A1A] max-w-2xl tracking-tight'>
                            {heroConfig.title}
                        </h2>
                        
                        {heroConfig.showPrice && (
                            <div className='text-[#1A1A1A] mt-8 sm:mt-12'>
                                <p className='text-[#1A1A1A]/50 text-sm font-normal mb-2'>Desde</p>
                                <p className='text-5xl font-semibold text-[#00C6A2] tracking-tight'>{currency}199</p>
                            </div>
                        )}
                        
                        {/* Calm CTA button */}
                        <Link href="/shop">
                            <button className='bg-gradient-to-r from-[#00C6A2] to-[#00B894] hover:from-[#00B894] hover:to-[#00A885] text-white text-sm font-medium py-4 px-10 sm:py-5 sm:px-14 mt-8 sm:mt-12 rounded-full hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-[0_4px_16px_rgba(0,198,162,0.2)] hover:shadow-[0_6px_24px_rgba(0,198,162,0.3)]'>
                                Explorar productos
                            </button>
                        </Link>
                    </div>
                </div>
            </div>
            <CategoriesMarquee />
        </div>
    )
}

export default Hero