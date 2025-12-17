'use client'
import { useState } from 'react'
import { X, Check } from 'lucide-react'

// Delegaciones/Municipios de CDMX
const CDMX_DELEGACIONES = [
    'Álvaro Obregón',
    'Azcapotzalco',
    'Benito Juárez',
    'Coyoacán',
    'Cuajimalpa de Morelos',
    'Cuauhtémoc',
    'Gustavo A. Madero',
    'Iztacalco',
    'Iztapalapa',
    'La Magdalena Contreras',
    'Miguel Hidalgo',
    'Milpa Alta',
    'Tláhuac',
    'Tlalpan',
    'Venustiano Carranza',
    'Xochimilco'
]

// Colonias principales por delegación (expandible)
const COLONIAS_BY_DELEGACION = {
    'Álvaro Obregón': ['San Ángel', 'Tlacopac', 'San Ángel Inn', 'Chimalistac', 'Altavista', 'Lomas de San Ángel', 'Tlacopac San Ángel'],
    'Azcapotzalco': ['Azcapotzalco Centro', 'Clavería', 'San Miguel Amantla', 'Nueva Santa María', 'Progreso Nacional', 'San Rafael'],
    'Benito Juárez': ['Del Valle', 'Nápoles', 'Portales', 'Narvarte', 'Álamos', 'Del Valle Norte', 'Del Valle Sur'],
    'Coyoacán': ['Coyoacán', 'Villa Coyoacán', 'Del Carmen', 'Churubusco', 'Copilco', 'Santa Catarina', 'Xotepingo'],
    'Cuajimalpa de Morelos': ['Cuajimalpa', 'San José de los Cedros', 'San Lorenzo Acopilco', 'La Venta'],
    'Cuauhtémoc': ['Roma Norte', 'Roma Sur', 'Condesa', 'Juárez', 'Centro Histórico', 'Doctores', 'Tabacalera', 'San Rafael'],
    'Gustavo A. Madero': ['Lindavista', 'Villa Gustavo A. Madero', 'Ferrería', 'Tlalnepantla', 'Cuautepec', 'Guadalupe'],
    'Iztacalco': ['Iztacalco', 'Agrícola Oriental', 'Viaducto Piedad', 'Santa Anita', 'Michoacana'],
    'Iztapalapa': ['Iztapalapa', 'Santa Martha Acatitla', 'San Miguel Teotongo', 'San Lorenzo', 'San José'],
    'La Magdalena Contreras': ['La Magdalena Contreras', 'San Jerónimo', 'Barranca Seca'],
    'Miguel Hidalgo': ['Polanco', 'Lomas de Chapultepec', 'Anzures', 'Reforma', 'Ampliación Granada', 'Bosque de las Lomas'],
    'Milpa Alta': ['Milpa Alta', 'Villa Milpa Alta', 'San Pedro Atocpan'],
    'Tláhuac': ['Tláhuac', 'San Pedro Tláhuac', 'Santiago Zapotitlán'],
    'Tlalpan': ['Tlalpan', 'Pedregal de San Ángel', 'San Ángel', 'Tlalpan Centro'],
    'Venustiano Carranza': ['Moctezuma', 'Morelos', 'Centro', 'Jardín Balbuena'],
    'Xochimilco': ['Xochimilco', 'San Gregorio Atlapulco', 'Santa Cruz Xochitepec']
}

export default function CDMXColoniasSelector({ selectedColonias = [], onChange }) {
    const [selectedDelegacion, setSelectedDelegacion] = useState('')
    const [availableColonias, setAvailableColonias] = useState([])

    const handleDelegacionChange = (delegacion) => {
        setSelectedDelegacion(delegacion)
        setAvailableColonias(COLONIAS_BY_DELEGACION[delegacion] || [])
    }

    const handleToggleColonia = (colonia) => {
        const fullName = `${colonia}, ${selectedDelegacion}`
        if (selectedColonias.includes(fullName)) {
            // Remove if already selected
            onChange(selectedColonias.filter(c => c !== fullName))
        } else {
            // Add if not selected
            onChange([...selectedColonias, fullName])
        }
        // Don't close the dropdown - keep it open for multiple selections
    }

    const handleRemoveColonia = (colonia) => {
        onChange(selectedColonias.filter(c => c !== colonia))
    }

    const isColoniaSelected = (colonia) => {
        const fullName = `${colonia}, ${selectedDelegacion}`
        return selectedColonias.includes(fullName)
    }

    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                    Selecciona Delegación/Municipio
                </label>
                <select
                    value={selectedDelegacion}
                    onChange={(e) => handleDelegacionChange(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-[#00C6A2]/20 focus:border-[#00C6A2] focus:ring-2 focus:ring-[#00C6A2]/20 outline-none transition-all"
                >
                    <option value="">Selecciona una delegación...</option>
                    {CDMX_DELEGACIONES.map(delegacion => (
                        <option key={delegacion} value={delegacion}>{delegacion}</option>
                    ))}
                </select>
            </div>

            {availableColonias.length > 0 && (
                <div>
                    <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                        Selecciona Múltiples Colonias (haz clic para seleccionar/deseleccionar)
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-y-auto p-3 border-2 border-slate-200 rounded-xl bg-slate-50">
                        {availableColonias.map(colonia => {
                            const isSelected = isColoniaSelected(colonia)
                            return (
                                <button
                                    key={colonia}
                                    type="button"
                                    onClick={() => handleToggleColonia(colonia)}
                                    className={`px-3 py-2.5 text-sm rounded-lg transition-all text-left flex items-center justify-between ${
                                        isSelected
                                            ? 'bg-gradient-to-r from-[#00C6A2] to-[#00B894] text-white shadow-md font-semibold'
                                            : 'bg-white hover:bg-[#00C6A2]/10 border border-slate-200 hover:border-[#00C6A2]'
                                    }`}
                                >
                                    <span>{colonia}</span>
                                    {isSelected && <Check size={16} className="text-white" />}
                                </button>
                            )
                        })}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                        💡 Puedes seleccionar múltiples colonias sin que se cierre el menú
                    </p>
                </div>
            )}

            {selectedColonias.length > 0 && (
                <div>
                    <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                        Colonias Seleccionadas ({selectedColonias.length})
                    </label>
                    <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                        {selectedColonias.map(colonia => (
                            <span
                                key={colonia}
                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-[#00C6A2] to-[#00B894] text-white rounded-full text-sm font-medium shadow-sm"
                            >
                                {colonia}
                                <button
                                    type="button"
                                    onClick={() => handleRemoveColonia(colonia)}
                                    className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
                                >
                                    <X size={14} />
                                </button>
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

