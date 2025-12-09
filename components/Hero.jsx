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
            console.error('Error loading hero config:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className='mx-6'>
            <div className='flex max-xl:flex-col gap-8 max-w-7xl mx-auto my-10'>
                <div className='relative flex-1 flex flex-col bg-gradient-to-br from-[#00C6A2]/20 to-[#00C6A2]/5 rounded-3xl xl:min-h-100 group overflow-hidden border border-[#00C6A2]/20 shadow-lg'>
                    <div className='p-5 sm:p-16 relative z-10'>
                        <div className='inline-flex items-center gap-3 bg-[#FFD95E]/30 text-[#1A1A1A] pr-4 p-1.5 rounded-full text-xs sm:text-sm border border-[#FFD95E]/40'>
                            <span className='bg-[#FFD95E] px-3 py-1 max-sm:ml-1 rounded-full text-[#1A1A1A] text-xs font-semibold'>NUEVO</span> ¡Envío gratis en pedidos mayores a $800 MXN! <ChevronRightIcon className='group-hover:ml-2 transition-all' size={16} />
                        </div>
                        <h2 className='text-3xl sm:text-5xl leading-[1.2] my-3 font-bold text-[#1A1A1A] max-w-xs sm:max-w-md'>
                            {heroConfig.title}
                        </h2>
                        {heroConfig.showPrice && (
                            <div className='text-[#1A1A1A] text-sm font-medium mt-4 sm:mt-8'>
                                <p>Desde</p>
                                <p className='text-3xl font-bold'>{currency}199</p>
                            </div>
                        )}
                        <Link href="/shop">
                            <button className='bg-[#00C6A2] hover:bg-[#00B894] text-white text-sm font-semibold py-2.5 px-7 sm:py-5 sm:px-12 mt-4 sm:mt-10 rounded-full hover:scale-105 active:scale-95 transition-all shadow-lg hover:shadow-xl'>VER MÁS</button>
                        </Link>
                    </div>
                    {heroConfig.bannerImage ? (
                        <Image className='sm:absolute bottom-0 right-0 md:right-10 w-full sm:max-w-sm opacity-90' src={heroConfig.bannerImage} alt="" width={400} height={400} />
                    ) : (
                        <Image className='sm:absolute bottom-0 right-0 md:right-10 w-full sm:max-w-sm opacity-90' src={assets.hero_model_img} alt="" />
                    )}
                </div>
            </div>
            <CategoriesMarquee />
        </div>
    )
}

export default Hero