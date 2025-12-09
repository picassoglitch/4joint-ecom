'use client'
import { assets } from "@/assets/assets"
import Image from "next/image"
import { useState, useRef, useEffect } from "react"
import { toast } from "react-hot-toast"
import { uploadImage } from "@/lib/supabase/storage"
import { Upload, Plus, X } from "lucide-react"
import { getCurrentUser } from "@/lib/supabase/auth"
import { useRouter } from "next/navigation"

export default function StoreAddProduct() {
    const router = useRouter()
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [checkingAuth, setCheckingAuth] = useState(true)
    const [currentUser, setCurrentUser] = useState(null)

    const categories = ['Extractos', 'Flores', 'Otra (especificar)']

    const [imageUrls, setImageUrls] = useState({ 1: '', 2: '', 3: '', 4: '' })
    const [uploading, setUploading] = useState({ 1: false, 2: false, 3: false, 4: false })
    const fileInputRefs = {
        1: useRef(null),
        2: useRef(null),
        3: useRef(null),
        4: useRef(null),
    }
    const [productInfo, setProductInfo] = useState({
        name: "",
        description: "",
        mrp: 0,
        price: 0,
        category: "",
        customCategory: "",
    })
    const [variants, setVariants] = useState([])
    const [useVariants, setUseVariants] = useState(false)
    const [loading, setLoading] = useState(false)
    const [showCustomCategory, setShowCustomCategory] = useState(false)

    // Check authentication on mount
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const { user } = await getCurrentUser()
                if (user) {
                    setIsAuthenticated(true)
                    setCurrentUser(user) // Store user for later use
                } else {
                    toast.error('Debes iniciar sesión para agregar productos')
                    router.push('/')
                }
            } catch (error) {
                console.error('Error checking auth:', error)
                toast.error('Error al verificar autenticación')
                router.push('/')
            } finally {
                setCheckingAuth(false)
            }
        }
        checkAuth()
    }, [router])

    const handleImageSelect = async (e, imageKey) => {
        // Verify authentication before uploading
        if (!isAuthenticated) {
            toast.error('Debes iniciar sesión para subir imágenes')
            return
        }
        const file = e.target.files?.[0]
        if (!file) return

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.error('Por favor selecciona un archivo de imagen')
            return
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error('La imagen debe ser menor a 5MB')
            return
        }

        setUploading({ ...uploading, [imageKey]: true })

        try {
            const url = await uploadImage(file, 'products')
            setImageUrls({ ...imageUrls, [imageKey]: url })
            toast.success('Imagen subida exitosamente')
        } catch (error) {
            console.error('Error uploading image:', error)
            const errorMessage = error.message || 'Error al subir la imagen. Intenta de nuevo.'
            toast.error(errorMessage)
            
            // If authentication error, redirect to login
            if (errorMessage.includes('iniciar sesión') || errorMessage.includes('autenticado')) {
                router.push('/')
            }
        } finally {
            setUploading({ ...uploading, [imageKey]: false })
        }
    }

    const removeImage = (imageKey) => {
        setImageUrls({ ...imageUrls, [imageKey]: '' })
        if (fileInputRefs[imageKey].current) {
            fileInputRefs[imageKey].current.value = ''
        }
    }

    const onChangeHandler = (e) => {
        setProductInfo({ ...productInfo, [e.target.name]: e.target.value })
    }

    const addVariant = () => {
        setVariants([...variants, { name: '', price: 0, mrp: 0 }])
    }

    const removeVariant = (index) => {
        setVariants(variants.filter((_, i) => i !== index))
    }

    const updateVariant = (index, field, value) => {
        const updatedVariants = [...variants]
        updatedVariants[index] = { ...updatedVariants[index], [field]: value }
        setVariants(updatedVariants)
    }

    const onSubmitHandler = async (e) => {
        e.preventDefault()
        setLoading(true)

        try {
            const productImages = Object.values(imageUrls).filter(url => url !== '')
            if (productImages.length === 0) {
                toast.error('Por favor sube al menos una imagen')
                setLoading(false)
                return
            }

            // Import createProduct from database
            const { createProduct } = await import('@/lib/supabase/database')
            
            // Use custom category if "Otra (especificar)" is selected
            const finalCategory = productInfo.category === 'Otra (especificar)' 
                ? productInfo.customCategory.trim() 
                : productInfo.category

            if (!finalCategory) {
                toast.error('Por favor selecciona o especifica una categoría')
                setLoading(false)
                return
            }

            // Validate variants if using them
            if (useVariants) {
                if (variants.length === 0) {
                    toast.error('Por favor agrega al menos una opción de cantidad/precio')
                    setLoading(false)
                    return
                }
                const validVariants = variants.filter(v => v.name.trim() && v.price > 0)
                if (validVariants.length === 0) {
                    toast.error('Por favor completa todas las opciones con nombre y precio válidos')
                    setLoading(false)
                    return
                }
            } else {
                if (!productInfo.price || productInfo.price <= 0) {
                    toast.error('Por favor ingresa un precio válido')
                    setLoading(false)
                    return
                }
            }

            // Prepare variants if using variants, otherwise use single price
            const productVariants = useVariants && variants.length > 0 
                ? variants.map(v => ({
                    name: v.name.trim(),
                    price: parseFloat(v.price) || 0,
                    mrp: parseFloat(v.mrp) || parseFloat(v.price) || 0,
                })).filter(v => v.name && v.price > 0)
                : []

            // Calculate price and mrp
            let finalPrice, finalMrp;
            if (useVariants && productVariants.length > 0) {
                finalPrice = Math.min(...productVariants.map(v => v.price));
                finalMrp = Math.max(...productVariants.map(v => v.mrp || v.price));
            } else {
                finalPrice = parseFloat(productInfo.price);
                finalMrp = parseFloat(productInfo.mrp) || finalPrice;
            }

            // Validate price
            if (!finalPrice || finalPrice <= 0 || isNaN(finalPrice)) {
                toast.error('Por favor ingresa un precio válido');
                setLoading(false);
                return;
            }

            const productData = {
                name: productInfo.name.trim(),
                description: productInfo.description.trim() || '',
                price: finalPrice,
                mrp: finalMrp || finalPrice,
                category: finalCategory,
                images: productImages.length > 0 ? productImages : [], // Ensure it's an array
                in_stock: true,
                variants: productVariants.length > 0 ? productVariants : [], // Use empty array instead of null
            }

            // Validate required fields
            if (!productData.name || productData.name.trim() === '') {
                toast.error('El nombre del producto es requerido');
                setLoading(false);
                return;
            }

            if (!productData.images || productData.images.length === 0) {
                toast.error('Por favor sube al menos una imagen');
                setLoading(false);
                return;
            }

            console.log('Creating product with data:', productData)
            // Pass current user ID if available to avoid session issues
            await createProduct(productData, currentUser?.id)
            toast.success('Producto agregado exitosamente')
            
            // Reset form
            setProductInfo({
                name: "",
                description: "",
                mrp: 0,
                price: 0,
                category: "",
                customCategory: "",
            })
            setImageUrls({ 1: '', 2: '', 3: '', 4: '' })
            setShowCustomCategory(false)
            setVariants([])
            setUseVariants(false)
        } catch (error) {
            console.error('Error creating product:', error)
            // Better error message
            let errorMessage = 'Error al agregar el producto. Intenta de nuevo.'
            
            if (error?.message) {
                errorMessage = error.message
            } else if (error?.error_description) {
                errorMessage = error.error_description
            } else if (typeof error === 'string') {
                errorMessage = error
            } else if (error?.code) {
                errorMessage = `Error ${error.code}: ${error.message || 'Error desconocido'}`
            }
            
            toast.error(errorMessage)
        } finally {
            setLoading(false)
        }
    }

    if (checkingAuth) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00C6A2]"></div>
            </div>
        )
    }

    if (!isAuthenticated) {
        return null // Will redirect
    }

    return (
        <form onSubmit={e => toast.promise(onSubmitHandler(e), { loading: "Agregando producto...", success: "Producto agregado", error: "Error al agregar" })} className="text-[#1A1A1A]/70 mb-28">
            <h1 className="text-2xl">Agregar Nuevo <span className="text-[#1A1A1A] font-bold">Producto</span></h1>
            <p className="mt-7 text-[#1A1A1A]/80 font-medium">Imágenes del Producto</p>

            <div className="flex gap-3 mt-4 flex-wrap">
                {[1, 2, 3, 4].map((key) => (
                    <div key={key} className="relative">
                        <input
                            ref={fileInputRefs[key]}
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageSelect(e, key)}
                            className="hidden"
                            id={`image-upload-${key}`}
                        />
                        <label
                            htmlFor={`image-upload-${key}`}
                            className="relative block cursor-pointer group"
                        >
                            {imageUrls[key] ? (
                                <div className="relative">
                                    <Image 
                                        width={150} 
                                        height={150} 
                                        className='h-32 w-32 object-cover border-2 border-[#00C6A2]/30 rounded-2xl transition-all bg-white/50' 
                                        src={imageUrls[key]} 
                                        alt={`Producto imagen ${key}`}
                                    />
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault()
                                            removeImage(key)
                                        }}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                                    >
                                        ×
                                    </button>
                                </div>
                            ) : (
                                <div className="h-32 w-32 border-2 border-dashed border-[#00C6A2]/30 rounded-2xl cursor-pointer hover:border-[#00C6A2] transition-all bg-white/50 flex flex-col items-center justify-center group-hover:bg-[#00C6A2]/5">
                                    {uploading[key] ? (
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00C6A2]"></div>
                                    ) : (
                                        <>
                                            <Upload size={24} className="text-[#00C6A2]/60 mb-2" />
                                            <span className="text-xs text-[#1A1A1A]/60">Subir</span>
                                        </>
                                    )}
                                </div>
                            )}
                        </label>
                    </div>
                ))}
            </div>

            <label htmlFor="" className="flex flex-col gap-2 my-6 ">
                <span className="text-[#1A1A1A]/80 font-medium">Nombre</span>
                <input type="text" name="name" onChange={onChangeHandler} value={productInfo.name} placeholder="Ingresa el nombre del producto" className="w-full max-w-sm p-3 px-4 outline-none border border-[#00C6A2]/20 rounded-xl focus:border-[#00C6A2] focus:ring-2 focus:ring-[#00C6A2]/20 transition-all" required />
            </label>

            <label htmlFor="" className="flex flex-col gap-2 my-6 ">
                <span className="text-[#1A1A1A]/80 font-medium">Descripción</span>
                <textarea name="description" onChange={onChangeHandler} value={productInfo.description} placeholder="Ingresa la descripción del producto" rows={5} className="w-full max-w-sm p-3 px-4 outline-none border border-[#00C6A2]/20 rounded-xl focus:border-[#00C6A2] focus:ring-2 focus:ring-[#00C6A2]/20 resize-none transition-all" required />
            </label>

            {/* Price Options */}
            <div className="my-6">
                <div className="flex items-center gap-3 mb-4">
                    <input
                        type="checkbox"
                        id="useVariants"
                        checked={useVariants}
                        onChange={(e) => setUseVariants(e.target.checked)}
                        className="w-4 h-4 accent-[#00C6A2]"
                    />
                    <label htmlFor="useVariants" className="text-[#1A1A1A]/80 font-medium cursor-pointer">
                        Usar opciones de cantidad/precio (ej: 1g, Media oz, Una oz)
                    </label>
                </div>

                {useVariants ? (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={addVariant}
                                className="flex items-center gap-2 px-4 py-2 bg-[#00C6A2] hover:bg-[#00B894] text-white rounded-full text-sm font-medium transition-all"
                            >
                                <Plus size={16} />
                                Agregar Opción
                            </button>
                        </div>
                        {variants.map((variant, index) => (
                            <div key={index} className="flex gap-3 items-end p-4 bg-white/50 border border-[#00C6A2]/20 rounded-xl">
                                <div className="flex-1">
                                    <label className="text-sm text-[#1A1A1A]/70 mb-1 block">Nombre de la opción</label>
                                    <input
                                        type="text"
                                        value={variant.name}
                                        onChange={(e) => updateVariant(index, 'name', e.target.value)}
                                        placeholder="Ej: 1g, Media oz, Una oz"
                                        className="w-full p-2 px-3 outline-none border border-[#00C6A2]/20 rounded-lg focus:border-[#00C6A2] focus:ring-2 focus:ring-[#00C6A2]/20 transition-all"
                                    />
                                </div>
                                <div className="w-32">
                                    <label className="text-sm text-[#1A1A1A]/70 mb-1 block">Precio</label>
                                    <input
                                        type="number"
                                        value={variant.price}
                                        onChange={(e) => updateVariant(index, 'price', e.target.value)}
                                        placeholder="0"
                                        className="w-full p-2 px-3 outline-none border border-[#00C6A2]/20 rounded-lg focus:border-[#00C6A2] focus:ring-2 focus:ring-[#00C6A2]/20 transition-all"
                                    />
                                </div>
                                <div className="w-32">
                                    <label className="text-sm text-[#1A1A1A]/70 mb-1 block">Precio Original</label>
                                    <input
                                        type="number"
                                        value={variant.mrp}
                                        onChange={(e) => updateVariant(index, 'mrp', e.target.value)}
                                        placeholder="0"
                                        className="w-full p-2 px-3 outline-none border border-[#00C6A2]/20 rounded-lg focus:border-[#00C6A2] focus:ring-2 focus:ring-[#00C6A2]/20 transition-all"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeVariant(index)}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        ))}
                        {variants.length === 0 && (
                            <p className="text-sm text-[#1A1A1A]/60 italic">Agrega al menos una opción de cantidad/precio</p>
                        )}
                    </div>
                ) : (
                    <div className="flex gap-5 flex-wrap">
                        <label htmlFor="" className="flex flex-col gap-2 ">
                            <span className="text-[#1A1A1A]/80 font-medium">Precio Original (MXN $)</span>
                            <input type="number" name="mrp" onChange={onChangeHandler} value={productInfo.mrp} placeholder="0" className="w-full max-w-48 p-3 px-4 outline-none border border-[#00C6A2]/20 rounded-xl focus:border-[#00C6A2] focus:ring-2 focus:ring-[#00C6A2]/20 transition-all" required={!useVariants} />
                        </label>
                        <label htmlFor="" className="flex flex-col gap-2 ">
                            <span className="text-[#1A1A1A]/80 font-medium">Precio de Oferta (MXN $)</span>
                            <input type="number" name="price" onChange={onChangeHandler} value={productInfo.price} placeholder="0" className="w-full max-w-48 p-3 px-4 outline-none border border-[#00C6A2]/20 rounded-xl focus:border-[#00C6A2] focus:ring-2 focus:ring-[#00C6A2]/20 transition-all" required={!useVariants} />
                        </label>
                    </div>
                )}
            </div>

            <label htmlFor="" className="flex flex-col gap-2 my-6">
                <span className="text-[#1A1A1A]/80 font-medium">Categoría</span>
                <select 
                    onChange={(e) => {
                        const selectedCategory = e.target.value
                        setProductInfo({ ...productInfo, category: selectedCategory, customCategory: '' })
                        setShowCustomCategory(selectedCategory === 'Otra (especificar)')
                    }} 
                    value={productInfo.category} 
                    className="w-full max-w-sm p-3 px-4 outline-none border border-[#00C6A2]/20 rounded-xl focus:border-[#00C6A2] focus:ring-2 focus:ring-[#00C6A2]/20 transition-all" 
                    required
                >
                    <option value="">Selecciona una categoría</option>
                    {categories.map((category) => (
                        <option key={category} value={category}>{category}</option>
                    ))}
                </select>
                {showCustomCategory && (
                    <input 
                        type="text" 
                        name="customCategory" 
                        onChange={onChangeHandler} 
                        value={productInfo.customCategory} 
                        placeholder="Ingresa el nombre de tu categoría" 
                        className="w-full max-w-sm p-3 px-4 mt-2 outline-none border border-[#00C6A2]/20 rounded-xl focus:border-[#00C6A2] focus:ring-2 focus:ring-[#00C6A2]/20 transition-all" 
                        required
                    />
                )}
            </label>

            <br />

            <button disabled={loading} className="bg-[#00C6A2] hover:bg-[#00B894] text-white px-8 mt-7 py-3 rounded-full font-semibold transition-all hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed">Agregar Producto</button>
        </form>
    )
}