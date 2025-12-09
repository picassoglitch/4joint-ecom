'use client'
import { assets } from "@/assets/assets"
import Image from "next/image"
import { useState, useRef, useEffect } from "react"
import { toast } from "react-hot-toast"
import { uploadImage } from "@/lib/supabase/storage"
import { Upload, Plus, X, Save } from "lucide-react"
import { getCurrentUser } from "@/lib/supabase/auth"
import { useRouter, useParams } from "next/navigation"
import { getProductById, updateProduct } from "@/lib/supabase/database"
import Loading from "@/components/Loading"

export default function StoreEditProduct() {
    const router = useRouter()
    const params = useParams()
    const productId = params.id

    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [checkingAuth, setCheckingAuth] = useState(true)
    const [currentUser, setCurrentUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

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
    const [showCustomCategory, setShowCustomCategory] = useState(false)

    // Check authentication and load product
    useEffect(() => {
        const checkAuthAndLoad = async () => {
            try {
                const { user } = await getCurrentUser()
                if (!user) {
                    toast.error('Debes iniciar sesión para editar productos')
                    router.push('/')
                    return
                }
                setIsAuthenticated(true)
                setCurrentUser(user)

                // Load product data
                const product = await getProductById(productId)
                if (!product) {
                    toast.error('Producto no encontrado')
                    router.push('/store/manage-product')
                    return
                }

                // Verify product belongs to current user
                if (product.vendor_id !== user.id) {
                    toast.error('No tienes permiso para editar este producto')
                    router.push('/store/manage-product')
                    return
                }

                // Populate form with product data
                setProductInfo({
                    name: product.name || "",
                    description: product.description || "",
                    mrp: product.mrp || 0,
                    price: product.price || 0,
                    category: product.category || "",
                    customCategory: product.category && !categories.includes(product.category) ? product.category : "",
                })

                // Set images
                if (product.images && product.images.length > 0) {
                    const imageMap = { 1: '', 2: '', 3: '', 4: '' }
                    product.images.slice(0, 4).forEach((img, idx) => {
                        imageMap[(idx + 1)] = img
                    })
                    setImageUrls(imageMap)
                }

                // Set variants
                if (product.variants && Array.isArray(product.variants) && product.variants.length > 0) {
                    setVariants(product.variants)
                    setUseVariants(true)
                }

                // Show custom category if needed
                if (product.category && !categories.includes(product.category)) {
                    setShowCustomCategory(true)
                }

            } catch (error) {
                console.error('Error loading product:', error)
                toast.error('Error al cargar el producto')
                router.push('/store/manage-product')
            } finally {
                setCheckingAuth(false)
                setLoading(false)
            }
        }
        checkAuthAndLoad()
    }, [productId, router])

    const handleImageSelect = async (e, imageKey) => {
        if (!isAuthenticated) {
            toast.error('Debes iniciar sesión para subir imágenes')
            return
        }
        const file = e.target.files?.[0]
        if (!file) return

        if (!file.type.startsWith('image/')) {
            toast.error('Por favor selecciona un archivo de imagen')
            return
        }

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
            toast.error(error.message || 'Error al subir la imagen')
            if (error.message?.includes('iniciar sesión')) {
                router.push('/')
            }
        } finally {
            setUploading({ ...uploading, [imageKey]: false })
        }
    }

    const removeImage = (imageKey) => {
        setImageUrls({ ...imageUrls, [imageKey]: '' })
    }

    const addVariant = () => {
        setVariants([...variants, { name: '', price: 0, mrp: 0 }])
    }

    const removeVariant = (index) => {
        setVariants(variants.filter((_, i) => i !== index))
    }

    const updateVariant = (index, field, value) => {
        const updated = [...variants]
        updated[index] = { ...updated[index], [field]: value }
        setVariants(updated)
    }

    const onSubmitHandler = async (e) => {
        e.preventDefault()
        setSaving(true)

        try {
            // Validation
            if (!productInfo.name.trim()) {
                toast.error('El nombre del producto es requerido')
                setSaving(false)
                return
            }

            if (!productInfo.category) {
                toast.error('La categoría es requerida')
                setSaving(false)
                return
            }

            // Get all image URLs
            const images = Object.values(imageUrls).filter(url => url.trim() !== '')

            if (images.length === 0) {
                toast.error('Por favor sube al menos una imagen')
                setSaving(false)
                return
            }

            // Determine final category
            const finalCategory = showCustomCategory && productInfo.customCategory
                ? productInfo.customCategory
                : productInfo.category

            // Prepare product data
            const productData = {
                name: productInfo.name.trim(),
                description: productInfo.description.trim(),
                category: finalCategory,
                images: images,
                in_stock: true,
            }

            // Handle variants
            if (useVariants && variants.length > 0) {
                // Validate variants
                const validVariants = variants.filter(v => v.name.trim() && v.price > 0)
                if (validVariants.length === 0) {
                    toast.error('Agrega al menos una variante válida')
                    setSaving(false)
                    return
                }

                productData.variants = validVariants.map(v => ({
                    name: v.name.trim(),
                    price: parseFloat(v.price),
                    mrp: parseFloat(v.mrp) || parseFloat(v.price),
                }))

                // Set price to minimum variant price
                const minPrice = Math.min(...productData.variants.map(v => v.price))
                productData.price = minPrice
                productData.mrp = Math.max(...productData.variants.map(v => v.mrp || v.price))
            } else {
                // No variants, use regular price
                if (!productInfo.price || productInfo.price <= 0) {
                    toast.error('El precio es requerido')
                    setSaving(false)
                    return
                }
                productData.price = parseFloat(productInfo.price)
                productData.mrp = parseFloat(productInfo.mrp) || parseFloat(productInfo.price)
                productData.variants = []
            }

            // Update product
            await updateProduct(productId, productData, currentUser?.id)
            toast.success('Producto actualizado exitosamente')
            router.push('/store/manage-product')
        } catch (error) {
            console.error('Error updating product:', error)
            toast.error(error.message || 'Error al actualizar el producto')
        } finally {
            setSaving(false)
        }
    }

    if (checkingAuth || loading) return <Loading />

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl text-slate-500 mb-5">Editar <span className="text-slate-800 font-medium">Producto</span></h1>
            
            <form onSubmit={onSubmitHandler} className="space-y-6">
                {/* Images */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Imágenes del Producto *</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map((key) => (
                            <div key={key} className="relative">
                                {imageUrls[key] ? (
                                    <div className="relative group">
                                        <Image
                                            src={imageUrls[key]}
                                            alt={`Imagen ${key}`}
                                            width={200}
                                            height={200}
                                            className="w-full h-32 object-cover rounded-lg border-2 border-slate-200"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeImage(key)}
                                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ) : (
                                    <div
                                        onClick={() => fileInputRefs[key].current?.click()}
                                        className="w-full h-32 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-[#00C6A2] transition-colors"
                                    >
                                        {uploading[key] ? (
                                            <span className="text-sm text-slate-400">Subiendo...</span>
                                        ) : (
                                            <Upload size={24} className="text-slate-400" />
                                        )}
                                    </div>
                                )}
                                <input
                                    ref={fileInputRefs[key]}
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleImageSelect(e, key)}
                                    className="hidden"
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Product Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Nombre del Producto *</label>
                        <input
                            type="text"
                            name="name"
                            value={productInfo.name}
                            onChange={(e) => setProductInfo({ ...productInfo, [e.target.name]: e.target.value })}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00C6A2] focus:border-transparent"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Categoría *</label>
                        <select
                            value={productInfo.category}
                            onChange={(e) => {
                                const selectedCategory = e.target.value
                                if (selectedCategory === 'Otra (especificar)') {
                                    setShowCustomCategory(true)
                                    setProductInfo({ ...productInfo, category: '', customCategory: '' })
                                } else {
                                    setShowCustomCategory(false)
                                    setProductInfo({ ...productInfo, category: selectedCategory, customCategory: '' })
                                }
                            }}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00C6A2] focus:border-transparent"
                            required
                        >
                            <option value="">Selecciona una categoría</option>
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    {showCustomCategory && (
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-2">Especifica la categoría *</label>
                            <input
                                type="text"
                                value={productInfo.customCategory}
                                onChange={(e) => setProductInfo({ ...productInfo, customCategory: e.target.value })}
                                placeholder="Ej: Vaporizadores, Accesorios, etc."
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00C6A2] focus:border-transparent"
                                required={showCustomCategory}
                            />
                        </div>
                    )}

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-2">Descripción</label>
                        <textarea
                            name="description"
                            value={productInfo.description}
                            onChange={(e) => setProductInfo({ ...productInfo, [e.target.name]: e.target.value })}
                            rows={4}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00C6A2] focus:border-transparent"
                        />
                    </div>
                </div>

                {/* Variants */}
                <div>
                    <label className="flex items-center gap-2 mb-2">
                        <input
                            type="checkbox"
                            checked={useVariants}
                            onChange={(e) => setUseVariants(e.target.checked)}
                            className="rounded"
                        />
                        <span className="text-sm font-medium text-slate-700">Usar variantes de precio/cantidad</span>
                    </label>

                    {useVariants ? (
                        <div className="space-y-3 mt-3">
                            {variants.map((variant, index) => (
                                <div key={index} className="flex gap-2 items-end">
                                    <div className="flex-1">
                                        <label className="block text-xs text-slate-600 mb-1">Nombre (ej: 1g, Media oz)</label>
                                        <input
                                            type="text"
                                            value={variant.name}
                                            onChange={(e) => updateVariant(index, 'name', e.target.value)}
                                            placeholder="Ej: 1g"
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-xs text-slate-600 mb-1">Precio (MXN)</label>
                                        <input
                                            type="number"
                                            value={variant.price}
                                            onChange={(e) => updateVariant(index, 'price', e.target.value)}
                                            min="0"
                                            step="0.01"
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-xs text-slate-600 mb-1">Precio Original (MXN)</label>
                                        <input
                                            type="number"
                                            value={variant.mrp}
                                            onChange={(e) => updateVariant(index, 'mrp', e.target.value)}
                                            min="0"
                                            step="0.01"
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeVariant(index)}
                                        className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={addVariant}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
                            >
                                <Plus size={16} />
                                Agregar Variante
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-4 mt-3">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Precio (MXN) *</label>
                                <input
                                    type="number"
                                    name="price"
                                    value={productInfo.price}
                                    onChange={(e) => setProductInfo({ ...productInfo, [e.target.name]: parseFloat(e.target.value) || 0 })}
                                    min="0"
                                    step="0.01"
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00C6A2] focus:border-transparent"
                                    required={!useVariants}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Precio Original (MXN)</label>
                                <input
                                    type="number"
                                    name="mrp"
                                    value={productInfo.mrp}
                                    onChange={(e) => setProductInfo({ ...productInfo, [e.target.name]: parseFloat(e.target.value) || 0 })}
                                    min="0"
                                    step="0.01"
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00C6A2] focus:border-transparent"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Submit */}
                <div className="flex gap-4">
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-3 bg-[#00C6A2] text-white rounded-lg hover:bg-[#00B894] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Save size={20} />
                        {saving ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                    <button
                        type="button"
                        onClick={() => router.push('/store/manage-product')}
                        className="px-6 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
                    >
                        Cancelar
                    </button>
                </div>
            </form>
        </div>
    )
}

