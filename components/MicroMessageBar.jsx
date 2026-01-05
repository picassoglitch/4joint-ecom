'use client'
import { useState, useEffect } from 'react'
import { ChevronRight } from 'lucide-react'

const messages = [
    { text: '🚚 Entrega rápida y discreta', color: 'from-[#00C6A2] to-[#00B894]' },
    { text: '💰 Envío gratis desde $800 MXN', color: 'from-[#FFD95E] to-[#FFD044]' },
    { text: '✅ Productos verificados', color: 'from-[#00C6A2] to-[#00B894]' },
    { text: '⚡ Miles de productos disponibles', color: 'from-[#FFD95E] to-[#FFD044]' },
    { text: '🎯 Calidad garantizada', color: 'from-[#00C6A2] to-[#00B894]' },
]

export default function MicroMessageBar() {
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isVisible, setIsVisible] = useState(true)

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % messages.length)
        }, 5000) // Rotate every 5 seconds

        return () => clearInterval(interval)
    }, [])

    // Hide on scroll down, show on scroll up
    useEffect(() => {
        let lastScrollY = window.scrollY
        const handleScroll = () => {
            const currentScrollY = window.scrollY
            if (currentScrollY > 100) {
                setIsVisible(currentScrollY < lastScrollY)
            } else {
                setIsVisible(true)
            }
            lastScrollY = currentScrollY
        }

        window.addEventListener('scroll', handleScroll, { passive: true })
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    const currentMessage = messages[currentIndex]

    if (!isVisible) return null

    return (
        <div className={`bg-gradient-to-r ${currentMessage.color} text-white text-xs sm:text-sm py-2 px-4 transition-all duration-500 ease-in-out`}>
            <div className="max-w-7xl mx-auto flex items-center justify-center gap-2">
                <span key={currentIndex} className="font-medium animate-fade-in">{currentMessage.text}</span>
                <ChevronRight size={14} className="opacity-80" />
            </div>
        </div>
    )
}

