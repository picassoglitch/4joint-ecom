'use client'
import { useRouter } from 'next/navigation'
import { TrendingUp, Zap, Cookie, DollarSign, Sparkles } from 'lucide-react'

const quickActions = [
    { label: 'Más vendidos', icon: TrendingUp, href: '/shop?sort=popular' },
    { label: 'Ofertas activas', icon: Zap, href: '/shop?filter=offers' },
    { label: 'Comestibles', icon: Cookie, href: '/shop?category=Comestibles' },
    { label: 'Menos de $500', icon: DollarSign, href: '/shop?maxPrice=500' },
    { label: 'Nuevos', icon: Sparkles, href: '/shop?sort=newest' },
]

export default function QuickActionStrip() {
    const router = useRouter()

    return (
        <div className="flex flex-wrap items-center gap-2 mt-4 sm:mt-6">
            {quickActions.map((action, index) => {
                const Icon = action.icon
                return (
                    <button
                        key={index}
                        onClick={() => router.push(action.href)}
                        className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-white/80 backdrop-blur-sm border border-[#00C6A2]/20 rounded-full text-xs sm:text-sm font-medium text-[#1A1A1A] hover:bg-[#00C6A2] hover:text-white hover:border-[#00C6A2] transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm hover:shadow-md"
                    >
                        <Icon size={14} />
                        <span>{action.label}</span>
                    </button>
                )
            })}
        </div>
    )
}




