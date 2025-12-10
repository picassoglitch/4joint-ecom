'use client'
import { useEffect, useState } from "react"
import { format } from "date-fns"
import toast from "react-hot-toast"
import { DeleteIcon } from "lucide-react"
import { getVendors } from "@/lib/supabase/database"
import { getCurrentUser } from "@/lib/supabase/auth"
import { getProducts } from "@/lib/supabase/database"
import Loading from "@/components/Loading"

export default function AdminCoupons() {
    const [coupons, setCoupons] = useState([])
    const [loading, setLoading] = useState(true)
    const [vendors, setVendors] = useState([])
    const [products, setProducts] = useState([])
    const [submitting, setSubmitting] = useState(false)

    const [newCoupon, setNewCoupon] = useState({
        code: '',
        description: '',
        type: 'percentage',
        discount_value: '',
        min_purchase: '',
        max_discount: '',
        free_product_id: '',
        for_new_user: false,
        for_member: false,
        is_public: false,
        applicable_vendor_ids: [],
        max_uses: '',
        expires_at: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd') // 30 days from now
    })

    const couponTypes = [
        { value: 'percentage', label: 'Descuento por Porcentaje (%)' },
        { value: 'fixed_amount', label: 'Descuento por Monto Fijo ($)' },
        { value: 'free_shipping', label: 'Envío Gratis' },
        { value: 'free_product', label: 'Producto Gratis' },
        { value: 'gift', label: 'Regalo' }
    ]

    const fetchCoupons = async () => {
        try {
            const { supabase } = await import('@/lib/supabase/client')
            const { data: { session } } = await supabase.auth.getSession()
            
            if (!session) {
                toast.error('Debes estar autenticado')
                return
            }

            const response = await fetch('/api/admin/coupons', {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            })

            if (!response.ok) {
                const errorData = await response.json()
                const errorMessage = errorData.error || 'Error al cargar cupones'
                const hint = errorData.hint || ''
                
                // Show specific error message
                if (errorMessage.includes('no existe') || errorMessage.includes('does not exist')) {
                    toast.error(errorMessage + (hint ? `\n${hint}` : ''), { duration: 6000 })
                } else {
                    toast.error(errorMessage)
                }
                
                throw new Error(errorMessage)
            }

            const { data } = await response.json()
            setCoupons(data || [])
        } catch (error) {
            console.error('Error fetching coupons:', error)
            // Error toast already shown above
        } finally {
            setLoading(false)
        }
    }

    const fetchVendors = async () => {
        try {
            const vendorsList = await getVendors(true) // Get approved vendors
            setVendors(vendorsList || [])
        } catch (error) {
            console.error('Error fetching vendors:', error)
        }
    }

    const fetchProducts = async () => {
        try {
            const productsList = await getProducts({})
            setProducts(productsList || [])
        } catch (error) {
            console.error('Error fetching products:', error)
        }
    }

    const handleAddCoupon = async (e) => {
        e.preventDefault()
        setSubmitting(true)

        try {
            const { user } = await getCurrentUser()
            if (!user) {
                toast.error('Debes estar autenticado')
                return
            }

            const { supabase } = await import('@/lib/supabase/client')
            const { data: { session } } = await supabase.auth.getSession()
            
            if (!session) {
                toast.error('Sesión no encontrada')
                return
            }

            // Prepare coupon data
            // For free_shipping, discount_value should be 0
            const discountValue = newCoupon.type === 'free_shipping' 
                ? 0 
                : (newCoupon.discount_value && newCoupon.discount_value !== '') 
                    ? parseFloat(newCoupon.discount_value) 
                    : 0

            const couponData = {
                code: newCoupon.code,
                description: newCoupon.description,
                type: newCoupon.type,
                discount_value: discountValue,
                min_purchase: newCoupon.min_purchase ? parseFloat(newCoupon.min_purchase) : 0,
                max_discount: newCoupon.max_discount ? parseFloat(newCoupon.max_discount) : null,
                free_product_id: newCoupon.type === 'free_product' && newCoupon.free_product_id ? newCoupon.free_product_id : null,
                for_new_user: newCoupon.for_new_user,
                for_member: newCoupon.for_member,
                is_public: newCoupon.is_public,
                applicable_vendor_ids: newCoupon.applicable_vendor_ids.length > 0 ? newCoupon.applicable_vendor_ids : null,
                max_uses: newCoupon.max_uses ? parseInt(newCoupon.max_uses) : null,
                expires_at: newCoupon.expires_at
            }

            const response = await fetch('/api/admin/coupons', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify(couponData)
            })

            if (!response.ok) {
                const errorData = await response.json()
                const errorMessage = errorData.error || 'Error al crear el cupón'
                
                // Show specific error message
                if (errorMessage.includes('already exists') || errorMessage.includes('ya existe')) {
                    toast.error('Este código de cupón ya existe. Por favor usa otro código.', { duration: 4000 })
                } else {
                    toast.error(errorMessage)
                }
                
                throw new Error(errorMessage)
            }

            toast.success('Cupón creado exitosamente')
            
            // Reset form
            setNewCoupon({
                code: '',
                description: '',
                type: 'percentage',
                discount_value: '',
                min_purchase: '',
                max_discount: '',
                free_product_id: '',
                for_new_user: false,
                for_member: false,
                is_public: false,
                applicable_vendor_ids: [],
                max_uses: '',
                expires_at: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
            })

            // Refresh coupons list
            await fetchCoupons()
        } catch (error) {
            console.error('Error creating coupon:', error)
            toast.error(error.message || 'Error al crear el cupón')
            throw error
        } finally {
            setSubmitting(false)
        }
    }

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target
        setNewCoupon(prev => {
            const updated = {
                ...prev,
                [name]: type === 'checkbox' ? checked : value
            }
            // Clear discount_value when switching to free_shipping
            if (name === 'type' && value === 'free_shipping') {
                updated.discount_value = ''
            }
            // Clear free_product_id when switching away from free_product
            if (name === 'type' && value !== 'free_product') {
                updated.free_product_id = ''
            }
            return updated
        })
    }

    const handleVendorToggle = (vendorId) => {
        setNewCoupon(prev => {
            const currentIds = prev.applicable_vendor_ids || []
            const isSelected = currentIds.includes(vendorId)
            
            if (isSelected) {
                return {
                    ...prev,
                    applicable_vendor_ids: currentIds.filter(id => id !== vendorId)
                }
            } else {
                return {
                    ...prev,
                    applicable_vendor_ids: [...currentIds, vendorId]
                }
            }
        })
    }

    const deleteCoupon = async (code) => {
        try {
            const { user } = await getCurrentUser()
            if (!user) {
                toast.error('Debes estar autenticado')
                return
            }

            const { supabase } = await import('@/lib/supabase/client')
            const { data: { session } } = await supabase.auth.getSession()
            
            if (!session) {
                toast.error('Sesión no encontrada')
                return
            }

            const response = await fetch(`/api/admin/coupons/${code}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Error al eliminar el cupón')
            }

            toast.success('Cupón eliminado exitosamente')
            await fetchCoupons()
        } catch (error) {
            console.error('Error deleting coupon:', error)
            toast.error(error.message || 'Error al eliminar el cupón')
            throw error
        }
    }

    useEffect(() => {
        fetchCoupons()
        fetchVendors()
        fetchProducts()
    }, [])

    if (loading) {
        return <Loading />
    }

    const getDiscountDisplay = (coupon) => {
        switch (coupon.type) {
            case 'percentage':
                return `${coupon.discount_value}%`
            case 'fixed_amount':
                return `$${coupon.discount_value}`
            case 'free_shipping':
                return 'Envío Gratis'
            case 'free_product':
                return 'Producto Gratis'
            case 'gift':
                return 'Regalo'
            default:
                return coupon.discount_value
        }
    }

    return (
        <div className="text-slate-500 mb-40">
            {/* Add Coupon */}
            <form onSubmit={(e) => toast.promise(handleAddCoupon(e), { loading: "Creando cupón...", success: "Cupón creado", error: "Error al crear" })} className="max-w-4xl text-sm">
                <h2 className="text-2xl mb-6">Crear <span className="text-slate-800 font-medium">Cupón</span></h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Code */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Código del Cupón *</label>
                        <input 
                            type="text" 
                            placeholder="EJEMPLO20" 
                            className="w-full p-2 border border-slate-200 outline-slate-400 rounded-md"
                            name="code" 
                            value={newCoupon.code} 
                            onChange={handleChange} 
                            required
                        />
                    </div>

                    {/* Type */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Cupón *</label>
                        <select 
                            className="w-full p-2 border border-slate-200 outline-slate-400 rounded-md"
                            name="type" 
                            value={newCoupon.type} 
                            onChange={handleChange}
                            required
                        >
                            {couponTypes.map(type => (
                                <option key={type.value} value={type.value}>{type.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Discount Value */}
                    {newCoupon.type !== 'free_shipping' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                {newCoupon.type === 'percentage' ? 'Porcentaje de Descuento (%) *' : 
                                 newCoupon.type === 'fixed_amount' ? 'Monto de Descuento ($) *' : 
                                 'Valor *'}
                            </label>
                            <input 
                                type="number" 
                                step="0.01"
                                min="0"
                                placeholder={newCoupon.type === 'percentage' ? '20' : '50'} 
                                className="w-full p-2 border border-slate-200 outline-slate-400 rounded-md"
                                name="discount_value" 
                                value={newCoupon.discount_value} 
                                onChange={handleChange} 
                                required={newCoupon.type !== 'free_shipping'}
                            />
                        </div>
                    )}

                    {/* Free Product (only for free_product type) */}
                    {newCoupon.type === 'free_product' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Producto Gratis *</label>
                            <select 
                                className="w-full p-2 border border-slate-200 outline-slate-400 rounded-md"
                                name="free_product_id" 
                                value={newCoupon.free_product_id} 
                                onChange={handleChange}
                                required
                            >
                                <option value="">Seleccionar producto</option>
                                {products.map(product => (
                                    <option key={product.id} value={product.id}>{product.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Min Purchase */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Compra Mínima ($)</label>
                        <input 
                            type="number" 
                            step="0.01"
                            min="0"
                            placeholder="0" 
                            className="w-full p-2 border border-slate-200 outline-slate-400 rounded-md"
                            name="min_purchase" 
                            value={newCoupon.min_purchase} 
                            onChange={handleChange}
                        />
                    </div>

                    {/* Max Discount (only for percentage) */}
                    {newCoupon.type === 'percentage' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Descuento Máximo ($)</label>
                            <input 
                                type="number" 
                                step="0.01"
                                min="0"
                                placeholder="Sin límite" 
                                className="w-full p-2 border border-slate-200 outline-slate-400 rounded-md"
                                name="max_discount" 
                                value={newCoupon.max_discount} 
                                onChange={handleChange}
                            />
                        </div>
                    )}

                    {/* Max Uses */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Máximo de Usos</label>
                        <input 
                            type="number" 
                            min="1"
                            placeholder="Ilimitado" 
                            className="w-full p-2 border border-slate-200 outline-slate-400 rounded-md"
                            name="max_uses" 
                            value={newCoupon.max_uses} 
                            onChange={handleChange}
                        />
                    </div>

                    {/* Expires At */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de Expiración *</label>
                        <input 
                            type="date" 
                            className="w-full p-2 border border-slate-200 outline-slate-400 rounded-md"
                            name="expires_at" 
                            value={newCoupon.expires_at} 
                            onChange={handleChange}
                            required
                        />
                    </div>
                </div>

                {/* Description */}
                <div className="mt-4">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Descripción *</label>
                    <textarea 
                        placeholder="Descripción del cupón" 
                        className="w-full p-2 border border-slate-200 outline-slate-400 rounded-md"
                        name="description" 
                        value={newCoupon.description} 
                        onChange={handleChange} 
                        rows="3"
                        required
                    />
                </div>

                {/* Restrictions */}
                <div className="mt-5 space-y-3">
                    <h3 className="text-lg font-medium text-slate-800">Restricciones</h3>
                    
                    <div className="flex gap-2 items-center">
                        <label className="relative inline-flex items-center cursor-pointer text-gray-900 gap-3">
                            <input 
                                type="checkbox" 
                                className="sr-only peer"
                                name="for_new_user" 
                                checked={newCoupon.for_new_user}
                                onChange={handleChange}
                            />
                            <div className="w-11 h-6 bg-slate-300 rounded-full peer peer-checked:bg-green-600 transition-colors duration-200"></div>
                            <span className="dot absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ease-in-out peer-checked:translate-x-5"></span>
                        </label>
                        <p>Solo para Nuevos Usuarios</p>
                    </div>

                    <div className="flex gap-2 items-center">
                        <label className="relative inline-flex items-center cursor-pointer text-gray-900 gap-3">
                            <input 
                                type="checkbox" 
                                className="sr-only peer"
                                name="for_member" 
                                checked={newCoupon.for_member}
                                onChange={handleChange}
                            />
                            <div className="w-11 h-6 bg-slate-300 rounded-full peer peer-checked:bg-green-600 transition-colors duration-200"></div>
                            <span className="dot absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ease-in-out peer-checked:translate-x-5"></span>
                        </label>
                        <p>Solo para Miembros</p>
                    </div>

                    <div className="flex gap-2 items-center">
                        <label className="relative inline-flex items-center cursor-pointer text-gray-900 gap-3">
                            <input 
                                type="checkbox" 
                                className="sr-only peer"
                                name="is_public" 
                                checked={newCoupon.is_public}
                                onChange={handleChange}
                            />
                            <div className="w-11 h-6 bg-slate-300 rounded-full peer peer-checked:bg-green-600 transition-colors duration-200"></div>
                            <span className="dot absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ease-in-out peer-checked:translate-x-5"></span>
                        </label>
                        <p>Público (visible para todos)</p>
                    </div>
                </div>

                {/* Applicable Stores */}
                <div className="mt-5">
                    <h3 className="text-lg font-medium text-slate-800 mb-3">Tiendas Aplicables</h3>
                    <p className="text-xs text-slate-500 mb-3">Deja vacío para aplicar a todas las tiendas</p>
                    <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-md p-3 space-y-2">
                        {vendors.length === 0 ? (
                            <p className="text-sm text-slate-400">No hay tiendas disponibles</p>
                        ) : (
                            vendors.map((vendor) => (
                                <label key={vendor.id} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={newCoupon.applicable_vendor_ids.includes(vendor.id)}
                                        onChange={() => handleVendorToggle(vendor.id)}
                                        className="accent-[#00C6A2]"
                                    />
                                    <span className="text-sm">{vendor.name || vendor.email}</span>
                                </label>
                            ))
                        )}
                    </div>
                </div>

                <button 
                    type="submit"
                    disabled={submitting}
                    className="mt-6 p-2 px-10 rounded bg-slate-700 text-white active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {submitting ? 'Creando...' : 'Crear Cupón'}
                </button>
            </form>

            {/* List Coupons */}
            <div className="mt-14">
                <h2 className="text-2xl mb-4">Lista de <span className="text-slate-800 font-medium">Cupones</span></h2>
                <div className="overflow-x-auto mt-4 rounded-lg border border-slate-200 max-w-6xl">
                    <table className="min-w-full bg-white text-sm">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="py-3 px-4 text-left font-semibold text-slate-600">Código</th>
                                <th className="py-3 px-4 text-left font-semibold text-slate-600">Descripción</th>
                                <th className="py-3 px-4 text-left font-semibold text-slate-600">Tipo</th>
                                <th className="py-3 px-4 text-left font-semibold text-slate-600">Descuento</th>
                                <th className="py-3 px-4 text-left font-semibold text-slate-600">Expira</th>
                                <th className="py-3 px-4 text-left font-semibold text-slate-600">Usos</th>
                                <th className="py-3 px-4 text-left font-semibold text-slate-600">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {coupons.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="py-8 text-center text-slate-400">
                                        No hay cupones creados
                                    </td>
                                </tr>
                            ) : (
                                coupons.map((coupon) => (
                                    <tr key={coupon.code} className="hover:bg-slate-50">
                                        <td className="py-3 px-4 font-medium text-slate-800">{coupon.code}</td>
                                        <td className="py-3 px-4 text-slate-800">{coupon.description}</td>
                                        <td className="py-3 px-4 text-slate-800">
                                            {couponTypes.find(t => t.value === coupon.type)?.label || coupon.type}
                                        </td>
                                        <td className="py-3 px-4 text-slate-800">{getDiscountDisplay(coupon)}</td>
                                        <td className="py-3 px-4 text-slate-800">
                                            {format(new Date(coupon.expires_at), 'yyyy-MM-dd')}
                                        </td>
                                        <td className="py-3 px-4 text-slate-800">
                                            {coupon.used_count || 0} / {coupon.max_uses || '∞'}
                                        </td>
                                        <td className="py-3 px-4 text-slate-800">
                                            <DeleteIcon 
                                                onClick={() => toast.promise(deleteCoupon(coupon.code), { loading: "Eliminando cupón...", success: "Cupón eliminado", error: "Error al eliminar" })} 
                                                className="w-5 h-5 text-red-500 hover:text-red-800 cursor-pointer" 
                                            />
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
