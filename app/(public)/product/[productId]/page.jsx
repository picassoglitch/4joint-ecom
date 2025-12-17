'use client'
import ProductDescription from "@/components/ProductDescription";
import ProductDetails from "@/components/ProductDetails";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";

export default function Product() {

    const { productId } = useParams();
    const [product, setProduct] = useState();
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
    }, [productId,products]);

    return (
        <div className="mx-6">
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
            </div>
        </div>
    );
}