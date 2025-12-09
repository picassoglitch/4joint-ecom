'use client'
import { useState, useEffect } from 'react'
import { getHeroConfig, getSocialMediaLinks, getAllSiteConfig, updateSiteConfig } from '@/lib/supabase/siteConfig'
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

