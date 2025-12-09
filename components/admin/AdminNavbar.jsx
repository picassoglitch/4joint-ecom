'use client'
import Link from "next/link"

const AdminNavbar = () => {


    return (
        <div className="flex items-center justify-between px-12 py-3 border-b border-[#00C6A2]/20 transition-all bg-[#FAFAF6]">
            <Link href="/" className="relative text-4xl font-bold text-[#1A1A1A]">
                <span className="text-[#00C6A2]">4</span>joint
                <span className="absolute text-xs font-semibold -top-1 -right-8 px-2 py-0.5 rounded-full flex items-center gap-1 text-white bg-[#00C6A2]">
                    Admin
                </span>
            </Link>
            <div className="flex items-center gap-3">
                <p className="text-[#1A1A1A]/70">Panel de Administración</p>
            </div>
        </div>
    )
}

export default AdminNavbar