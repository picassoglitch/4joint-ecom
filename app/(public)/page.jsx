'use client'
import BestSelling from "@/components/BestSelling";
import HeroCarousel from "@/components/HeroCarousel";
import Newsletter from "@/components/Newsletter";
import OurSpecs from "@/components/OurSpec";
import LatestProducts from "@/components/LatestProducts";
import FeedBlock from "@/components/FeedBlock";
import PopularStores from "@/components/PopularStores";
import { useSelector } from "react-redux";
import { Zap, TrendingUp, Clock, Package, Flame } from "lucide-react";

export default function Home() {
    const products = useSelector(state => state.product.list);
    const isLoading = useSelector(state => state.product.loading);
    
    // Create multiple feed blocks with different contexts (marketplace repetition pattern)
    const affordableProducts = products.length > 0
        ? products.slice().filter(p => p.price < 500).slice(0, 8)
        : [];
    
    const popularProducts = products.length > 0
        ? products.slice().sort((a, b) => (b.rating?.length || 0) - (a.rating?.length || 0)).slice(0, 8)
        : [];
    
    const recentProducts = products.length > 0
        ? products.slice().sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 8)
        : [];
    
    const edibleProducts = products.length > 0
        ? products.slice().filter(p => p.category?.toLowerCase().includes('comestible') || p.category?.toLowerCase().includes('edible')).slice(0, 8)
        : [];
    
    const allProductsShuffled1 = products.length > 0
        ? [...products].sort(() => Math.random() - 0.5).slice(0, 8)
        : [];
    
    const allProductsShuffled2 = products.length > 0
        ? [...products].sort(() => Math.random() - 0.5).slice(0, 8)
        : [];

    return (
        <div className="space-y-0">
            <HeroCarousel />
            
            {/* Popular Stores - Horizontal scroll */}
            <PopularStores />
            
            {/* Immediate density after hero - Popular today */}
            <FeedBlock
                title="Populares hoy"
                subtitle="Los productos más buscados"
                products={popularProducts.map((p, i) => ({ ...p, _activitySignal: i < 2 ? 'Popular hoy' : null }))}
                showLabel={true}
                labelType={{ text: 'Popular', icon: TrendingUp, color: 'bg-[#00C6A2]' }}
                isLoading={isLoading}
            />
            
            <LatestProducts />
            <BestSelling />
            
            {/* Menos de $500 */}
            <FeedBlock
                title="Menos de $500"
                subtitle="Ofertas accesibles para todos"
                products={affordableProducts}
                showLabel={true}
                labelType={{ text: 'Oferta', icon: Zap, color: 'bg-[#FFD95E]' }}
                isLoading={isLoading}
            />
            
            {/* Comestibles */}
            <FeedBlock
                title="Comestibles"
                subtitle="Productos comestibles destacados"
                products={edibleProducts}
                showLabel={true}
                labelType={{ text: 'Nuevo', icon: Package, color: 'bg-blue-500' }}
                isLoading={isLoading}
            />
            
            {/* Recomendados */}
            <FeedBlock
                title="Recomendados"
                subtitle="Selección especial para ti"
                products={allProductsShuffled1}
                isLoading={isLoading}
            />
            
            <OurSpecs />
            
            {/* Entrega rápida - Reuse products with different context */}
            <FeedBlock
                title="Entrega rápida"
                subtitle="Productos disponibles ahora"
                products={recentProducts.slice(0, 6)}
                showLabel={true}
                labelType={{ text: 'Disponible', icon: Clock, color: 'bg-green-500' }}
                isLoading={isLoading}
                skeletonCount={6}
            />
            
            {/* Seguir explorando */}
            <FeedBlock
                title="Seguir explorando"
                subtitle="Más productos que podrían interesarte"
                products={allProductsShuffled2}
                isLoading={isLoading}
            />
            
            <Newsletter />
        </div>
    );
}
