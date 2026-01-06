'use client'
import { useEffect, useState } from "react"
import Loading from "@/components/Loading"
import { getOrders, updateOrderStatus } from "@/lib/supabase/database"
import { getCurrentUser } from "@/lib/supabase/auth"
import toast from "react-hot-toast"
import { getSafeImageSource } from "@/lib/utils/image"
import { Trash2 } from "lucide-react"

export default function StoreOrders() {
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedOrder, setSelectedOrder] = useState(null)
    const [isModalOpen, setIsModalOpen] = useState(false)

    const fetchOrders = async () => {
        try {
            const { user } = await getCurrentUser()
            if (!user) {
                toast.error('Debes estar autenticado')
                setLoading(false)
                return
            }

            // Get only orders for current vendor
            const vendorOrders = await getOrders({ vendor_id: user.id })
            
            // Format orders for display and fetch order items
            const formattedOrders = await Promise.all(
                (vendorOrders || []).map(async (order) => {
                    // Get order items
                    const { getOrderItems } = await import('@/lib/supabase/database')
                    const orderItems = await getOrderItems(order.id).catch(() => [])

                    return {
                        id: order.id,
                        total: parseFloat(order.total || 0),
                        status: order.status || 'ORDER_PLACED',
                        paymentMethod: order.payment_method || 'COD',
                        isPaid: order.is_paid || false,
                        isCouponUsed: false, // TODO: Add coupon support
                        coupon: null,
                        createdAt: order.created_at,
                        // Guest checkout data
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
                            country: 'México',
                            phone: order.guest_phone || 'N/A',
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
        } catch (error) {
            console.error('Error fetching orders:', error)
            toast.error('Error al cargar los pedidos')
            setOrders([])
        } finally {
            setLoading(false)
        }
    }

    const handleUpdateOrderStatus = async (orderId, status) => {
        try {
            await updateOrderStatus(orderId, status)
            toast.success('Estado del pedido actualizado')
            
            // Update local state
            setOrders(orders.map(order => 
                order.id === orderId ? { ...order, status } : order
            ))
            
            // Update selected order if modal is open
            if (selectedOrder && selectedOrder.id === orderId) {
                setSelectedOrder({ ...selectedOrder, status })
            }
        } catch (error) {
            console.error('Error updating order status:', error)
            toast.error('Error al actualizar el estado del pedido')
            throw error
        }
    }

    const handleDeleteOrder = async (orderId) => {
        if (!confirm('¿Estás seguro de que deseas eliminar este pedido? Esta acción no se puede deshacer.')) {
            return
        }

        try {
            const { user } = await getCurrentUser()
            if (!user) {
                toast.error('Debes estar autenticado')
                return
            }

            // Get session token for API call
            const { createClient } = await import('@supabase/supabase-js')
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
            const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
            
            if (!supabaseUrl || !supabaseAnonKey) {
                toast.error('Error de configuración')
                return
            }

            const supabase = createClient(supabaseUrl, supabaseAnonKey)
            const { data: { session } } = await supabase.auth.getSession()
            
            if (!session?.access_token) {
                toast.error('Error de autenticación')
                return
            }

            const response = await fetch(`/api/orders/${orderId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json',
                },
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Error al eliminar el pedido')
            }

            toast.success('Pedido eliminado correctamente')
            
            // Remove order from local state
            setOrders(orders.filter(order => order.id !== orderId))
            
            // Close modal if deleted order was selected
            if (selectedOrder && selectedOrder.id === orderId) {
                closeModal()
            }
        } catch (error) {
            console.error('Error deleting order:', error)
            toast.error(error.message || 'Error al eliminar el pedido')
        }
    }

    const openModal = (order) => {
        setSelectedOrder(order)
        setIsModalOpen(true)
    }

    const closeModal = () => {
        setSelectedOrder(null)
        setIsModalOpen(false)
    }

    useEffect(() => {
        fetchOrders()
    }, [])

    if (loading) return <Loading />

    const currency = 'MXN $'

    return (
        <>
            <h1 className="text-2xl text-[#1A1A1A]/70 mb-5">Pedidos de <span className="text-[#1A1A1A] font-bold">4joint</span></h1>
            {orders.length === 0 ? (
                <div className="flex items-center justify-center h-80 bg-white/80 backdrop-blur-sm border border-[#00C6A2]/20 rounded-2xl">
                    <p className="text-[#1A1A1A]/60 text-lg">No se encontraron pedidos</p>
                </div>
            ) : (
                <div className="overflow-x-auto max-w-4xl rounded-2xl shadow-sm border border-[#00C6A2]/20 bg-white/80 backdrop-blur-sm">
                    <table className="w-full text-sm text-left text-[#1A1A1A]/80">
                        <thead className="bg-gradient-to-r from-[#00C6A2]/10 to-[#FFD95E]/10 text-[#1A1A1A] text-xs uppercase tracking-wider">
                            <tr>
                                {["#", "Cliente", "Total", "Pago", "Cupón", "Estado", "Fecha", "Acciones"].map((heading, i) => (
                                    <th key={i} className="px-4 py-4 font-semibold">{heading}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#00C6A2]/10">
                            {orders.map((order, index) => (
                                <tr
                                    key={order.id}
                                    className="hover:bg-[#00C6A2]/5 transition-colors duration-150 cursor-pointer"
                                    onClick={() => openModal(order)}
                                >
                                    <td className="pl-6 py-4 text-[#00C6A2] font-semibold" >
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
                                        {order.isCouponUsed ? (
                                            <span className="bg-[#FFD95E]/20 text-[#1A1A1A] text-xs px-3 py-1 rounded-full font-medium">
                                                {order.coupon?.code}
                                            </span>
                                        ) : (
                                            <span className="text-[#1A1A1A]/40">—</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-4" onClick={(e) => { e.stopPropagation() }}>
                                        <select
                                            value={order.status}
                                            onChange={e => toast.promise(handleUpdateOrderStatus(order.id, e.target.value), { loading: "Actualizando estado...", success: "Estado actualizado", error: "Error al actualizar" })}
                                            className="border border-[#00C6A2]/20 rounded-full text-xs px-3 py-1.5 bg-white focus:ring-2 focus:ring-[#00C6A2]/20 focus:border-[#00C6A2] transition-all outline-none text-[#1A1A1A] font-medium"
                                        >
                                            <option value="ORDER_PLACED">Pedido Realizado</option>
                                            <option value="PROCESSING">En Proceso</option>
                                            <option value="SHIPPED">Enviado</option>
                                            <option value="DELIVERED">Entregado</option>
                                        </select>
                                    </td>
                                    <td className="px-4 py-4 text-[#1A1A1A]/60">
                                        {new Date(order.createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </td>
                                    <td className="px-4 py-4" onClick={(e) => { e.stopPropagation() }}>
                                        <button
                                            onClick={() => handleDeleteOrder(order.id)}
                                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Eliminar pedido"
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

            {/* Modal */}
            {isModalOpen && selectedOrder && (
                <div onClick={closeModal} className="fixed inset-0 flex items-center justify-center bg-[#1A1A1A]/60 text-[#1A1A1A] text-sm backdrop-blur-sm z-50" >
                    <div onClick={e => e.stopPropagation()} className="bg-[#FAFAF6] rounded-3xl shadow-2xl max-w-2xl w-full mx-4 p-8 relative border border-[#00C6A2]/20">
                        <h2 className="text-2xl font-bold text-[#1A1A1A] mb-6 text-center">
                            Detalles del Pedido
                        </h2>

                        {/* Customer Details */}
                        <div className="mb-6 bg-white/80 rounded-2xl p-5 border border-[#00C6A2]/10">
                            <h3 className="font-bold text-[#1A1A1A] mb-3 text-lg">Datos del Cliente</h3>
                            <div className="space-y-2 text-sm">
                                <p><span className="text-[#00C6A2] font-semibold">Nombre:</span> {selectedOrder.user?.name}</p>
                                <p><span className="text-[#00C6A2] font-semibold">Email:</span> {selectedOrder.user?.email}</p>
                                <p><span className="text-[#00C6A2] font-semibold">Teléfono:</span> {selectedOrder.address?.phone}</p>
                                <p><span className="text-[#00C6A2] font-semibold">Dirección:</span> {`${selectedOrder.address?.street}, ${selectedOrder.address?.city}, ${selectedOrder.address?.state}, ${selectedOrder.address?.zip}, ${selectedOrder.address?.country}`}</p>
                            </div>
                        </div>

                        {/* Products */}
                        <div className="mb-6 bg-white/80 rounded-2xl p-5 border border-[#00C6A2]/10">
                            <h3 className="font-bold text-[#1A1A1A] mb-3 text-lg">Productos</h3>
                            <div className="space-y-3">
                                {selectedOrder.orderItems && selectedOrder.orderItems.length > 0 ? (
                                    selectedOrder.orderItems.map((item, i) => (
                                        <div key={i} className="flex items-center gap-4 border border-[#00C6A2]/20 rounded-xl p-3 bg-white shadow-sm">
                                            {item.product?.images?.[0] && (
                                                <img
                                                    src={getSafeImageSource(item.product.images[0]?.src || item.product.images[0], item.product?.id)}
                                                    alt={item.product?.name}
                                                    className="w-20 h-20 object-cover rounded-xl"
                                                    onError={(e) => {
                                                        // Prevent infinite loop: only handle error once using dataset flag
                                                        if (e.currentTarget.dataset.fallbackApplied) return
                                                        e.currentTarget.dataset.fallbackApplied = '1'
                                                        
                                                        const PLACEHOLDER_PATH = '/img/placeholder-product.svg'
                                                        if (e.currentTarget.src !== PLACEHOLDER_PATH && !e.currentTarget.src.includes('placeholder-product')) {
                                                            e.currentTarget.src = PLACEHOLDER_PATH
                                                        }
                                                    }}
                                                />
                                            )}
                                            <div className="flex-1">
                                                <p className="font-semibold text-[#1A1A1A]">{item.product?.name || 'Producto'}</p>
                                                {item.variant && (
                                                    <p className="text-xs text-[#00C6A2] font-medium mt-1">
                                                        Variante: {item.variant.name || (typeof item.variant === 'object' ? item.variant.name : item.variant)}
                                                    </p>
                                                )}
                                                <p className="text-[#1A1A1A]/60 text-sm">Cantidad: {item.quantity}</p>
                                                <p className="text-[#00C6A2] font-semibold">{currency}{item.price?.toLocaleString('es-MX', { minimumFractionDigits: 2 }) || '0.00'}</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-[#1A1A1A]/60 text-sm">No hay información de productos disponible</p>
                                )}
                            </div>
                        </div>

                        {/* Payment & Status */}
                        <div className="mb-6 bg-gradient-to-br from-[#00C6A2]/10 to-[#FFD95E]/10 rounded-2xl p-5 border border-[#00C6A2]/20">
                            <h3 className="font-bold text-[#1A1A1A] mb-3 text-lg">Información de Pago</h3>
                            <div className="space-y-2 text-sm">
                                <p><span className="text-[#00C6A2] font-semibold">Método de Pago:</span> {selectedOrder.paymentMethod === 'COD' ? 'Efectivo' : selectedOrder.paymentMethod}</p>
                                <p><span className="text-[#00C6A2] font-semibold">Pagado:</span> {selectedOrder.isPaid ? "Sí" : "No"}</p>
                                {selectedOrder.isCouponUsed && (
                                    <p><span className="text-[#00C6A2] font-semibold">Cupón:</span> <span className="bg-[#FFD95E]/30 px-2 py-1 rounded-full">{selectedOrder.coupon.code}</span> ({selectedOrder.coupon.discount}% descuento)</p>
                                )}
                                <p><span className="text-[#00C6A2] font-semibold">Estado:</span> 
                                    <span className="ml-2 px-3 py-1 bg-[#00C6A2]/20 text-[#00C6A2] rounded-full text-xs font-medium">
                                        {selectedOrder.status === 'ORDER_PLACED' ? 'Pedido Realizado' : 
                                         selectedOrder.status === 'PROCESSING' ? 'En Proceso' :
                                         selectedOrder.status === 'SHIPPED' ? 'Enviado' : 'Entregado'}
                                    </span>
                                </p>
                                <p><span className="text-[#00C6A2] font-semibold">Fecha del Pedido:</span> {new Date(selectedOrder.createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                                <p className="pt-2 border-t border-[#00C6A2]/20"><span className="text-[#00C6A2] font-semibold">Total:</span> <span className="text-xl font-bold text-[#1A1A1A]">{currency}{selectedOrder.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-between items-center gap-3">
                            <button
                                onClick={() => handleDeleteOrder(selectedOrder.id)}
                                className="px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-full font-semibold transition-all hover:scale-105 active:scale-95 shadow-lg flex items-center gap-2"
                            >
                                <Trash2 size={18} />
                                Eliminar Pedido
                            </button>
                            <div className="flex gap-3">
                                {selectedOrder.status === 'ORDER_PLACED' && selectedOrder.isPaid && (
                                    <button 
                                        onClick={async () => {
                                            try {
                                                await handleUpdateOrderStatus(selectedOrder.id, 'PROCESSING')
                                                toast.success('Pedido aprobado y en proceso')
                                            } catch (error) {
                                                // Error already handled in handleUpdateOrderStatus
                                            }
                                        }}
                                        className="px-8 py-3 bg-[#FFD95E] hover:bg-[#FFD044] text-[#1A1A1A] rounded-full font-semibold transition-all hover:scale-105 active:scale-95 shadow-lg"
                                    >
                                        Aprobar Pedido
                                    </button>
                                )}
                                <button onClick={closeModal} className="px-8 py-3 bg-[#00C6A2] hover:bg-[#00B894] text-white rounded-full font-semibold transition-all hover:scale-105 active:scale-95 shadow-lg" >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
