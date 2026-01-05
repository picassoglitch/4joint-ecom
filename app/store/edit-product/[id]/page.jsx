'use client'
import { assets } from "@/assets/assets"
import Image from "next/image"
import { useState, useRef, useEffect } from "react"
import { toast } from "react-hot-toast"
import { uploadImage } from "@/lib/supabase/storage"
import { getImageBlobUrl, revokeBlobUrl } from "@/lib/utils/imageLoader"
import { Upload, Plus, X, Save } from "lucide-react"
import { getCurrentUser } from "@/lib/supabase/auth"
import { useRouter, useParams } from "next/navigation"
import { getProductById, updateProduct } from "@/lib/supabase/database"
import Loading from "@/components/Loading"
import ImageEditor from "@/components/store/ImageEditor"

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
    const [imageBlobUrls, setImageBlobUrls] = useState({ 1: '', 2: '', 3: '', 4: '' }) // Blob URLs for images with incorrect Content-Type
    const [imageErrors, setImageErrors] = useState({ 1: false, 2: false, 3: false, 4: false })
    const [uploading, setUploading] = useState({ 1: false, 2: false, 3: false, 4: false })
    
    // FIX: Reset error when imageUrl changes (new upload)
    useEffect(() => {
        Object.keys(imageUrls).forEach(key => {
            const url = imageUrls[key]
            if (url && typeof url === 'string' && url.trim() !== '') {
                // Reset error when URL exists
                setImageErrors(prev => {
                    if (prev[key]) {
                        return { ...prev, [key]: false }
                    }
                    return prev
                })
            }
        })
    }, [imageUrls])
    const [editorOpen, setEditorOpen] = useState(false)
    const [editorFile, setEditorFile] = useState(null)
    const [editorImageKey, setEditorImageKey] = useState(null)
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

                // Set images - normalize URLs from DB
                // Ensure we store full Supabase URLs for proper retrieval
                if (product.images && product.images.length > 0) {
                    const imageMap = { 1: '', 2: '', 3: '', 4: '' }
                    product.images.slice(0, 4).forEach((img, idx) => {
                        if (img && typeof img === 'string' && img.trim() !== '') {
                            // If it's already a full URL, use it as-is
                            if (img.startsWith('http://') || img.startsWith('https://')) {
                                imageMap[(idx + 1)] = img
                            } else {
                                // Build full Supabase URL
                                const SUPABASE_BASE = 'https://yqttcfpeebdycpyjmnrv.supabase.co/storage/v1/object/public/product-images/'
                                const cleanPath = img.startsWith('/') ? img.slice(1) : img
                                imageMap[(idx + 1)] = `${SUPABASE_BASE}${cleanPath}`
                            }
                        }
                    })
                    setImageUrls(imageMap)
                    setImageErrors({ 1: false, 2: false, 3: false, 4: false })
                    
                    // Convert images to blob URLs if they have incorrect Content-Type
                    // This allows images with application/json to display correctly
                    const blobUrlMap = { 1: '', 2: '', 3: '', 4: '' }
                    const blobPromises = Object.entries(imageMap).map(async ([key, url]) => {
                        if (url) {
                            try {
                                const blobUrl = await getImageBlobUrl(url)
                                if (blobUrl && blobUrl.startsWith('blob:')) {
                                    blobUrlMap[key] = blobUrl
                                }
                            } catch (error) {
                                console.error(`Error creating blob URL for image ${key}:`, error)
                            }
                        }
                    })
                    await Promise.all(blobPromises)
                    setImageBlobUrls(blobUrlMap)
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

        // Validate file size (max 10MB - increased for editing)
        if (file.size > 10 * 1024 * 1024) {
            toast.error('La imagen debe ser menor a 10MB')
            return
        }

        // Open image editor instead of uploading directly
        setEditorFile(file)
        setEditorImageKey(imageKey)
        setEditorOpen(true)
        
        // Reset file input
        if (fileInputRefs[imageKey].current) {
            fileInputRefs[imageKey].current.value = ''
        }
    }

    const handleEditorSave = async (croppedFile) => {
        if (!editorImageKey || !croppedFile) return

        const imageKey = editorImageKey
        setUploading(prev => ({ ...prev, [imageKey]: true }))
        setImageErrors(prev => ({ ...prev, [imageKey]: false }))

        try {
            // Verify file type before upload
            if (process.env.NODE_ENV !== 'production') {
                console.log('File before upload:', {
                    name: croppedFile.name,
                    type: croppedFile.type,
                    size: croppedFile.size,
                    isFile: croppedFile instanceof File,
                    isBlob: croppedFile instanceof Blob
                })
            }
            
            // CRITICAL: Ensure file has correct MIME type
            // Read as ArrayBuffer and recreate to guarantee correct type
            if (!croppedFile.type || !croppedFile.type.startsWith('image/')) {
                console.error('Invalid file type detected:', croppedFile.type)
                // Read file as ArrayBuffer
                const arrayBuffer = await croppedFile.arrayBuffer()
                // Create new File with explicit JPEG type
                const fixedFile = new File([arrayBuffer], croppedFile.name.replace(/\.[^/.]+$/, '') + '.jpg', {
                    type: 'image/jpeg',
                    lastModified: croppedFile.lastModified || Date.now()
                })
                console.log('Fixed file type:', {
                    oldType: croppedFile.type,
                    newType: fixedFile.type,
                    newName: fixedFile.name
                })
                croppedFile = fixedFile
            } else if (croppedFile.type !== 'image/jpeg') {
                // Even if it's an image, ensure it's JPEG
                console.warn('File type is image but not JPEG:', croppedFile.type)
                const arrayBuffer = await croppedFile.arrayBuffer()
                const fixedFile = new File([arrayBuffer], croppedFile.name.replace(/\.[^/.]+$/, '') + '.jpg', {
                    type: 'image/jpeg',
                    lastModified: croppedFile.lastModified || Date.now()
                })
                croppedFile = fixedFile
            }
            
            // Final verification
            if (croppedFile.type !== 'image/jpeg') {
                throw new Error(`File type is still incorrect after fix: ${croppedFile.type}`)
            }
            
            // Upload image and get public URL
            const url = await uploadImage(croppedFile, 'products')
            
            if (!url || typeof url !== 'string' || !url.startsWith('http')) {
                throw new Error('URL de imagen inválida')
            }
            
            // FIX: Update state immediately with the full public URL
            // Use functional update to ensure we get the latest state
            setImageUrls(prev => {
                const updated = { ...prev, [imageKey]: url }
                // Log for debugging
                if (process.env.NODE_ENV !== 'production') {
                    console.log('Image URL state updated:', {
                        key: imageKey,
                        url: url,
                        allUrls: updated
                    })
                }
                return updated
            })
            
            // Create blob URL for the new image to ensure correct Content-Type
            try {
                const blobUrl = await getImageBlobUrl(url)
                if (blobUrl && blobUrl.startsWith('blob:')) {
                    setImageBlobUrls(prev => ({ ...prev, [imageKey]: blobUrl }))
                }
            } catch (error) {
                console.error('Error creating blob URL for new image:', error)
            }
            
            // FIX: Reset error state when new URL is set
            setImageErrors(prev => ({ ...prev, [imageKey]: false }))
            
            toast.success('Imagen subida exitosamente')
        } catch (error) {
            console.error('Error uploading image:', error)
            toast.error(error.message || 'Error al subir la imagen')
            setImageErrors(prev => ({ ...prev, [imageKey]: true }))
        } finally {
            setUploading(prev => ({ ...prev, [imageKey]: false }))
        }
    }

    const handleEditorClose = () => {
        setEditorOpen(false)
        setEditorFile(null)
        setEditorImageKey(null)
    }

    const removeImage = (imageKey) => {
        // Clean up blob URL if it exists
        const blobUrl = imageBlobUrls[imageKey]
        if (blobUrl) {
            revokeBlobUrl(blobUrl)
        }
        
        setImageUrls(prev => ({ ...prev, [imageKey]: '' }))
        setImageBlobUrls(prev => ({ ...prev, [imageKey]: '' }))
        setImageErrors(prev => ({ ...prev, [imageKey]: false }))
    }
    
    // Cleanup blob URLs on unmount
    useEffect(() => {
        return () => {
            // Clean up all blob URLs when component unmounts
            setImageBlobUrls(prev => {
                Object.values(prev).forEach(blobUrl => {
                    if (blobUrl) {
                        revokeBlobUrl(blobUrl)
                    }
                })
                return prev
            })
        }
    }, [])
    
    // Cleanup blob URLs on unmount
    useEffect(() => {
        return () => {
            Object.values(imageBlobUrls).forEach(blobUrl => {
                if (blobUrl) {
                    revokeBlobUrl(blobUrl)
                }
            })
        }
    }, [])

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

            // Get all image URLs - ensure they're full Supabase URLs
            // These should already be full URLs from uploadImage, but normalize to be safe
            // Get all image URLs - only keep full HTTP URLs
            const images = Object.values(imageUrls)
                .filter(url => url && typeof url === 'string' && url.trim() !== '')
                .map(url => url.trim())
                .filter(url => {
                    // Validate URL format
                    if (!url.startsWith('http://') && !url.startsWith('https://')) {
                        if (process.env.NODE_ENV !== 'production') {
                            console.warn('Invalid image URL format (not HTTP):', url)
                        }
                        return false
                    }
                    // Ensure URL is complete (at least 50 chars for a valid Supabase URL)
                    if (url.length < 50) {
                        if (process.env.NODE_ENV !== 'production') {
                            console.warn('Image URL seems truncated (too short):', url)
                        }
                        return false
                    }
                    return true
                })

            if (images.length === 0) {
                toast.error('Por favor sube al menos una imagen válida')
                setSaving(false)
                return
            }

            // Log images in development to verify they're complete
            if (process.env.NODE_ENV !== 'production') {
                console.log('Saving product with images:', images.map((img, idx) => ({
                    index: idx + 1,
                    url: img,
                    length: img.length,
                    isValid: img.startsWith('https://') && img.length > 50
                })))
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
        <>
            <ImageEditor
                isOpen={editorOpen}
                imageFile={editorFile}
                onSave={handleEditorSave}
                onClose={handleEditorClose}
            />
            <div className="max-w-4xl mx-auto">
                <h1 className="text-2xl text-slate-500 mb-5">Editar <span className="text-slate-800 font-medium">Producto</span></h1>
                
                <form onSubmit={onSubmitHandler} className="space-y-6">
                {/* Images */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Imágenes del Producto *</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map((key) => {
                            // FIX: Get current image URL from state - ensure it's a string
                            const imageUrl = (imageUrls[key] && typeof imageUrls[key] === 'string') ? imageUrls[key].trim() : ''
                            const blobUrl = imageBlobUrls[key] || '' // Use blob URL if available (fixes Content-Type issues)
                            const displayUrl = blobUrl || imageUrl // Prefer blob URL, fallback to original
                            const hasError = imageErrors[key] || false
                            const isUploading = uploading[key] || false
                            
                            // FIX: Show image container if we have a URL (regardless of hasError)
                            // Only show "Sin imagen" upload area if no URL at all
                            const hasImage = imageUrl !== ''
                            
                            return (
                                <div key={key} className="relative">
                                    {hasImage ? (
                                        <div className="relative group">
                                            {hasError ? (
                                                // Fallback: Use regular img tag if Next.js Image fails
                                                <img
                                                    src={displayUrl}
                                                    alt={`Imagen ${key}`}
                                                    className="w-full h-32 object-cover rounded-lg border-2 border-slate-200"
                                                    onLoad={() => {
                                                        // If regular img loads successfully, reset error
                                                        setImageErrors(prev => {
                                                            if (prev[key]) {
                                                                return { ...prev, [key]: false }
                                                            }
                                                            return prev
                                                        })
                                                    }}
                                                    onError={async (e) => {
                                                        // Even regular img failed - diagnose the issue
                                                        if (process.env.NODE_ENV !== 'production') {
                                                            console.error('❌ Both Next.js Image and regular img failed for:', imageUrl)
                                                            
                                                            // Try to fetch the full image to see what's wrong
                                                            try {
                                                                const response = await fetch(imageUrl, { 
                                                                    method: 'GET',
                                                                    mode: 'cors'
                                                                })
                                                                
                                                                console.error('Full image fetch test:', {
                                                                    status: response.status,
                                                                    statusText: response.statusText,
                                                                    ok: response.ok,
                                                                    headers: {
                                                                        'content-type': response.headers.get('content-type'),
                                                                        'content-length': response.headers.get('content-length'),
                                                                        'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
                                                                        'cache-control': response.headers.get('cache-control')
                                                                    }
                                                                })
                                                                
                                                                // Try to read as blob to see if it's actually an image
                                                                if (response.ok) {
                                                                    const blob = await response.blob()
                                                                    console.error('Image blob info:', {
                                                                        size: blob.size,
                                                                        type: blob.type,
                                                                        isImage: blob.type.startsWith('image/')
                                                                    })
                                                                    
                                                                    if (!blob.type.startsWith('image/')) {
                                                                        console.error('⚠️ WARNING: File is not an image! Content-Type:', blob.type)
                                                                    }
                                                                }
                                                            } catch (fetchError) {
                                                                console.error('Full image fetch error:', {
                                                                    message: fetchError.message,
                                                                    name: fetchError.name
                                                                })
                                                            }
                                                        }
                                                    }}
                                                />
                                            ) : (
                                                <Image
                                                    src={displayUrl}
                                                    alt={`Imagen ${key}`}
                                                    width={200}
                                                    height={200}
                                                    className="w-full h-32 object-cover rounded-lg border-2 border-slate-200"
                                                    unoptimized={true}
                                                    onLoad={() => {
                                                        // FIX: Reset error on successful load
                                                        setImageErrors(prev => {
                                                            if (prev[key]) {
                                                                return { ...prev, [key]: false }
                                                            }
                                                            return prev
                                                        })
                                                    }}
                                                    onError={async (e) => {
                                                    // FIX: Show error when image fails to load - no placeholder fallback
                                                    if (imageUrl && !hasError && e?.currentTarget) {
                                                        const currentSrc = e.currentTarget.src || ''
                                                        // Only set error if we're actually trying to load the imageUrl
                                                        if (currentSrc.includes(imageUrl) || currentSrc === imageUrl) {
                                                            setImageErrors(prev => ({ ...prev, [key]: true }))
                                                            
                                                            // Diagnose the issue in development
                                                            if (process.env.NODE_ENV !== 'production') {
                                                                const errorInfo = {
                                                                    slot: key,
                                                                    imageUrl: imageUrl || 'NO_URL',
                                                                    urlLength: imageUrl ? imageUrl.length : 0,
                                                                    currentSrc: currentSrc || 'NO_SRC',
                                                                    isCompleteUrl: imageUrl ? (imageUrl.startsWith('https://') && imageUrl.length > 50) : false,
                                                                    eventType: e?.type || 'unknown',
                                                                    targetSrc: e?.currentTarget?.src || 'NO_TARGET_SRC'
                                                                }
                                                                console.error('Image load error:', errorInfo)
                                                                console.error('Full error details:', {
                                                                    error: e,
                                                                    currentTarget: e?.currentTarget,
                                                                    target: e?.target
                                                                })
                                                                
                                                                // Try to fetch the image directly to diagnose the issue
                                                                try {
                                                                    const response = await fetch(imageUrl, { 
                                                                        method: 'HEAD',
                                                                        mode: 'cors'
                                                                    })
                                                                    if (response.ok) {
                                                                        console.warn('✅ Image is accessible (status 200) but Next.js Image failed. Using regular <img> tag as fallback.', {
                                                                            status: response.status,
                                                                            statusText: response.statusText,
                                                                            headers: {
                                                                                'content-type': response.headers.get('content-type'),
                                                                                'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
                                                                                'content-length': response.headers.get('content-length')
                                                                            }
                                                                        })
                                                                    } else {
                                                                        console.error('❌ Image fetch test failed:', {
                                                                            status: response.status,
                                                                            statusText: response.statusText,
                                                                            ok: response.ok,
                                                                            headers: {
                                                                                'content-type': response.headers.get('content-type'),
                                                                                'access-control-allow-origin': response.headers.get('access-control-allow-origin')
                                                                            }
                                                                        })
                                                                    }
                                                                } catch (fetchError) {
                                                                    console.error('Image fetch error:', {
                                                                        message: fetchError.message,
                                                                        name: fetchError.name,
                                                                        stack: fetchError.stack
                                                                    })
                                                                }
                                                            }
                                                            
                                                            // Show error toast with more details
                                                            toast.error(`Error al cargar imagen ${key}${imageUrl.length < 50 ? ' (URL parece truncada)' : ''}`)
                                                        }
                                                    }
                                                }}
                                                />
                                            )}
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
                                        onClick={() => !isUploading && fileInputRefs[key].current?.click()}
                                        className="w-full h-32 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-[#00C6A2] transition-colors"
                                    >
                                        {isUploading ? (
                                            <span className="text-sm text-slate-400">Subiendo...</span>
                                        ) : (
                                            <>
                                                <Upload size={24} className="text-slate-400" />
                                                <span className="text-xs text-slate-400 ml-2">Sin imagen</span>
                                            </>
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
                            )
                        })}
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
        </>
    )
}

