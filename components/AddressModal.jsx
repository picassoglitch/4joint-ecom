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

        // Save address to Supabase
        try {
            const savedAddress = await saveAddress({
                ...address,
                references: address.references,
            });
            
            // Add address to Redux store with real ID
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
        } catch (error) {
            console.error('Error saving address:', error);
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