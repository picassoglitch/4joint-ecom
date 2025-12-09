'use client'

import { usePathname } from "next/navigation"
import { HomeIcon, ShieldCheckIcon, StoreIcon, TicketPercentIcon, Users, Settings } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { assets } from "@/assets/assets"

const AdminSidebar = () => {

    const pathname = usePathname()

    const sidebarLinks = [
        { name: 'Panel', href: '/admin', icon: HomeIcon },
        { name: 'Usuarios', href: '/admin/users', icon: Users },
        { name: 'Tiendas', href: '/admin/stores', icon: StoreIcon },
        { name: 'Aprobar Tiendas', href: '/admin/approve', icon: ShieldCheckIcon },
        { name: 'Cupones', href: '/admin/coupons', icon: TicketPercentIcon  },
        { name: 'Configuración', href: '/admin/site-config', icon: Settings  },
    ]

    return (
        <div className="inline-flex h-full flex-col gap-5 border-r border-[#00C6A2]/20 sm:min-w-60 bg-[#FAFAF6]">
            <div className="flex flex-col gap-3 justify-center items-center pt-8 max-sm:hidden">
                <div className="text-3xl font-bold text-[#1A1A1A]">
                    <span className="text-[#00C6A2]">4</span>joint
                </div>
                <p className="text-[#1A1A1A]/70 text-sm">Panel Admin</p>
            </div>

            <div className="max-sm:mt-6">
                {
                    sidebarLinks.map((link, index) => (
                        <Link key={index} href={link.href} className={`relative flex items-center gap-3 text-[#1A1A1A]/70 hover:bg-[#00C6A2]/10 p-2.5 transition rounded-xl ${pathname === link.href && 'bg-[#00C6A2]/20 text-[#00C6A2] font-semibold'}`}>
                            <link.icon size={18} className="sm:ml-5" />
                            <p className="max-sm:hidden">{link.name}</p>
                            {pathname === link.href && <span className="absolute bg-[#00C6A2] right-0 top-1.5 bottom-1.5 w-1 sm:w-1.5 rounded-l"></span>}
                        </Link>
                    ))
                }
            </div>
        </div>
    )
}

export default AdminSidebar