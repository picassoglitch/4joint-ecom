'use client'
import Image from "next/image";
import { DotIcon } from "lucide-react";
import { useSelector } from "react-redux";
import Rating from "./Rating";
import { useState } from "react";
import RatingModal from "./RatingModal";

const OrderItem = ({ order }) => {
    const currency = 'MXN $';
    const [ratingModal, setRatingModal] = useState(null);
    const { ratings } = useSelector(state => state.rating);

    // Format order date
    const orderDate = order.created_at 
        ? new Date(order.created_at).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
        : 'Fecha no disponible';

    // Get address information (from guest_address JSONB or address_id)
    const getAddressDisplay = () => {
        if (order.guest_address) {
            // Guest checkout address
            const addr = order.guest_address;
            return {
                name: order.guest_name || 'Cliente',
                street: addr.street || addr.address || '',
                city: addr.city || '',
                state: addr.state || '',
                zip: addr.zip || '',
                country: addr.country || 'México',
                phone: order.guest_phone || ''
            };
        } else if (order.address_id) {
            // User saved address (would need to fetch from addresses table)
            return {
                name: 'Dirección guardada',
                street: 'Ver detalles del pedido',
                city: '',
                state: '',
                zip: '',
                country: 'México',
                phone: ''
            };
        }
        return {
            name: 'Sin dirección',
            street: '',
            city: '',
            state: '',
            zip: '',
            country: '',
            phone: ''
        };
    };

    const address = getAddressDisplay();

    // Get status display
    const getStatusDisplay = () => {
        const status = order.status || 'ORDER_PLACED';
        const statusMap = {
            'ORDER_PLACED': { text: 'Pedido Realizado', color: 'text-blue-500 bg-blue-100' },
            'PROCESSING': { text: 'En Proceso', color: 'text-yellow-500 bg-yellow-100' },
            'SHIPPED': { text: 'Enviado', color: 'text-purple-500 bg-purple-100' },
            'DELIVERED': { text: 'Entregado', color: 'text-green-500 bg-green-100' },
            'CANCELLED': { text: 'Cancelado', color: 'text-red-500 bg-red-100' }
        };
        return statusMap[status] || { text: status.replace(/_/g, ' ').toLowerCase(), color: 'text-slate-500 bg-slate-100' };
    };

    const statusDisplay = getStatusDisplay();

    // Handle order items - they come from getOrderItems with product relation
    const orderItems = order.orderItems || [];

    return (
        <>
            <tr className="text-sm">
                <td className="text-left">
                    <div className="flex flex-col gap-6">
                        {orderItems.length > 0 ? (
                            orderItems.map((item, index) => {
                                // Handle items with product relation or free items
                                const product = item.product;
                                const isFreeItem = item.variant?.is_free_item || item.product_id === null;
                                const productName = isFreeItem 
                                    ? (item.variant?.name || '1 gr gratis')
                                    : (product?.name || 'Producto no disponible');
                                const productImages = product?.images || [];
                                const productImage = Array.isArray(productImages) && productImages.length > 0 
                                    ? productImages[0] 
                                    : '/placeholder-product.png';
                                
                                return (
                                    <div key={item.id || index} className="flex items-center gap-4">
                                        <div className="w-20 aspect-square bg-slate-100 flex items-center justify-center rounded-md">
                                            {!isFreeItem && (
                                                <Image
                                                    className="h-14 w-auto"
                                                    src={productImage}
                                                    alt={productName}
                                                    width={50}
                                                    height={50}
                                                />
                                            )}
                                        </div>
                                        <div className="flex flex-col justify-center text-sm">
                                            <p className="font-medium text-slate-600 text-base">
                                                {productName}
                                                {item.variant?.name && !isFreeItem && (
                                                    <span className="text-xs text-slate-400 ml-2">({item.variant.name})</span>
                                                )}
                                            </p>
                                            <p>{currency}{parseFloat(item.price || 0).toFixed(2)} Cantidad: {item.quantity || 1}</p>
                                            <p className="mb-1 text-xs text-slate-400">{orderDate}</p>
                                            {!isFreeItem && product && (
                                                <div>
                                                    {ratings.find(rating => order.id === rating.orderId && product.id === rating.productId)
                                                        ? <Rating value={ratings.find(rating => order.id === rating.orderId && product.id === rating.productId).rating} />
                                                        : order.status === 'DELIVERED' && (
                                                            <button 
                                                                onClick={() => setRatingModal({ orderId: order.id, productId: product.id })} 
                                                                className="text-green-500 hover:bg-green-50 transition text-xs"
                                                            >
                                                                Calificar Producto
                                                            </button>
                                                        )
                                                    }
                                                </div>
                                            )}
                                            {ratingModal && <RatingModal ratingModal={ratingModal} setRatingModal={setRatingModal} />}
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <p className="text-slate-400 text-sm">No hay items en este pedido</p>
                        )}
                    </div>
                </td>

                <td className="text-center max-md:hidden">{currency}{parseFloat(order.total || 0).toFixed(2)}</td>

                <td className="text-left max-md:hidden text-xs">
                    <p>{address.name}</p>
                    {address.street && <p>{address.street}</p>}
                    {(address.city || address.state || address.zip) && (
                        <p>{[address.city, address.state, address.zip].filter(Boolean).join(', ')}</p>
                    )}
                    {address.country && <p>{address.country}</p>}
                    {address.phone && <p>{address.phone}</p>}
                </td>

                <td className="text-left space-y-2 text-sm max-md:hidden">
                    <div className={`flex items-center justify-center gap-1 rounded-full p-1 ${statusDisplay.color}`}>
                        <DotIcon size={10} className="scale-250" />
                        {statusDisplay.text}
                    </div>
                </td>
            </tr>
            {/* Mobile */}
            <tr className="md:hidden">
                <td colSpan={5}>
                    <div className="space-y-2 text-xs">
                        <p><strong>Dirección:</strong> {address.name}</p>
                        {address.street && <p>{address.street}</p>}
                        {(address.city || address.state || address.zip) && (
                            <p>{[address.city, address.state, address.zip].filter(Boolean).join(', ')}</p>
                        )}
                        {address.phone && <p>{address.phone}</p>}
                        <p><strong>Total:</strong> {currency}{parseFloat(order.total || 0).toFixed(2)}</p>
                    </div>
                    <br />
                    <div className="flex items-center">
                        <span className={`text-center mx-auto px-6 py-1.5 rounded ${statusDisplay.color}`}>
                            {statusDisplay.text}
                        </span>
                    </div>
                </td>
            </tr>
            <tr>
                <td colSpan={4}>
                    <div className="border-b border-slate-300 w-6/7 mx-auto" />
                </td>
            </tr>
        </>
    )
}

export default OrderItem