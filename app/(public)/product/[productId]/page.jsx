'use client'
import ProductDescription from "@/components/ProductDescription";
import ProductDetails from "@/components/ProductDetails";
import FeedBlock from "@/components/FeedBlock";
import { useParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { useSelector } from "react-redux";
import { TrendingUp } from "lucide-react";

export default function Product() {
    const { productId } = useParams();
    const [product, setProduct] = useState();
    const [isVisible, setIsVisible] = useState(false);
    const pageRef = useRef(null);
    const products = useSelector(state => state.product.list);

    const fetchProduct = async () => {
        const product = products.find((product) => product.id === productId);
        setProduct(product);
    }

    useEffect(() => {
        if (products.length > 0) {
            fetchProduct()
        }
        scrollTo(0, 0)
    }, [productId, products]);

    // Track recently viewed
    useEffect(() => {
        if (product?.id) {
            try {
                const viewed = localStorage.getItem('recently_viewed_products')
                const productIds = viewed ? JSON.parse(viewed) : []
                // Add to front, remove duplicates, limit to 10
                const updated = [product.id, ...productIds.filter(id => id !== product.id)].slice(0, 10)
                localStorage.setItem('recently_viewed_products', JSON.stringify(updated))
            } catch (e) {
                console.error('Error saving recently viewed:', e)
            }
        }
    }, [product])

    // Scroll reveal
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                }
            },
            { threshold: 0.1 }
        );

        if (pageRef.current) {
            observer.observe(pageRef.current);
        }

        return () => {
            if (pageRef.current) {
                observer.unobserve(pageRef.current);
            }
        };
    }, []);

    // Get multiple related product sets for marketplace density
    const relatedProducts = product && products.length > 0
        ? products
            .filter(p => p.id !== product.id && p.category === product.category)
            .slice(0, 8)
        : [];
    
    const similarProducts = product && products.length > 0
        ? products
            .filter(p => p.id !== product.id && p.category !== product.category)
            .sort(() => Math.random() - 0.5)
            .slice(0, 8)
        : [];
    
    const popularInCategory = product && products.length > 0
        ? products
            .filter(p => p.id !== product.id && p.category === product.category)
            .sort((a, b) => (b.rating?.length || 0) - (a.rating?.length || 0))
            .slice(0, 6)
        : [];

    return (
        <div 
            ref={pageRef}
            className={`mx-6 transition-all duration-700 ease-out ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
        >
            <div className="max-w-7xl mx-auto">

                {/* Breadcrumbs */}
                <div className="text-slate-600 text-sm mt-8 mb-5 flex items-center gap-2">
                    <a href="/" className="hover:text-[#00C6A2] transition-colors">Inicio</a>
                    <span>/</span>
                    <a href="/shop" className="hover:text-[#00C6A2] transition-colors">Productos</a>
                    {product?.category && (
                        <>
                            <span>/</span>
                            <span className="text-[#00C6A2] font-medium">{product.category}</span>
                        </>
                    )}
                </div>

                {/* Product Details */}
                {product && (<ProductDetails product={product} />)}

                {/* Description & Reviews */}
                {product && (<ProductDescription product={product} />)}

                {/* Multiple related product blocks for marketplace density */}
                {relatedProducts.length > 0 && (
                    <div className="mt-12 mb-8">
                        <FeedBlock
                            title="Productos similares"
                            subtitle="En la misma categoría"
                            products={relatedProducts}
                        />
                    </div>
                )}
                
                {popularInCategory.length > 0 && (
                    <div className="mb-8">
                        <FeedBlock
                            title="Más vendidos en esta categoría"
                            subtitle="Los favoritos de los clientes"
                            products={popularInCategory}
                            showLabel={true}
                            labelType={{ text: 'Popular', icon: TrendingUp, color: 'bg-[#00C6A2]' }}
                        />
                    </div>
                )}
                
                {similarProducts.length > 0 && (
                    <div className="mb-12">
                        <FeedBlock
                            title="Otros clientes vieron"
                            subtitle="Productos que también podrían interesarte"
                            products={similarProducts}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}