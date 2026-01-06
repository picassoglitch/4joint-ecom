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
        <form onSubmit={e => toast.promise(handleSubmit(e), { loading: 'Agregando dirección...' })} className="fixed inset-0 z-50 bg-white/60 backdrop-blur h-screen flex items-center justify-center overflow-y-auto">
            <div className="flex flex-col gap-5 text-slate-700 w-full max-w-md mx-6 my-8 bg-white rounded-xl p-6 shadow-lg">
                <div className="flex justify-between items-center">
                    <h2 className="text-3xl">Agregar Nueva <span className="font-semibold">Dirección</span></h2>
                    <XIcon size={30} className="text-slate-500 hover:text-slate-700 cursor-pointer" onClick={() => setShowAddressModal(false)} />
                </div>
                
                <input 
                    name="name" 
                    onChange={handleAddressChange} 
                    value={address.name} 
                    className="p-2 px-4 outline-none border border-slate-200 rounded-lg w-full" 
                    type="text" 
                    placeholder="Nombre completo *" 
                    required 
                />
                
                <input 
                    name="email" 
                    onChange={handleAddressChange} 
                    value={address.email} 
                    className="p-2 px-4 outline-none border border-slate-200 rounded-lg w-full" 
                    type="email" 
                    placeholder="Correo electrónico *" 
                    required 
                />
                
                <input 
                    name="street" 
                    onChange={handleAddressChange} 
                    value={address.street} 
                    className="p-2 px-4 outline-none border border-slate-200 rounded-lg w-full" 
                    type="text" 
                    placeholder="Calle y número *" 
                    required 
                />
                
                <div className="flex gap-4">
                    <input 
                        name="city" 
                        onChange={handleAddressChange} 
                        value={address.city} 
                        className="p-2 px-4 outline-none border border-slate-200 rounded-lg w-full" 
                        type="text" 
                        placeholder="Ciudad *" 
                        required 
                    />
                    <input 
                        name="state" 
                        onChange={handleAddressChange} 
                        value={address.state} 
                        className="p-2 px-4 outline-none border border-slate-200 rounded-lg w-full" 
                        type="text" 
                        placeholder="Estado *" 
                        required 
                    />
                </div>
                
                <div className="flex gap-4">
                    <input 
                        name="zip" 
                        onChange={handleAddressChange} 
                        value={address.zip} 
                        className="p-2 px-4 outline-none border border-slate-200 rounded-lg w-full" 
                        type="text" 
                        placeholder="Código Postal *" 
                        required 
                    />
                    <input 
                        name="country" 
                        onChange={handleAddressChange} 
                        value={address.country} 
                        className="p-2 px-4 outline-none border border-slate-200 rounded-lg w-full" 
                        type="text" 
                        placeholder="País *" 
                        required 
                    />
                </div>
                
                <input 
                    name="phone" 
                    onChange={handleAddressChange} 
                    value={address.phone} 
                    className="p-2 px-4 outline-none border border-slate-200 rounded-lg w-full" 
                    type="tel" 
                    placeholder="Teléfono *" 
                    required 
                />
                
                <textarea 
                    name="references" 
                    onChange={handleAddressChange} 
                    value={address.references} 
                    className="p-2 px-4 outline-none border border-slate-200 rounded-lg w-full" 
                    placeholder="Referencias (opcional)"
                    rows="3"
                />
                
                <button className="bg-[#00C6A2] text-white text-sm font-medium py-2.5 rounded-full hover:bg-[#00B894] active:scale-95 transition-all">
                    GUARDAR DIRECCIÓN
                </button>
            </div>
        </form>
    )
}

export default AddressModal