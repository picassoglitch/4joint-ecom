'use client'
import { useState } from 'react'
import { Plus, X, MapPin } from 'lucide-react'
import { toast } from 'react-hot-toast'

export default function MeetupPointsManager({ points = [], onChange }) {
    const [showAddForm, setShowAddForm] = useState(false)
    const [newPoint, setNewPoint] = useState({
        name: '',
        address: '',
        latitude: '',
        longitude: '',
        instructions: '',
    })

    const handleAddPoint = () => {
        if (!newPoint.name || !newPoint.address) {
            toast.error('Nombre y dirección son requeridos')
            return
        }

        // If lat/lng not provided, try to geocode
        if (!newPoint.latitude || !newPoint.longitude) {
            // For now, just add with empty coordinates
            // In production, you'd want to geocode the address
            toast.error('Por favor ingresa latitud y longitud')
            return
        }

        const point = {
            id: Date.now().toString(),
            name: newPoint.name,
            address: newPoint.address,
            latitude: parseFloat(newPoint.latitude),
            longitude: parseFloat(newPoint.longitude),
            instructions: newPoint.instructions || '',
        }

        onChange([...points, point])
        setNewPoint({ name: '', address: '', latitude: '', longitude: '', instructions: '' })
        setShowAddForm(false)
        toast.success('Punto de entrega agregado')
    }

    const handleRemovePoint = (id) => {
        onChange(points.filter(p => p.id !== id))
        toast.success('Punto de entrega eliminado')
    }

    return (
        <div className="space-y-4">
            {points.map((point) => (
                <div key={point.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <MapPin size={16} className="text-[#00C6A2]" />
                                <h4 className="font-semibold text-[#1A1A1A]">{point.name}</h4>
                            </div>
                            <p className="text-sm text-slate-600 mb-1">{point.address}</p>
                            {point.instructions && (
                                <p className="text-xs text-slate-500">{point.instructions}</p>
                            )}
                            <p className="text-xs text-slate-400 mt-1">
                                {point.latitude?.toFixed(4)}, {point.longitude?.toFixed(4)}
                            </p>
                        </div>
                        <button
                            onClick={() => handleRemovePoint(point.id)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>
            ))}

            {showAddForm ? (
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                    <input
                        type="text"
                        placeholder="Nombre del punto *"
                        value={newPoint.name}
                        onChange={(e) => setNewPoint({ ...newPoint, name: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-[#00C6A2] focus:ring-2 focus:ring-[#00C6A2]/20 outline-none"
                    />
                    <input
                        type="text"
                        placeholder="Dirección *"
                        value={newPoint.address}
                        onChange={(e) => setNewPoint({ ...newPoint, address: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-[#00C6A2] focus:ring-2 focus:ring-[#00C6A2]/20 outline-none"
                    />
                    <div className="grid grid-cols-2 gap-2">
                        <input
                            type="number"
                            step="any"
                            placeholder="Latitud *"
                            value={newPoint.latitude}
                            onChange={(e) => setNewPoint({ ...newPoint, latitude: e.target.value })}
                            className="px-3 py-2 rounded-lg border border-slate-300 focus:border-[#00C6A2] focus:ring-2 focus:ring-[#00C6A2]/20 outline-none"
                        />
                        <input
                            type="number"
                            step="any"
                            placeholder="Longitud *"
                            value={newPoint.longitude}
                            onChange={(e) => setNewPoint({ ...newPoint, longitude: e.target.value })}
                            className="px-3 py-2 rounded-lg border border-slate-300 focus:border-[#00C6A2] focus:ring-2 focus:ring-[#00C6A2]/20 outline-none"
                        />
                    </div>
                    <textarea
                        placeholder="Instrucciones (opcional)"
                        value={newPoint.instructions}
                        onChange={(e) => setNewPoint({ ...newPoint, instructions: e.target.value })}
                        rows={2}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-[#00C6A2] focus:ring-2 focus:ring-[#00C6A2]/20 outline-none resize-none"
                    />
                    <div className="flex gap-2">
                        <button
                            onClick={handleAddPoint}
                            className="flex-1 px-4 py-2 bg-[#00C6A2] text-white rounded-lg font-medium hover:bg-[#00B894] transition-colors"
                        >
                            Agregar
                        </button>
                        <button
                            onClick={() => {
                                setShowAddForm(false)
                                setNewPoint({ name: '', address: '', latitude: '', longitude: '', instructions: '' })
                            }}
                            className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300 transition-colors"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    onClick={() => setShowAddForm(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-[#00C6A2] hover:text-[#00C6A2] transition-colors"
                >
                    <Plus size={18} />
                    Agregar Punto de Entrega
                </button>
            )}
        </div>
    )
}

