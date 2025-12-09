'use client'
import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast';
import { getCurrentUser } from '@/lib/supabase/auth';
import { getOrders } from '@/lib/supabase/database';

export default function Banner() {
    const [isOpen, setIsOpen] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [hasFirstOrder, setHasFirstOrder] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check if user is authenticated and if they have orders
        const checkAuthAndOrders = async () => {
            try {
                const user = await getCurrentUser();
                if (user) {
                    setIsAuthenticated(true);
                    // Check if user has any orders
                    const orders = await getOrders({ user_id: user.id });
                    setHasFirstOrder(orders && orders.length > 0);
                } else {
                    setIsAuthenticated(false);
                }
            } catch (error) {
                setIsAuthenticated(false);
                console.error('Error checking auth:', error);
            } finally {
                setIsLoading(false);
            }
        };
        checkAuthAndOrders();
    }, []);

    const handleClaim = async () => {
        // Check if user is authenticated before claiming
        const user = await getCurrentUser();
        if (!user) {
            toast.error('Debes iniciar sesión para reclamar esta oferta');
            return;
        }

        // Check if user already has orders
        if (hasFirstOrder) {
            toast.error('Esta oferta solo es válida para tu primer pedido');
            setIsOpen(false);
            return;
        }

        // Close banner and show success message
        setIsOpen(false);
        toast.success('¡Oferta aplicada! Recibirás 1 gr gratis en tu primer pedido');
        
        // Try to copy code to clipboard if available
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
            try {
                await navigator.clipboard.writeText('1GRGRATIS');
            } catch (err) {
                // Clipboard API failed, but that's okay - we already showed success message
                console.log('Clipboard API not available:', err);
            }
        }
    };

    // Don't show banner if user has already made their first order
    if (isLoading || (isAuthenticated && hasFirstOrder) || !isOpen) {
        return null;
    }

    return (
        <div className="w-full px-6 py-2 font-medium text-sm text-[#1A1A1A] text-center bg-gradient-to-r from-[#00C6A2] via-[#00C6A2] to-[#FFD95E]">
            <div className='flex items-center justify-between max-w-7xl mx-auto'>
                <div className="flex items-center gap-2">
                    <p className="font-semibold">¡Obtén 1 gr gratis en tu primer pedido!</p>
                    {!isAuthenticated && (
                        <span className="text-[10px] opacity-70">*Solo usuarios registrados</span>
                    )}
                </div>
                <div className="flex items-center space-x-6">
                    {isAuthenticated ? (
                        <button onClick={handleClaim} type="button" className="font-semibold text-[#1A1A1A] bg-white/90 hover:bg-white px-7 py-2 rounded-full max-sm:hidden transition-all hover:scale-105 active:scale-95 shadow-md">Reclamar Oferta</button>
                    ) : (
                        <button 
                            onClick={() => {
                                // Trigger login modal - this will be handled by Navbar
                                const event = new CustomEvent('openAuthModal');
                                window.dispatchEvent(event);
                            }} 
                            type="button"
                            className="font-semibold text-[#1A1A1A] bg-white/90 hover:bg-white px-7 py-2 rounded-full max-sm:hidden transition-all hover:scale-105 active:scale-95 shadow-md"
                        >
                            Iniciar Sesión
                        </button>
                    )}
                    <button onClick={() => setIsOpen(false)} type="button" className="font-normal text-[#1A1A1A] py-2 rounded-full hover:bg-white/20 transition-colors">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect y="12.532" width="17.498" height="2.1" rx="1.05" transform="rotate(-45.74 0 12.532)" fill="#1A1A1A" />
                            <rect x="12.533" y="13.915" width="17.498" height="2.1" rx="1.05" transform="rotate(-135.74 12.533 13.915)" fill="#1A1A1A" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};