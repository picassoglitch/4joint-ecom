'use client'
import BestSelling from "@/components/BestSelling";
import Hero from "@/components/Hero";
import Newsletter from "@/components/Newsletter";
import OurSpecs from "@/components/OurSpec";
import LatestProducts from "@/components/LatestProducts";
import Link from "next/link";
import { ShoppingBag, Sparkles, TrendingUp, Zap } from "lucide-react";

export default function Home() {
    return (
        <div className="bg-[#FAFAF8] min-h-screen">
            {/* Hero Section - Editorial & Immersive */}
            <div className="relative overflow-hidden">
                <Hero />
                
                {/* Premium Action Cards - Refined & Calm */}
                <div className="sticky top-20 z-40 mx-6 mb-12">
                    <div className="max-w-7xl mx-auto">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                            <Link 
                                href="/shop" 
                                className="group premium-card premium-glow bg-white/80 backdrop-blur-sm p-8 rounded-3xl border border-[#00C6A2]/10 hover:border-[#00C6A2]/20 transition-all duration-300"
                            >
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#00C6A2]/10 to-[#00C6A2]/5 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-300">
                                    <ShoppingBag size={28} className="text-[#00C6A2]" />
                                </div>
                                <h3 className="font-semibold text-lg mb-2 text-[#1A1A1A] leading-tight">Explorar</h3>
                                <p className="text-sm text-[#1A1A1A]/60 leading-relaxed">Ver todos los productos</p>
                            </Link>
                            
                            <Link 
                                href="/tiendas-cerca" 
                                className="group premium-card premium-glow bg-white/80 backdrop-blur-sm p-8 rounded-3xl border border-[#FFD95E]/10 hover:border-[#FFD95E]/20 transition-all duration-300"
                            >
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FFD95E]/10 to-[#FFD95E]/5 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-300">
                                    <Sparkles size={28} className="text-[#FFD95E]" />
                                </div>
                                <h3 className="font-semibold text-lg mb-2 text-[#1A1A1A] leading-tight">Tiendas</h3>
                                <p className="text-sm text-[#1A1A1A]/60 leading-relaxed">Cerca de ti</p>
                            </Link>
                            
                            <Link 
                                href="/shop?category=Extractos" 
                                className="group premium-card premium-glow bg-white/80 backdrop-blur-sm p-8 rounded-3xl border border-purple-200/30 hover:border-purple-300/40 transition-all duration-300"
                            >
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-100/50 to-purple-50/30 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-300">
                                    <Zap size={28} className="text-purple-500/80" />
                                </div>
                                <h3 className="font-semibold text-lg mb-2 text-[#1A1A1A] leading-tight">Extractos</h3>
                                <p className="text-sm text-[#1A1A1A]/60 leading-relaxed">Premium</p>
                            </Link>
                            
                            <Link 
                                href="/shop?category=Flores" 
                                className="group premium-card premium-glow bg-white/80 backdrop-blur-sm p-8 rounded-3xl border border-green-200/30 hover:border-green-300/40 transition-all duration-300"
                            >
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-100/50 to-green-50/30 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-300">
                                    <TrendingUp size={28} className="text-green-500/80" />
                                </div>
                                <h3 className="font-semibold text-lg mb-2 text-[#1A1A1A] leading-tight">Flores</h3>
                                <p className="text-sm text-[#1A1A1A]/60 leading-relaxed">Más vendidas</p>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Products Sections - More Breathing Room */}
            <div className="space-y-24 pb-24">
                <LatestProducts />
                <BestSelling />
            </div>

            {/* Specs and Newsletter - Soft Transitions */}
            <div className="bg-gradient-to-b from-[#FAFAF8] to-white/50 py-20">
                <OurSpecs />
            </div>
            <Newsletter />
        </div>
    );
}
