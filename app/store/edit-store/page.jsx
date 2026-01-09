'use client'
import { useEffect, useState, useRef } from "react"
import { toast } from "react-hot-toast"
import Image from "next/image"
import Loading from "@/components/Loading"
import { getCurrentVendor, updateVendor } from "@/lib/supabase/database"
import { uploadImage } from "@/lib/supabase/storage"
import { assets } from "@/assets/assets"
import MeetupPointsManager from "@/components/store/MeetupPointsManager"
import LocationSearch from "@/components/store/LocationSearch"
import ServiceAreaSelector from "@/components/store/ServiceAreaSelector"
import { getUserAddresses } from "@/lib/supabase/addresses"
import { getCurrentUser } from "@/lib/supabase/auth"
import { supabase } from "@/lib/supabase/client"

export default function EditStore() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [storeInfo, setStoreInfo] = useState({
        name: "",
        description: "",
        logo: "",
        email: "",
        contact: "",
        address: "",
        locationAddress: "", // Human-readable address from user's address
        latitude: null,
        longitude: null,
        serviceColonias: [], // Array of colonia IDs for service area
        fulfillmentModes: { pickup: false, delivery: false, meetupPoint: false, courierExterno: false },
        meetupPoints: [],
        deliveryNotes: "",
        minOrder: 0,
        deliveryFeePolicy: "flat", // "flat", "percent", "included"
        deliveryFeeAmount: 0,
        deliveryFeePercent: 0,
        operatingHours: {},
        courierCost: 0,
        courierCostIncluded: false,
        freeShippingThreshold: 800, // Minimum order amount for free shipping
        deliveryOptions: [ // Same day, on demand, etc.
            { id: 'same_day', name: 'Entrega Mismo Día', price: 80, description: 'Lun-Vie antes de 8pm, Sáb antes de 6pm', enabled: true },
            { id: 'on_demand', name: 'On Demand', price: 150, description: 'Entrega inmediata en 80 min. Lun-Vie antes de 8pm. Solo CDMX', enabled: true }
        ],
        requireOrderApproval: false, // Require vendor to approve orders before processing
        telegramChatId: null,
        telegramEnabled: false,
        notificationPrefs: { newOrder: true, lowStock: true, support: true },
        telegramUserId: null, // Telegram username or user ID for direct customer contact
    })
    const [logoFile, setLogoFile] = useState(null)
    const [logoPreview, setLogoPreview] = useState("")
    const fileInputRef = useRef(null)
    const [telegramLoading, setTelegramLoading] = useState(false)
    const [storeId, setStoreId] = useState(null)

    const fetchStoreInfo = async () => {
        try {
            const vendor = await getCurrentVendor()
            if (vendor) {
                // Get user's address to use as store location
                const { user } = await getCurrentUser()
                let userAddress = ""
                let userLat = null
                let userLng = null
                
                if (user) {
                    try {
                        const addresses = await getUserAddresses(user.id)
                        const defaultAddress = addresses.find(addr => addr.is_default) || addresses[0]
                        if (defaultAddress) {
                            userAddress = `${defaultAddress.street}, ${defaultAddress.colonia || ''}, ${defaultAddress.city}, ${defaultAddress.state} ${defaultAddress.zip}`
                            // If vendor doesn't have location, use user's address location
                            if (!vendor.latitude || !vendor.longitude) {
                                // We'll need to geocode the address or use stored location
                                // For now, we'll use the address string
                            }
                        }
                    } catch (error) {
                        console.warn('Could not fetch user addresses:', error)
                    }
                }
                
                setStoreInfo({
                    name: vendor.name || "",
                    description: vendor.description || "",
                    logo: vendor.logo || "",
                    email: vendor.email || "",
                    contact: vendor.contact || "",
                    address: vendor.address || "",
                    locationAddress: userAddress || vendor.address || "",
                    latitude: vendor.latitude || userLat || null,
                    longitude: vendor.longitude || userLng || null,
                    serviceColonias: vendor.service_colonias || [],
                    fulfillmentModes: vendor.fulfillment_modes || { pickup: false, delivery: false, meetupPoint: false, courierExterno: false },
                    meetupPoints: vendor.meetup_points || [],
                    deliveryNotes: vendor.delivery_notes || "",
                    minOrder: vendor.min_order || 0,
                    deliveryFeePolicy: vendor.delivery_fee_policy || "flat",
                    deliveryFeeAmount: vendor.delivery_fee_amount || 0,
                    deliveryFeePercent: vendor.delivery_fee_percent || 0,
                    operatingHours: vendor.operating_hours || {},
                    courierCost: vendor.courier_cost || 0,
                    courierCostIncluded: vendor.courier_cost_included || false,
                    requireOrderApproval: vendor.require_order_approval || false,
                    telegramChatId: vendor.telegram_chat_id || null,
                    telegramEnabled: vendor.telegram_enabled || false,
                    notificationPrefs: vendor.notification_prefs || { newOrder: true, lowStock: true, support: true },
                    telegramUserId: vendor.telegram_user_id || null,
                    freeShippingThreshold: vendor.free_shipping_threshold || 800,
                    deliveryOptions: vendor.delivery_options || [
                        { id: 'same_day', name: 'Entrega Mismo Día', price: 80, description: 'Lun-Vie antes de 8pm, Sáb antes de 6pm', enabled: true },
                        { id: 'on_demand', name: 'On Demand', price: 150, description: 'Entrega inmediata en 80 min. Lun-Vie antes de 8pm. Solo CDMX', enabled: true }
                    ],
                })
                setLogoPreview(vendor.logo || "")
                setStoreId(vendor.id)
            } else {
                toast.error('No tienes una tienda registrada. Por favor regístrate primero.')
            }
        } catch (error) {
            console.error('Error fetching store info:', error)
            toast.error('Error al cargar la información de la tienda')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchStoreInfo()
    }, [])

    const handleLogoChange = (e) => {
        const file = e.target.files[0]
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error('La imagen debe ser menor a 5MB')
                return
            }
            setLogoFile(file)
            setLogoPreview(URL.createObjectURL(file))
        }
    }

    const handleChange = (e) => {
        setStoreInfo({ ...storeInfo, [e.target.name]: e.target.value })
    }

    const handleTelegramPrefChange = (prefName) => {
        setStoreInfo(prev => ({
            ...prev,
            notificationPrefs: {
                ...prev.notificationPrefs,
                [prefName]: !prev.notificationPrefs[prefName],
            },
        }))
    }

    const handleTestTelegram = async () => {
        if (!storeId) {
            toast.error('No se pudo identificar la tienda')
            return
        }

        // Check if Chat ID is filled
        if (!storeInfo.telegramChatId || storeInfo.telegramChatId.trim() === '') {
            toast.error('Por favor ingresa tu Chat ID de Telegram primero.')
            return
        }

        // Check if notifications are enabled
        if (!storeInfo.telegramEnabled) {
            toast.error('Por favor habilita las notificaciones de Telegram primero.')
            return
        }

        setTelegramLoading(true)
        try {
            // Get session token
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                throw new Error('No estás autenticado. Por favor inicia sesión.')
            }

            // First, save the current Chat ID and enabled status to database
            toast.loading('Guardando configuración de Telegram...', { id: 'save-telegram' })
            
            const updateData = {
                telegram_chat_id: storeInfo.telegramChatId.trim(),
                telegram_enabled: storeInfo.telegramEnabled,
                notification_prefs: storeInfo.notificationPrefs,
            }

            await updateVendor(updateData)
            toast.success('Configuración guardada', { id: 'save-telegram' })

            // Wait a moment for the database to update
            await new Promise(resolve => setTimeout(resolve, 500))

            // Now try to send test notification
            toast.loading('Enviando notificación de prueba...', { id: 'test-telegram' })

            const response = await fetch(`/api/stores/${storeId}/telegram/test`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json',
                },
            })

            const data = await response.json()

            if (!response.ok) {
                // Provide more helpful error messages
                if (data.error?.includes('no está conectado') || data.error?.includes('not connected')) {
                    toast.error('Error: El Chat ID no se guardó correctamente. Por favor intenta de nuevo.', { id: 'test-telegram', duration: 6000 })
                } else if (data.error?.includes('deshabilitadas')) {
                    toast.error('Las notificaciones están deshabilitadas. Por favor habilítalas y guarda los cambios.', { id: 'test-telegram', duration: 6000 })
                } else {
                    toast.error(data.error || 'Error al enviar notificación de prueba', { id: 'test-telegram' })
                }
                return
            }

            toast.success('✅ Notificación de prueba enviada. Revisa tu Telegram.', { id: 'test-telegram' })
            
            // Refresh store info to sync with database
            await fetchStoreInfo()
        } catch (error) {
            console.error('Error testing Telegram:', error)
            toast.error(error.message || 'Error al enviar notificación de prueba', { id: 'test-telegram' })
        } finally {
            setTelegramLoading(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setSaving(true)

        try {
            let logoUrl = storeInfo.logo

            // Upload new logo if selected
            if (logoFile) {
                toast.loading('Subiendo logo...', { id: 'upload-logo' })
                logoUrl = await uploadImage(logoFile, 'store-logos')
                toast.success('Logo subido exitosamente', { id: 'upload-logo' })
            }

            // Update vendor data - only include fields that exist in the database
            const updateData = {
                name: storeInfo.name,
                description: storeInfo.description,
                logo: logoUrl,
                email: storeInfo.email,
                contact: storeInfo.contact,
                address: storeInfo.address,
                latitude: storeInfo.latitude,
                longitude: storeInfo.longitude,
                service_colonias: storeInfo.serviceColonias,
                fulfillment_modes: storeInfo.fulfillmentModes,
                meetup_points: storeInfo.meetupPoints,
                delivery_notes: storeInfo.deliveryNotes,
                min_order: storeInfo.minOrder,
                delivery_fee_policy: storeInfo.deliveryFeePolicy,
                delivery_fee_amount: storeInfo.deliveryFeeAmount,
                delivery_fee_percent: storeInfo.deliveryFeePercent,
                operating_hours: storeInfo.operatingHours,
                courier_cost: storeInfo.courierCost,
                courier_cost_included: storeInfo.courierCostIncluded,
                require_order_approval: storeInfo.requireOrderApproval,
                telegram_chat_id: storeInfo.telegramChatId || null,
                telegram_enabled: storeInfo.telegramEnabled || false,
                notification_prefs: storeInfo.notificationPrefs,
                telegram_user_id: storeInfo.telegramUserId || null,
                free_shipping_threshold: storeInfo.freeShippingThreshold || 800,
                delivery_options: storeInfo.deliveryOptions || [],
            }

            console.log('💾 Saving store data:')
            console.log(`  - service_colonias: ${JSON.stringify(storeInfo.serviceColonias)}`)
            console.log(`  - service_colonias length: ${storeInfo.serviceColonias?.length || 0}`)
            if (storeInfo.serviceColonias && storeInfo.serviceColonias.length > 0) {
                console.log(`  - First 3 colonias: ${JSON.stringify(storeInfo.serviceColonias.slice(0, 3))}`)
            }

            await updateVendor(updateData)
            toast.success('Información de la tienda actualizada exitosamente')
            
            // Refresh the page data
            await fetchStoreInfo()
        } catch (error) {
            console.error('Error updating store:', error)
            // Provide more helpful error message
            const errorMessage = error.message || error.toString() || 'Error desconocido'
            console.error('Full error details:', {
                message: errorMessage,
                error: error,
                updateData: updateData
            })
            toast.error(`Error al actualizar la información: ${errorMessage}`)
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <Loading />

    return (
        <div className="text-[#1A1A1A]/70 mb-28">
            <h1 className="text-2xl mb-5">Editar <span className="text-[#1A1A1A] font-bold">Mi Tienda</span></h1>

            <form onSubmit={handleSubmit} className="max-w-4xl space-y-6">
                {/* Logo */}
                <div>
                    <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                        Logo de la Tienda
                    </label>
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Image
                                src={logoPreview || assets.upload_area}
                                alt="Logo preview"
                                width={150}
                                height={150}
                                className="rounded-lg border-2 border-[#00C6A2]/20 object-cover"
                            />
                            {logoPreview && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setLogoFile(null)
                                        setLogoPreview(storeInfo.logo || "")
                                        if (fileInputRef.current) {
                                            fileInputRef.current.value = ""
                                        }
                                    }}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                        <div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleLogoChange}
                                className="hidden"
                                id="logo-upload"
                            />
                            <label
                                htmlFor="logo-upload"
                                className="cursor-pointer px-6 py-3 bg-[#00C6A2] hover:bg-[#00B894] text-white rounded-full font-semibold transition-all hover:scale-105 active:scale-95 inline-block"
                            >
                                {logoPreview ? 'Cambiar Logo' : 'Subir Logo'}
                            </label>
                            <p className="text-xs text-[#1A1A1A]/60 mt-2">Máximo 5MB. Formatos: JPG, PNG, WEBP</p>
                        </div>
                    </div>
                </div>

                {/* Store Name */}
                <div>
                    <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                        Nombre de la Tienda *
                    </label>
                    <input
                        type="text"
                        name="name"
                        value={storeInfo.name || ''}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 rounded-xl border border-[#00C6A2]/20 focus:border-[#00C6A2] focus:ring-2 focus:ring-[#00C6A2]/20 outline-none transition-all"
                        placeholder="Nombre de tu tienda"
                    />
                </div>

                {/* Description */}
                <div>
                    <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                        Descripción *
                    </label>
                    <textarea
                        name="description"
                        value={storeInfo.description || ''}
                        onChange={handleChange}
                        required
                        rows={5}
                        className="w-full px-4 py-3 rounded-xl border border-[#00C6A2]/20 focus:border-[#00C6A2] focus:ring-2 focus:ring-[#00C6A2]/20 outline-none transition-all resize-none"
                        placeholder="Describe tu tienda..."
                    />
                </div>

                {/* Email */}
                <div>
                    <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                        Email de Contacto *
                    </label>
                    <input
                        type="email"
                        name="email"
                        value={storeInfo.email || ''}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 rounded-xl border border-[#00C6A2]/20 focus:border-[#00C6A2] focus:ring-2 focus:ring-[#00C6A2]/20 outline-none transition-all"
                        placeholder="tienda@ejemplo.com"
                    />
                </div>

                {/* Contact */}
                <div>
                    <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                        Teléfono de Contacto <span className="text-[#1A1A1A]/40 text-sm font-normal">(Opcional)</span>
                    </label>
                    <input
                        type="text"
                        name="contact"
                        value={storeInfo.contact || ''}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-xl border border-[#00C6A2]/20 focus:border-[#00C6A2] focus:ring-2 focus:ring-[#00C6A2]/20 outline-none transition-all"
                        placeholder="+52 55 1234 5678"
                    />
                </div>

                {/* Address */}
                <div>
                    <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                        Dirección <span className="text-[#1A1A1A]/40 text-sm font-normal">(Opcional)</span>
                    </label>
                    <LocationSearch
                        value={storeInfo.address}
                        onChange={(address) => setStoreInfo({ ...storeInfo, address })}
                        onLocationSelect={(location) => {
                            setStoreInfo({
                                ...storeInfo,
                                address: location.address,
                                latitude: location.latitude,
                                longitude: location.longitude
                            })
                        }}
                        placeholder="Busca tu dirección (calle, colonia, ciudad)..."
                    />
                    {storeInfo.address && (
                        <p className="text-xs text-[#00C6A2] mt-2">
                            ✓ {storeInfo.address}
                        </p>
                    )}
                </div>

                {/* Location Section */}
                <div className="border-t border-slate-200 pt-6">
                    <h2 className="text-xl font-semibold text-[#1A1A1A] mb-4">Ubicación y Zona de Servicio</h2>
                    
                    <div className="mb-4">
                        <p className="text-sm text-[#1A1A1A]/70 mb-4">
                            Se usará la misma ubicación que configuraste en tu dirección de perfil.
                        </p>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                            Zona de Servicio (Colonias donde entregas)
                        </label>
                        <p className="text-xs text-[#1A1A1A]/60 mb-3">
                            Selecciona las delegaciones y colonias donde realizas entregas. Los clientes solo podrán comprar si su código postal está en tu zona de servicio.
                        </p>
                        <ServiceAreaSelector
                            selectedColonias={storeInfo.serviceColonias}
                            onChange={(colonias) => setStoreInfo({ ...storeInfo, serviceColonias: colonias })}
                        />
                    </div>
                </div>

                {/* Fulfillment Modes */}
                <div className="border-t border-slate-200 pt-6">
                    <h2 className="text-xl font-semibold text-[#1A1A1A] mb-4">Métodos de Entrega</h2>
                    
                    <div className="space-y-3">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={storeInfo.fulfillmentModes.pickup}
                                onChange={(e) => setStoreInfo({
                                    ...storeInfo,
                                    fulfillmentModes: { ...storeInfo.fulfillmentModes, pickup: e.target.checked }
                                })}
                                className="w-5 h-5 rounded border-[#00C6A2] text-[#00C6A2] focus:ring-[#00C6A2]"
                            />
                            <span className="text-[#1A1A1A]">Pickup (Recoger en tienda)</span>
                        </label>
                        
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={storeInfo.fulfillmentModes.delivery}
                                onChange={(e) => setStoreInfo({
                                    ...storeInfo,
                                    fulfillmentModes: { ...storeInfo.fulfillmentModes, delivery: e.target.checked }
                                })}
                                className="w-5 h-5 rounded border-[#00C6A2] text-[#00C6A2] focus:ring-[#00C6A2]"
                            />
                            <span className="text-[#1A1A1A]">Envío a domicilio</span>
                        </label>
                        
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={storeInfo.fulfillmentModes.meetupPoint}
                                onChange={(e) => setStoreInfo({
                                    ...storeInfo,
                                    fulfillmentModes: { ...storeInfo.fulfillmentModes, meetupPoint: e.target.checked }
                                })}
                                className="w-5 h-5 rounded border-[#00C6A2] text-[#00C6A2] focus:ring-[#00C6A2]"
                            />
                            <span className="text-[#1A1A1A]">Punto de entrega</span>
                        </label>
                        
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={storeInfo.fulfillmentModes.courierExterno}
                                onChange={(e) => setStoreInfo({
                                    ...storeInfo,
                                    fulfillmentModes: { ...storeInfo.fulfillmentModes, courierExterno: e.target.checked }
                                })}
                                className="w-5 h-5 rounded border-[#00C6A2] text-[#00C6A2] focus:ring-[#00C6A2]"
                            />
                            <span className="text-[#1A1A1A]">Courier Externo (Uber/Didi)</span>
                        </label>
                    </div>
                    
                    {/* Delivery Options Configuration */}
                    {storeInfo.fulfillmentModes.delivery && (
                        <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                            <h3 className="text-lg font-semibold text-[#1A1A1A] mb-3">Opciones de Entrega</h3>
                            
                            {/* Free Shipping Threshold */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                                    Monto mínimo para envío gratis (MXN)
                                </label>
                                <input
                                    type="number"
                                    value={storeInfo.freeShippingThreshold || 800}
                                    onChange={(e) => setStoreInfo({
                                        ...storeInfo,
                                        freeShippingThreshold: parseFloat(e.target.value) || 0
                                    })}
                                    className="w-full px-4 py-2 rounded-lg border border-[#00C6A2]/20 focus:border-[#00C6A2] focus:ring-2 focus:ring-[#00C6A2]/20 outline-none"
                                    min="0"
                                    step="1"
                                />
                                <p className="text-xs text-[#1A1A1A]/60 mt-1">
                                    Los pedidos iguales o mayores a este monto tendrán envío gratis
                                </p>
                            </div>
                            
                            {/* Delivery Options */}
                            <div className="space-y-3">
                                {storeInfo.deliveryOptions?.map((option, index) => (
                                    <div key={option.id || index} className="p-3 bg-white rounded-lg border border-slate-200">
                                        <div className="flex items-center gap-3 mb-3">
                                            <input
                                                type="checkbox"
                                                checked={option.enabled !== false}
                                                onChange={(e) => {
                                                    const updatedOptions = [...storeInfo.deliveryOptions];
                                                    updatedOptions[index] = { ...option, enabled: e.target.checked };
                                                    setStoreInfo({ ...storeInfo, deliveryOptions: updatedOptions });
                                                }}
                                                className="w-5 h-5 rounded border-[#00C6A2] text-[#00C6A2] focus:ring-[#00C6A2]"
                                            />
                                            <span className="font-medium text-[#1A1A1A]">{option.name}</span>
                                        </div>
                                        
                                        {option.enabled !== false && (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 ml-8">
                                                <div>
                                                    <label className="block text-xs text-[#1A1A1A]/70 mb-1">Precio (MXN)</label>
                                                    <input
                                                        type="number"
                                                        value={option.price || 0}
                                                        onChange={(e) => {
                                                            const updatedOptions = [...storeInfo.deliveryOptions];
                                                            updatedOptions[index] = { ...option, price: parseFloat(e.target.value) || 0 };
                                                            setStoreInfo({ ...storeInfo, deliveryOptions: updatedOptions });
                                                        }}
                                                        className="w-full px-3 py-2 rounded border border-slate-300 focus:border-[#00C6A2] focus:ring-1 focus:ring-[#00C6A2]/20 outline-none text-sm"
                                                        min="0"
                                                        step="0.01"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-[#1A1A1A]/70 mb-1">Descripción</label>
                                                    <input
                                                        type="text"
                                                        value={option.description || ''}
                                                        onChange={(e) => {
                                                            const updatedOptions = [...storeInfo.deliveryOptions];
                                                            updatedOptions[index] = { ...option, description: e.target.value };
                                                            setStoreInfo({ ...storeInfo, deliveryOptions: updatedOptions });
                                                        }}
                                                        className="w-full px-3 py-2 rounded border border-slate-300 focus:border-[#00C6A2] focus:ring-1 focus:ring-[#00C6A2]/20 outline-none text-sm"
                                                        placeholder="Ej: Lun-Vie antes de 8pm"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Order Approval Settings */}
                <div className="border-t border-slate-200 pt-6">
                    <h2 className="text-xl font-semibold text-[#1A1A1A] mb-4">Configuración de Pedidos</h2>
                    
                    <div className="space-y-3">
                        <label className="flex items-start gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={storeInfo.requireOrderApproval}
                                onChange={(e) => setStoreInfo({
                                    ...storeInfo,
                                    requireOrderApproval: e.target.checked
                                })}
                                className="w-5 h-5 rounded border-[#00C6A2] text-[#00C6A2] focus:ring-[#00C6A2] mt-0.5"
                            />
                            <div>
                                <span className="text-[#1A1A1A] font-medium block">Requerir aceptación de pedidos</span>
                                <span className="text-sm text-[#1A1A1A]/60 block mt-1">
                                    Si está activado, deberás aceptar manualmente cada pedido antes de que se procese. 
                                    Los pedidos permanecerán en estado "Pendiente" hasta que los apruebes.
                                </span>
                            </div>
                        </label>
                    </div>
                </div>

                {/* Telegram Notifications */}
                <div className="border-t border-slate-200 pt-6">
                    <h2 className="text-xl font-semibold text-[#1A1A1A] mb-4">Notificaciones de Telegram</h2>
                    
                    <div className="space-y-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                            <p className="text-sm text-blue-800 font-medium mb-2">📱 Cómo obtener tu Chat ID de Telegram:</p>
                            <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside ml-2">
                                <li>Inicia conversación con el bot <a href="https://t.me/userinfobot" target="_blank" rel="noopener noreferrer" className="underline font-medium">@userinfobot</a> en Telegram</li>
                                <li className="font-semibold text-blue-800">⚠️ IMPORTANTE: Asegúrate de usar el bot correcto: <code className="bg-blue-100 px-1 rounded">@userinfobot</code> (User Info • Get ID • idbot)</li>
                                <li>Envía cualquier mensaje al bot (ej: "/start" o "hola")</li>
                                <li>El bot te responderá con tu información. Busca el campo <code className="bg-blue-100 px-1 rounded">Id:</code> que muestra un número como: <code className="bg-blue-100 px-1 rounded">8027256689</code></li>
                                <li>Copia ese número (solo el número, sin espacios ni guiones) y pégalo en el campo de abajo</li>
                            </ol>
                            <p className="text-xs text-blue-600 mt-2">
                                💡 Alternativa: Visita <a href="https://api.telegram.org/bot8501718133:AAEnmlFhPe04-0WjebhYwxOoSTbtnUg_HOU/getUpdates" target="_blank" rel="noopener noreferrer" className="underline">esta URL</a> después de enviar un mensaje al bot y busca tu <code className="bg-blue-100 px-1 rounded">chat.id</code>
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                                Chat ID de Telegram
                            </label>
                            <input
                                type="text"
                                name="telegramChatId"
                                value={storeInfo.telegramChatId || ''}
                                onChange={(e) => setStoreInfo({ ...storeInfo, telegramChatId: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-[#00C6A2]/20 focus:border-[#00C6A2] focus:ring-2 focus:ring-[#00C6A2]/20 outline-none transition-all"
                                placeholder="Ej: 123456789"
                            />
                            <p className="text-xs text-[#1A1A1A]/60 mt-1">
                                Tu Chat ID de Telegram (número sin espacios ni guiones)
                            </p>
                        </div>

                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={storeInfo.telegramEnabled}
                                onChange={(e) => setStoreInfo({ ...storeInfo, telegramEnabled: e.target.checked })}
                                className="w-5 h-5 rounded border-[#00C6A2] text-[#00C6A2] focus:ring-[#00C6A2]"
                            />
                            <div>
                                <span className="text-[#1A1A1A] font-medium block">Habilitar notificaciones de Telegram</span>
                                <span className="text-sm text-[#1A1A1A]/60 block mt-1">
                                    Recibirás notificaciones cuando haya nuevas órdenes, productos con bajo stock y mensajes de soporte.
                                </span>
                            </div>
                        </label>

                        {storeInfo.telegramChatId && storeInfo.telegramEnabled && (
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={handleTestTelegram}
                                    disabled={telegramLoading}
                                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {telegramLoading ? 'Enviando...' : 'Enviar Notificación de Prueba'}
                                </button>
                            </div>
                        )}
                        {(!storeInfo.telegramChatId || !storeInfo.telegramEnabled) && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-2">
                                <p className="text-xs text-yellow-800">
                                    ⚠️ <strong>Importante:</strong> Debes ingresar tu Chat ID, habilitar las notificaciones y <strong>guardar los cambios</strong> antes de poder enviar una notificación de prueba.
                                </p>
                            </div>
                        )}

                        <div className="border-t border-slate-200 pt-4 mt-4">
                            <h3 className="text-sm font-semibold text-[#1A1A1A] mb-3">Preferencias de Notificación</h3>
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={storeInfo.notificationPrefs.newOrder}
                                        onChange={() => handleTelegramPrefChange('newOrder')}
                                        className="w-4 h-4 rounded border-[#00C6A2] text-[#00C6A2] focus:ring-[#00C6A2]"
                                    />
                                    <span className="text-sm text-[#1A1A1A]">Nuevas Órdenes</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={storeInfo.notificationPrefs.lowStock}
                                        onChange={() => handleTelegramPrefChange('lowStock')}
                                        className="w-4 h-4 rounded border-[#00C6A2] text-[#00C6A2] focus:ring-[#00C6A2]"
                                    />
                                    <span className="text-sm text-[#1A1A1A]">Bajo Stock</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={storeInfo.notificationPrefs.support}
                                        onChange={() => handleTelegramPrefChange('support')}
                                        className="w-4 h-4 rounded border-[#00C6A2] text-[#00C6A2] focus:ring-[#00C6A2]"
                                    />
                                    <span className="text-sm text-[#1A1A1A]">Mensajes de Soporte</span>
                                </label>
                            </div>
                        </div>

                        {/* Telegram Username for Customer Contact */}
                        <div className="border-t border-slate-200 pt-4 mt-4">
                            <h3 className="text-sm font-semibold text-[#1A1A1A] mb-3">Contacto Directo con Clientes</h3>
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                                <p className="text-sm text-green-800 font-medium mb-2">💬 Tu Telegram para que los clientes te contacten:</p>
                                <p className="text-xs text-green-700 mb-2">
                                    Ingresa tu <strong>username de Telegram</strong> (ej: @tuusuario). 
                                    Los clientes podrán contactarte directamente después de completar su compra.
                                </p>
                                <p className="text-xs text-green-600 mt-2">
                                    💡 Si no tienes username, puedes configurarlo en Telegram: Configuración → Nombre de usuario
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                                    Telegram Username
                                </label>
                                <input
                                    type="text"
                                    name="telegramUserId"
                                    value={storeInfo.telegramUserId || ''}
                                    onChange={(e) => {
                                        let value = e.target.value.trim()
                                        // Ensure it starts with @
                                        if (value && !value.startsWith('@')) {
                                            value = '@' + value
                                        }
                                        setStoreInfo({ ...storeInfo, telegramUserId: value })
                                    }}
                                    className="w-full px-4 py-3 rounded-xl border border-[#00C6A2]/20 focus:border-[#00C6A2] focus:ring-2 focus:ring-[#00C6A2]/20 outline-none transition-all"
                                    placeholder="Ej: @tuusuario"
                                />
                                <p className="text-xs text-[#1A1A1A]/60 mt-1">
                                    Username de Telegram (debe empezar con @) para contacto directo con clientes
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Meetup Points */}
                {storeInfo.fulfillmentModes.meetupPoint && (
                    <div className="border-t border-slate-200 pt-6">
                        <h2 className="text-xl font-semibold text-[#1A1A1A] mb-4">Puntos de Entrega</h2>
                        <MeetupPointsManager
                            points={storeInfo.meetupPoints}
                            onChange={(points) => setStoreInfo({ ...storeInfo, meetupPoints: points })}
                        />
                    </div>
                )}

                {/* Delivery Settings */}
                {(storeInfo.fulfillmentModes.delivery || storeInfo.fulfillmentModes.courierExterno) && (
                    <div className="border-t border-slate-200 pt-6">
                        <h2 className="text-xl font-semibold text-[#1A1A1A] mb-4">Configuración de Envío</h2>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                                    Pedido Mínimo (MXN)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={storeInfo.minOrder ?? 0}
                                    onChange={(e) => setStoreInfo({ ...storeInfo, minOrder: parseFloat(e.target.value) || 0 })}
                                    className="w-full px-4 py-3 rounded-xl border border-[#00C6A2]/20 focus:border-[#00C6A2] focus:ring-2 focus:ring-[#00C6A2]/20 outline-none transition-all"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                                    Política de Costo de Envío
                                </label>
                                <select
                                    value={storeInfo.deliveryFeePolicy || 'flat'}
                                    onChange={(e) => setStoreInfo({ ...storeInfo, deliveryFeePolicy: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-[#00C6A2]/20 focus:border-[#00C6A2] focus:ring-2 focus:ring-[#00C6A2]/20 outline-none transition-all"
                                >
                                    <option value="flat">Tarifa fija</option>
                                    <option value="percent">Porcentaje</option>
                                    <option value="included">Incluido en precio</option>
                                </select>
                            </div>
                            
                            {storeInfo.deliveryFeePolicy === 'flat' && (
                                <div>
                                    <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                                        Costo de Envío (MXN)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={storeInfo.deliveryFeeAmount ?? 0}
                                        onChange={(e) => setStoreInfo({ ...storeInfo, deliveryFeeAmount: parseFloat(e.target.value) || 0 })}
                                        className="w-full px-4 py-3 rounded-xl border border-[#00C6A2]/20 focus:border-[#00C6A2] focus:ring-2 focus:ring-[#00C6A2]/20 outline-none transition-all"
                                    />
                                </div>
                            )}
                            
                            {storeInfo.deliveryFeePolicy === 'percent' && (
                                <div>
                                    <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                                        Porcentaje de Envío (%)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        max="100"
                                        value={storeInfo.deliveryFeePercent ?? 0}
                                        onChange={(e) => setStoreInfo({ ...storeInfo, deliveryFeePercent: parseFloat(e.target.value) || 0 })}
                                        className="w-full px-4 py-3 rounded-xl border border-[#00C6A2]/20 focus:border-[#00C6A2] focus:ring-2 focus:ring-[#00C6A2]/20 outline-none transition-all"
                                    />
                                </div>
                            )}
                            
                            <div>
                                <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                                    Notas de Entrega
                                </label>
                                <textarea
                                    value={storeInfo.deliveryNotes || ''}
                                    onChange={(e) => setStoreInfo({ ...storeInfo, deliveryNotes: e.target.value })}
                                    rows={3}
                                    className="w-full px-4 py-3 rounded-xl border border-[#00C6A2]/20 focus:border-[#00C6A2] focus:ring-2 focus:ring-[#00C6A2]/20 outline-none transition-all resize-none"
                                    placeholder="Instrucciones especiales para entregas..."
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Courier Settings - Now part of Delivery Settings */}
                {storeInfo.fulfillmentModes.courierExterno && (
                    <div className="border-t border-slate-200 pt-6">
                        <h2 className="text-xl font-semibold text-[#1A1A1A] mb-4">Configuración de Courier Externo</h2>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                                    Costo de Courier (MXN)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={storeInfo.courierCost ?? 0}
                                    onChange={(e) => setStoreInfo({ ...storeInfo, courierCost: parseFloat(e.target.value) || 0 })}
                                    className="w-full px-4 py-3 rounded-xl border border-[#00C6A2]/20 focus:border-[#00C6A2] focus:ring-2 focus:ring-[#00C6A2]/20 outline-none transition-all"
                                />
                                <p className="text-xs text-[#1A1A1A]/60 mt-1">Costo estimado para courier externo (Uber/Didi)</p>
                            </div>
                            
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={storeInfo.courierCostIncluded}
                                    onChange={(e) => setStoreInfo({ ...storeInfo, courierCostIncluded: e.target.checked })}
                                    className="w-5 h-5 rounded border-[#00C6A2] text-[#00C6A2] focus:ring-[#00C6A2]"
                                />
                                <span className="text-[#1A1A1A]">El costo de courier está incluido en el precio de los productos</span>
                            </label>
                        </div>
                    </div>
                )}

                {/* Submit Button */}
                <div className="flex gap-4 pt-4">
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-8 py-3 bg-[#00C6A2] hover:bg-[#00B894] text-white rounded-full font-semibold transition-all hover:scale-105 active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
            </form>
        </div>
    )
}

