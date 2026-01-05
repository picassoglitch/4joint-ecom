'use client'
import StoreInfo from "@/components/admin/StoreInfo"
import Loading from "@/components/Loading"
import { useEffect, useState } from "react"
import toast from "react-hot-toast"
import { getVendors } from "@/lib/supabase/database"
import { supabase } from "@/lib/supabase/client"

export default function AdminApprove() {
    const [stores, setStores] = useState([])
    const [loading, setLoading] = useState(true)

    const fetchStores = async () => {
        try {
            // Get unapproved vendors
            const vendors = await getVendors(false)
            setStores(vendors.map(vendor => ({
                id: vendor.id,
                name: vendor.name || 'Sin nombre',
                email: vendor.email || '',
                description: vendor.description || '',
                logo: vendor.logo || null,
                address: vendor.address || null,
                contact: vendor.contact || null,
                status: vendor.approved ? 'approved' : 'pending',
                createdAt: vendor.created_at,
            })))
        } catch (error) {
            console.error('Error fetching stores:', error)
            toast.error('Error al cargar las tiendas')
        } finally {
            setLoading(false)
        }
    }

    const handleApprove = async ({ storeId, status }) => {
        try {
            // Get access token from session
            const { data: { session }, error: sessionError } = await supabase.auth.getSession()
            
            if (sessionError || !session?.access_token) {
                throw new Error('No se pudo obtener la sesión. Por favor inicia sesión nuevamente.')
            }

            if (status === 'approved') {
                // Use API route for approval
                const response = await fetch(`/api/admin/vendors/${storeId}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`
                    },
                    body: JSON.stringify({ approved: true })
                })

                const result = await response.json()

                if (!response.ok) {
                    throw new Error(result.error || 'Error al aprobar la tienda')
                }

                toast.success('Tienda aprobada exitosamente')
            } else {
                // Use API route for rejection (delete)
                const response = await fetch(`/api/admin/vendors/${storeId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`
                    }
                })

                const result = await response.json()

                if (!response.ok) {
                    throw new Error(result.error || 'Error al rechazar la tienda')
                }

                toast.success('Tienda rechazada')
            }
            // Refresh the list
            await fetchStores()
        } catch (error) {
            console.error('Error updating vendor:', error)
            const errorMessage = error instanceof Error ? error.message : (error?.message || 'Error al procesar la solicitud')
            toast.error(errorMessage)
            throw error
        }
    }

    useEffect(() => {
        fetchStores()
    }, [])

    // Filter stores by status
    const pendingStores = stores.filter(store => store.status === 'pending')

    return !loading ? (
        <div className="text-[#1A1A1A]/70 mb-28">
            <h1 className="text-2xl">Cola de Aprobación de <span className="text-[#1A1A1A] font-bold">Vendedores</span></h1>

            {pendingStores.length ? (
                <div className="flex flex-col gap-4 mt-4">
                    {pendingStores.map((store) => (
                        <div key={store.id} className="bg-white/80 backdrop-blur-sm border border-[#00C6A2]/20 rounded-2xl shadow-md p-6 flex max-md:flex-col gap-4 md:items-end max-w-4xl hover:shadow-lg transition-all" >
                            {/* Store Info */}
                            <StoreInfo store={store} />

                            {/* Actions */}
                            <div className="flex gap-3 pt-2 flex-wrap">
                                <button onClick={() => toast.promise(handleApprove({ storeId: store.id, status: 'approved' }), { loading: "Aprobando...", success: "Tienda aprobada", error: "Error al aprobar" })} className="px-6 py-2.5 bg-[#00C6A2] hover:bg-[#00B894] text-white rounded-full hover:scale-105 active:scale-95 transition-all font-semibold shadow-md" >
                                    Aprobar
                                </button>
                                <button onClick={() => toast.promise(handleApprove({ storeId: store.id, status: 'rejected' }), { loading: 'Rechazando...', success: "Tienda rechazada", error: "Error al rechazar" })} className="px-6 py-2.5 bg-[#1A1A1A]/20 hover:bg-[#1A1A1A]/30 text-[#1A1A1A] rounded-full hover:scale-105 active:scale-95 transition-all font-semibold" >
                                    Rechazar
                                </button>
                            </div>
                        </div>
                    ))}

                </div>) : (
                <div className="flex items-center justify-center h-80">
                    <h1 className="text-3xl text-[#1A1A1A]/40 font-medium">No hay solicitudes pendientes</h1>
                </div>
            )}
        </div>
    ) : <Loading />
}