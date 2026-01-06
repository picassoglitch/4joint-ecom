'use client'
import { useState, useEffect } from 'react'
import { MapPin, ExternalLink, Copy, Check, Trash2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import Loading from '@/components/Loading'
import { getCurrentUser } from '@/lib/supabase/auth'

export default function OrderDispatch() {
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [copiedId, setCopiedId] = useState(null)

    useEffect(() => {
        fetchOrders()
    }, [])

    const fetchOrders = async () => {
        try {
            const { user } = await getCurrentUser()
            if (!user) {
                toast.error('Debes estar autenticado')
                return
            }

            // Check if user is admin
            const role = user.user_metadata?.role
            if (role !== 'admin') {
                toast.error('No tienes permisos para acceder a esta página')
                return
            }

            const response = await fetch('/api/admin/dispatch')
            if (!response.ok) {
                throw new Error('Error al obtener órdenes')
            }

            const { orders: dispatchOrders } = await response.json()
            setOrders(dispatchOrders || [])
        } catch (error) {
            console.error('Error fetching orders:', error)
            toast.error('Error al cargar las órdenes')
        } finally {
            setLoading(false)
        }
    }

    const getDeliveryAddress = (order) => {
        if (order.guest_address) {
            const addr = order.guest_address
            return `${addr.street || ''}, ${addr.city || ''}, ${addr.state || ''}, ${addr.zip || ''}`.trim()
        }
        if (order.address) {
            return `${order.address.address || order.address.street || ''}, ${order.address.city || ''}, ${order.address.state || ''}, ${order.address.zip || ''}`.trim()
        }
        return 'Dirección no disponible'
    }

    const openUber = (address) => {
        const encodedAddress = encodeURIComponent(address)
        const uberUrl = `https://m.uber.com/looking?pickup=my_location&dropoff[formatted_address]=${encodedAddress}`
        window.open(uberUrl, '_blank')
    }

    const openDidi = (address) => {
        const encodedAddress = encodeURIComponent(address)
        const didiUrl = `https://www.didi.com.mx/ride/?dropoff=${encodedAddress}`
        window.open(didiUrl, '_blank')
    }

    const copyAddress = (address, orderId) => {
        navigator.clipboard.writeText(address)
        setCopiedId(orderId)
        toast.success('Dirección copiada al portapapeles')
        setTimeout(() => setCopiedId(null), 2000)
    }

    const updateDispatchStatus = async (orderId, status) => {
        try {
            const response = await fetch('/api/admin/dispatch', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    orderId,
                    dispatchStatus: status,
                }),
            })

            if (!response.ok) {
                throw new Error('Error al actualizar estado')
            }

            toast.success('Estado actualizado')
            fetchOrders()
        } catch (error) {
            console.error('Error updating dispatch status:', error)
            toast.error('Error al actualizar estado')
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
            fetchOrders()
        } catch (error) {
            console.error('Error deleting order:', error)
            toast.error(error.message || 'Error al eliminar el pedido')
        }
    }

    if (loading) return <Loading />

    const pendingOrders = orders.filter(o => o.fulfillment_type === 'courierExterno' && o.dispatch_status === 'pending')
    const dispatchedOrders = orders.filter(o => o.fulfillment_type === 'courierExterno' && o.dispatch_status === 'dispatched')

    return (
        <div className="min-h-screen bg-[#FAFAF6] py-8 px-4">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl font-bold text-[#1A1A1A] mb-6">
                    Despacho de Pedidos
                </h1>

                {/* Pending Orders */}
                <div className="mb-8">
                    <h2 className="text-xl font-semibold text-[#1A1A1A] mb-4">
                        Pedidos Pendientes ({pendingOrders.length})
                    </h2>
                    {pendingOrders.length === 0 ? (
                        <p className="text-slate-500">No hay pedidos pendientes de despacho</p>
                    ) : (
                        <div className="space-y-4">
                            {pendingOrders.map((order) => {
                                const address = getDeliveryAddress(order)
                                return (
                                    <div key={order.id} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                                        <div className="flex items-start justify-between mb-4">
                                            <div>
                                                <h3 className="font-semibold text-lg text-[#1A1A1A] mb-1">
                                                    Pedido #{order.id.slice(0, 8)}
                                                </h3>
                                                <p className="text-sm text-slate-500">
                                                    {new Date(order.created_at).toLocaleString('es-MX')}
                                                </p>
                                                <p className="text-sm text-slate-600 mt-1">
                                                    Total: ${order.total.toFixed(2)} MXN
                                                </p>
                                            </div>
                                            <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                                                Pendiente
                                            </span>
                                        </div>

                                        <div className="border-t border-slate-200 pt-4">
                                            <div className="flex items-start gap-2 mb-3">
                                                <MapPin size={18} className="text-[#00C6A2] mt-1" />
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium text-[#1A1A1A] mb-1">
                                                        Dirección de entrega:
                                                    </p>
                                                    <p className="text-sm text-slate-600">{address}</p>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap gap-2 mt-4">
                                                <button
                                                    onClick={() => openUber(address)}
                                                    className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                                                >
                                                    <ExternalLink size={16} />
                                                    Abrir en Uber
                                                </button>
                                                <button
                                                    onClick={() => openDidi(address)}
                                                    className="flex items-center gap-2 px-4 py-2 bg-[#FF6600] text-white rounded-lg hover:bg-[#E55A00] transition-colors"
                                                >
                                                    <ExternalLink size={16} />
                                                    Abrir en Didi
                                                </button>
                                                <button
                                                    onClick={() => copyAddress(address, order.id)}
                                                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                                                >
                                                    {copiedId === order.id ? (
                                                        <>
                                                            <Check size={16} />
                                                            Copiado
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Copy size={16} />
                                                            Copiar dirección
                                                        </>
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => updateDispatchStatus(order.id, 'dispatched')}
                                                    className="flex items-center gap-2 px-4 py-2 bg-[#00C6A2] text-white rounded-lg hover:bg-[#00B894] transition-colors"
                                                >
                                                    Marcar como Despachado
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteOrder(order.id)}
                                                    className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                    Eliminar Pedido
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Dispatched Orders */}
                <div>
                    <h2 className="text-xl font-semibold text-[#1A1A1A] mb-4">
                        Pedidos Despachados ({dispatchedOrders.length})
                    </h2>
                    {dispatchedOrders.length === 0 ? (
                        <p className="text-slate-500">No hay pedidos despachados</p>
                    ) : (
                        <div className="space-y-4">
                            {dispatchedOrders.map((order) => {
                                const address = getDeliveryAddress(order)
                                return (
                                    <div key={order.id} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm opacity-75">
                                        <div className="flex items-start justify-between mb-4">
                                            <div>
                                                <h3 className="font-semibold text-lg text-[#1A1A1A] mb-1">
                                                    Pedido #{order.id.slice(0, 8)}
                                                </h3>
                                                <p className="text-sm text-slate-500">
                                                    {new Date(order.created_at).toLocaleString('es-MX')}
                                                </p>
                                            </div>
                                            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                                Despachado
                                            </span>
                                        </div>

                                        <div className="border-t border-slate-200 pt-4">
                                            <div className="flex items-start gap-2 mb-3">
                                                <MapPin size={18} className="text-[#00C6A2] mt-1" />
                                                <div className="flex-1">
                                                    <p className="text-sm text-slate-600">{address}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

