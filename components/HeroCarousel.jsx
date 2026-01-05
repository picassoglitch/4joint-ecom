'use client'
import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { getHeroConfig } from '@/lib/supabase/siteConfig'

export default function HeroCarousel() {
    const [currentSlide, setCurrentSlide] = useState(0)
    const [slides, setSlides] = useState([])
    const [loading, setLoading] = useState(true)
    const autoPlayRef = useRef(null)

    useEffect(() => {
        loadCarouselSlides()
    }, [])

    const loadCarouselSlides = async () => {
        try {
            const config = await getHeroConfig()
            // For now, use a single slide from hero config
            // In the future, this can be extended to support multiple slides from admin
            if (config?.bannerImage) {
                setSlides([{
                    id: 1,
                    image: config.bannerImage,
                    title: config.title || 'Productos 420 que amas. Precios que confías.',
                    subtitle: 'Productos verificados • Entrega rápida • Calidad garantizada',
                    ctaText: 'Explorar Todo',
                    ctaLink: '/shop'
                }])
            } else {
                // Default slide if no config
                setSlides([{
                    id: 1,
                    image: null,
                    title: 'Productos 420 que amas. Precios que confías.',
                    subtitle: 'Productos verificados • Entrega rápida • Calidad garantizada',
                    ctaText: 'Explorar Todo',
                    ctaLink: '/shop',
                    gradient: 'from-[#00C6A2]/20 via-[#00C6A2]/10 to-[#00C6A2]/5'
                }])
            }
        } catch (error) {
            console.error('Error loading carousel:', error)
            // Fallback default slide
            setSlides([{
                id: 1,
                image: null,
                title: 'Productos 420 que amas. Precios que confías.',
                subtitle: 'Productos verificados • Entrega rápida • Calidad garantizada',
                ctaText: 'Explorar Todo',
                ctaLink: '/shop',
                gradient: 'from-[#00C6A2]/20 via-[#00C6A2]/10 to-[#00C6A2]/5'
            }])
        } finally {
            setLoading(false)
        }
    }

    // Auto-rotate carousel
    useEffect(() => {
        if (slides.length > 1) {
            autoPlayRef.current = setInterval(() => {
                setCurrentSlide((prev) => (prev + 1) % slides.length)
            }, 5000) // Rotate every 5 seconds

            return () => {
                if (autoPlayRef.current) {
                    clearInterval(autoPlayRef.current)
                }
            }
        }
    }, [slides.length])

    const goToSlide = (index) => {
        setCurrentSlide(index)
        // Reset auto-play timer
        if (autoPlayRef.current) {
            clearInterval(autoPlayRef.current)
        }
        autoPlayRef.current = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % slides.length)
        }, 5000)
    }

    const nextSlide = () => {
        goToSlide((currentSlide + 1) % slides.length)
    }

    const prevSlide = () => {
        goToSlide((currentSlide - 1 + slides.length) % slides.length)
    }

    if (loading || slides.length === 0) {
        return (
            <div className="px-4 sm:mx-6 my-4 sm:my-6">
                <div className="max-w-7xl mx-auto h-48 sm:h-64 bg-gradient-to-br from-[#00C6A2]/20 via-[#00C6A2]/10 to-[#00C6A2]/5 rounded-2xl animate-pulse" />
            </div>
        )
    }

    const slide = slides[currentSlide]

    return (
        <div className="px-4 sm:mx-6 my-3 sm:my-4">
            <div className="max-w-7xl mx-auto relative">
                <div className={`relative overflow-hidden rounded-2xl ${
                    slide.image 
                        ? 'bg-gradient-to-br from-slate-50 to-slate-100' 
                        : `bg-gradient-to-br ${slide.gradient || 'from-[#00C6A2]/20 via-[#00C6A2]/10 to-[#00C6A2]/5'}`
                } border border-[#00C6A2]/20 shadow-lg`}>
                    <div className="relative h-40 sm:h-56 md:h-72 flex items-center overflow-hidden">
                        {slide.image ? (
                            <>
                                <Image
                                    src={slide.image}
                                    alt={slide.title}
                                    fill
                                    className="object-cover"
                                    priority
                                />
                                {/* Elegant gradient overlay - darker on left for text, lighter on right */}
                                <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30 z-[1]" />
                            </>
                        ) : null}
                        
                        {/* Content with modern, integrated design */}
                        <div className="relative z-10 w-full px-6 sm:px-12 md:px-16 py-8">
                            <div className="max-w-2xl space-y-3 sm:space-y-4">
                                {/* Title with text shadow for readability */}
                                <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold text-white leading-tight [text-shadow:_0_2px_12px_rgb(0_0_0_/_0.6)]">
                                    {slide.title}
                                </h2>
                                
                                {/* Subtitle with subtle backdrop */}
                                {slide.subtitle && (
                                    <div className="inline-block">
                                        <p className="text-sm sm:text-base text-white/95 leading-relaxed [text-shadow:_0_1px_8px_rgb(0_0_0_/_0.5)] backdrop-blur-[1px] bg-black/10 px-3 py-1.5 rounded-lg inline-block">
                                            {slide.subtitle}
                                        </p>
                                    </div>
                                )}
                                
                                {/* CTA Button */}
                                <div className="pt-2">
                                    <Link href={slide.ctaLink || '/shop'}>
                                        <button className="bg-gradient-to-r from-[#00C6A2] to-[#00B894] hover:from-[#00B894] hover:to-[#00A885] text-white text-sm sm:text-base font-bold py-2.5 px-6 sm:px-8 rounded-lg hover:scale-105 active:scale-95 transition-all shadow-lg hover:shadow-xl hover:shadow-[#00C6A2]/40">
                                            {slide.ctaText || 'Explorar Todo'}
                                        </button>
                                    </Link>
                                </div>
                            </div>
                        </div>

                        {/* Navigation arrows (only if multiple slides) */}
                        {slides.length > 1 && (
                            <>
                                <button
                                    onClick={prevSlide}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/90 hover:bg-white rounded-full shadow-lg transition-all hover:scale-110 z-20"
                                    aria-label="Slide anterior"
                                >
                                    <ChevronLeft size={20} className="text-[#1A1A1A]" />
                                </button>
                                <button
                                    onClick={nextSlide}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/90 hover:bg-white rounded-full shadow-lg transition-all hover:scale-110 z-20"
                                    aria-label="Slide siguiente"
                                >
                                    <ChevronRight size={20} className="text-[#1A1A1A]" />
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Slide indicators (only if multiple slides) */}
                {slides.length > 1 && (
                    <div className="flex justify-center gap-2 mt-4">
                        {slides.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => goToSlide(index)}
                                className={`h-2 rounded-full transition-all ${
                                    index === currentSlide
                                        ? 'w-8 bg-[#00C6A2]'
                                        : 'w-2 bg-slate-300 hover:bg-slate-400'
                                }`}
                                aria-label={`Ir a slide ${index + 1}`}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

