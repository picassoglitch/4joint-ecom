'use client'
import Counter from "@/components/Counter";
import OrderSummary from "@/components/OrderSummary";
import PageTitle from "@/components/PageTitle";
import { deleteItemFromCart } from "@/lib/features/cart/cartSlice";
import { Trash2Icon } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

export default function Cart() {

    const currency = 'MXN $';
    
    const { cartItems } = useSelector(state => state.cart);
    const products = useSelector(state => state.product.list);

    const dispatch = useDispatch();

    const [cartArray, setCartArray] = useState([]);
    const [totalPrice, setTotalPrice] = useState(0);

    const createCartArray = () => {
        setTotalPrice(0);
        const cartArray = [];
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
                setTotalPrice(prev => prev + itemPrice * quantity);
            }
        }
        setCartArray(cartArray);
    }

    const handleDeleteItemFromCart = (cartKey, variant) => {
        // Extract productId from cartKey
        const productId = cartKey.split('_')[0];
        dispatch(deleteItemFromCart({ productId, variant }))
    }

    useEffect(() => {
        if (products.length > 0) {
            createCartArray();
        }
    }, [cartItems, products]);

    return cartArray.length > 0 ? (
        <div className="min-h-screen mx-6 text-slate-800">

            <div className="max-w-7xl mx-auto ">
                {/* Title */}
                <PageTitle heading="Mi Carrito" text="artículos en tu carrito" linkText="Agregar más" />

                <div className="flex items-start justify-between gap-5 max-lg:flex-col">

                    <table className="w-full max-w-4xl text-slate-600 table-auto">
                        <thead>
                            <tr className="max-sm:text-sm">
                                <th className="text-left">Producto</th>
                                <th>Cantidad</th>
                                <th>Precio Total</th>
                                <th className="max-md:hidden">Eliminar</th>
                            </tr>
                        </thead>
                        <tbody>
                            {
                                cartArray.map((item, index) => (
                                    <tr key={index} className="space-x-2">
                                        <td className="flex gap-3 my-4">
                                            <div className="flex gap-3 items-center justify-center bg-slate-100 size-18 rounded-md">
                                                <Image src={item.images[0]} className="h-14 w-auto" alt="" width={45} height={45} />
                                            </div>
                                            <div>
                                                <p className="max-sm:text-sm">{item.name}</p>
                                                {item.variant && (
                                                    <p className="text-xs text-[#00C6A2] font-medium">{item.variant.name}</p>
                                                )}
                                                <p className="text-xs text-slate-500">{item.category}</p>
                                                <p>{currency}{item.price}</p>
                                            </div>
                                        </td>
                                        <td className="text-center">
                                            <Counter productId={item.id} variant={item.variant} cartKey={item.cartKey} />
                                        </td>
                                        <td className="text-center">{currency}{(item.price * item.quantity).toLocaleString()}</td>
                                        <td className="text-center max-md:hidden">
                                            <button onClick={() => handleDeleteItemFromCart(item.cartKey, item.variant)} className=" text-red-500 hover:bg-red-50 p-2.5 rounded-full active:scale-95 transition-all">
                                                <Trash2Icon size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            }
                        </tbody>
                    </table>
                    <OrderSummary totalPrice={totalPrice} items={cartArray} />
                </div>
            </div>
        </div>
    ) : (
        <div className="min-h-[80vh] mx-6 flex items-center justify-center text-slate-400">
            <h1 className="text-2xl sm:text-4xl font-semibold">Tu carrito está vacío</h1>
        </div>
    )
}