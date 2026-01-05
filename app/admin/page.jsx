'use client'
import Loading from "@/components/Loading"
import OrdersAreaChart from "@/components/OrdersAreaChart"
import { CircleDollarSignIcon, ShoppingBasketIcon, StoreIcon, TagsIcon, UserPlus, CheckCircle, XCircle, Clock } from "lucide-react"
import { useEffect, useState } from "react"
import { getProducts, getOrders, getVendors } from "@/lib/supabase/database"
import { getCurrentUser, isAdmin } from "@/lib/supabase/auth"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"

export default function AdminDashboard() {

    const currency = 'MXN $'
    const router = useRouter()

    const [loading, setLoading] = useState(true)
    const [dashboardData, setDashboardData] = useState({
        products: 0,
        revenue: 0,
        orders: 0,
        stores: 0,
        allOrders: [],
        pendingStores: 0,
        totalCommission: 0,
    })
    const [storeRequests, setStoreRequests] = useState([])
    const [loadingRequests, setLoadingRequests] = useState(false)

    // Calculate total commission from orders (15% of revenue)
    const totalCommission = dashboardData.revenue * 0.15

    const dashboardCardsData = [
        { title: 'Productos Totales', value: dashboardData.products, icon: ShoppingBasketIcon, color: 'text-[#00C6A2]' },
        { title: 'Ingresos Totales', value: currency + dashboardData.revenue.toLocaleString('es-MX', { minimumFractionDigits: 2 }), icon: CircleDollarSignIcon, color: 'text-[#FFD95E]' },
        { title: 'Pedidos Totales', value: dashboardData.orders, icon: TagsIcon, color: 'text-[#00C6A2]' },
        { title: 'Tiendas Totales', value: dashboardData.stores, icon: StoreIcon, color: 'text-[#FFD95E]' },
        { title: 'Comisiones (15%)', value: currency + totalCommission.toLocaleString('es-MX', { minimumFractionDigits: 2 }), icon: CircleDollarSignIcon, color: 'text-[#00C6A2]' },
        { title: 'Tiendas Pendientes', value: dashboardData.pendingStores || 0, icon: StoreIcon, color: 'text-[#FFD95E]' },
        { title: 'Solicitudes de Tienda', value: storeRequests.length, icon: UserPlus, color: 'text-[#00C6A2]' },
    ]

    const fetchStoreRequests = async () => {
        setLoadingRequests(true)
        try {
            const { supabase } = await import('@/lib/supabase/client')
            const { data, error } = await supabase
                .from('store_requests')
                .select('*')
                .eq('status', 'pending')
                .order('created_at', { ascending: false })
            
            if (error) {
                // Check if it's a table not found error (expected - table may not exist yet)
                if (error.code === '42P01' || 
                    error.message?.includes('does not exist') || 
                    (error.message?.includes('relation') && error.message?.includes('does not exist'))) {
                    // Silently handle - table doesn't exist yet, which is fine
                    setStoreRequests([])
                    return
                } 
                
                // Check if it's a permission error (expected - RLS may not be set up)
                if (error.code === '42501' || 
                    error.message?.includes('permission denied') || 
                    error.message?.includes('row-level security')) {
                    // Silently handle - RLS not configured, which is fine
                    setStoreRequests([])
                    return
                }
                
                // Only log unexpected errors with actual error information
                if (error.message || error.code) {
                    console.warn('Could not fetch store requests:', error.message || `Error code: ${error.code}`)
                }
                
                // Set empty array to prevent UI breakage
                setStoreRequests([])
                return
            }
            
            setStoreRequests(data || [])
        } catch (error) {
            // Only log if there's actual error information
            if (error && (error.message || error.stack || error.name)) {
                console.warn('Exception fetching store requests:', error.message || 'Unknown exception')
            }
            // Set empty array on exception to prevent UI breakage
            setStoreRequests([])
        } finally {
            setLoadingRequests(false)
        }
    }

    const handleUpdateRequestStatus = async (requestId, newStatus) => {
        try {
            const { supabase } = await import('@/lib/supabase/client')
            const { user } = await getCurrentUser()
            
            const { data, error } = await supabase
                .from('store_requests')
                .update({
                    status: newStatus,
                    reviewed_at: new Date().toISOString(),
                    reviewed_by: user?.id
                })
                .eq('id', requestId)
                .select()
            
            if (error) {
                console.error('Error updating request:', {
                    message: error.message,
                    details: error.details,
                    hint: error.hint,
                    code: error.code
                })
                
                // Check if it's a table not found error
                if (error.code === '42P01' || error.message?.includes('does not exist')) {
                    toast.error('Error: La tabla de solicitudes no existe. Ejecuta la migración SQL.', {
                        duration: 6000,
                    })
                } else if (error.code === '42501' || error.message?.includes('permission denied')) {
                    toast.error('Error de permisos. Verifica las políticas RLS.', {
                        duration: 6000,
                    })
                } else {
                    toast.error('Error al actualizar la solicitud: ' + (error.message || 'Error desconocido'))
                }
                return
            }
            
            if (data && data.length > 0) {
                toast.success(`Solicitud ${newStatus === 'approved' ? 'aprobada' : 'rechazada'}`)
                await fetchStoreRequests()
            } else {
                toast.error('No se pudo actualizar la solicitud')
            }
        } catch (error) {
            console.error('Exception updating request status:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            })
            toast.error('Error al actualizar la solicitud: ' + (error.message || 'Error desconocido'))
        }
    }

    const fetchDashboardData = async () => {
        try {
            // Check if user is admin
            const { user } = await getCurrentUser()
            if (!user || !isAdmin(user)) {
                toast.error('No tienes permisos para acceder a esta página')
                router.push('/')
                return
            }

            // Fetch real data from Supabase
            const [products, orders, vendors, pendingVendors] = await Promise.all([
                getProducts(), // All products
                getOrders(), // All orders
                getVendors(true), // Approved vendors
                getVendors(false), // Pending vendors
            ])

            // Calculate revenue from orders
            const revenue = orders.reduce((sum, order) => sum + (parseFloat(order.total) || 0), 0)
            
            // Calculate total commission (15% of revenue)
            const totalCommission = revenue * 0.15

            // Format orders for chart (group by date)
            // Filter out orders with invalid dates and format valid ones
            const formattedOrders = orders
                .filter(order => {
                    // Only include orders with valid created_at dates
                    if (!order.created_at) return false
                    const date = new Date(order.created_at)
                    return !isNaN(date.getTime()) // Check if date is valid
                })
                .map(order => {
                    const date = new Date(order.created_at)
                    return {
                        date: date.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' }),
                        dateValue: date, // Keep original date for sorting
                        revenue: parseFloat(order.total) || 0,
                        orders: 1,
                    }
                })

            // Group by date for chart
            const ordersByDate = {}
            formattedOrders.forEach(order => {
                if (!ordersByDate[order.date]) {
                    ordersByDate[order.date] = { 
                        date: order.date, 
                        dateValue: order.dateValue, // Keep for sorting
                        revenue: 0, 
                        orders: 0 
                    }
                }
                ordersByDate[order.date].revenue += order.revenue
                ordersByDate[order.date].orders += order.orders
            })

            const allOrders = Object.values(ordersByDate).sort((a, b) => {
                // Sort by original date value, not formatted string
                return a.dateValue - b.dateValue
            }).map(order => ({
                // Convert to format expected by OrdersAreaChart
                createdAt: order.dateValue.toISOString(),
                total: order.revenue,
                date: order.date
            }))

            setDashboardData({
                products: products?.length || 0,
                revenue: revenue,
                orders: orders?.length || 0,
                stores: vendors?.length || 0,
                allOrders: allOrders,
                pendingStores: pendingVendors?.length || 0,
                totalCommission: totalCommission,
            })
        } catch (error) {
            console.error('Error fetching dashboard data:', error)
            toast.error('Error al cargar los datos del dashboard')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchDashboardData()
        fetchStoreRequests()
    }, [])

    if (loading) return <Loading />

    return (
        <div className="text-[#1A1A1A]/70">
            <h1 className="text-2xl">Panel de <span className="text-[#1A1A1A] font-bold">Administración</span></h1>

            {/* Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 my-10 mt-4">
                {
                    dashboardCardsData.map((card, index) => (
                        <div key={index} className="flex items-center gap-6 border border-[#00C6A2]/20 bg-white/80 backdrop-blur-sm p-4 px-6 rounded-2xl shadow-sm hover:shadow-md transition-all">
                            <div className="flex flex-col gap-2 text-xs flex-1">
                                <p className="text-[#1A1A1A]/60">{card.title}</p>
                                <b className={`text-2xl font-bold ${card.color || 'text-[#1A1A1A]'}`}>{card.value}</b>
                            </div>
                            <card.icon size={50} className={`w-12 h-12 p-2.5 ${card.color || 'text-[#00C6A2]'} bg-[#00C6A2]/10 rounded-full`} />
                        </div>
                    ))
                }
            </div>

            {/* Store Requests Section */}
            {storeRequests.length > 0 && (
                <div className="mt-6 bg-white/80 backdrop-blur-sm border border-[#00C6A2]/20 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <UserPlus size={24} className="text-[#00C6A2]" />
                            <h2 className="text-xl font-bold text-[#1A1A1A]">
                                Solicitudes de Tienda ({storeRequests.length})
                            </h2>
                        </div>
                        <button
                            onClick={fetchStoreRequests}
                            disabled={loadingRequests}
                            className="text-sm text-[#00C6A2] hover:text-[#00B894] transition-colors disabled:opacity-50"
                        >
                            {loadingRequests ? 'Actualizando...' : 'Actualizar'}
                        </button>
                    </div>
                    
                    <div className="space-y-3">
                        {storeRequests.map((request) => (
                            <div
                                key={request.id}
                                className="flex items-center justify-between p-4 bg-gradient-to-r from-[#00C6A2]/5 to-[#FFD95E]/5 border border-[#00C6A2]/20 rounded-xl"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-10 h-10 rounded-full bg-[#00C6A2]/20 flex items-center justify-center">
                                            <StoreIcon size={20} className="text-[#00C6A2]" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-[#1A1A1A]">
                                                {request.user_name || 'Sin nombre'}
                                            </p>
                                            <p className="text-sm text-[#1A1A1A]/60">{request.user_email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-[#1A1A1A]/60 ml-[52px]">
                                        <Clock size={14} />
                                        <span>
                                            Solicitado: {new Date(request.created_at).toLocaleDateString('es-MX', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleUpdateRequestStatus(request.id, 'approved')}
                                        className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                                        title="Aprobar solicitud"
                                    >
                                        <CheckCircle size={16} />
                                        Aprobar
                                    </button>
                                    <button
                                        onClick={() => handleUpdateRequestStatus(request.id, 'rejected')}
                                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                                        title="Rechazar solicitud"
                                    >
                                        <XCircle size={16} />
                                        Rechazar
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Analytics Charts */}
            <div className="space-y-6 mt-6">
                <div className="bg-white/80 backdrop-blur-sm border border-[#00C6A2]/20 rounded-2xl p-6 shadow-sm">
                    <h2 className="text-xl font-bold text-[#1A1A1A] mb-4">Análisis de Pedidos e Ingresos</h2>
                    <OrdersAreaChart allOrders={dashboardData.allOrders} />
                </div>
            </div>
        </div>
    )
}