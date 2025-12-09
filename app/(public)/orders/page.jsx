'use client'
import PageTitle from "@/components/PageTitle"
import { useEffect, useState } from "react";
import OrderItem from "@/components/OrderItem";
import { getOrders, getOrderItems } from "@/lib/supabase/database";
import { getCurrentUser } from "@/lib/supabase/auth";
import { useRouter } from "next/navigation";
import Loading from "@/components/Loading";

export default function Orders() {
    const router = useRouter();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadOrders();
    }, []);

    const loadOrders = async () => {
        try {
            const { user } = await getCurrentUser();
            if (!user) {
                router.push('/');
                return;
            }

            // Get orders for current user
            const userOrders = await getOrders({ user_id: user.id });
            
            // Load order items for each order
            const ordersWithItemsData = await Promise.all(
                userOrders.map(async (order) => {
                    const items = await getOrderItems(order.id);
                    return {
                        ...order,
                        orderItems: items || []
                    };
                })
            );

            setOrders(ordersWithItemsData);
        } catch (error) {
            console.error('Error loading orders:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <Loading />;
    }

    return (
        <div className="min-h-[70vh] mx-6">
            {orders.length > 0 ? (
                <div className="my-20 max-w-7xl mx-auto">
                    <PageTitle heading="Mis Pedidos" text={`Mostrando ${orders.length} pedido${orders.length !== 1 ? 's' : ''}`} linkText={'Ir al inicio'} />

                    <table className="w-full max-w-5xl text-slate-500 table-auto border-separate border-spacing-y-12 border-spacing-x-4">
                        <thead>
                            <tr className="max-sm:text-sm text-slate-600 max-md:hidden">
                                <th className="text-left">Producto</th>
                                <th className="text-center">Precio Total</th>
                                <th className="text-left">Dirección</th>
                                <th className="text-left">Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map((order) => (
                                <OrderItem order={order} key={order.id} />
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="min-h-[80vh] mx-6 flex items-center justify-center text-slate-400">
                    <h1 className="text-2xl sm:text-4xl font-semibold">No tienes pedidos</h1>
                </div>
            )}
        </div>
    )
}