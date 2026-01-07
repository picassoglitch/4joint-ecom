'use client'
import { XIcon } from "lucide-react"
import { useState, useEffect } from "react"
import { toast } from "react-hot-toast"
import { useDispatch } from "react-redux"
import { addAddress } from "@/lib/features/address/addressSlice"
import { getCurrentUser } from "@/lib/supabase/auth"
import { saveAddress } from "@/lib/supabase/addresses"

const AddressModal = ({ setShowAddressModal }) => {
    const dispatch = useDispatch()
    const [user, setUser] = useState(null)

    const [address, setAddress] = useState({
        name: '',
        email: '',
        street: '',
        city: '',
        state: '',
        zip: '',
        country: 'México',
        phone: '',
        references: ''
    })

    useEffect(() => {
        const loadUser = async () => {
            try {
                const currentUser = await getCurrentUser();
                if (currentUser) {
                    setUser(currentUser);
                    setAddress(prev => ({
                        ...prev,
                        email: currentUser.email || '',
                        name: currentUser.user_metadata?.full_name || currentUser.email || ''
                    }));
                }
            } catch (error) {
                console.error('Error loading user:', error);
            }
        };
        loadUser();
    }, []);

    const handleAddressChange = (e) => {
        setAddress({
            ...address,
            [e.target.name]: e.target.value
        })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        // Validate required fields
        if (!address.name || !address.email || !address.street || !address.city || !address.state || !address.zip || !address.phone) {
            toast.error('Por favor completa todos los campos requeridos');
            return;
        }

        // If user is logged in, try to save to Supabase
        if (user) {
            try {
                const savedAddress = await saveAddress({
                    ...address,
                    references: address.references,
                });
                
                if (savedAddress) {
                    // Add address to Redux store with real ID from Supabase
                    dispatch(addAddress({
                        id: savedAddress.id,
                        name: savedAddress.name,
                        email: savedAddress.email,
                        street: savedAddress.street,
                        city: savedAddress.city,
                        state: savedAddress.state,
                        zip: savedAddress.zip,
                        country: savedAddress.country,
                        phone: savedAddress.phone,
                        address: savedAddress.street,
                    }));

                    toast.success('Dirección guardada exitosamente');
                    setShowAddressModal(false);
                    return;
                } else {
                    // Fallback to localStorage if Supabase save fails
                    console.warn('Could not save to Supabase, saving to localStorage instead');
                }
            } catch (error) {
                console.error('Error saving address to Supabase:', error);
                
                // Handle specific error cases but don't block - fall through to localStorage save
                if (error?.isTableNotFound || error?.code === 'PGRST205' || error?.code === '42P01' || error?.message?.includes('does not exist') || error?.message?.includes('Could not find the table')) {
                    console.warn('Addresses table does not exist. Saving to localStorage instead.');
                } else {
                    console.warn('Error saving to Supabase:', error?.message || 'Unknown error. Saving to localStorage instead.');
                }
                // Fall through to localStorage save
            }
        }

        // For non-logged users OR if Supabase save failed, save to localStorage
        try {
            // Generate a temporary ID for guest addresses
            const tempId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            const guestAddress = {
                id: tempId,
                name: address.name,
                email: address.email,
                street: address.street,
                city: address.city,
                state: address.state,
                zip: address.zip,
                country: address.country || 'México',
                phone: address.phone,
                address: address.street,
                references: address.references,
                is_guest: true, // Mark as guest address
            };

            // Save to localStorage
            const savedGuestAddresses = JSON.parse(localStorage.getItem('guest_addresses') || '[]');
            savedGuestAddresses.push(guestAddress);
            localStorage.setItem('guest_addresses', JSON.stringify(savedGuestAddresses));

            // Add address to Redux store
            dispatch(addAddress(guestAddress));

            toast.success('Dirección guardada exitosamente');
            setShowAddressModal(false);
        } catch (error) {
            console.error('Error saving guest address:', error);
            toast.error('Error al guardar la dirección. Intenta de nuevo.');
        }
    }

    return (
        <form onSubmit={e => toast.promise(handleSubmit(e), { loading: 'Agregando dirección...' })} className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm h-screen flex items-center justify-center overflow-y-auto p-4" style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
            <div className="flex flex-col gap-4 sm:gap-5 text-slate-700 w-full max-w-md bg-white rounded-xl p-4 sm:p-6 shadow-lg max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl sm:text-2xl md:text-3xl">Agregar Nueva <span className="font-semibold">Dirección</span></h2>
                    <button 
                        type="button"
                        onClick={() => setShowAddressModal(false)} 
                        className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-500 hover:text-slate-700 cursor-pointer touch-manipulation"
                        aria-label="Cerrar"
                    >
                        <XIcon size={24} className="sm:w-[30px] sm:h-[30px]" />
                    </button>
                </div>
                
                <input 
                    name="name" 
                    onChange={handleAddressChange} 
                    value={address.name} 
                    className="p-3 sm:p-2 sm:px-4 outline-none border border-slate-200 rounded-lg w-full text-base min-h-[44px] touch-manipulation" 
                    type="text" 
                    placeholder="Nombre completo *" 
                    required 
                />
                
                <input 
                    name="email" 
                    onChange={handleAddressChange} 
                    value={address.email} 
                    className="p-3 sm:p-2 sm:px-4 outline-none border border-slate-200 rounded-lg w-full text-base min-h-[44px] touch-manipulation" 
                    type="email" 
                    placeholder="Correo electrónico *" 
                    required 
                />
                
                <input 
                    name="street" 
                    onChange={handleAddressChange} 
                    value={address.street} 
                    className="p-3 sm:p-2 sm:px-4 outline-none border border-slate-200 rounded-lg w-full text-base min-h-[44px] touch-manipulation" 
                    type="text" 
                    placeholder="Calle y número *" 
                    required 
                />
                
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <input 
                        name="city" 
                        onChange={handleAddressChange} 
                        value={address.city} 
                        className="p-3 sm:p-2 sm:px-4 outline-none border border-slate-200 rounded-lg w-full text-base min-h-[44px] touch-manipulation" 
                        type="text" 
                        placeholder="Ciudad *" 
                        required 
                    />
                    <input 
                        name="state" 
                        onChange={handleAddressChange} 
                        value={address.state} 
                        className="p-3 sm:p-2 sm:px-4 outline-none border border-slate-200 rounded-lg w-full text-base min-h-[44px] touch-manipulation" 
                        type="text" 
                        placeholder="Estado *" 
                        required 
                    />
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <input 
                        name="zip" 
                        onChange={handleAddressChange} 
                        value={address.zip} 
                        className="p-3 sm:p-2 sm:px-4 outline-none border border-slate-200 rounded-lg w-full text-base min-h-[44px] touch-manipulation" 
                        type="text" 
                        placeholder="Código Postal *" 
                        required 
                    />
                    <input 
                        name="country" 
                        onChange={handleAddressChange} 
                        value={address.country} 
                        className="p-3 sm:p-2 sm:px-4 outline-none border border-slate-200 rounded-lg w-full text-base min-h-[44px] touch-manipulation" 
                        type="text" 
                        placeholder="País *" 
                        required 
                    />
                </div>
                
                <input 
                    name="phone" 
                    onChange={handleAddressChange} 
                    value={address.phone} 
                    className="p-3 sm:p-2 sm:px-4 outline-none border border-slate-200 rounded-lg w-full text-base min-h-[44px] touch-manipulation" 
                    type="tel" 
                    placeholder="Teléfono *" 
                    required 
                />
                
                <textarea 
                    name="references" 
                    onChange={handleAddressChange} 
                    value={address.references} 
                    className="p-3 sm:p-2 sm:px-4 outline-none border border-slate-200 rounded-lg w-full text-base min-h-[80px] touch-manipulation resize-none" 
                    placeholder="Referencias (opcional)"
                    rows="3"
                />
                
                <button type="submit" className="bg-[#00C6A2] text-white text-sm sm:text-base font-medium py-3 sm:py-2.5 rounded-full hover:bg-[#00B894] active:scale-95 transition-all min-h-[44px] touch-manipulation shadow-md">
                    GUARDAR DIRECCIÓN
                </button>
            </div>
        </form>
    )
}

export default AddressModal