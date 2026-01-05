'use client'
import { useState, useEffect } from 'react'
import { getHeroConfig, getSocialMediaLinks, getAllSiteConfig, updateSiteConfig, getBannerConfig, getShippingBannerConfig } from '@/lib/supabase/siteConfig'
import { getCurrentUser, isAdmin as checkIsAdmin } from '@/lib/supabase/auth'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { uploadImage } from '@/lib/supabase/storage'
import Loading from '@/components/Loading'

export default function SiteConfigPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [isAuthorized, setIsAuthorized] = useState(false)
    
    // Hero config
    const [heroTitle, setHeroTitle] = useState('')
    const [heroBannerImage, setHeroBannerImage] = useState('')
    const [heroBannerImageFile, setHeroBannerImageFile] = useState(null)
    const [heroBannerImagePreview, setHeroBannerImagePreview] = useState('')
    const [showPrice, setShowPrice] = useState(false)
    
    // Banner config
    const [bannerConfig, setBannerConfig] = useState({
        enabled: true,
        text: '¡Obtén 1 gr gratis en tu primer pedido!',
        buttonText: 'Reclamar Oferta',
        loginButtonText: 'Iniciar Sesión',
        couponCode: '1GRGRATIS',
        icon: '🎁',
        showForAuthenticated: true,
        showForUnauthenticated: true
    })
    
    // Shipping banner config
    const [shippingBannerConfig, setShippingBannerConfig] = useState({
        enabled: true,
        badgeText: 'NUEVO',
        message: '¡Envío gratis en pedidos mayores a $800 MXN!',
        showBadge: true
    })
    
    // Social media
    const [socialMedia, setSocialMedia] = useState({
        facebook: '',
        instagram: '',
        twitter: '',
        linkedin: '',
        tiktok: '',
        youtube: ''
    })

    useEffect(() => {
        checkAuthAndLoad()
    }, [])

    const checkAuthAndLoad = async () => {
        try {
            const { user } = await getCurrentUser()
            if (!user || !checkIsAdmin(user)) {
                router.push('/')
                return
            }
            setIsAuthorized(true)
            await loadConfig()
        } catch (error) {
            console.error('Error checking auth:', error)
            router.push('/')
        }
    }

    const loadConfig = async () => {
        try {
            const config = await getAllSiteConfig()
            
            // Load hero config
            if (config.hero) {
                setHeroTitle(config.hero.title || '')
                setHeroBannerImage(config.hero.bannerImage || '')
                setHeroBannerImagePreview(config.hero.bannerImage || '')
                setShowPrice(config.hero.showPrice || false)
            }
            
            // Load banner config
            if (config.promotional_banner) {
                setBannerConfig(config.promotional_banner)
            } else {
                // Load default banner config
                const defaultBanner = await getBannerConfig()
                if (defaultBanner) {
                    setBannerConfig(defaultBanner)
                }
            }
            
            // Load shipping banner config
            if (config.shipping_banner) {
                setShippingBannerConfig(config.shipping_banner)
            } else {
                // Load default shipping banner config
                const defaultShippingBanner = await getShippingBannerConfig()
                if (defaultShippingBanner) {
                    setShippingBannerConfig(defaultShippingBanner)
                }
            }
            
            // Load social media
            if (config.social_media) {
                setSocialMedia(config.social_media)
            }
            
            setLoading(false)
        } catch (error) {
            console.error('Error loading config:', error)
            toast.error('Error al cargar la configuración')
            setLoading(false)
        }
    }

    const handleBannerImageChange = (e) => {
        const file = e.target.files[0]
        if (file) {
            setHeroBannerImageFile(file)
            const reader = new FileReader()
            reader.onloadend = () => {
                setHeroBannerImagePreview(reader.result)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            // Upload banner image if new file selected
            let bannerImageUrl = heroBannerImage
            if (heroBannerImageFile) {
                bannerImageUrl = await uploadImage(heroBannerImageFile, 'site-config')
            }

            // Save hero config
            await updateSiteConfig('hero', {
                title: heroTitle,
                bannerImage: bannerImageUrl,
                showPrice: showPrice
            })

            // Save banner config
            await updateSiteConfig('promotional_banner', bannerConfig)

            // Save shipping banner config
            await updateSiteConfig('shipping_banner', shippingBannerConfig)

            // Save social media
            await updateSiteConfig('social_media', socialMedia)

            toast.success('Configuración guardada exitosamente')
        } catch (error) {
            // Log the error in detail
            console.error('Error saving config - Full error object:', error)
            console.error('Error type:', typeof error)
            console.error('Error instanceof Error:', error instanceof Error)
            
            // Extract error message safely
            let errorMessage = 'Error al guardar la configuración'
            
            if (error instanceof Error) {
                errorMessage = error.message || errorMessage
            } else if (error?.message) {
                errorMessage = error.message
            } else if (error?.originalError?.message) {
                errorMessage = error.originalError.message
            } else if (typeof error === 'string') {
                errorMessage = error
            } else {
                // Try to stringify the error
                try {
                    const errorStr = JSON.stringify(error)
                    if (errorStr && errorStr !== '{}') {
                        errorMessage = `Error: ${errorStr}`
                    }
                } catch (e) {
                    errorMessage = `Error desconocido: ${String(error)}`
                }
            }
            
            toast.error(errorMessage)
            
            // Log full error details for debugging
            console.error('Error details for debugging:', {
                message: error?.message,
                code: error?.code,
                details: error?.details,
                hint: error?.hint,
                stack: error?.stack,
                originalError: error?.originalError,
                configKey: error?.configKey,
                fullError: error
            })
        } finally {
            setSaving(false)
        }
    }

    if (loading || !isAuthorized) {
        return <Loading />
    }

    return (
        <div className="text-[#1A1A1A]/70 mb-28">
            <h1 className="text-2xl mb-6">Configuración del <span className="text-[#1A1A1A] font-bold">Sitio</span></h1>

            <div className="max-w-4xl space-y-8">
                {/* Hero Section */}
                <div className="bg-white rounded-2xl p-6 border border-[#00C6A2]/20 shadow-lg">
                    <h2 className="text-xl font-semibold text-[#1A1A1A] mb-4">Banner Principal (Hero)</h2>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                                Mensaje Principal
                            </label>
                            <input
                                type="text"
                                value={heroTitle}
                                onChange={(e) => setHeroTitle(e.target.value)}
                                className="w-full px-4 py-2 border border-[#00C6A2]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00C6A2]"
                                placeholder="Productos 420 que amas. Precios que confías."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                                Imagen del Banner
                            </label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleBannerImageChange}
                                className="w-full px-4 py-2 border border-[#00C6A2]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00C6A2]"
                            />
                            {heroBannerImagePreview && (
                                <div className="mt-4">
                                    <img 
                                        src={heroBannerImagePreview} 
                                        alt="Banner preview" 
                                        className="max-w-md rounded-lg border border-[#00C6A2]/20"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="showPrice"
                                checked={showPrice}
                                onChange={(e) => setShowPrice(e.target.checked)}
                                className="w-4 h-4 text-[#00C6A2] border-[#00C6A2]/30 rounded focus:ring-[#00C6A2]"
                            />
                            <label htmlFor="showPrice" className="text-sm text-[#1A1A1A]">
                                Mostrar precio "Desde MXN $199"
                            </label>
                        </div>
                    </div>
                </div>

                {/* Shipping Banner */}
                <div className="bg-white rounded-2xl p-6 border border-[#00C6A2]/20 shadow-lg">
                    <h2 className="text-xl font-semibold text-[#1A1A1A] mb-4">Banner de Envío Gratis</h2>
                    
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="shippingBannerEnabled"
                                checked={shippingBannerConfig.enabled}
                                onChange={(e) => setShippingBannerConfig({ ...shippingBannerConfig, enabled: e.target.checked })}
                                className="w-4 h-4 text-[#00C6A2] border-[#00C6A2]/30 rounded focus:ring-[#00C6A2]"
                            />
                            <label htmlFor="shippingBannerEnabled" className="text-sm text-[#1A1A1A] font-medium">
                                Habilitar banner de envío gratis
                            </label>
                        </div>

                        {shippingBannerConfig.enabled && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                                        Mensaje del Banner
                                    </label>
                                    <input
                                        type="text"
                                        value={shippingBannerConfig.message}
                                        onChange={(e) => setShippingBannerConfig({ ...shippingBannerConfig, message: e.target.value })}
                                        className="w-full px-4 py-2 border border-[#00C6A2]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00C6A2]"
                                        placeholder="¡Envío gratis en pedidos mayores a $800 MXN!"
                                    />
                                </div>

                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="showShippingBadge"
                                        checked={shippingBannerConfig.showBadge}
                                        onChange={(e) => setShippingBannerConfig({ ...shippingBannerConfig, showBadge: e.target.checked })}
                                        className="w-4 h-4 text-[#00C6A2] border-[#00C6A2]/30 rounded focus:ring-[#00C6A2]"
                                    />
                                    <label htmlFor="showShippingBadge" className="text-sm text-[#1A1A1A]">
                                        Mostrar badge "NUEVO"
                                    </label>
                                </div>

                                {shippingBannerConfig.showBadge && (
                                    <div>
                                        <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                                            Texto del Badge
                                        </label>
                                        <input
                                            type="text"
                                            value={shippingBannerConfig.badgeText}
                                            onChange={(e) => setShippingBannerConfig({ ...shippingBannerConfig, badgeText: e.target.value })}
                                            className="w-full px-4 py-2 border border-[#00C6A2]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00C6A2]"
                                            placeholder="NUEVO"
                                            maxLength={20}
                                        />
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Promotional Banner */}
                <div className="bg-white rounded-2xl p-6 border border-[#00C6A2]/20 shadow-lg">
                    <h2 className="text-xl font-semibold text-[#1A1A1A] mb-4">Banner Promocional</h2>
                    
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="bannerEnabled"
                                checked={bannerConfig.enabled}
                                onChange={(e) => setBannerConfig({ ...bannerConfig, enabled: e.target.checked })}
                                className="w-4 h-4 text-[#00C6A2] border-[#00C6A2]/30 rounded focus:ring-[#00C6A2]"
                            />
                            <label htmlFor="bannerEnabled" className="text-sm text-[#1A1A1A] font-medium">
                                Habilitar banner promocional
                            </label>
                        </div>

                        {bannerConfig.enabled && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                                        Texto del Banner
                                    </label>
                                    <input
                                        type="text"
                                        value={bannerConfig.text}
                                        onChange={(e) => setBannerConfig({ ...bannerConfig, text: e.target.value })}
                                        className="w-full px-4 py-2 border border-[#00C6A2]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00C6A2]"
                                        placeholder="¡Obtén 1 gr gratis en tu primer pedido!"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                                        Icono (emoji)
                                    </label>
                                    <input
                                        type="text"
                                        value={bannerConfig.icon}
                                        onChange={(e) => setBannerConfig({ ...bannerConfig, icon: e.target.value })}
                                        className="w-full px-4 py-2 border border-[#00C6A2]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00C6A2]"
                                        placeholder="🎁"
                                        maxLength={2}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                                        Texto del Botón (Usuarios Autenticados)
                                    </label>
                                    <input
                                        type="text"
                                        value={bannerConfig.buttonText}
                                        onChange={(e) => setBannerConfig({ ...bannerConfig, buttonText: e.target.value })}
                                        className="w-full px-4 py-2 border border-[#00C6A2]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00C6A2]"
                                        placeholder="Reclamar Oferta"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                                        Texto del Botón (Usuarios No Autenticados)
                                    </label>
                                    <input
                                        type="text"
                                        value={bannerConfig.loginButtonText}
                                        onChange={(e) => setBannerConfig({ ...bannerConfig, loginButtonText: e.target.value })}
                                        className="w-full px-4 py-2 border border-[#00C6A2]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00C6A2]"
                                        placeholder="Iniciar Sesión"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                                        Código de Cupón
                                    </label>
                                    <input
                                        type="text"
                                        value={bannerConfig.couponCode}
                                        onChange={(e) => setBannerConfig({ ...bannerConfig, couponCode: e.target.value })}
                                        className="w-full px-4 py-2 border border-[#00C6A2]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00C6A2]"
                                        placeholder="1GRGRATIS"
                                    />
                                </div>

                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="showForAuthenticated"
                                        checked={bannerConfig.showForAuthenticated}
                                        onChange={(e) => setBannerConfig({ ...bannerConfig, showForAuthenticated: e.target.checked })}
                                        className="w-4 h-4 text-[#00C6A2] border-[#00C6A2]/30 rounded focus:ring-[#00C6A2]"
                                    />
                                    <label htmlFor="showForAuthenticated" className="text-sm text-[#1A1A1A]">
                                        Mostrar para usuarios autenticados
                                    </label>
                                </div>

                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="showForUnauthenticated"
                                        checked={bannerConfig.showForUnauthenticated}
                                        onChange={(e) => setBannerConfig({ ...bannerConfig, showForUnauthenticated: e.target.checked })}
                                        className="w-4 h-4 text-[#00C6A2] border-[#00C6A2]/30 rounded focus:ring-[#00C6A2]"
                                    />
                                    <label htmlFor="showForUnauthenticated" className="text-sm text-[#1A1A1A]">
                                        Mostrar para usuarios no autenticados
                                    </label>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Social Media */}
                <div className="bg-white rounded-2xl p-6 border border-[#00C6A2]/20 shadow-lg">
                    <h2 className="text-xl font-semibold text-[#1A1A1A] mb-4">Redes Sociales</h2>
                    
                    <div className="space-y-4">
                        {Object.entries(socialMedia).map(([platform, url]) => (
                            <div key={platform}>
                                <label className="block text-sm font-medium text-[#1A1A1A] mb-2 capitalize">
                                    {platform}
                                </label>
                                <input
                                    type="url"
                                    value={url}
                                    onChange={(e) => setSocialMedia({ ...socialMedia, [platform]: e.target.value })}
                                    className="w-full px-4 py-2 border border-[#00C6A2]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00C6A2]"
                                    placeholder={`https://${platform}.com/...`}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-8 py-3 bg-[#00C6A2] hover:bg-[#00B894] text-white rounded-full font-semibold transition-all hover:scale-105 active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
            </div>
        </div>
    )
}

