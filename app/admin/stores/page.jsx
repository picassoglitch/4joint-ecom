'use client'
import StoreInfo from "@/components/admin/StoreInfo"
import Loading from "@/components/Loading"
import { useEffect, useState } from "react"
import toast from "react-hot-toast"
import { getVendors } from "@/lib/supabase/database"
import { getCurrentUser } from "@/lib/supabase/auth"
import { Trash2 } from "lucide-react"

export default function AdminStores() {
    const [stores, setStores] = useState([])
    const [loading, setLoading] = useState(true)
    const [deleting, setDeleting] = useState({})

    const fetchStores = async () => {
        try {
            // Get approved vendors only
            const vendors = await getVendors(true)
            setStores(vendors.map(vendor => ({
                id: vendor.id,
                name: vendor.name || 'Sin nombre',
                email: vendor.email || '',
                description: vendor.description || '',
                logo: vendor.logo || null,
                address: vendor.address || null,
                contact: vendor.contact || null,
                isActive: vendor.approved,
                approved: vendor.approved,
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

    const handleDeleteStore = async (storeId, storeName) => {
        // Confirm deletion
        const confirmed = window.confirm(
            `¿Estás seguro de que deseas eliminar la tienda "${storeName}"?\n\n` +
            `Esta acción eliminará:\n` +
            `- La tienda y su cuenta de vendedor\n` +
            `- Todos los productos de la tienda\n` +
            `- Todos los pedidos relacionados\n` +
            `- Todo el contenido relacionado\n\n` +
            `Esta acción NO se puede deshacer.`
        )

        if (!confirmed) return

        setDeleting({ ...deleting, [storeId]: true })
        try {
            const { user } = await getCurrentUser()
            if (!user) {
                toast.error('Debes estar autenticado')
                return
            }

            const { supabase } = await import('@/lib/supabase/client')
            const { data: { session } } = await supabase.auth.getSession()
            
            if (!session) {
                toast.error('Sesión no encontrada')
                return
            }

            const response = await fetch(`/api/admin/vendors/${storeId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Error al eliminar la tienda')
            }

            toast.success('Tienda eliminada exitosamente')
            await fetchStores()
        } catch (error) {
            console.error('Error deleting store:', error)
            toast.error(error.message || 'Error al eliminar la tienda')
        } finally {
            setDeleting({ ...deleting, [storeId]: false })
        }
    }

    const toggleIsActive = async (storeId) => {
        try {
            const store = stores.find(s => s.id === storeId)
            if (!store) return

            // Get current user session for auth token
            const { user } = await getCurrentUser()
            if (!user) {
                toast.error('Debes estar autenticado')
                return
            }

            // Get session token
            const { supabase } = await import('@/lib/supabase/client')
            const { data: { session } } = await supabase.auth.getSession()
            
            if (!session) {
                toast.error('Sesión no encontrada')
                return
            }

            // Toggle approved status
            const newStatus = !store.isActive
            
            const response = await fetch(`/api/admin/vendors/${storeId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ approved: newStatus }),
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Error al actualizar')
            }

            toast.success(newStatus ? 'Tienda activada' : 'Tienda desactivada')
            await fetchStores()
        } catch (error) {
            console.error('Error toggling store status:', error)
            toast.error(error.message || 'Error al actualizar el estado')
            throw error
        }
    }

    useEffect(() => {
        fetchStores()
    }, [])

    return !loading ? (
        <div className="text-slate-500 mb-28">
            <h1 className="text-2xl">Tiendas <span className="text-slate-800 font-medium">Activas</span></h1>

            {stores.length ? (
                <div className="flex flex-col gap-4 mt-4">
                    {stores.map((store) => (
                        <div key={store.id} className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 flex max-md:flex-col gap-4 md:items-end max-w-4xl" >
                            {/* Store Info */}
                            <StoreInfo store={store} />

                            {/* Actions */}
                            <div className="flex items-center gap-3 pt-2 flex-wrap">
                                <div className="flex items-center gap-2">
                                    <p>Activa</p>
                                    <label className="relative inline-flex items-center cursor-pointer text-gray-900">
                                        <input type="checkbox" className="sr-only peer" onChange={() => toast.promise(toggleIsActive(store.id), { loading: "Actualizando datos..." })} checked={store.isActive} />
                                        <div className="w-9 h-5 bg-slate-300 rounded-full peer peer-checked:bg-green-600 transition-colors duration-200"></div>
                                        <span className="dot absolute left-1 top-1 w-3 h-3 bg-white rounded-full transition-transform duration-200 ease-in-out peer-checked:translate-x-4"></span>
                                    </label>
                                </div>
                                <button
                                    onClick={() => handleDeleteStore(store.id, store.name)}
                                    disabled={deleting[store.id]}
                                    className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white rounded-lg font-semibold transition-all hover:scale-105 active:scale-95 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    <Trash2 size={16} />
                                    {deleting[store.id] ? 'Eliminando...' : 'Eliminar'}
                                </button>
                            </div>
                        </div>
                    ))}

                </div>
            ) : (
                <div className="flex items-center justify-center h-80">
                    <h1 className="text-3xl text-slate-400 font-medium">No hay tiendas disponibles</h1>
                </div>
            )
            }
        </div>
    ) : <Loading />
}