'use client'
import { useEffect, useState } from "react"
import Loading from "@/components/Loading"
import { getOrders, getProducts, getVendorById } from "@/lib/supabase/database"
import { getCurrentUser } from "@/lib/supabase/auth"
import toast from "react-hot-toast"
import { useRouter, useParams } from "next/navigation"
import { Trash2, ArrowLeft, BarChart3, Package, DollarSign, ShoppingCart } from "lucide-react"
import { getSafeImageSource } from "@/lib/utils/image"

export default function AdminStoreDashboard() {
    const router = useRouter()
    const params = useParams()
    const storeId = params?.storeId

    const [loading, setLoading] = useState(true)
    const [storeInfo, setStoreInfo] = useState(null)
    const [orders, setOrders] = useState([])
    const [products, setProducts] = useState([])
    const [stats, setStats] = useState({
        totalOrders: 0,
        totalRevenue: 0,
        totalProducts: 0,
        totalEarnings: 0,
    })

    const currency = 'MXN $'

    const fetchStoreData = async () => {
        try {
            const { user } = await getCurrentUser()
            if (!user) {
                toast.error('Debes estar autenticado')
                router.push('/admin')
                return
            }

            // Verify user is admin
            const userRole = user.user_metadata?.role || 'user'
            if (userRole !== 'admin') {
                toast.error('No tienes permisos para acceder a esta página')
                router.push('/admin')
                return
            }

            if (!storeId) {
                toast.error('ID de tienda no válido')
                router.push('/admin/stores')
                return
            }

            // Fetch store info
            const vendor = await getVendorById(storeId)
            if (!vendor) {
                toast.error('Tienda no encontrada')
                router.push('/admin/stores')
                return
            }
            setStoreInfo(vendor)

            // Fetch orders for this store
            const storeOrders = await getOrders({ vendor_id: storeId })
            
            // Format orders for display
            const formattedOrders = await Promise.all(
                (storeOrders || []).map(async (order) => {
                    const { getOrderItems } = await import('@/lib/supabase/database')
                    const orderItems = await getOrderItems(order.id).catch(() => [])

                    return {
                        id: order.id,
                        total: parseFloat(order.total || 0),
                        status: order.status || 'ORDER_PLACED',
                        paymentMethod: order.payment_method || 'COD',
                        isPaid: order.is_paid || false,
                        createdAt: order.created_at,
                        user: order.user_id ? {
                            name: 'Usuario registrado',
                            email: order.guest_email || 'N/A',
                        } : {
                            name: order.guest_name || 'Cliente invitado',
                            email: order.guest_email || 'N/A',
                        },
                        address: order.guest_address || {
                            street: 'N/A',
                            city: 'N/A',
                            state: 'N/A',
                            zip: 'N/A',
                        },
                        orderItems: orderItems.map(item => ({
                            product: item.product || { name: 'Producto eliminado', images: [] },
                            quantity: item.quantity,
                            price: parseFloat(item.price || 0),
                        })),
                    }
                })
            )

            setOrders(formattedOrders)

            // Fetch products
            const storeProducts = await getProducts({ vendor_id: storeId })
            setProducts(storeProducts || [])

            // Calculate stats
            const totalRevenue = formattedOrders.reduce((sum, order) => sum + order.total, 0)
            const totalEarnings = totalRevenue * 0.85 // 85% for vendor (15% commission)

            setStats({
                totalOrders: formattedOrders.length,
                totalRevenue: totalRevenue,
                totalProducts: storeProducts?.length || 0,
                totalEarnings: totalEarnings,
            })
        } catch (error) {
            console.error('Error fetching store data:', error)
            toast.error('Error al cargar los datos de la tienda')
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteOrder = async (orderId) => {
        if (!confirm('¿Estás seguro de que deseas eliminar este pedido? Esta acción recalculará todas las estadísticas y no se puede deshacer.')) {
            return
        }

        try {
            const { user } = await getCurrentUser()
            if (!user) {
                toast.error('Debes estar autenticado')
                return
            }

            // Get session token using the configured Supabase client
            const { supabase } = await import('@/lib/supabase/client')
            const { data: { session }, error: sessionError } = await supabase.auth.getSession()
            
            if (sessionError) {
                console.error('Error getting session:', sessionError)
                toast.error('Error de autenticación. Por favor, inicia sesión nuevamente.')
                return
            }
            
            if (!session?.access_token) {
                toast.error('Error de autenticación. Por favor, inicia sesión nuevamente.')
                return
            }

            console.log('🗑️ Attempting to delete order:', orderId)
            
            const response = await fetch(`/api/orders/${orderId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json',
                },
            })

            const data = await response.json()
            console.log('🗑️ Delete response:', { status: response.status, ok: response.ok, data })

            if (!response.ok) {
                throw new Error(data.error || 'Error al eliminar el pedido')
            }

            console.log('✅ Order deleted successfully, updating UI...')
            
            // Remove order from local state immediately
            const updatedOrders = orders.filter(order => order.id !== orderId)
            setOrders(updatedOrders)
            
            // Recalculate stats immediately with updated orders
            const updatedRevenue = updatedOrders.reduce((sum, order) => sum + order.total, 0)
            const updatedEarnings = updatedRevenue * 0.85
            
            setStats({
                totalOrders: updatedOrders.length,
                totalRevenue: updatedRevenue,
                totalProducts: products.length,
                totalEarnings: updatedEarnings,
            })
            
            toast.success('Pedido eliminado correctamente')
            
            // Reload all data to ensure consistency (with a small delay to allow DB to update)
            setTimeout(async () => {
                console.log('🔄 Reloading store data after deletion...')
                await fetchStoreData()
            }, 500)
        } catch (error) {
            console.error('Error deleting order:', error)
            toast.error(error.message || 'Error al eliminar el pedido')
        }
    }

    useEffect(() => {
        if (storeId) {
            fetchStoreData()
        }
    }, [storeId])

    if (loading) return <Loading />

    if (!storeInfo) {
        return (
            <div className="text-center py-20">
                <p className="text-slate-500">Tienda no encontrada</p>
                <button
                    onClick={() => router.push('/admin/stores')}
                    className="mt-4 px-6 py-2 bg-[#00C6A2] text-white rounded-lg hover:bg-[#00B894]"
                >
                    Volver a Tiendas
                </button>
            </div>
        )
    }

    return (
        <div className="text-[#1A1A1A]/70 mb-28">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={() => router.push('/admin/stores')}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                    <ArrowLeft size={20} className="text-slate-600" />
                </button>
                <div>
                    <h1 className="text-2xl">
                        Dashboard de <span className="text-[#1A1A1A] font-bold">{storeInfo.name || 'Tienda'}</span>
                    </h1>
                    <p className="text-sm text-slate-500">{storeInfo.email}</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                <div className="flex items-center gap-6 border border-[#00C6A2]/20 bg-white/80 backdrop-blur-sm p-4 px-6 rounded-2xl shadow-sm">
                    <div className="flex flex-col gap-2 text-xs flex-1">
                        <p className="text-[#1A1A1A]/60">Pedidos Totales</p>
                        <b className="text-2xl font-bold text-[#1A1A1A]">{stats.totalOrders}</b>
                    </div>
                    <ShoppingCart size={50} className="w-12 h-12 p-2.5 text-[#00C6A2] bg-[#00C6A2]/10 rounded-full" />
                </div>
                <div className="flex items-center gap-6 border border-[#00C6A2]/20 bg-white/80 backdrop-blur-sm p-4 px-6 rounded-2xl shadow-sm">
                    <div className="flex flex-col gap-2 text-xs flex-1">
                        <p className="text-[#1A1A1A]/60">Ingresos Totales</p>
                        <b className="text-2xl font-bold text-[#1A1A1A]">{currency}{stats.totalRevenue.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</b>
                    </div>
                    <DollarSign size={50} className="w-12 h-12 p-2.5 text-[#FFD95E] bg-[#FFD95E]/10 rounded-full" />
                </div>
                <div className="flex items-center gap-6 border border-[#00C6A2]/20 bg-white/80 backdrop-blur-sm p-4 px-6 rounded-2xl shadow-sm">
                    <div className="flex flex-col gap-2 text-xs flex-1">
                        <p className="text-[#1A1A1A]/60">Productos Totales</p>
                        <b className="text-2xl font-bold text-[#1A1A1A]">{stats.totalProducts}</b>
                    </div>
                    <Package size={50} className="w-12 h-12 p-2.5 text-[#00C6A2] bg-[#00C6A2]/10 rounded-full" />
                </div>
                <div className="flex items-center gap-6 border border-[#00C6A2]/20 bg-white/80 backdrop-blur-sm p-4 px-6 rounded-2xl shadow-sm">
                    <div className="flex flex-col gap-2 text-xs flex-1">
                        <p className="text-[#1A1A1A]/60">Ganancias de Tienda</p>
                        <b className="text-2xl font-bold text-[#1A1A1A]">{currency}{stats.totalEarnings.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</b>
                    </div>
                    <BarChart3 size={50} className="w-12 h-12 p-2.5 text-[#00C6A2] bg-[#00C6A2]/10 rounded-full" />
                </div>
            </div>

            {/* Orders Table */}
            <div className="bg-white/80 backdrop-blur-sm border border-[#00C6A2]/20 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-6 border-b border-[#00C6A2]/20">
                    <h2 className="text-xl font-bold text-[#1A1A1A]">Pedidos de la Tienda</h2>
                </div>
                {orders.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">
                        <p>No hay pedidos para esta tienda</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-[#1A1A1A]/80">
                            <thead className="bg-gradient-to-r from-[#00C6A2]/10 to-[#FFD95E]/10 text-[#1A1A1A] text-xs uppercase tracking-wider">
                                <tr>
                                    {["#", "Cliente", "Total", "Pago", "Estado", "Fecha", "Acciones"].map((heading, i) => (
                                        <th key={i} className="px-4 py-4 font-semibold">{heading}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#00C6A2]/10">
                                {orders.map((order, index) => (
                                    <tr
                                        key={order.id}
                                        className="hover:bg-[#00C6A2]/5 transition-colors duration-150"
                                    >
                                        <td className="pl-6 py-4 text-[#00C6A2] font-semibold">
                                            {index + 1}
                                        </td>
                                        <td className="px-4 py-4 font-medium">{order.user?.name}</td>
                                        <td className="px-4 py-4 font-semibold text-[#1A1A1A]">{currency}{order.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                                        <td className="px-4 py-4">
                                            <span className="px-3 py-1 rounded-full text-xs bg-[#00C6A2]/10 text-[#00C6A2] font-medium">
                                                {order.paymentMethod === 'COD' ? 'Efectivo' : order.paymentMethod}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                                order.status === 'DELIVERED' ? 'bg-green-100 text-green-700' :
                                                order.status === 'PROCESSING' ? 'bg-blue-100 text-blue-700' :
                                                order.status === 'SHIPPED' ? 'bg-purple-100 text-purple-700' :
                                                'bg-yellow-100 text-yellow-700'
                                            }`}>
                                                {order.status === 'ORDER_PLACED' ? 'Pedido Realizado' : 
                                                 order.status === 'PROCESSING' ? 'En Proceso' :
                                                 order.status === 'SHIPPED' ? 'Enviado' : 'Entregado'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-[#1A1A1A]/60">
                                            {new Date(order.createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="px-4 py-4">
                                            <button
                                                onClick={() => handleDeleteOrder(order.id)}
                                                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Eliminar pedido (recalculará estadísticas)"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}

