'use client'
import { dummyAdminDashboardData } from "@/assets/assets"
import Loading from "@/components/Loading"
import OrdersAreaChart from "@/components/OrdersAreaChart"
import { CircleDollarSignIcon, ShoppingBasketIcon, StoreIcon, TagsIcon } from "lucide-react"
import { useEffect, useState } from "react"

export default function AdminDashboard() {

    const currency = 'MXN $'

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

    // Calculate total commission from orders (15% of revenue)
    const totalCommission = dashboardData.revenue * 0.15

    const dashboardCardsData = [
        { title: 'Productos Totales', value: dashboardData.products, icon: ShoppingBasketIcon, color: 'text-[#00C6A2]' },
        { title: 'Ingresos Totales', value: currency + dashboardData.revenue.toLocaleString('es-MX', { minimumFractionDigits: 2 }), icon: CircleDollarSignIcon, color: 'text-[#FFD95E]' },
        { title: 'Pedidos Totales', value: dashboardData.orders, icon: TagsIcon, color: 'text-[#00C6A2]' },
        { title: 'Tiendas Totales', value: dashboardData.stores, icon: StoreIcon, color: 'text-[#FFD95E]' },
        { title: 'Comisiones (15%)', value: currency + totalCommission.toLocaleString('es-MX', { minimumFractionDigits: 2 }), icon: CircleDollarSignIcon, color: 'text-[#00C6A2]' },
        { title: 'Tiendas Pendientes', value: dashboardData.pendingStores || 0, icon: StoreIcon, color: 'text-[#FFD95E]' },
    ]

    const fetchDashboardData = async () => {
        setDashboardData(dummyAdminDashboardData)
        setLoading(false)
    }

    useEffect(() => {
        fetchDashboardData()
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

            {/* Analytics Charts */}
            <div className="space-y-6">
                <div className="bg-white/80 backdrop-blur-sm border border-[#00C6A2]/20 rounded-2xl p-6 shadow-sm">
                    <h2 className="text-xl font-bold text-[#1A1A1A] mb-4">Análisis de Pedidos e Ingresos</h2>
                    <OrdersAreaChart allOrders={dashboardData.allOrders} />
                </div>
            </div>
        </div>
    )
}