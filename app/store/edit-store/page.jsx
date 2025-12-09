'use client'
import { useEffect, useState, useRef } from "react"
import { toast } from "react-hot-toast"
import Image from "next/image"
import Loading from "@/components/Loading"
import { getCurrentVendor, updateVendor } from "@/lib/supabase/database"
import { uploadImage } from "@/lib/supabase/storage"
import { assets } from "@/assets/assets"

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
            }

            await updateVendor(updateData)
            toast.success('Información de la tienda actualizada exitosamente')
            
            // Refresh the page data
            await fetchStoreInfo()
        } catch (error) {
            console.error('Error updating store:', error)
            toast.error(error.message || 'Error al actualizar la información de la tienda')
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
                        value={storeInfo.name}
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
                        value={storeInfo.description}
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
                        value={storeInfo.email}
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
                        value={storeInfo.contact}
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
                        value={storeInfo.address}
                        onChange={handleChange}
                        rows={3}
                        className="w-full px-4 py-3 rounded-xl border border-[#00C6A2]/20 focus:border-[#00C6A2] focus:ring-2 focus:ring-[#00C6A2]/20 outline-none transition-all resize-none"
                        placeholder="Dirección completa de tu tienda"
                    />
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

