'use client'
import { dummyStoreDashboardData } from "@/assets/assets"
import Loading from "@/components/Loading"
import { CircleDollarSignIcon, ShoppingBasketIcon, StarIcon, TagsIcon, StoreIcon } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { getCurrentVendor } from "@/lib/supabase/database"
import Link from "next/link"

export default function Dashboard() {

    const currency = 'MXN $'

    const router = useRouter()

    const [loading, setLoading] = useState(true)
    const [hasStore, setHasStore] = useState(false)
    const [isGreenBoy, setIsGreenBoy] = useState(false)
    const [dashboardData, setDashboardData] = useState({
        totalProducts: 0,
        totalEarnings: 0,
        totalOrders: 0,
        totalRevenue: 0,
        totalCommission: 0,
        ratings: [],
        // GreenBoy specific fields
        totalProviderCost: 0,
        profitAfterProviderCost: 0,
    })

    // GreenBoy ID
    const GREENBOY_STORE_ID = 'f64fcf18-037f-47d8-b58a-9365cb62caf2'

    // Calculate commission (15%) and vendor earnings (85%) for regular stores
    // For GreenBoy: 50/50 split after provider cost
    const commissionRate = 0.15
    const vendorEarnings = isGreenBoy 
        ? dashboardData.profitAfterProviderCost * 0.5 
        : dashboardData.totalRevenue * (1 - commissionRate)
    const platformCommission = isGreenBoy
        ? dashboardData.profitAfterProviderCost * 0.5
        : dashboardData.totalRevenue * commissionRate

    const dashboardCardsData = [
        { title: 'Productos Totales', value: dashboardData.totalProducts, icon: ShoppingBasketIcon },
        { title: 'Ganancias Totales', value: currency + vendorEarnings.toLocaleString('es-MX', { minimumFractionDigits: 2 }), icon: CircleDollarSignIcon },
        { title: 'Pedidos Totales', value: dashboardData.totalOrders, icon: TagsIcon },
        { title: 'Calificaciones', value: dashboardData.ratings.length, icon: StarIcon },
    ]

    const fetchDashboardData = async () => {
        try {
            // Check if vendor has a store
            const vendor = await getCurrentVendor()
            setHasStore(!!vendor)

            if (!vendor) {
                setLoading(false)
                return
            }

            // Check if this is GreenBoy store
            const isGreenBoyStore = vendor.id === GREENBOY_STORE_ID
            setIsGreenBoy(isGreenBoyStore)

            const { getProducts, getOrders } = await import('@/lib/supabase/database')
            const { getCurrentUser } = await import('@/lib/supabase/auth')
            const { createClient } = await import('@supabase/supabase-js')
            
            const { user } = await getCurrentUser()
            if (!user) {
                setLoading(false)
                return
            }

            // Get vendor's products
            const products = await getProducts({ vendor_id: user.id })
            
            // Get vendor's orders
            const orders = await getOrders({ vendor_id: user.id })
            
            // Calculate total revenue
            const totalRevenue = orders.reduce((sum, order) => sum + parseFloat(order.total || 0), 0)
            
            // For GreenBoy, calculate provider cost from order items
            let totalProviderCost = 0
            let profitAfterProviderCost = 0

            if (isGreenBoyStore) {
                // Get Supabase client to fetch order items with products
                const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
                const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
                
                if (supabaseUrl && supabaseAnonKey) {
                    const supabase = createClient(supabaseUrl, supabaseAnonKey)
                    
                    // Get all order items with product information for this vendor's orders
                    const orderIds = orders.map(order => order.id)
                    
                    if (orderIds.length > 0) {
                        const { data: orderItems, error: itemsError } = await supabase
                            .from('order_items')
                            .select(`
                                quantity,
                                variant
                            `)
                            .in('order_id', orderIds)
                        
                        if (!itemsError && orderItems) {
                            // Calculate total provider cost from variants
                            // For GreenBoy, provider_cost is stored in each variant
                            totalProviderCost = orderItems.reduce((sum, item) => {
                                const variant = typeof item.variant === 'string' 
                                    ? JSON.parse(item.variant) 
                                    : item.variant
                                
                                // Get provider_cost from variant (for GreenBoy) or default to 0
                                const providerCost = parseFloat(variant?.provider_cost || 0)
                                const quantity = parseInt(item.quantity || 1)
                                return sum + (providerCost * quantity)
                            }, 0)
                            
                            // Calculate profit after provider cost
                            profitAfterProviderCost = totalRevenue - totalProviderCost
                        }
                    }
                }
            }
            
            // For ratings, we'll use empty array for now (can be enhanced later)
            const ratings = []

            setDashboardData({
                totalProducts: products.length,
                totalEarnings: isGreenBoyStore 
                    ? profitAfterProviderCost * 0.5 
                    : totalRevenue * 0.85, // 85% after commission for regular stores
                totalOrders: orders.length,
                totalRevenue: totalRevenue,
                totalCommission: isGreenBoyStore
                    ? profitAfterProviderCost * 0.5
                    : totalRevenue * 0.15,
                ratings: ratings,
                // GreenBoy specific
                totalProviderCost: totalProviderCost,
                profitAfterProviderCost: profitAfterProviderCost,
            })
        } catch (error) {
            console.error('Error fetching dashboard data:', error)
            // Fallback to dummy data on error
            setDashboardData(dummyStoreDashboardData)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchDashboardData()
    }, [])

    if (loading) return <Loading />

    // Show create store prompt if vendor doesn't have a store
    if (!hasStore) {
        return (
            <div className="text-[#1A1A1A]/70 mb-28">
                <h1 className="text-2xl mb-6">Panel de <span className="text-[#1A1A1A] font-bold">Vendedor</span></h1>
                
                <div className="bg-gradient-to-br from-[#00C6A2]/10 to-[#FFD95E]/10 border-2 border-[#00C6A2]/30 rounded-3xl p-8 max-w-2xl">
                    <div className="flex flex-col items-center text-center gap-4">
                        <div className="bg-[#00C6A2]/20 p-4 rounded-full">
                            <StoreIcon size={48} className="text-[#00C6A2]" />
                        </div>
                        <h2 className="text-2xl font-bold text-[#1A1A1A]">¡Crea tu Tienda!</h2>
                        <p className="text-[#1A1A1A]/70 max-w-md">
                            Para comenzar a vender en 4joint, necesitas crear tu tienda primero. 
                            Completa el formulario con la información de tu tienda y espera la aprobación del administrador.
                        </p>
                        <Link
                            href="/create-store"
                            className="mt-4 px-8 py-3 bg-[#00C6A2] hover:bg-[#00B894] text-white rounded-full font-semibold transition-all hover:scale-105 active:scale-95 shadow-lg"
                        >
                            Ir a Crear Tienda
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="text-[#1A1A1A]/70 mb-28">
            <h1 className="text-2xl">Panel de <span className="text-[#1A1A1A] font-bold">Vendedor</span></h1>

            <div className="flex flex-wrap gap-5 my-10 mt-4">
                {
                    dashboardCardsData.map((card, index) => (
                        <div key={index} className="flex items-center gap-11 border border-[#00C6A2]/20 bg-white/80 backdrop-blur-sm p-4 px-6 rounded-2xl shadow-sm hover:shadow-md transition-all">
                            <div className="flex flex-col gap-3 text-xs">
                                <p className="text-[#1A1A1A]/60">{card.title}</p>
                                <b className="text-2xl font-bold text-[#1A1A1A]">{card.value}</b>
                            </div>
                            <card.icon size={50} className="w-11 h-11 p-2.5 text-[#00C6A2] bg-[#00C6A2]/10 rounded-full" />
                        </div>
                    ))
                }
            </div>

            {/* Commission Calculator - Different for GreenBoy */}
            {isGreenBoy ? (
                <div className="bg-gradient-to-br from-[#00C6A2]/10 to-[#FFD95E]/10 border border-[#00C6A2]/20 rounded-2xl p-6 mb-8 shadow-sm">
                    <h2 className="text-xl font-bold text-[#1A1A1A] mb-4">Calculadora de Ganancias (GreenBoy)</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div className="bg-white/80 rounded-xl p-4 border border-[#00C6A2]/20">
                            <p className="text-sm text-[#1A1A1A]/60 mb-1">Ingresos Totales</p>
                            <p className="text-2xl font-bold text-[#1A1A1A]">{currency}{dashboardData.totalRevenue.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="bg-white/80 rounded-xl p-4 border border-red-200">
                            <p className="text-sm text-[#1A1A1A]/60 mb-1">Costo de Proveedor</p>
                            <p className="text-2xl font-bold text-red-600">{currency}{dashboardData.totalProviderCost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="bg-white/80 rounded-xl p-4 border border-blue-200">
                            <p className="text-sm text-[#1A1A1A]/60 mb-1">Sobrante</p>
                            <p className="text-2xl font-bold text-blue-600">{currency}{dashboardData.profitAfterProviderCost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="bg-white/80 rounded-xl p-4 border border-[#FFD95E]/20">
                            <p className="text-sm text-[#1A1A1A]/60 mb-1">Ganancias Plataforma (50%)</p>
                            <p className="text-2xl font-bold text-[#FFD95E]">{currency}{platformCommission.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="bg-white/80 rounded-xl p-4 border border-[#00C6A2]/30">
                            <p className="text-sm text-[#1A1A1A]/60 mb-1">Tus Ganancias (50%)</p>
                            <p className="text-2xl font-bold text-[#00C6A2]">{currency}{vendorEarnings.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-gradient-to-br from-[#00C6A2]/10 to-[#FFD95E]/10 border border-[#00C6A2]/20 rounded-2xl p-6 mb-8 shadow-sm">
                    <h2 className="text-xl font-bold text-[#1A1A1A] mb-4">Calculadora de Comisiones</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white/80 rounded-xl p-4 border border-[#00C6A2]/20">
                            <p className="text-sm text-[#1A1A1A]/60 mb-1">Ingresos Totales</p>
                            <p className="text-2xl font-bold text-[#1A1A1A]">{currency}{dashboardData.totalRevenue.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="bg-white/80 rounded-xl p-4 border border-[#FFD95E]/20">
                            <p className="text-sm text-[#1A1A1A]/60 mb-1">Comisión Plataforma (15%)</p>
                            <p className="text-2xl font-bold text-[#FFD95E]">{currency}{platformCommission.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="bg-white/80 rounded-xl p-4 border border-[#00C6A2]/30">
                            <p className="text-sm text-[#1A1A1A]/60 mb-1">Tus Ganancias (85%)</p>
                            <p className="text-2xl font-bold text-[#00C6A2]">{currency}{vendorEarnings.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                        </div>
                    </div>
                </div>
            )}

            <h2 className="text-xl font-bold text-[#1A1A1A] mb-4">Reseñas Totales</h2>

            <div className="mt-5">
                {
                    dashboardData.ratings.map((review, index) => (
                        <div key={index} className="flex max-sm:flex-col gap-5 sm:items-center justify-between py-6 border-b border-slate-200 text-sm text-slate-600 max-w-4xl">
                            <div>
                                <div className="flex gap-3">
                                    <Image src={review.user.image} alt="" className="w-10 aspect-square rounded-full" width={100} height={100} />
                                    <div>
                                        <p className="font-medium">{review.user.name}</p>
                                        <p className="font-light text-slate-500">{new Date(review.createdAt).toDateString()}</p>
                                    </div>
                                </div>
                                <p className="mt-3 text-slate-500 max-w-xs leading-6">{review.review}</p>
                            </div>
                            <div className="flex flex-col justify-between gap-6 sm:items-end">
                                <div className="flex flex-col sm:items-end">
                                    <p className="text-slate-400">{review.product?.category}</p>
                                    <p className="font-medium">{review.product?.name}</p>
                                    <div className='flex items-center'>
                                        {Array(5).fill('').map((_, index) => (
                                            <StarIcon key={index} size={17} className='text-transparent mt-0.5' fill={review.rating >= index + 1 ? "#00C950" : "#D1D5DB"} />
                                        ))}
                                    </div>
                                </div>
                                <button onClick={() => router.push(`/product/${review.product.id}`)} className="bg-[#00C6A2]/10 hover:bg-[#00C6A2]/20 text-[#00C6A2] px-5 py-2 rounded-full transition-all font-semibold">Ver Producto</button>
                            </div>
                        </div>
                    ))
                }
            </div>
        </div>
    )
}