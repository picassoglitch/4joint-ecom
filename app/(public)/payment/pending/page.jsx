'use client'
import { Clock } from 'lucide-react'
import Link from 'next/link'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default function PaymentPending() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#FAFAF6]">
            <div className="max-w-md w-full mx-6 bg-white rounded-3xl shadow-lg p-8 text-center">
                <div className="flex justify-center mb-4">
                    <Clock size={64} className="text-[#FFD95E]" />
                </div>
                <h1 className="text-3xl font-bold text-[#1A1A1A] mb-4">
                    Pago Pendiente
                </h1>
                <p className="text-[#1A1A1A]/70 mb-6">
                    Tu pago está siendo procesado. Te notificaremos por correo cuando se complete.
                </p>
                <Link
                    href="/"
                    className="inline-block bg-[#00C6A2] hover:bg-[#00B894] text-white px-8 py-3 rounded-full font-semibold transition-all hover:scale-105 active:scale-95"
                >
                    Volver al Inicio
                </Link>
            </div>
        </div>
    )
}

