'use client'
import { Search, ShoppingCart, User, LogOut, Package } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { getCurrentUser, signOut, getUserRole, isAdmin, isVendor } from "@/lib/supabase/auth";
import { supabase } from "@/lib/supabase/client";
import AuthModal from "./AuthModal";

const Navbar = () => {

    const router = useRouter();

    const [search, setSearch] = useState('')
    const [user, setUser] = useState(null)
    const [authModalOpen, setAuthModalOpen] = useState(false)
    const cartCount = useSelector(state => state.cart.total)

    useEffect(() => {
        checkUser()
        
        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null)
        })
        
        // Listen for custom event to open auth modal (from Banner)
        const handleOpenAuthModal = () => {
            setAuthModalOpen(true)
        }
        window.addEventListener('openAuthModal', handleOpenAuthModal)

        return () => {
            subscription.unsubscribe()
            window.removeEventListener('openAuthModal', handleOpenAuthModal)
        }
    }, [])

    const checkUser = async () => {
        const { user } = await getCurrentUser()
        setUser(user)
    }

    const handleSignOut = async () => {
        await signOut()
        setUser(null)
        router.push('/')
    }

    const handleSearch = (e) => {
        e.preventDefault()
        router.push(`/shop?search=${search}`)
    }

    return (
        <>
            <nav className="relative bg-[#FAFAF6] border-b border-[#00C6A2]/10">
                <div className="mx-6">
                    <div className="flex items-center justify-between max-w-7xl mx-auto py-4 transition-all">

                        <Link href="/" className="relative text-4xl font-bold text-[#1A1A1A]">
                            <span className="text-[#00C6A2]">4</span>joint
                            <span className="absolute text-xs font-semibold -top-1 -right-8 px-2 py-0.5 rounded-full flex items-center gap-1 text-white bg-[#00C6A2]">
                                🌿
                            </span>
                        </Link>

                        {/* Desktop Menu */}
                        <div className="hidden sm:flex items-center gap-4 lg:gap-8 text-[#1A1A1A]/80">
                            <Link href="/" className="hover:text-[#00C6A2] transition-colors">Inicio</Link>
                            <Link href="/shop" className="hover:text-[#00C6A2] transition-colors">Tienda</Link>

                            <form onSubmit={handleSearch} className="hidden xl:flex items-center w-xs text-sm gap-2 bg-white/80 backdrop-blur-sm px-4 py-3 rounded-full border border-[#00C6A2]/20 shadow-sm">
                                <Search size={18} className="text-[#1A1A1A]/60" />
                                <input className="w-full bg-transparent outline-none placeholder-[#1A1A1A]/50 text-[#1A1A1A]" type="text" placeholder="Buscar productos" value={search} onChange={(e) => setSearch(e.target.value)} required />
                            </form>

                            <Link href="/cart" className="relative flex items-center gap-2 text-[#1A1A1A]/80 hover:text-[#00C6A2] transition-colors">
                                <ShoppingCart size={18} />
                                <span className="hidden md:inline">Carrito</span>
                                {cartCount > 0 && (
                                    <span className="absolute -top-1 left-3 text-[10px] text-white bg-[#00C6A2] size-4 rounded-full flex items-center justify-center font-semibold">{cartCount}</span>
                                )}
                            </Link>

                            {user ? (
                                <div className="flex items-center gap-3">
                                    {isAdmin(user) && (
                                        <Link href="/admin" className="px-6 py-2.5 bg-[#FFD95E] hover:bg-[#FFD044] text-[#1A1A1A] rounded-full font-semibold transition-all hover:scale-105 active:scale-95 shadow-md">
                                            Admin
                                        </Link>
                                    )}
                                    {isVendor(user) && (
                                        <Link href="/store" className="px-6 py-2.5 bg-[#00C6A2] hover:bg-[#00B894] text-white rounded-full font-semibold transition-all hover:scale-105 active:scale-95 shadow-md">
                                            Mi Tienda
                                        </Link>
                                    )}
                                    <div className="relative group">
                                        <button className="flex items-center gap-2 px-4 py-2.5 bg-white/80 hover:bg-white border border-[#00C6A2]/20 rounded-full font-semibold transition-all hover:scale-105 active:scale-95">
                                            <User size={18} />
                                            <span className="hidden md:inline">{user.email?.split('@')[0]}</span>
                                        </button>
                                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-lg border border-[#00C6A2]/20 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                                            <div className="p-2 space-y-1">
                                                <Link
                                                    href="/orders"
                                                    className="w-full flex items-center gap-2 px-4 py-2 text-[#1A1A1A] hover:bg-[#00C6A2]/10 rounded-xl transition-colors"
                                                >
                                                    <Package size={16} />
                                                    Mis Pedidos
                                                </Link>
                                                <button
                                                    onClick={handleSignOut}
                                                    className="w-full flex items-center gap-2 px-4 py-2 text-[#1A1A1A] hover:bg-[#00C6A2]/10 rounded-xl transition-colors"
                                                >
                                                    <LogOut size={16} />
                                                    Cerrar Sesión
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <button 
                                    onClick={() => setAuthModalOpen(true)}
                                    className="px-8 py-2.5 bg-[#00C6A2] hover:bg-[#00B894] transition-all text-white rounded-full font-semibold shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
                                >
                                    Iniciar Sesión
                                </button>
                            )}

                        </div>

                        {/* Mobile User Button  */}
                        <div className="sm:hidden flex items-center gap-3">
                            <Link href="/cart" className="relative">
                                <ShoppingCart size={20} className="text-[#1A1A1A]/80" />
                                {cartCount > 0 && (
                                    <span className="absolute -top-1 -right-1 text-[10px] text-white bg-[#00C6A2] size-4 rounded-full flex items-center justify-center font-semibold">{cartCount}</span>
                                )}
                            </Link>
                            {user ? (
                                <button 
                                    onClick={handleSignOut}
                                    className="px-6 py-2 bg-white/80 hover:bg-white border border-[#00C6A2]/20 text-sm transition text-[#1A1A1A] rounded-full font-semibold"
                                >
                                    Salir
                                </button>
                            ) : (
                                <button 
                                    onClick={() => setAuthModalOpen(true)}
                                    className="px-6 py-2 bg-[#00C6A2] hover:bg-[#00B894] text-sm transition text-white rounded-full font-semibold"
                                >
                                    Entrar
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </nav>
            <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
        </>
    )
}

export default Navbar