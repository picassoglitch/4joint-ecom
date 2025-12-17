'use client'
import { useEffect, useState, useRef } from "react"
import { toast } from "react-hot-toast"
import Image from "next/image"
import Loading from "@/components/Loading"
import { getCurrentVendor, updateVendor } from "@/lib/supabase/database"
import { uploadImage } from "@/lib/supabase/storage"
import { assets } from "@/assets/assets"
import MeetupPointsManager from "@/components/store/MeetupPointsManager"
import LocationPicker from "@/components/store/LocationPicker"
import CDMXColoniasSelector from "@/components/store/CDMXColoniasSelector"

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
        latitude: null,
        longitude: null,
        serviceRadiusKm: 10.0,
        serviceColonias: [],
        showStoreLocation: true,
        showWhatsappContact: false,
        whatsappNumber: '',
        fulfillmentModes: { pickup: false, delivery: false, meetupPoint: false },
        meetupPoints: [],
        deliveryNotes: "",
        minOrder: 0,
        deliveryFeePolicy: "flat", // "flat", "percent", "included"
        deliveryFeeAmount: 0,
        deliveryFeePercent: 0,
        operatingHours: {},
        courierCost: 0,
        courierCostIncluded: false,
    })
    const [logoFile, setLogoFile] = useState(null)
    const [logoPreview, setLogoPreview] = useState("")
    const fileInputRef = useRef(null)

    const fetchStoreInfo = async () => {
        try {
            const vendor = await getCurrentVendor()
            if (vendor) {
                setStoreInfo({
                    name: vendor.name || "",
                    description: vendor.description || "",
                    logo: vendor.logo || "",
                    email: vendor.email || "",
                    contact: vendor.contact || "",
                    address: vendor.address || "",
                    latitude: vendor.latitude || null,
                    longitude: vendor.longitude || null,
                    serviceRadiusKm: vendor.service_radius_km || 10.0,
                    serviceColonias: vendor.service_colonias || [],
                    showStoreLocation: vendor.show_store_location !== false,
                    showWhatsappContact: vendor.show_whatsapp_contact || false,
                    whatsappNumber: vendor.whatsapp_number || '',
                    fulfillmentModes: vendor.fulfillment_modes || { pickup: false, delivery: false, meetupPoint: false },
                    meetupPoints: vendor.meetup_points || [],
                    deliveryNotes: vendor.delivery_notes || "",
                    minOrder: vendor.min_order || 0,
                    deliveryFeePolicy: vendor.delivery_fee_policy || "flat",
                    deliveryFeeAmount: vendor.delivery_fee_amount || 0,
                    deliveryFeePercent: vendor.delivery_fee_percent || 0,
                    operatingHours: vendor.operating_hours || {},
                    courierCost: vendor.courier_cost || 0,
                    courierCostIncluded: vendor.courier_cost_included || false,
                })
                setLogoPreview(vendor.logo || "")
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

            // Update vendor data
            const updateData = {
                name: storeInfo.name,
                description: storeInfo.description,
                logo: logoUrl,
                email: storeInfo.email,
                contact: storeInfo.contact,
                address: storeInfo.address,
                latitude: storeInfo.latitude,
                longitude: storeInfo.longitude,
                service_radius_km: storeInfo.serviceRadiusKm,
                service_colonias: storeInfo.serviceColonias,
                show_store_location: storeInfo.showStoreLocation,
                show_whatsapp_contact: storeInfo.showWhatsappContact,
                whatsapp_number: storeInfo.whatsappNumber || null,
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
            }

            await updateVendor(updateData)
            toast.success('Información de la tienda actualizada exitosamente')
            
            // Refresh the page data
            await fetchStoreInfo()
        } catch (error) {
            console.error('Error updating store:', error)
            
            // Better error handling
            let errorMessage = 'Error al actualizar la información de la tienda'
            
            if (error?.message) {
                errorMessage = error.message
            } else if (typeof error === 'string') {
                errorMessage = error
            } else if (error?.error_description) {
                errorMessage = error.error_description
            } else if (error?.details) {
                errorMessage = error.details
            } else if (error?.hint) {
                errorMessage = `Error: ${error.hint}`
            } else if (error?.code) {
                errorMessage = `Error ${error.code}: ${error.message || 'Error desconocido'}`
            }
            
            // Check if it's a missing column error
            if (errorMessage.includes('service_colonias') || errorMessage.includes('column')) {
                errorMessage = 'Algunas columnas no existen en la base de datos. Por favor ejecuta la migración: supabase/migration_colonias_and_courier.sql'
            }
            
            toast.error(errorMessage)
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
                    <textarea
                        name="address"
                        value={storeInfo.address || ''}
                        onChange={handleChange}
                        rows={3}
                        className="w-full px-4 py-3 rounded-xl border border-[#00C6A2]/20 focus:border-[#00C6A2] focus:ring-2 focus:ring-[#00C6A2]/20 outline-none transition-all resize-none"
                        placeholder="Dirección completa de tu tienda"
                    />
                </div>

                {/* Location Section - Donde recogerán las órdenes de Didi */}
                <div className="border-t border-slate-200 pt-6">
                    <h2 className="text-xl font-semibold text-[#1A1A1A] mb-2">Donde recogerán las órdenes de Didi</h2>
                    <p className="text-sm text-[#1A1A1A]/60 mb-6">
                        Configura el punto de recolección donde los repartidores de Didi/Uber recogerán los pedidos
                    </p>
                    
                    {/* Show Store Location Toggle */}
                    <div className="mb-6">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={storeInfo.showStoreLocation}
                                onChange={(e) => setStoreInfo({ ...storeInfo, showStoreLocation: e.target.checked })}
                                className="w-5 h-5 rounded border-[#00C6A2] text-[#00C6A2] focus:ring-[#00C6A2]"
                            />
                            <span className="text-[#1A1A1A] font-medium">
                                Mostrar ubicación de la tienda en el mapa
                            </span>
                        </label>
                        <p className="text-xs text-[#1A1A1A]/60 mt-1 ml-8">
                            Si está desactivado, solo se mostrará el punto de entrega seleccionado
                        </p>
                    </div>

                    {/* Map Location Picker */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-[#1A1A1A] mb-3">
                            Selecciona el punto de recolección en el mapa
                        </label>
                        <LocationPicker
                            latitude={storeInfo.latitude}
                            longitude={storeInfo.longitude}
                            onLocationChange={({ lat, lng }) => {
                                setStoreInfo({ ...storeInfo, latitude: lat, longitude: lng })
                            }}
                            showStoreLocation={storeInfo.showStoreLocation}
                        />
                    </div>

                    {/* CDMX Colonias Selector */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-[#1A1A1A] mb-3">
                            Colonias donde trabajas (CDMX)
                        </label>
                        <p className="text-xs text-[#1A1A1A]/60 mb-4">
                            Selecciona las colonias donde ofreces servicio de entrega. Por ahora solo están disponibles las delegaciones de CDMX.
                        </p>
                        <CDMXColoniasSelector
                            selectedColonias={storeInfo.serviceColonias || []}
                            onChange={(colonias) => setStoreInfo({ ...storeInfo, serviceColonias: colonias })}
                        />
                    </div>
                </div>

                {/* Fulfillment Modes */}
                <div className="border-t border-slate-200 pt-6">
                    <h2 className="text-xl font-semibold text-[#1A1A1A] mb-4">Modos de Entrega</h2>
                    
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
                {storeInfo.fulfillmentModes.delivery && (
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

                {/* Contact Settings */}
                <div className="border-t border-slate-200 pt-6">
                    <h2 className="text-xl font-semibold text-[#1A1A1A] mb-4">Configuración de Contacto</h2>
                    
                    <div className="space-y-4">
                        <label className="flex items-start gap-3 cursor-pointer p-4 bg-slate-50 rounded-xl border-2 border-slate-200 hover:border-[#00C6A2] transition-all">
                            <input
                                type="checkbox"
                                checked={storeInfo.showWhatsappContact || false}
                                onChange={(e) => setStoreInfo({ ...storeInfo, showWhatsappContact: e.target.checked })}
                                className="w-5 h-5 rounded border-[#00C6A2] text-[#00C6A2] focus:ring-[#00C6A2] mt-0.5"
                            />
                            <div className="flex-1">
                                <span className="text-[#1A1A1A] font-bold text-base block mb-1">
                                    Mostrar botón de WhatsApp en checkout
                                </span>
                                <p className="text-sm text-[#1A1A1A]/70">
                                    Cuando los clientes seleccionen "Envío a domicilio", verán un botón para contactarte directamente por WhatsApp y coordinar el envío con Didi/Uber.
                                </p>
                            </div>
                        </label>

                        {storeInfo.showWhatsappContact && (
                            <div className="ml-8 p-4 bg-green-50 border-2 border-green-200 rounded-xl">
                                <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                                    Número de WhatsApp <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={storeInfo.whatsappNumber || ''}
                                    onChange={(e) => setStoreInfo({ ...storeInfo, whatsappNumber: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-[#00C6A2]/20 focus:border-[#00C6A2] focus:ring-2 focus:ring-[#00C6A2]/20 outline-none transition-all"
                                    placeholder="+52 55 1234 5678"
                                    required={storeInfo.showWhatsappContact}
                                />
                                <p className="text-xs text-[#1A1A1A]/60 mt-2">
                                    Este número se mostrará en el botón de WhatsApp. Puede ser diferente al número de contacto general.
                                </p>
                                {storeInfo.showWhatsappContact && !storeInfo.whatsappNumber && (
                                    <p className="text-xs text-red-600 font-medium mt-2">
                                        ⚠️ Debes ingresar un número de WhatsApp para activar esta función
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>

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

