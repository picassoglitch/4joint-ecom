'use client'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getSiteConfig } from '@/lib/supabase/siteConfig'
import { AlertTriangle } from 'lucide-react'

export default function AgeGate() {
    const [isVerified, setIsVerified] = useState(false)
    const [isVisible, setIsVisible] = useState(false)
    const [config, setConfig] = useState({
        ageRequirement: 18,
        enabled: true,
        complianceNotice: '',
        regionRestrictions: [],
        disableStoreDiscovery: false,
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadConfig()
    }, [])

    const loadConfig = async () => {
        try {
            const ageGateConfig = await getSiteConfig('age_gate')
            if (ageGateConfig) {
                setConfig({
                    ageRequirement: ageGateConfig.ageRequirement || 18,
                    enabled: ageGateConfig.enabled !== false, // Default to true
                    complianceNotice: ageGateConfig.complianceNotice || '',
                    regionRestrictions: ageGateConfig.regionRestrictions || [],
                    disableStoreDiscovery: ageGateConfig.disableStoreDiscovery || false,
                })
            }

            // Check if age gate is enabled
            const ageGateEnabled = ageGateConfig?.enabled !== false
            if (!ageGateEnabled) {
                setIsVerified(true)
                setLoading(false)
                return
            }

            // Check if already verified
            const ageVerified = localStorage.getItem('4joint_age_verified')
            const verifiedAge = localStorage.getItem('4joint_verified_age')
            
            if (ageVerified === 'true' && verifiedAge) {
                const requiredAge = ageGateConfig?.ageRequirement || 18
                if (parseInt(verifiedAge) >= requiredAge) {
                    setIsVerified(true)
                } else {
                    // Age requirement changed, re-verify
                    localStorage.removeItem('4joint_age_verified')
                    localStorage.removeItem('4joint_verified_age')
                    setIsVisible(true)
                }
            } else {
                setIsVisible(true)
            }
        } catch (error) {
            console.error('Error loading age gate config:', error)
            // Default behavior if config fails to load
            const ageVerified = localStorage.getItem('4joint_age_verified')
            if (ageVerified === 'true') {
                setIsVerified(true)
            } else {
                setIsVisible(true)
            }
        } finally {
            setLoading(false)
        }
    }

    const handleYes = () => {
        localStorage.setItem('4joint_age_verified', 'true')
        localStorage.setItem('4joint_verified_age', config.ageRequirement.toString())
        setIsVerified(true)
        setIsVisible(false)
    }

    const handleNo = () => {
        window.location.href = 'https://www.google.com'
    }

    if (loading) return null
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
                        className="bg-[#FAFAF6] rounded-3xl p-8 md:p-12 max-w-md mx-4 shadow-2xl max-h-[90vh] overflow-y-auto"
                    >
                        <div className="text-center">
                            <div className="text-6xl mb-6">🌿</div>
                            <h2 className="text-3xl md:text-4xl font-semibold text-[#1A1A1A] mb-4">
                                ¿Eres mayor de {config.ageRequirement}?
                            </h2>
                            
                            {config.complianceNotice && (
                                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-left">
                                    <div className="flex items-start gap-2 mb-2">
                                        <AlertTriangle size={20} className="text-yellow-600 mt-0.5" />
                                        <h3 className="font-semibold text-yellow-900 text-sm">
                                            Aviso Legal y de Cumplimiento
                                        </h3>
                                    </div>
                                    <p className="text-xs text-yellow-800 whitespace-pre-line">
                                        {config.complianceNotice}
                                    </p>
                                </div>
                            )}

                            <p className="text-lg text-[#1A1A1A]/70 mb-4">
                                Confirma para entrar al mercado 420.
                            </p>
                            
                            {config.regionRestrictions && config.regionRestrictions.length > 0 && (
                                <p className="text-sm text-[#1A1A1A]/60 mb-6">
                                    <strong>Nota:</strong> La disponibilidad depende de las leyes locales. 
                                    Algunas regiones pueden tener restricciones.
                                </p>
                            )}

                            <div className="flex flex-col sm:flex-row gap-4">
                                <button
                                    onClick={handleYes}
                                    className="flex-1 px-8 py-4 bg-[#00C6A2] hover:bg-[#00B894] text-white font-semibold rounded-full transition-all hover:scale-105 active:scale-95 shadow-lg"
                                >
                                    Sí, tengo {config.ageRequirement} años o más
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

