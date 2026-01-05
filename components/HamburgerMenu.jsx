'use client'
import { useEffect, useState } from 'react'
import { X, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getCategories } from '@/lib/supabase/database'
import Link from 'next/link'

export default function HamburgerMenu({ isOpen, onClose }) {
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
                className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${
                    isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
                onClick={onClose}
            />
            
            {/* Slide-in menu */}
            <div className={`fixed left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-white z-50 shadow-2xl transform transition-transform duration-300 ease-out overflow-y-auto ${
                isOpen ? 'translate-x-0' : '-translate-x-full'
            }`}>
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-[#1A1A1A]">Menú</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                        aria-label="Cerrar menú"
                    >
                        <X size={20} className="text-[#1A1A1A]" />
                    </button>
                </div>

                <div className="py-2">
                    {/* Main Navigation */}
                    <div className="px-4 py-2">
                        <Link
                            href="/"
                            onClick={onClose}
                            className="block py-3 px-4 hover:bg-slate-50 rounded-lg transition-colors font-medium text-[#1A1A1A]"
                        >
                            Inicio
                        </Link>
                        <Link
                            href="/shop"
                            onClick={onClose}
                            className="block py-3 px-4 hover:bg-slate-50 rounded-lg transition-colors font-medium text-[#1A1A1A]"
                        >
                            Todos los Productos
                        </Link>
                        <Link
                            href="/tiendas-cerca"
                            onClick={onClose}
                            className="block py-3 px-4 hover:bg-slate-50 rounded-lg transition-colors font-medium text-[#1A1A1A]"
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
                                            className="w-full flex items-center justify-between py-3 px-4 hover:bg-slate-50 rounded-lg transition-colors text-left group"
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

