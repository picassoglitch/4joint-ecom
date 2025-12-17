'use client'

import { addToCart } from "@/lib/features/cart/cartSlice";
import { StarIcon, TagIcon, EarthIcon, CreditCardIcon, UserIcon, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Image from "next/image";
import Counter from "./Counter";
import { useDispatch, useSelector } from "react-redux";
import { getCurrentUser } from "@/lib/supabase/auth";
import { supabase } from "@/lib/supabase/client";

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
    const storeId = product.storeId || product.vendor_id;

    const cart = useSelector(state => state.cart.cartItems);
    const dispatch = useDispatch();

    const router = useRouter()

    // Safely get images array
    const productImages = Array.isArray(product.images) && product.images.length > 0 
        ? product.images 
        : ['/placeholder-product.png'];
    
    const [mainImage, setMainImage] = useState(productImages[0]);
    const [selectedVariant, setSelectedVariant] = useState(null);
    const [userLocation, setUserLocation] = useState(null);
    const [deliveryStatus, setDeliveryStatus] = useState(null);
    const [checkingDelivery, setCheckingDelivery] = useState(false);

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

    // Get user location
    useEffect(() => {
        const fetchUserLocation = async () => {
            try {
                const { user } = await getCurrentUser()
                if (!user) return

                const response = await fetch('/api/user/location', {
                    headers: {
                        'Authorization': `Bearer ${(await getCurrentUser()).user?.id ? (await supabase.auth.getSession()).data.session?.access_token : ''}`
                    }
                })
                
                if (response.ok) {
                    const { data } = await response.json()
                    if (data?.latitude && data?.longitude) {
                        setUserLocation({
                            lat: data.latitude,
                            lng: data.longitude,
                            place: data.location_place
                        })
                    }
                }
            } catch (error) {
                console.error('Error fetching user location:', error)
            }
        }

        fetchUserLocation()
    }, [])

    // Check delivery radius
    useEffect(() => {
        const checkDelivery = async () => {
            if (!storeId || !userLocation?.lat || !userLocation?.lng) {
                setDeliveryStatus(null)
                return
            }

            setCheckingDelivery(true)
            try {
                const response = await fetch(
                    `/api/stores/check-delivery?storeId=${storeId}&userLat=${userLocation.lat}&userLng=${userLocation.lng}`
                )
                if (response.ok) {
                    const data = await response.json()
                    setDeliveryStatus(data)
                }
            } catch (error) {
                console.error('Error checking delivery:', error)
            } finally {
                setCheckingDelivery(false)
            }
        }

        checkDelivery()
    }, [storeId, userLocation])

    const isOutsideRadius = deliveryStatus && !deliveryStatus.withinRadius

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
        <div className="flex max-lg:flex-col gap-12 my-8">
            <div className="flex max-sm:flex-col-reverse gap-4">
                <div className="flex sm:flex-col gap-3">
                    {productImages.map((image, index) => (
                        <div key={index} onClick={() => setMainImage(productImages[index])} className="bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center size-26 rounded-xl group cursor-pointer border border-slate-200 hover:border-[#00C6A2]/40 transition-all hover:scale-105 shadow-sm">
                            <Image src={image} className="group-hover:scale-110 transition-transform duration-300" alt="" width={45} height={45} />
                        </div>
                    ))}
                </div>
                <div className="flex justify-center items-center h-100 sm:size-113 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
                    <Image src={mainImage || productImages[0]} alt={product.name || 'Product'} width={400} height={400} className="object-contain" />
                </div>
            </div>
            <div className="flex-1">
                <h1 className="text-4xl font-bold text-[#1A1A1A] mb-3">{product.name}</h1>
                {product.quantity && product.unit && (
                    <p className="text-lg text-slate-600 mb-3 font-medium">
                        {product.quantity}{product.unit}
                    </p>
                )}
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
                    <div className="my-8">
                        <p className="text-lg text-[#1A1A1A] font-bold mb-4">Selecciona la cantidad:</p>
                        <div className="flex flex-wrap gap-3">
                            {variants.map((variant, index) => (
                                <button
                                    key={index}
                                    onClick={() => setSelectedVariant(variant)}
                                    className={`px-6 py-4 rounded-xl font-semibold transition-all ${
                                        selectedVariant?.name === variant.name
                                            ? 'bg-gradient-to-r from-[#00C6A2] to-[#00B894] text-white shadow-lg scale-105'
                                            : 'bg-white border-2 border-slate-200 text-[#1A1A1A] hover:border-[#00C6A2] hover:scale-105 hover:shadow-md'
                                    }`}
                                >
                                    <div className="text-center">
                                        <div className="font-bold">{variant.name}</div>
                                        {variant.quantity && variant.unit && (
                                            <div className="text-xs opacity-75 mt-0.5">{variant.quantity}{variant.unit}</div>
                                        )}
                                        <div className="text-sm opacity-90 mt-1">{currency}{variant.price?.toLocaleString('es-MX')}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex items-center my-6 gap-4">
                    <p className="text-4xl font-bold text-[#1A1A1A]"> {currency}{currentPrice?.toLocaleString('es-MX')} </p>
                    {currentMrp > currentPrice && (
                        <>
                            <p className="text-2xl text-slate-400 line-through">{currency}{currentMrp?.toLocaleString('es-MX')}</p>
                            <span className="px-3 py-1 bg-gradient-to-r from-[#FFD95E] to-[#FFD044] text-[#1A1A1A] text-sm font-bold rounded-full">
                                -{((currentMrp - currentPrice) / currentMrp * 100).toFixed(0)}%
                            </span>
                        </>
                    )}
                </div>
                {currentMrp > currentPrice && (
                    <div className="flex items-center gap-2 text-slate-600 mb-6">
                        <TagIcon size={16} className="text-[#00C6A2]" />
                        <p className="font-medium">Ahorra {currency}{(currentMrp - currentPrice).toLocaleString('es-MX')} ahora</p>
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
                                <p className="text-lg text-[#1A1A1A] font-bold">Cantidad</p>
                                <Counter productId={productId} variant={selectedVariant} />
                            </div>
                        ) : null;
                    })()}
                    {(() => {
                        const cartKey = selectedVariant ? `${productId}_${selectedVariant.name}` : productId;
                        const isInCart = cart[cartKey] || (!variants && cart[productId]);
                        return (
                            <div className="flex flex-col gap-2">
                                <button 
                                    onClick={() => {
                                        if (isOutsideRadius) {
                                            return
                                        }
                                        !isInCart ? addToCartHandler() : router.push('/cart')
                                    }}
                                    disabled={isOutsideRadius}
                                    className={`px-12 py-4 text-base font-bold rounded-full transition-all shadow-lg ${
                                        isOutsideRadius
                                            ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                                            : 'bg-gradient-to-r from-[#00C6A2] to-[#00B894] hover:from-[#00B894] hover:to-[#00A885] text-white hover:scale-105 active:scale-95 hover:shadow-xl'
                                    }`}
                                >
                                    {!isInCart ? 'Agregar al Carrito' : 'Ver Carrito'}
                                </button>
                                {isOutsideRadius && deliveryStatus && (
                                    <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-xl">
                                        <MapPin size={16} className="text-red-600" />
                                        <p className="text-sm font-semibold text-red-600">
                                            {deliveryStatus.message}
                                        </p>
                                    </div>
                                )}
                            </div>
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