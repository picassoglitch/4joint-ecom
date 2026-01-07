'use client'

import { addToCart } from "@/lib/features/cart/cartSlice";
import { StarIcon, TagIcon, EarthIcon, CreditCardIcon, UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Image from "next/image";
import Counter from "./Counter";
import { useDispatch, useSelector } from "react-redux";
import { getSafeImageSource, normalizeImageSource } from "@/lib/utils/image";

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

    // Safely get images array and normalize them
    const PLACEHOLDER_PATH = '/img/placeholder-product.svg'
    const rawImages = Array.isArray(product.images) && product.images.length > 0 
        ? product.images 
        : [];
    
    const productImages = rawImages.length > 0
        ? rawImages.map(img => getSafeImageSource(img, productId, PLACEHOLDER_PATH))
        : [PLACEHOLDER_PATH];
    
    const [mainImage, setMainImage] = useState(productImages[0]);
    const [imageErrors, setImageErrors] = useState({});
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
                provider_cost: selectedVariant.provider_cost || 0, // Include provider_cost for GreenBoy calculations
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
        <div className="flex max-lg:flex-col gap-6 sm:gap-12 my-4 sm:my-8 px-4 sm:px-0">
            <div className="flex max-sm:flex-col-reverse gap-3 sm:gap-4">
                <div className="flex sm:flex-col gap-2 sm:gap-3 max-sm:overflow-x-auto max-sm:pb-2">
                    {productImages.map((image, index) => {
                        const imageKey = `thumb-${index}`
                        const hasError = imageErrors[imageKey]
                        const safeSrc = hasError ? PLACEHOLDER_PATH : image
                        
                        return (
                            <div 
                                key={index} 
                                onClick={() => setMainImage(safeSrc)} 
                                className="bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center size-16 sm:size-20 md:size-26 rounded-xl group cursor-pointer border border-slate-200 hover:border-[#00C6A2]/40 transition-all hover:scale-105 shadow-sm flex-shrink-0 touch-manipulation min-w-[64px] min-h-[64px] sm:min-w-[80px] sm:min-h-[80px]"
                            >
                                <Image 
                                    src={safeSrc} 
                                    className="group-hover:scale-110 transition-transform duration-300" 
                                    alt="" 
                                    width={45} 
                                    height={45}
                                    onError={(e) => {
                                        // Prevent infinite loop: only handle error once using dataset flag
                                        if (e.currentTarget.dataset.fallbackApplied) return
                                        e.currentTarget.dataset.fallbackApplied = '1'
                                        
                                        if (!imageErrors[imageKey]) {
                                            if (process.env.NODE_ENV !== 'production') {
                                                console.error('Thumbnail image failed to load:', { productId, index, attemptedSrc: image })
                                            }
                                            setImageErrors(prev => ({ ...prev, [imageKey]: true }))
                                            // Update src to placeholder only if not already set
                                            if (e.currentTarget.src !== PLACEHOLDER_PATH && !e.currentTarget.src.includes('placeholder-product')) {
                                                e.currentTarget.src = PLACEHOLDER_PATH
                                            }
                                        }
                                    }}
                                />
                            </div>
                        )
                    })}
                </div>
                <div className="flex justify-center items-center h-64 sm:h-80 md:h-100 lg:size-113 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border border-slate-200 shadow-lg overflow-hidden w-full sm:w-auto">
                    <Image 
                        src={mainImage || productImages[0] || PLACEHOLDER_PATH} 
                        alt={product.name || 'Product'} 
                        width={400} 
                        height={400} 
                        className="object-contain max-h-full w-auto"
                        onError={(e) => {
                            // Prevent infinite loop: only handle error once using dataset flag
                            if (e.currentTarget.dataset.fallbackApplied) return
                            e.currentTarget.dataset.fallbackApplied = '1'
                            
                            if (e.currentTarget.src !== PLACEHOLDER_PATH && !e.currentTarget.src.includes('placeholder-product')) {
                                if (process.env.NODE_ENV !== 'production') {
                                    console.error('Main image failed to load:', { productId, attemptedSrc: mainImage || productImages[0] })
                                }
                                e.currentTarget.src = PLACEHOLDER_PATH
                            }
                        }}
                    />
                </div>
            </div>
            <div className="flex-1">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-3">{product.name}</h1>
                {ratings.length > 0 && (
                    <div className='flex items-center gap-2 mt-2 mb-4'>
                        {Array(5).fill('').map((_, index) => (
                            <StarIcon key={index} size={18} className='text-transparent' fill={averageRating >= index + 1 ? "#FFD95E" : "#E5E7EB"} />
                        ))}
                        <p className="text-sm ml-2 text-slate-600 font-medium">{ratings.length} Reseñas</p>
                    </div>
                )}
                {/* Variant Selection */}
                {variants && variants.length > 0 && (
                    <div className="my-6 sm:my-8">
                        <p className="text-base sm:text-lg text-[#1A1A1A] font-bold mb-4">Selecciona la cantidad:</p>
                        <div className="flex flex-wrap gap-2 sm:gap-3">
                            {variants.map((variant, index) => (
                                <button
                                    key={index}
                                    onClick={() => setSelectedVariant(variant)}
                                    className={`px-4 sm:px-6 py-3 sm:py-4 rounded-xl font-semibold transition-all min-h-[44px] touch-manipulation ${
                                        selectedVariant?.name === variant.name
                                            ? 'bg-gradient-to-r from-[#00C6A2] to-[#00B894] text-white shadow-lg scale-105'
                                            : 'bg-white border-2 border-slate-200 text-[#1A1A1A] hover:border-[#00C6A2] hover:scale-105 hover:shadow-md active:scale-95'
                                    }`}
                                >
                                    <div className="text-center">
                                        <div className="font-bold text-sm sm:text-base">{variant.name}</div>
                                        <div className="text-xs sm:text-sm opacity-90 mt-1">{currency}{variant.price?.toLocaleString('es-MX')}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex items-center my-4 sm:my-6 gap-3 sm:gap-4 flex-wrap">
                    <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A]"> {currency}{currentPrice?.toLocaleString('es-MX')} </p>
                    {currentMrp > currentPrice && (
                        <>
                            <p className="text-lg sm:text-xl md:text-2xl text-slate-400 line-through">{currency}{currentMrp?.toLocaleString('es-MX')}</p>
                            <span className="px-2 sm:px-3 py-1 bg-gradient-to-r from-[#FFD95E] to-[#FFD044] text-[#1A1A1A] text-xs sm:text-sm font-bold rounded-full">
                                -{((currentMrp - currentPrice) / currentMrp * 100).toFixed(0)}%
                            </span>
                        </>
                    )}
                </div>
                {currentMrp > currentPrice && (
                    <div className="flex items-center gap-2 text-slate-600 mb-4 sm:mb-6">
                        <TagIcon size={16} className="text-[#00C6A2] flex-shrink-0" />
                        <p className="font-medium text-sm sm:text-base">Ahorra {currency}{(currentMrp - currentPrice).toLocaleString('es-MX')} ahora</p>
                    </div>
                )}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-4 sm:gap-5 mt-6 sm:mt-10">
                    {(() => {
                        // Check if product is in cart (with or without variant)
                        const cartKey = selectedVariant ? `${productId}_${selectedVariant.name}` : productId;
                        const isInCart = cart[cartKey] || (variants ? false : cart[productId]);
                        const cartItem = cart[cartKey] || cart[productId];
                        const quantity = typeof cartItem === 'number' ? cartItem : (cartItem?.quantity || 0);
                        
                        return isInCart && quantity > 0 ? (
                            <div className="flex flex-col gap-2 sm:gap-3">
                                <p className="text-base sm:text-lg text-[#1A1A1A] font-bold">Cantidad</p>
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
                                className="bg-gradient-to-r from-[#00C6A2] to-[#00B894] hover:from-[#00B894] hover:to-[#00A885] text-white px-6 sm:px-12 py-3 sm:py-4 text-sm sm:text-base font-bold rounded-full hover:scale-105 active:scale-95 transition-all shadow-lg hover:shadow-xl min-h-[44px] touch-manipulation w-full sm:w-auto"
                            >
                                {!isInCart ? 'Agregar al Carrito' : 'Ver Carrito'}
                            </button>
                        );
                    })()}
                </div>
                <hr className="border-slate-200 my-8" />
                <div className="flex flex-col gap-4 text-slate-600 bg-gradient-to-br from-slate-50 to-white p-6 rounded-2xl border border-slate-200">
                    <p className="flex items-center gap-3 font-medium"> <EarthIcon className="text-[#00C6A2]" size={20} /> Envío gratis a todo México </p>
                    <p className="flex items-center gap-3 font-medium"> <CreditCardIcon className="text-[#00C6A2]" size={20} /> Pago 100% Seguro </p>
                    <p className="flex items-center gap-3 font-medium"> <UserIcon className="text-[#00C6A2]" size={20} /> Confiado por las mejores marcas </p>
                </div>

            </div>
        </div>
    )
}

export default ProductDetails