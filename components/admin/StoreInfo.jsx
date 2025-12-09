'use client'
import Image from "next/image"
import { MapPin, Mail, Phone, Store } from "lucide-react"

const StoreInfo = ({store}) => {
    // Default values to prevent errors
    const logoUrl = store?.logo || '/placeholder-store.png'
    const storeName = store?.name || 'Sin nombre'
    const description = store?.description || 'Sin descripción'
    const address = store?.address || 'No especificada'
    const contact = store?.contact || 'No especificado'
    const email = store?.email || 'No especificado'
    const createdAt = store?.createdAt || store?.created_at || new Date().toISOString()
    const status = store?.status || (store?.approved ? 'approved' : 'pending')

    return (
        <div className="flex-1 space-y-2 text-sm">
            <div className="flex items-center gap-3 mb-3">
                {logoUrl && logoUrl !== '/placeholder-store.png' ? (
                    <Image 
                        width={100} 
                        height={100} 
                        src={logoUrl} 
                        alt={storeName} 
                        className="max-w-20 max-h-20 object-contain shadow rounded-full max-sm:mx-auto" 
                    />
                ) : (
                    <div className="w-20 h-20 bg-[#00C6A2]/20 rounded-full flex items-center justify-center">
                        <Store size={32} className="text-[#00C6A2]" />
                    </div>
                )}
                <div className="flex flex-col sm:flex-row gap-3 items-center">
                    <h3 className="text-xl font-semibold text-slate-800">{storeName}</h3>

                    {/* Status Badge */}
                    <span
                        className={`text-xs font-semibold px-4 py-1 rounded-full ${
                            status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : status === 'rejected'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-green-100 text-green-800'
                        }`}
                    >
                        {status === 'pending' ? 'Pendiente' : status === 'rejected' ? 'Rechazada' : 'Aprobada'}
                    </span>
                </div>
            </div>

            <p className="text-slate-600 my-5 max-w-2xl">{description}</p>
            {address && address !== 'No especificada' && (
                <p className="flex items-center gap-2"> <MapPin size={16} /> {address}</p>
            )}
            {contact && contact !== 'No especificado' && (
                <p className="flex items-center gap-2"><Phone size={16} /> {contact}</p>
            )}
            <p className="flex items-center gap-2"><Mail size={16} /> {email}</p>
            <p className="text-slate-700 mt-5">Solicitud enviada el <span className="text-xs">{new Date(createdAt).toLocaleDateString('es-MX')}</span></p>
        </div>
    )
}

export default StoreInfo