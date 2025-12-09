'use client'

import { addToCart } from "@/lib/features/cart/cartSlice";
import { StarIcon, TagIcon, EarthIcon, CreditCardIcon, UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Image from "next/image";
import Counter from "./Counter";
import { useDispatch, useSelector } from "react-redux";

const ProductDetails = ({ product }) => {
    // Safety check: if product is not provided, return null
    if (!product || !product.id) {
        return (
            <div className="text-center py-12">
                <p className="text-slate-500">Producto no encontrado</p>
            </div>
        );
    }

    const productId = product.id;
    const currency = 'MXN $';

    const cart = useSelector(state => state.cart.cartItems);
    const dispatch = useDispatch();

    const router = useRouter()

    // Safely get images array
    const productImages = Array.isArray(product.images) && product.images.length > 0 
        ? product.images 
        : ['/placeholder-product.png'];
    
    const [mainImage, setMainImage] = useState(productImages[0]);
    const [selectedVariant, setSelectedVariant] = useState(null);

    // Get variants from product (can be array or null)
    const variants = product.variants && Array.isArray(product.variants) && product.variants.length > 0
        ? product.variants
        : null;

    // Set default variant if available
    useEffect(() => {
        if (variants && variants.length > 0 && !selectedVariant) {
            setSelectedVariant(variants[0])
        }
    }, [variants])

    // Get current price based on variant or product price
    const currentPrice = selectedVariant ? selectedVariant.price : (product.price || 0);
    const currentMrp = selectedVariant ? (selectedVariant.mrp || selectedVariant.price) : (product.mrp || product.price || 0);

    const addToCartHandler = () => {
        // Include variant info if selected
        const cartItem = {
            productId,
            variant: selectedVariant ? {
                name: selectedVariant.name,
                price: selectedVariant.price,
            } : null
        }
        dispatch(addToCart(cartItem))
    }

    // Safely calculate average rating
    const ratings = product.rating && Array.isArray(product.rating) && product.rating.length > 0
        ? product.rating
        : [];
    const averageRating = ratings.length > 0
        ? ratings.reduce((acc, item) => acc + (item.rating || 0), 0) / ratings.length
        : 0;
    
    return (
        <div className="flex max-lg:flex-col gap-12">
            <div className="flex max-sm:flex-col-reverse gap-3">
                <div className="flex sm:flex-col gap-3">
                    {productImages.map((image, index) => (
                        <div key={index} onClick={() => setMainImage(productImages[index])} className="bg-slate-100 flex items-center justify-center size-26 rounded-lg group cursor-pointer">
                            <Image src={image} className="group-hover:scale-103 group-active:scale-95 transition" alt="" width={45} height={45} />
                        </div>
                    ))}
                </div>
                <div className="flex justify-center items-center h-100 sm:size-113 bg-slate-100 rounded-lg ">
                    <Image src={mainImage || productImages[0]} alt={product.name || 'Product'} width={250} height={250} />
                </div>
            </div>
            <div className="flex-1">
                <h1 className="text-3xl font-semibold text-slate-800">{product.name}</h1>
                {ratings.length > 0 && (
                    <div className='flex items-center mt-2'>
                        {Array(5).fill('').map((_, index) => (
                            <StarIcon key={index} size={14} className='text-transparent mt-0.5' fill={averageRating >= index + 1 ? "#00C950" : "#D1D5DB"} />
                        ))}
                        <p className="text-sm ml-3 text-slate-500">{ratings.length} Reseñas</p>
                    </div>
                )}
                {/* Variant Selection */}
                {variants && variants.length > 0 && (
                    <div className="my-6">
                        <p className="text-lg text-slate-800 font-semibold mb-3">Selecciona la cantidad:</p>
                        <div className="flex flex-wrap gap-3">
                            {variants.map((variant, index) => (
                                <button
                                    key={index}
                                    onClick={() => setSelectedVariant(variant)}
                                    className={`px-6 py-3 rounded-full font-medium transition-all ${
                                        selectedVariant?.name === variant.name
                                            ? 'bg-[#00C6A2] text-white shadow-lg scale-105'
                                            : 'bg-white border-2 border-[#00C6A2]/30 text-[#1A1A1A] hover:border-[#00C6A2] hover:scale-105'
                                    }`}
                                >
                                    <div className="text-center">
                                        <div className="font-semibold">{variant.name}</div>
                                        <div className="text-sm opacity-90">{currency}{variant.price}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex items-start my-6 gap-3 text-2xl font-semibold text-slate-800">
                    <p> {currency}{currentPrice} </p>
                    {currentMrp > currentPrice && (
                        <p className="text-xl text-slate-500 line-through">{currency}{currentMrp}</p>
                    )}
                </div>
                {currentMrp > currentPrice && (
                    <div className="flex items-center gap-2 text-slate-500">
                        <TagIcon size={14} />
                        <p>Ahorra {((currentMrp - currentPrice) / currentMrp * 100).toFixed(0)}% ahora</p>
                    </div>
                )}
                <div className="flex items-end gap-5 mt-10">
                    {(() => {
                        // Check if product is in cart (with or without variant)
                        const cartKey = selectedVariant ? `${productId}_${selectedVariant.name}` : productId;
                        const isInCart = cart[cartKey] || (variants ? false : cart[productId]);
                        const cartItem = cart[cartKey] || cart[productId];
                        const quantity = typeof cartItem === 'number' ? cartItem : (cartItem?.quantity || 0);
                        
                        return isInCart && quantity > 0 ? (
                            <div className="flex flex-col gap-3">
                                <p className="text-lg text-slate-800 font-semibold">Cantidad</p>
                                <Counter productId={productId} variant={selectedVariant} />
                            </div>
                        ) : null;
                    })()}
                    {(() => {
                        const cartKey = selectedVariant ? `${productId}_${selectedVariant.name}` : productId;
                        const isInCart = cart[cartKey] || (!variants && cart[productId]);
                        return (
                            <button 
                                onClick={() => !isInCart ? addToCartHandler() : router.push('/cart')} 
                                className="bg-slate-800 text-white px-10 py-3 text-sm font-medium rounded hover:bg-slate-900 active:scale-95 transition"
                            >
                                {!isInCart ? 'Agregar al Carrito' : 'Ver Carrito'}
                            </button>
                        );
                    })()}
                </div>
                <hr className="border-gray-300 my-5" />
                <div className="flex flex-col gap-4 text-slate-500">
                    <p className="flex gap-3"> <EarthIcon className="text-slate-400" /> Envío gratis a todo México </p>
                    <p className="flex gap-3"> <CreditCardIcon className="text-slate-400" /> Pago 100% Seguro </p>
                    <p className="flex gap-3"> <UserIcon className="text-slate-400" /> Confiado por las mejores marcas </p>
                </div>

            </div>
        </div>
    )
}

export default ProductDetails