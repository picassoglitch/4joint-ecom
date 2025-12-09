'use client'
import { assets } from "@/assets/assets"
import { useEffect, useState, useRef } from "react"
import Image from "next/image"
import toast from "react-hot-toast"
import Loading from "@/components/Loading"
import { getCurrentVendor } from "@/lib/supabase/database"
import { registerAsVendor, getCurrentUser } from "@/lib/supabase/auth"
import { uploadImage } from "@/lib/supabase/storage"
import { useRouter } from "next/navigation"

export default function CreateStore() {
    const router = useRouter()
    const [alreadySubmitted, setAlreadySubmitted] = useState(false)
    const [status, setStatus] = useState("")
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [message, setMessage] = useState("")
    const [userEmail, setUserEmail] = useState("")
    const fileInputRef = useRef(null)

    const [storeInfo, setStoreInfo] = useState({
        name: "",
        description: "",
        email: "",
        contact: "",
        address: "",
        image: null
    })

    const onChangeHandler = (e) => {
        setStoreInfo({ ...storeInfo, [e.target.name]: e.target.value })
    }

    const handleImageChange = (e) => {
        const file = e.target.files[0]
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error('La imagen debe ser menor a 5MB')
                return
            }
            setStoreInfo({ ...storeInfo, image: file })
        }
    }

    const fetchSellerStatus = async () => {
        try {
            // Get current user email
            const { user } = await getCurrentUser()
            if (user?.email) {
                setUserEmail(user.email)
                setStoreInfo(prev => ({ ...prev, email: user.email }))
            }

            const vendor = await getCurrentVendor()
            if (vendor) {
                setAlreadySubmitted(true)
                setStatus(vendor.approved ? 'approved' : 'pending')
                setMessage(
                    vendor.approved 
                        ? 'Tu tienda ha sido aprobada. Ya puedes comenzar a vender.'
                        : 'Tu solicitud de tienda está pendiente de aprobación. Te notificaremos cuando sea revisada.'
                )
            }
        } catch (error) {
            console.error('Error checking vendor status:', error)
        } finally {
            setLoading(false)
        }
    }

    const onSubmitHandler = async (e) => {
        e.preventDefault()
        setSubmitting(true)

        try {
            // Validate required fields
            if (!storeInfo.name || !storeInfo.description) {
                toast.error('Por favor completa todos los campos requeridos')
                setSubmitting(false)
                return
            }

            // Ensure we use the authenticated user's email
            const { user } = await getCurrentUser()
            if (!user?.email) {
                toast.error('No se pudo obtener tu email. Por favor inicia sesión de nuevo.')
                setSubmitting(false)
                return
            }

            let logoUrl = ""

            // Upload logo if provided
            if (storeInfo.image) {
                toast.loading('Subiendo logo...', { id: 'upload-logo' })
                logoUrl = await uploadImage(storeInfo.image, 'store-logos')
                toast.success('Logo subido exitosamente', { id: 'upload-logo' })
            }

            // Register as vendor (use authenticated user's email)
            const vendorData = {
                name: storeInfo.name,
                description: storeInfo.description,
                email: user.email, // Always use authenticated user's email
                contact: storeInfo.contact || null,
                address: storeInfo.address || null,
                logo: logoUrl || null,
            }

            const { data, error } = await registerAsVendor(vendorData)

            if (error) {
                throw error
            }

            toast.success('¡Tienda registrada exitosamente! Está pendiente de aprobación.')
            setAlreadySubmitted(true)
            setStatus('pending')
            setMessage('Tu solicitud de tienda está pendiente de aprobación. Te notificaremos cuando sea revisada.')
            
            // Redirect to store dashboard after 2 seconds
            setTimeout(() => {
                router.push('/store')
            }, 2000)
        } catch (error) {
            console.error('Error registering vendor:', error)
            toast.error(error.message || 'Error al registrar la tienda. Intenta de nuevo.')
        } finally {
            setSubmitting(false)
        }
    }

    useEffect(() => {
        fetchSellerStatus()
    }, [])

    return !loading ? (
        <>
            {!alreadySubmitted ? (
                <div className="mx-6 min-h-[70vh] my-16">
                    <form onSubmit={onSubmitHandler} className="max-w-7xl mx-auto flex flex-col items-start gap-4 text-slate-500">
                        {/* Title */}
                        <div>
                            <h1 className="text-3xl ">Agrega Tu <span className="text-[#1A1A1A] font-medium">Tienda</span></h1>
                            <p className="max-w-lg">Para convertirte en vendedor en 4joint, envía los detalles de tu tienda para revisión. Tu tienda se activará después de la verificación del administrador.</p>
                        </div>

                        <label className="mt-10 cursor-pointer">
                            Logo de la Tienda (Opcional)
                            <div className="mt-2">
                                <Image 
                                    src={storeInfo.image ? URL.createObjectURL(storeInfo.image) : assets.upload_area} 
                                    className="rounded-lg h-32 w-auto border-2 border-[#00C6A2]/20 object-cover" 
                                    alt="" 
                                    width={150} 
                                    height={150} 
                                />
                                <input 
                                    ref={fileInputRef}
                                    type="file" 
                                    accept="image/*" 
                                    onChange={handleImageChange} 
                                    hidden 
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="mt-2 px-4 py-2 bg-[#00C6A2] hover:bg-[#00B894] text-white rounded-full text-sm font-semibold transition-all"
                                >
                                    {storeInfo.image ? 'Cambiar Logo' : 'Subir Logo'}
                                </button>
                            </div>
                            <p className="text-xs text-[#1A1A1A]/60 mt-1">Máximo 5MB. Formatos: JPG, PNG, WEBP</p>
                        </label>

                        <div>
                            <p className="mb-2">Nombre de la Tienda *</p>
                            <input 
                                name="name" 
                                onChange={onChangeHandler} 
                                value={storeInfo.name} 
                                type="text" 
                                placeholder="Nombre de tu tienda" 
                                required
                                className="border border-[#00C6A2]/20 focus:border-[#00C6A2] focus:ring-2 focus:ring-[#00C6A2]/20 outline-none w-full max-w-lg p-3 rounded-xl transition-all" 
                            />
                        </div>

                        <div>
                            <p className="mb-2">Descripción *</p>
                            <textarea 
                                name="description" 
                                onChange={onChangeHandler} 
                                value={storeInfo.description} 
                                rows={5} 
                                placeholder="Describe tu tienda..." 
                                required
                                className="border border-[#00C6A2]/20 focus:border-[#00C6A2] focus:ring-2 focus:ring-[#00C6A2]/20 outline-none w-full max-w-lg p-3 rounded-xl resize-none transition-all" 
                            />
                        </div>

                        <div>
                            <p className="mb-2">Email de Contacto</p>
                            <input 
                                name="email" 
                                value={userEmail || storeInfo.email} 
                                type="email" 
                                disabled
                                readOnly
                                className="border border-[#00C6A2]/20 bg-[#00C6A2]/5 w-full max-w-lg p-3 rounded-xl transition-all cursor-not-allowed text-[#1A1A1A]/60" 
                            />
                            <p className="text-xs text-[#1A1A1A]/60 mt-1">Se usará el email de tu cuenta: {userEmail || storeInfo.email}</p>
                        </div>

                        <div>
                            <p className="mb-2">Teléfono de Contacto <span className="text-[#1A1A1A]/40 text-sm">(Opcional)</span></p>
                            <input 
                                name="contact" 
                                onChange={onChangeHandler} 
                                value={storeInfo.contact} 
                                type="text" 
                                placeholder="+52 55 1234 5678" 
                                className="border border-[#00C6A2]/20 focus:border-[#00C6A2] focus:ring-2 focus:ring-[#00C6A2]/20 outline-none w-full max-w-lg p-3 rounded-xl transition-all" 
                            />
                        </div>

                        <div>
                            <p className="mb-2">Dirección <span className="text-[#1A1A1A]/40 text-sm">(Opcional)</span></p>
                            <textarea 
                                name="address" 
                                onChange={onChangeHandler} 
                                value={storeInfo.address} 
                                rows={3} 
                                placeholder="Dirección completa de tu tienda" 
                                className="border border-[#00C6A2]/20 focus:border-[#00C6A2] focus:ring-2 focus:ring-[#00C6A2]/20 outline-none w-full max-w-lg p-3 rounded-xl resize-none transition-all" 
                            />
                        </div>

                        <button 
                            type="submit"
                            disabled={submitting}
                            className="bg-[#00C6A2] hover:bg-[#00B894] text-white px-12 py-3 rounded-full mt-10 mb-40 active:scale-95 transition-all font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? 'Registrando...' : 'Registrar Tienda'}
                        </button>
                    </form>
                </div>
            ) : (
                <div className="min-h-[80vh] flex flex-col items-center justify-center">
                    <p className="sm:text-2xl lg:text-3xl mx-5 font-semibold text-slate-500 text-center max-w-2xl">{message}</p>
                    {status === "approved" && (
                        <button
                            onClick={() => router.push('/store')}
                            className="mt-5 px-6 py-3 bg-[#00C6A2] hover:bg-[#00B894] text-white rounded-full font-semibold transition-all"
                        >
                            Ir al Dashboard
                        </button>
                    )}
                </div>
            )}
        </>
    ) : (<Loading />)
}