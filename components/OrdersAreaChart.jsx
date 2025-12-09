'use client'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, LineChart, Line } from 'recharts'

export default function OrdersAreaChart({ allOrders }) {

    // Group orders by date
    const ordersPerDay = allOrders.reduce((acc, order) => {
        const date = new Date(order.createdAt).toISOString().split('T')[0] // format: YYYY-MM-DD
        acc[date] = (acc[date] || 0) + 1
        return acc
    }, {})

    // Group revenue by date
    const revenuePerDay = allOrders.reduce((acc, order) => {
        const date = new Date(order.createdAt).toISOString().split('T')[0]
        acc[date] = (acc[date] || 0) + (order.total || 0)
        return acc
    }, {})

    // Convert to array for Recharts
    const chartData = Object.entries(ordersPerDay).map(([date, count]) => ({
        date: new Date(date).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' }),
        orders: count,
        revenue: revenuePerDay[date] || 0
    })).sort((a, b) => new Date(a.date) - new Date(b.date))

    return (
        <div className="space-y-6">
            <div className="w-full h-[300px]">
                <h3 className="text-lg font-bold text-[#1A1A1A] mb-4">Pedidos por Día</h3>
                <ResponsiveContainer width="100%" height="100%"> 
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#00C6A2" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#00C6A2" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#00C6A2/10" />
                        <XAxis dataKey="date" stroke="#1A1A1A/60" />
                        <YAxis allowDecimals={false} stroke="#1A1A1A/60" label={{ value: 'Pedidos', angle: -90, position: 'insideLeft', style: { fill: '#1A1A1A' } }} />
                        <Tooltip 
                            contentStyle={{ 
                                backgroundColor: '#FAFAF6', 
                                border: '1px solid #00C6A2/20', 
                                borderRadius: '12px',
                                color: '#1A1A1A'
                            }} 
                        />
                        <Area type="monotone" dataKey="orders" stroke="#00C6A2" fill="url(#colorOrders)" strokeWidth={2} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
            
            <div className="w-full h-[300px]">
                <h3 className="text-lg font-bold text-[#1A1A1A] mb-4">Ingresos por Día</h3>
                <ResponsiveContainer width="100%" height="100%"> 
                    <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#00C6A2/10" />
                        <XAxis dataKey="date" stroke="#1A1A1A/60" />
                        <YAxis stroke="#1A1A1A/60" label={{ value: 'MXN $', angle: -90, position: 'insideLeft', style: { fill: '#1A1A1A' } }} />
                        <Tooltip 
                            contentStyle={{ 
                                backgroundColor: '#FAFAF6', 
                                border: '1px solid #00C6A2/20', 
                                borderRadius: '12px',
                                color: '#1A1A1A'
                            }}
                            formatter={(value) => [`MXN $${value.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 'Ingresos']}
                        />
                        <Bar dataKey="revenue" fill="#FFD95E" radius={[8, 8, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}
