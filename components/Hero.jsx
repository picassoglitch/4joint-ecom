'use client'
import { assets } from '@/assets/assets'
import { ChevronRightIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import React, { useEffect, useState, useRef } from 'react'
import CategoriesMarquee from './CategoriesMarquee'
import QuickActionStrip from './QuickActionStrip'
import { getHeroConfig, getShippingBannerConfig } from '@/lib/supabase/siteConfig'

const Hero = () => {
    const currency = 'MXN $'
    const [heroConfig, setHeroConfig] = useState({
        title: 'Productos 420 que amas. Precios que confías.',
        bannerImage: '',
        showPrice: false
    })
    const [shippingBannerConfig, setShippingBannerConfig] = useState({
        enabled: true,
        badgeText: 'NUEVO',
        message: '¡Envío gratis en pedidos mayores a $800 MXN!',
        showBadge: true
    })
    const [loading, setLoading] = useState(true)
    const [isVisible, setIsVisible] = useState(false)
    const heroRef = useRef(null)

    useEffect(() => {
        loadHeroConfig()
    }, [])

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

        if (heroRef.current) {
            observer.observe(heroRef.current)
        }

        return () => {
            if (heroRef.current) {
                observer.unobserve(heroRef.current)
            }
        }
    }, [])

    const loadHeroConfig = async () => {
        try {
            const [heroConfigData, shippingBannerData] = await Promise.all([
                getHeroConfig(),
                getShippingBannerConfig()
            ])
            setHeroConfig(heroConfigData)
            if (shippingBannerData) {
                setShippingBannerConfig(shippingBannerData)
            }
        } catch (error) {
            console.error('Error loading hero config:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div 
            ref={heroRef}
            className={`px-4 sm:mx-6 transition-all duration-700 ease-out ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
        >
            {/* RESPONSIVE FIX: Responsive container - Reduced height for marketplace feel */}
            <div className='flex max-xl:flex-col gap-4 sm:gap-6 max-w-7xl mx-auto my-4 sm:my-6'>
                <div className='relative flex-1 flex flex-col bg-gradient-to-br from-[#00C6A2]/20 via-[#00C6A2]/10 to-[#00C6A2]/5 rounded-2xl group overflow-hidden border border-[#00C6A2]/20 shadow-lg hover:shadow-xl transition-all duration-300'>
                    <div className='absolute inset-0 bg-gradient-to-br from-white/10 to-transparent'></div>
                    <div className='p-4 sm:p-8 md:p-12 relative z-10'>
                        {shippingBannerConfig.enabled && (
                            <div className='inline-flex items-center gap-3 bg-gradient-to-r from-[#FFD95E]/40 to-[#FFD95E]/30 text-[#1A1A1A] pr-4 p-1.5 rounded-full text-xs sm:text-sm border border-[#FFD95E]/50 shadow-sm backdrop-blur-sm'>
                                {shippingBannerConfig.showBadge && (
                                    <span className='bg-gradient-to-r from-[#FFD95E] to-[#FFD044] px-3 py-1 max-sm:ml-1 rounded-full text-[#1A1A1A] text-xs font-bold shadow-sm'>
                                        {shippingBannerConfig.badgeText || 'NUEVO'}
                                    </span>
                                )}
                                <span className='font-medium'>{shippingBannerConfig.message || '¡Envío gratis en pedidos mayores a $800 MXN!'}</span>
                                <ChevronRightIcon className='group-hover:translate-x-1 transition-transform duration-300' size={16} />
                            </div>
                        )}
                        <h2 className='text-2xl sm:text-4xl lg:text-5xl leading-[1.1] my-2 sm:my-3 font-bold text-[#1A1A1A] max-w-xs sm:max-w-md lg:max-w-lg'>
                            {heroConfig.title}
                        </h2>
                        <p className='text-sm sm:text-base text-[#1A1A1A]/70 mb-3 sm:mb-4'>
                            Productos verificados • Entrega rápida • Calidad garantizada
                        </p>
                        
                        {/* Quick Action Strip */}
                        <QuickActionStrip />
                        
                        <div className='flex items-center gap-3 mt-4 sm:mt-6'>
                            <Link href="/shop">
                                <button className='bg-gradient-to-r from-[#00C6A2] to-[#00B894] hover:from-[#00B894] hover:to-[#00A885] text-white text-sm font-bold py-2.5 px-6 sm:py-3 sm:px-8 rounded-full hover:scale-105 active:scale-95 transition-all shadow-md hover:shadow-lg'>
                                    Explorar Todo
                                </button>
                            </Link>
                            {heroConfig.showPrice && (
                                <div className='text-[#1A1A1A] text-xs sm:text-sm font-medium'>
                                    <p className='text-slate-500'>Desde</p>
                                    <p className='text-xl sm:text-2xl font-bold text-[#00C6A2]'>{currency}199</p>
                                </div>
                            )}
                        </div>
                    </div>
                    {heroConfig.bannerImage && heroConfig.bannerImage.trim() !== '' && (
                        <div className='sm:absolute bottom-0 right-0 md:right-10 w-full sm:max-w-sm opacity-90 group-hover:opacity-100 transition-opacity duration-300'>
                            {/* FIX: Added priority for LCP optimization - hero image is above the fold */}
                            <Image className='w-full h-auto' src={heroConfig.bannerImage} alt="" width={400} height={400} priority />
                        </div>
                    )}
                </div>
            </div>
            <CategoriesMarquee />
        </div>
    )
}

export default Hero