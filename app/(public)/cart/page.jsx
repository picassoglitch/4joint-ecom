'use client'
import Counter from "@/components/Counter";
import OrderSummary from "@/components/OrderSummary";
import PageTitle from "@/components/PageTitle";
import { deleteItemFromCart } from "@/lib/features/cart/cartSlice";
import { Trash2Icon } from "lucide-react";
import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";

export default function Cart() {

    const currency = 'MXN $';
    
    const { cartItems } = useSelector(state => state.cart);
    const products = useSelector(state => state.product.list);

    const dispatch = useDispatch();

    const [cartArray, setCartArray] = useState([]);
    const [totalPrice, setTotalPrice] = useState(0);
    const [isVisible, setIsVisible] = useState(true); // Start visible
    const cartRef = useRef(null);

    const createCartArray = () => {
        const cartArray = [];
        let total = 0;
        
        for (const [key, cartItem] of Object.entries(cartItems)) {
            // Handle both old format (number) and new format (object with quantity and variant)
            const quantity = typeof cartItem === 'number' ? cartItem : cartItem.quantity;
            const variant = typeof cartItem === 'object' ? cartItem.variant : null;
            
            // Extract productId from key (format: productId or productId_variantName)
            const productId = key.split('_')[0];
            const product = products.find(product => product.id === productId);
            
            if (product) {
                // Use variant price if available, otherwise use product price
                const itemPrice = variant ? variant.price : product.price;
                
                cartArray.push({
                    ...product,
                    quantity: quantity,
                    variant: variant,
                    price: itemPrice, // Override with variant price
                    cartKey: key, // Store the cart key for deletion
                });
                total += itemPrice * quantity;
            }
        }
        setCartArray(cartArray);
        setTotalPrice(total);
    }

    const handleDeleteItemFromCart = (cartKey, variant) => {
        // Extract productId from cartKey
        const productId = cartKey.split('_')[0];
        dispatch(deleteItemFromCart({ productId, variant }))
    }

    useEffect(() => {
        // Always try to create cart array, even if products aren't loaded yet
        // This ensures cart items are shown as soon as products are available
        createCartArray();
    }, [cartItems, products]);

    // Ensure content is visible when cart has items
    useEffect(() => {
        if (cartArray.length > 0) {
            setIsVisible(true);
        }
    }, [cartArray.length]);

    return cartArray.length > 0 ? (
        <div 
            ref={cartRef}
            className="min-h-screen mx-6 text-slate-800 py-6"
        >
            <div className="max-w-7xl mx-auto">
                {/* Title - More compact */}
                <PageTitle heading="Mi Carrito" text="artículos en tu carrito" linkText="Agregar más" />

                <div className="flex items-start justify-between gap-6 max-lg:flex-col mt-6">

                    {/* Desktop Table View */}
                    <div className="w-full max-w-4xl bg-white/80 backdrop-blur-sm rounded-2xl border border-[#00C6A2]/10 shadow-sm hover:shadow-md transition-all overflow-hidden max-md:hidden">
                        <table className="w-full text-slate-600 table-auto">
                            <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
                                <tr className="max-sm:text-sm">
                                    <th className="text-left p-4 font-semibold text-[#1A1A1A]">Producto</th>
                                    <th className="p-4 font-semibold text-[#1A1A1A]">Cantidad</th>
                                    <th className="p-4 font-semibold text-[#1A1A1A]">Precio Total</th>
                                    <th className="max-md:hidden p-4 font-semibold text-[#1A1A1A]">Eliminar</th>
                                </tr>
                            </thead>
                            <tbody>
                                {
                                    cartArray.map((item, index) => (
                                        <tr key={index} className="border-b border-slate-100 hover:bg-[#00C6A2]/5 transition-all duration-200 group">
                                            <td className="flex gap-4 my-4 p-4">
                                                <div className="flex gap-3 items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 size-20 rounded-xl border border-slate-200 shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-200">
                                                    <Image src={item.images[0]} className="h-16 w-auto" alt={item.name} width={60} height={60} />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="max-sm:text-sm font-semibold text-[#1A1A1A] group-hover:text-[#00C6A2] transition-colors">{item.name}</p>
                                                    {item.variant && (
                                                        <p className="text-xs text-[#00C6A2] font-bold mt-1">{item.variant.name}</p>
                                                    )}
                                                    <p className="text-xs text-slate-500 mt-1">{item.category}</p>
                                                    <p className="text-sm font-bold text-[#1A1A1A] mt-2">{currency}{item.price?.toLocaleString('es-MX')}</p>
                                                </div>
                                            </td>
                                            <td className="text-center p-4">
                                                <Counter productId={item.id} variant={item.variant} cartKey={item.cartKey} />
                                            </td>
                                            <td className="text-center p-4 font-bold text-[#1A1A1A]">{currency}{(item.price * item.quantity).toLocaleString('es-MX')}</td>
                                            <td className="text-center max-md:hidden p-4">
                                                <button onClick={() => handleDeleteItemFromCart(item.cartKey, item.variant)} className="text-red-500 hover:bg-red-50 p-2.5 rounded-full active:scale-95 transition-all hover:scale-110 min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation">
                                                    <Trash2Icon size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                }
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="w-full md:hidden space-y-4">
                        {cartArray.map((item, index) => (
                            <div key={index} className="bg-white/80 backdrop-blur-sm rounded-2xl border border-[#00C6A2]/10 shadow-sm p-4">
                                <div className="flex gap-4 mb-4">
                                    <div className="flex-shrink-0 bg-gradient-to-br from-slate-50 to-slate-100 size-20 rounded-xl border border-slate-200 shadow-sm flex items-center justify-center">
                                        <Image src={item.images[0]} className="h-16 w-auto" alt={item.name} width={60} height={60} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-[#1A1A1A] truncate">{item.name}</p>
                                        {item.variant && (
                                            <p className="text-xs text-[#00C6A2] font-bold mt-1">{item.variant.name}</p>
                                        )}
                                        <p className="text-xs text-slate-500 mt-1">{item.category}</p>
                                        <p className="text-sm font-bold text-[#1A1A1A] mt-2">{currency}{item.price?.toLocaleString('es-MX')}</p>
                                    </div>
                                    <button 
                                        onClick={() => handleDeleteItemFromCart(item.cartKey, item.variant)} 
                                        className="flex-shrink-0 text-red-500 hover:bg-red-50 p-2.5 rounded-full active:scale-95 transition-all min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation"
                                        aria-label="Eliminar producto"
                                    >
                                        <Trash2Icon size={20} />
                                    </button>
                                </div>
                                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                    <div className="flex-1">
                                        <p className="text-xs text-slate-500 mb-2">Cantidad</p>
                                        <Counter productId={item.id} variant={item.variant} cartKey={item.cartKey} />
                                    </div>
                                    <div className="text-right ml-4">
                                        <p className="text-xs text-slate-500 mb-2">Total</p>
                                        <p className="text-base font-bold text-[#1A1A1A]">{currency}{(item.price * item.quantity).toLocaleString('es-MX')}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <OrderSummary totalPrice={totalPrice} items={cartArray} />
                </div>
            </div>
        </div>
    ) : (
        <div className="min-h-[80vh] mx-6 flex flex-col items-center justify-center text-slate-400">
            <div className="text-6xl mb-4 animate-bounce">🛒</div>
            <h1 className="text-2xl sm:text-4xl font-bold text-[#1A1A1A] mb-2">Tu carrito está vacío</h1>
            <p className="text-slate-500 mb-6">Agrega productos para comenzar</p>
            <a 
                href="/shop" 
                className="px-8 py-3 bg-[#00C6A2] hover:bg-[#00B894] text-white rounded-full font-semibold transition-all hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl"
            >
                Explorar Productos
            </a>
        </div>
    )
}