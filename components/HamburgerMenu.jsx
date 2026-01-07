'use client'
import { useEffect, useState } from 'react'
import { X, ChevronRight, ShoppingCart, User, LogOut, Package } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getCategories } from '@/lib/supabase/database'
import { isAdmin, isVendor } from '@/lib/supabase/auth'
import Link from 'next/link'

export default function HamburgerMenu({ isOpen, onClose, user, cartCount = 0, onSignOut, onOpenAuth }) {
    const router = useRouter()
    const [categories, setCategories] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const uniqueCategories = await getCategories()
                setCategories([...new Set(uniqueCategories)])
            } catch (error) {
                console.error('Error fetching categories:', error)
                setCategories(["Extractos", "Flores", "Accesorios"])
            } finally {
                setLoading(false)
            }
        }
        if (isOpen) {
            fetchCategories()
        }
    }, [isOpen])

    const handleCategoryClick = (category) => {
        router.push(`/shop?category=${encodeURIComponent(category)}`)
        onClose()
    }

    return (
        <>
            {/* Backdrop */}
            <div 
                className={`fixed inset-0 bg-black/50 z-[110] transition-opacity duration-300 ${
                    isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
                onClick={onClose}
            />
            
            {/* Slide-in menu */}
            <div className={`fixed left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-white z-[120] shadow-2xl transform transition-transform duration-300 ease-out overflow-y-auto ${
                isOpen ? 'translate-x-0' : '-translate-x-full'
            }`} style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-[#1A1A1A]">Menú</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation"
                        aria-label="Cerrar menú"
                    >
                        <X size={20} className="text-[#1A1A1A]" />
                    </button>
                </div>

                <div className="py-2">
                    {/* User Account Section (Mobile) */}
                    <div className="px-4 py-2 border-b border-slate-200">
                        {user ? (
                            <div className="space-y-2">
                                <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-lg">
                                    <div className="w-10 h-10 rounded-full bg-[#00C6A2]/20 flex items-center justify-center">
                                        <User size={20} className="text-[#00C6A2]" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-[#1A1A1A] truncate">
                                            {user.email?.split('@')[0] || 'Usuario'}
                                        </p>
                                        <p className="text-xs text-slate-500 truncate">
                                            {user.email}
                                        </p>
                                    </div>
                                </div>
                                
                                <div className="space-y-1">
                                    {isAdmin(user) && (
                                        <Link
                                            href="/admin"
                                            onClick={onClose}
                                            className="flex items-center gap-3 py-3 px-4 hover:bg-slate-50 rounded-lg transition-colors font-medium text-[#1A1A1A] min-h-[44px] touch-manipulation"
                                        >
                                            <span>Admin</span>
                                        </Link>
                                    )}
                                    {isVendor(user) && (
                                        <Link
                                            href="/store"
                                            onClick={onClose}
                                            className="flex items-center gap-3 py-3 px-4 hover:bg-slate-50 rounded-lg transition-colors font-medium text-[#1A1A1A] min-h-[44px] touch-manipulation"
                                        >
                                            <span>Mi Tienda</span>
                                        </Link>
                                    )}
                                    <Link
                                        href="/orders"
                                        onClick={onClose}
                                        className="flex items-center gap-3 py-3 px-4 hover:bg-slate-50 rounded-lg transition-colors font-medium text-[#1A1A1A] min-h-[44px] touch-manipulation"
                                    >
                                        <Package size={18} className="text-[#1A1A1A]" />
                                        <span>Mis Pedidos</span>
                                    </Link>
                                    <button
                                        onClick={() => {
                                            onSignOut?.()
                                            onClose()
                                        }}
                                        className="w-full flex items-center gap-3 py-3 px-4 hover:bg-slate-50 rounded-lg transition-colors font-medium text-[#1A1A1A] min-h-[44px] touch-manipulation text-left"
                                    >
                                        <LogOut size={18} className="text-[#1A1A1A]" />
                                        <span>Cerrar Sesión</span>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => {
                                    onOpenAuth?.()
                                    onClose()
                                }}
                                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#00C6A2] hover:bg-[#00B894] transition-all text-white rounded-lg font-semibold text-base shadow-md hover:shadow-lg min-h-[44px] touch-manipulation"
                            >
                                <User size={18} />
                                <span>Entrar / Iniciar Sesión</span>
                            </button>
                        )}
                    </div>

                    {/* Cart (Mobile) */}
                    <div className="px-4 py-2 border-b border-slate-200">
                        <Link
                            href="/cart"
                            onClick={onClose}
                            className="flex items-center justify-between py-3 px-4 hover:bg-slate-50 rounded-lg transition-colors font-medium text-[#1A1A1A] min-h-[44px] touch-manipulation"
                        >
                            <div className="flex items-center gap-3">
                                <ShoppingCart size={20} className="text-[#1A1A1A]" />
                                <span>Carrito</span>
                            </div>
                            {cartCount > 0 && (
                                <span className="text-sm text-white bg-[#00C6A2] px-2.5 py-1 rounded-full font-bold min-w-[24px] text-center">
                                    {cartCount}
                                </span>
                            )}
                        </Link>
                    </div>

                    {/* Main Navigation */}
                    <div className="px-4 py-2">
                        <Link
                            href="/"
                            onClick={onClose}
                            className="block py-3 px-4 hover:bg-slate-50 rounded-lg transition-colors font-medium text-[#1A1A1A] min-h-[44px] flex items-center touch-manipulation"
                        >
                            Inicio
                        </Link>
                        <Link
                            href="/shop"
                            onClick={onClose}
                            className="block py-3 px-4 hover:bg-slate-50 rounded-lg transition-colors font-medium text-[#1A1A1A] min-h-[44px] flex items-center touch-manipulation"
                        >
                            Todos los Productos
                        </Link>
                        <Link
                            href="/tiendas-cerca"
                            onClick={onClose}
                            className="block py-3 px-4 hover:bg-slate-50 rounded-lg transition-colors font-medium text-[#1A1A1A] min-h-[44px] flex items-center touch-manipulation"
                        >
                            Tiendas cerca de ti
                        </Link>
                    </div>

                    {/* Categories Section */}
                    <div className="border-t border-slate-200 mt-2 pt-2">
                        <div className="px-4 py-2">
                            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">
                                Categorías
                            </h3>
                            {loading ? (
                                <div className="space-y-2">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="h-10 bg-slate-100 rounded animate-pulse" />
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {categories.map((category, index) => (
                                        <button
                                            key={index}
                                            onClick={() => handleCategoryClick(category)}
                                            className="w-full flex items-center justify-between py-3 px-4 hover:bg-slate-50 rounded-lg transition-colors text-left group min-h-[44px] touch-manipulation"
                                        >
                                            <span className="text-[#1A1A1A] font-medium">{category}</span>
                                            <ChevronRight size={16} className="text-slate-400 group-hover:text-[#00C6A2] transition-colors" />
                                        </button>
                                    ))}
                                    {categories.length === 0 && (
                                        <p className="text-sm text-slate-500 py-3 px-4">
                                            No hay categorías disponibles
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}
