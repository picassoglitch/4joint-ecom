'use client'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function AgeGate() {
    const [isVerified, setIsVerified] = useState(false)
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        const ageVerified = localStorage.getItem('4joint_age_verified')
        if (ageVerified === 'true') {
            setIsVerified(true)
        } else {
            setIsVisible(true)
        }
    }, [])

    const handleYes = () => {
        localStorage.setItem('4joint_age_verified', 'true')
        setIsVerified(true)
        setIsVisible(false)
    }

    const handleNo = () => {
        window.location.href = 'https://www.google.com'
    }

    if (isVerified) return null

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#1A1A1A]/95 backdrop-blur-sm"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="bg-[#FAFAF6] rounded-3xl p-8 md:p-12 max-w-md mx-4 shadow-2xl"
                    >
                        <div className="text-center">
                            <div className="text-6xl mb-6">🌿</div>
                            <h2 className="text-3xl md:text-4xl font-semibold text-[#1A1A1A] mb-4">
                                ¿Eres mayor de 18?
                            </h2>
                            <p className="text-lg text-[#1A1A1A]/70 mb-8">
                                Confirma para entrar al mercado 420.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <button
                                    onClick={handleYes}
                                    className="flex-1 px-8 py-4 bg-[#00C6A2] hover:bg-[#00B894] text-white font-semibold rounded-full transition-all hover:scale-105 active:scale-95 shadow-lg"
                                >
                                    Sí, entrar
                                </button>
                                <button
                                    onClick={handleNo}
                                    className="flex-1 px-8 py-4 bg-[#1A1A1A]/10 hover:bg-[#1A1A1A]/20 text-[#1A1A1A] font-semibold rounded-full transition-all hover:scale-105 active:scale-95"
                                >
                                    No, salir
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

