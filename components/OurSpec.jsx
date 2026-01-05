'use client'
import React, { useEffect, useRef, useState } from 'react'
import Title from './Title'
import { ourSpecsData } from '@/assets/assets'

const OurSpecs = () => {
    const [isVisible, setIsVisible] = useState(false)
    const specsRef = useRef(null)

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true)
                }
            },
            { threshold: 0.1, rootMargin: '50px' }
        )

        if (specsRef.current) {
            observer.observe(specsRef.current)
        }

        return () => {
            if (specsRef.current) {
                observer.unobserve(specsRef.current)
            }
        }
    }, [])

    return (
        <section 
            ref={specsRef}
            className={`px-4 sm:mx-6 py-4 sm:py-5 max-w-7xl mx-auto transition-all duration-700 ease-out ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
        >
            <div className="mb-4 sm:mb-5">
                <h2 className="text-xl sm:text-2xl font-bold text-[#1A1A1A] mb-1 text-center">
                    Nuestras Especificaciones
                </h2>
                <p className="text-xs sm:text-sm text-[#1A1A1A]/60 text-center max-w-2xl mx-auto">
                    Ofrecemos servicio de primera clase y comodidad para asegurar que tu experiencia de compra sea fluida, segura y completamente sin complicaciones.
                </p>
            </div>

            <div className='flex flex-wrap justify-center gap-4 sm:gap-6'>
                {ourSpecsData.map((spec, index) => (
                    <div 
                        key={index}
                        style={{ 
                            animationDelay: `${index * 100}ms`,
                            backgroundColor: spec.accent + '10',
                            borderColor: spec.accent + '30'
                        }}
                        className='relative h-44 px-6 sm:px-8 flex flex-col items-center justify-center w-full max-w-sm text-center border rounded-xl group hover:shadow-lg hover:scale-[1.02] transition-all duration-300'
                    >
                        <h3 className='text-slate-800 font-medium text-lg'>{spec.title}</h3>
                        <p className='text-sm text-slate-600 mt-3'>{spec.description}</p>
                        <div className='absolute -top-5 text-white size-10 flex items-center justify-center rounded-md group-hover:scale-110 transition-transform duration-300 shadow-md' style={{ backgroundColor: spec.accent }}>
                            <spec.icon size={20} />
                        </div>
                    </div>
                ))}
            </div>
        </section>
    )
}

export default OurSpecs