import { PlusIcon, SquarePenIcon, XIcon } from 'lucide-react';
import React, { useState, useEffect } from 'react'
import AddressModal from './AddressModal';
import { useSelector, useDispatch } from 'react-redux';
import { addAddress } from '@/lib/features/address/addressSlice';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { createOrder, createOrderItems } from '@/lib/supabase/database';
import { getCurrentUser, autoRegisterUser } from '@/lib/supabase/auth';
import { clearCart } from '@/lib/features/cart/cartSlice';
import { saveAddress, getUserAddresses } from '@/lib/supabase/addresses';
import { validateCartItem } from '@/lib/utils/serviceAreaValidation';

const OrderSummary = ({ totalPrice, items }) => {

    const currency = 'MXN $';

    const router = useRouter();
    const dispatch = useDispatch();

    const addressList = useSelector(state => state.address.list);

    const [paymentMethod, setPaymentMethod] = useState('COD');
    const [processingPayment, setProcessingPayment] = useState(false);
    const [selectedAddress, setSelectedAddress] = useState(null);
    const [showAddressModal, setShowAddressModal] = useState(false);
    const [couponCodeInput, setCouponCodeInput] = useState('');
    const [coupon, setCoupon] = useState('');
    
    // User state
    const [user, setUser] = useState(null);
    const [isLoadingUser, setIsLoadingUser] = useState(true);
    
    // Guest checkout fields
    const [guestEmail, setGuestEmail] = useState('');
    const [guestName, setGuestName] = useState('');
    const [guestPhone, setGuestPhone] = useState('');
    
    // Address fields for guests (temporary, stored in sessionStorage)
    const [guestAddress, setGuestAddress] = useState(() => {
        // Try to load from sessionStorage on mount
        if (typeof window !== 'undefined') {
            const saved = sessionStorage.getItem('guest_checkout_address');
            if (saved) {
                try {
                    return JSON.parse(saved);
                } catch (e) {
                    return {
                        street: '',
                        city: '',
                        state: '',
                        zip: '',
                        references: '',
                        country: 'México'
                    };
                }
            }
        }
        return {
            street: '',
            city: '',
            state: '',
            zip: '',
            references: '',
            country: 'México'
        };
    });
    
    // Delivery options
    const [deliveryOption, setDeliveryOption] = useState(null);
    const [fulfillmentType, setFulfillmentType] = useState(null); // 'pickup', 'delivery', 'meetupPoint', 'courierExterno'
    const [selectedMeetupPoint, setSelectedMeetupPoint] = useState(null);
    const [storeInfo, setStoreInfo] = useState(null);
    
    // Delivery options will be loaded from storeInfo.delivery_options if available
    // Fallback to default options if not configured
    const getDeliveryOptions = () => {
        if (storeInfo?.delivery_options && Array.isArray(storeInfo.delivery_options) && storeInfo.delivery_options.length > 0) {
            // Filter only enabled options
            return storeInfo.delivery_options.filter(opt => opt.enabled !== false);
        }
        // Default fallback options
        return [
            {
                id: 'same_day',
                name: 'Entrega Mismo Día',
                price: 80,
                description: 'Lun-Vie antes de 8pm, Sáb antes de 6pm'
            },
            {
                id: 'on_demand',
                name: 'On Demand',
                price: 150,
                description: 'Entrega inmediata en 80 min. Lun-Vie antes de 8pm. Solo CDMX'
            }
        ];
    };
    
    const deliveryOptions = getDeliveryOptions();
    
    // Tip options
    const [tipType, setTipType] = useState('percentage'); // 'percentage' or 'custom'
    const [tipPercentage, setTipPercentage] = useState(0);
    const [customTip, setCustomTip] = useState('');
    const tipPercentages = [0, 3, 5, 10, 15];
    
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);

    // Check if user is eligible for free 1gr (first order)
    const [isEligibleForFreeGram, setIsEligibleForFreeGram] = useState(false);
    
    // Track if user was auto-registered in this session (to skip address saving)
    const [wasAutoRegistered, setWasAutoRegistered] = useState(false);
    
    // Save guest address to sessionStorage whenever it changes (only for non-logged users)
    useEffect(() => {
        if (!user && typeof window !== 'undefined') {
            // Save guest address temporarily to sessionStorage
            sessionStorage.setItem('guest_checkout_address', JSON.stringify(guestAddress));
        }
    }, [guestAddress, user]);

    // Save guest contact info to sessionStorage
    useEffect(() => {
        if (!user && typeof window !== 'undefined') {
            const guestInfo = {
                name: guestName,
                email: guestEmail,
                phone: guestPhone
            };
            sessionStorage.setItem('guest_checkout_info', JSON.stringify(guestInfo));
        }
    }, [guestName, guestEmail, guestPhone, user]);

    // Fetch store info to check fulfillment modes
    useEffect(() => {
        const fetchStoreInfo = async () => {
            try {
                const vendorId = items[0]?.vendor_id || items[0]?.storeId;
                if (!vendorId) return;

                const response = await fetch(`/api/stores/info?vendorId=${vendorId}`);
                if (response.ok) {
                    const data = await response.json();
                    setStoreInfo(data);
                }
            } catch (error) {
                console.error('Error fetching store info:', error);
            }
        };

        if (items.length > 0) {
            fetchStoreInfo();
        }
    }, [items]);

    // Auto-select first address when addressList changes and user is logged in
    useEffect(() => {
        if (user && addressList.length > 0 && !selectedAddress) {
            // Auto-select the first address (default or first available)
            const defaultAddr = addressList.find(a => a.is_default) || addressList[0];
            if (defaultAddr) {
                setSelectedAddress(defaultAddr);
            }
        }
    }, [addressList, user]);

    // Check if user is logged in and load saved addresses
    useEffect(() => {
        const checkUser = async () => {
            try {
                const currentUser = await getCurrentUser();
                setUser(currentUser);
                if (currentUser) {
                    setGuestEmail(currentUser.email || '');
                    setGuestName(currentUser.user_metadata?.full_name || currentUser.email || '');
                    
                    // Clear sessionStorage when user logs in and migrate guest addresses
                    if (typeof window !== 'undefined') {
                        sessionStorage.removeItem('guest_checkout_address');
                        sessionStorage.removeItem('guest_checkout_info');
                        // Try to migrate guest addresses to user account
                        const guestAddresses = JSON.parse(localStorage.getItem('guest_addresses') || '[]');
                        if (guestAddresses.length > 0) {
                            // Attempt to save guest addresses to user account
                            guestAddresses.forEach(async (guestAddr) => {
                                try {
                                    const { saveAddress } = await import('@/lib/supabase/addresses');
                                    await saveAddress({
                                        name: guestAddr.name,
                                        email: guestAddr.email,
                                        street: guestAddr.street,
                                        city: guestAddr.city,
                                        state: guestAddr.state,
                                        zip: guestAddr.zip,
                                        country: guestAddr.country || 'México',
                                        phone: guestAddr.phone,
                                        references: guestAddr.references,
                                        is_default: false,
                                    });
                                } catch (error) {
                                    console.warn('Could not migrate guest address to user account:', error);
                                }
                            });
                            // Clear guest addresses after migration attempt
                            localStorage.removeItem('guest_addresses');
                        }
                    }
                    
                    // Load saved addresses (only if addresses table exists and user has valid ID)
                    try {
                        if (!currentUser.id) {
                            console.warn('User ID is missing, skipping address load');
                        } else {
                            const savedAddresses = await getUserAddresses(currentUser.id);
                            if (savedAddresses && savedAddresses.length > 0) {
                                // Update Redux store with saved addresses
                                savedAddresses.forEach(addr => {
                                    dispatch(addAddress({
                                        id: addr.id,
                                        name: addr.name,
                                        email: addr.email,
                                        street: addr.street,
                                        city: addr.city,
                                        state: addr.state,
                                        zip: addr.zip,
                                        country: addr.country,
                                        phone: addr.phone,
                                        address: addr.street,
                                    }));
                                });
                                // Auto-select first address (default or first available)
                                const defaultAddr = savedAddresses.find(a => a.is_default) || savedAddresses[0];
                                if (defaultAddr && !selectedAddress) {
                                    setSelectedAddress({
                                        id: defaultAddr.id,
                                        name: defaultAddr.name,
                                        email: defaultAddr.email,
                                        street: defaultAddr.street,
                                        city: defaultAddr.city,
                                        state: defaultAddr.state,
                                        zip: defaultAddr.zip,
                                        country: defaultAddr.country,
                                        phone: defaultAddr.phone,
                                        address: defaultAddr.street,
                                    });
                                }
                            }
                        }
                    } catch (error) {
                        // Handle 404 error gracefully (table doesn't exist)
                        if (error?.code === '42P01' || error?.message?.includes('does not exist') || error?.message?.includes('404')) {
                            console.warn('Addresses table does not exist. Run migration_addresses.sql in Supabase.');
                        } else if (error?.code === '22P02' || error?.message?.includes('invalid input syntax for type uuid')) {
                            console.warn('Invalid UUID format for user_id. Skipping address load.');
                        } else {
                            console.error('Error loading addresses:', error);
                        }
                    }
                    
                    // Check if user is eligible for free 1gr (no previous orders)
                    try {
                        const { getOrders } = await import('@/lib/supabase/database');
                        const orders = await getOrders({ user_id: currentUser.id });
                        setIsEligibleForFreeGram(!orders || orders.length === 0);
                    } catch (error) {
                        console.error('Error checking orders:', error);
                        setIsEligibleForFreeGram(false);
                    }
                } else {
                    // User is not logged in - load guest addresses from localStorage
                    if (typeof window !== 'undefined') {
                        try {
                            const guestAddresses = JSON.parse(localStorage.getItem('guest_addresses') || '[]');
                            if (guestAddresses && guestAddresses.length > 0) {
                                // Load guest addresses into Redux store
                                guestAddresses.forEach(addr => {
                                    dispatch(addAddress({
                                        id: addr.id,
                                        name: addr.name,
                                        email: addr.email,
                                        street: addr.street,
                                        city: addr.city,
                                        state: addr.state,
                                        zip: addr.zip,
                                        country: addr.country || 'México',
                                        phone: addr.phone,
                                        address: addr.street,
                                        is_guest: true,
                                    }));
                                });
                                // Auto-select first guest address if available
                                if (guestAddresses.length > 0 && !selectedAddress) {
                                    const firstAddr = guestAddresses[0];
                                    setSelectedAddress({
                                        id: firstAddr.id,
                                        name: firstAddr.name,
                                        email: firstAddr.email,
                                        street: firstAddr.street,
                                        city: firstAddr.city,
                                        state: firstAddr.state,
                                        zip: firstAddr.zip,
                                        country: firstAddr.country || 'México',
                                        phone: firstAddr.phone,
                                        address: firstAddr.street,
                                        is_guest: true,
                                    });
                                }
                            }
                        } catch (error) {
                            console.error('Error loading guest addresses:', error);
                        }
                    }
                    
                    // Load guest info from sessionStorage if available
                    if (typeof window !== 'undefined') {
                        const savedInfo = sessionStorage.getItem('guest_checkout_info');
                        if (savedInfo) {
                            try {
                                const info = JSON.parse(savedInfo);
                                if (info.name) setGuestName(info.name);
                                if (info.email) setGuestEmail(info.email);
                                if (info.phone) setGuestPhone(info.phone);
                            } catch (e) {
                                // Ignore parse errors
                            }
                        }
                    }
                    setIsEligibleForFreeGram(false);
                }
            } catch (error) {
                console.error('Error checking user:', error);
                setIsEligibleForFreeGram(false);
            } finally {
                setIsLoadingUser(false);
            }
        };
        checkUser();
    }, []);

    // Calculate coupon discount
    const calculateCouponDiscount = (subtotal) => {
        if (!coupon) return 0;
        
        switch (coupon.type) {
            case 'percentage':
                let discount = (subtotal * coupon.discount_value) / 100;
                if (coupon.max_discount && discount > coupon.max_discount) {
                    discount = coupon.max_discount;
                }
                return discount;
            case 'fixed_amount':
                return Math.min(coupon.discount_value, subtotal);
            case 'free_shipping':
                return 0; // Handled separately in delivery cost
            case 'free_product':
            case 'gift':
                return 0; // Handled separately
            default:
                return 0;
        }
    };

    const calculateTip = () => {
        // Calculate tip based on subtotal + delivery + courier (BEFORE coupon)
        const subtotal = totalPrice; // Original subtotal without coupon
        
        // Check if free shipping applies (based on ORIGINAL subtotal)
        const freeShippingThreshold = storeInfo?.free_shipping_threshold || 800;
        const isFreeShippingFromCoupon = coupon?.type === 'free_shipping';
        const isFreeShippingFromAmount = subtotal >= freeShippingThreshold;
        const isFreeShipping = isFreeShippingFromCoupon || isFreeShippingFromAmount;
        
        // Calculate delivery cost
        let deliveryCost = 0;
        if (deliveryOption) {
            const isSameDay = deliveryOption.id === 'same_day';
            if (isFreeShipping && isSameDay) {
                deliveryCost = 0;
            } else {
                deliveryCost = deliveryOption.originalPrice || deliveryOption.price || 0;
            }
        }
        
        const courierCost = getCourierCost();
        const orderSubtotal = subtotal + deliveryCost + courierCost;
        
        if (tipType === 'percentage') {
            return (orderSubtotal * tipPercentage) / 100;
        } else {
            return parseFloat(customTip) || 0;
        }
    };

    const getCourierCost = () => {
        if (fulfillmentType === 'courierExterno' && storeInfo && !storeInfo.courier_cost_included) {
            return storeInfo.courier_cost || 0;
        }
        return 0;
    };

    const calculateTotal = () => {
        // IMPORTANT: Calculate everything BEFORE applying coupon
        // This ensures free shipping and other calculations are based on original subtotal
        
        const subtotal = totalPrice; // Original subtotal without coupon
        
        // Check if free shipping applies (based on ORIGINAL subtotal, not after coupon)
        const freeShippingThreshold = storeInfo?.free_shipping_threshold || 800;
        const isFreeShippingFromCoupon = coupon?.type === 'free_shipping';
        const isFreeShippingFromAmount = subtotal >= freeShippingThreshold; // Use original subtotal
        const isFreeShipping = isFreeShippingFromCoupon || isFreeShippingFromAmount;
        
        // Calculate delivery cost (based on free shipping status from original subtotal)
        let deliveryCost = 0;
        if (deliveryOption) {
            const isSameDay = deliveryOption.id === 'same_day';
            if (isFreeShipping && isSameDay) {
                deliveryCost = 0; // Free shipping applies to same day
            } else {
                // Use original price if available, otherwise use current price
                deliveryCost = deliveryOption.originalPrice || deliveryOption.price || 0;
            }
        }
        
        const courierCost = getCourierCost();
        
        // Calculate tip based on subtotal + delivery + courier (before coupon)
        const orderSubtotal = subtotal + deliveryCost + courierCost;
        let tip = 0;
        if (tipType === 'percentage') {
            tip = (orderSubtotal * tipPercentage) / 100;
        } else {
            tip = parseFloat(customTip) || 0;
        }
        
        // Calculate total BEFORE coupon: subtotal + delivery + courier + tip
        const totalBeforeCoupon = subtotal + deliveryCost + courierCost + tip;
        
        // NOW apply coupon discount to the FINAL total
        // Check if coupon is stackable with other promotions
        let couponDiscount = 0;
        if (coupon) {
            // Check if there are other active promotions (e.g., free shipping from amount threshold)
            const hasOtherPromotions = isFreeShippingFromAmount && coupon.type !== 'free_shipping';
            
            // If coupon is not stackable and there are other promotions, don't apply the coupon
            if (!coupon.stackable_with_promotions && hasOtherPromotions) {
                couponDiscount = 0; // Don't apply coupon if not stackable and other promotions exist
            } else {
                // For free_shipping coupons, they don't reduce the total, they just make shipping free
                if (coupon.type === 'free_shipping') {
                    couponDiscount = 0; // Already handled in deliveryCost calculation
                } else {
                    // Apply coupon to the final total (subtotal + delivery + courier + tip)
                    switch (coupon.type) {
                        case 'percentage':
                            couponDiscount = (totalBeforeCoupon * coupon.discount_value) / 100;
                            if (coupon.max_discount && couponDiscount > coupon.max_discount) {
                                couponDiscount = coupon.max_discount;
                            }
                            break;
                        case 'fixed_amount':
                            couponDiscount = Math.min(coupon.discount_value, totalBeforeCoupon);
                            break;
                        default:
                            couponDiscount = 0;
                    }
                }
            }
        }
        
        return totalBeforeCoupon - couponDiscount;
    };
    
    const getDeliveryCost = () => {
        // Calculate delivery cost based on ORIGINAL subtotal (before coupon)
        const subtotal = totalPrice; // Original subtotal without coupon
        
        // Check if free shipping applies (based on ORIGINAL subtotal)
        const freeShippingThreshold = storeInfo?.free_shipping_threshold || 800;
        const isFreeShippingFromCoupon = coupon?.type === 'free_shipping';
        const isFreeShippingFromAmount = subtotal >= freeShippingThreshold; // Use original subtotal
        const isFreeShipping = isFreeShippingFromCoupon || isFreeShippingFromAmount;
        
        if (!deliveryOption) return 0;
        
        // If free shipping applies and "same_day" is selected: $0
        // If "on_demand" is selected: always charge full price (premium option)
        const isSameDay = deliveryOption.id === 'same_day';
        if (isFreeShipping && isSameDay) {
            return 0; // Free shipping applies to same day
        }
        
        // Use original price if available, otherwise use current price
        return deliveryOption.originalPrice || deliveryOption.price || 0;
    };

    const handleCouponCode = async (event) => {
        event.preventDefault();
        
        if (!couponCodeInput.trim()) {
            toast.error('Por favor ingresa un código de cupón');
            return;
        }

        try {
            // Get vendor_id from first item
            const vendorId = items[0]?.vendor_id || items[0]?.storeId;
            if (!vendorId) {
                toast.error('No se pudo determinar la tienda');
                return;
            }

            // Calculate current subtotal
            const currentSubtotal = totalPrice;

            // Get user ID if logged in
            const userId = user?.id || null;

            // Validate coupon
            const response = await fetch('/api/coupons/validate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    code: couponCodeInput.trim(),
                    user_id: userId,
                    vendor_id: vendorId,
                    subtotal: currentSubtotal,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al validar el cupón');
            }

            const { coupon: validatedCoupon } = await response.json();
            
            // Set coupon with all necessary data
            setCoupon({
                code: validatedCoupon.code,
                description: validatedCoupon.description,
                type: validatedCoupon.type,
                discount_value: validatedCoupon.discount_value,
                discount_amount: validatedCoupon.discount_amount,
                discount_description: validatedCoupon.discount_description,
                free_product_id: validatedCoupon.free_product_id,
                min_purchase: validatedCoupon.min_purchase,
                max_discount: validatedCoupon.max_discount,
                stackable_with_promotions: validatedCoupon.stackable_with_promotions !== undefined ? validatedCoupon.stackable_with_promotions : true,
            });

            toast.success('Cupón aplicado exitosamente');
            setCouponCodeInput('');
        } catch (error) {
            console.error('Error validating coupon:', error);
            toast.error(error.message || 'Error al validar el cupón');
            throw error;
        }
    }

    const handlePlaceOrder = async (e) => {
        e.preventDefault();
        
        // CRITICAL VALIDATION: Must select fulfillment type
        if (!fulfillmentType) {
            toast.error('Por favor selecciona un tipo de entrega');
            return;
        }
        
        // CRITICAL VALIDATION: Must have address if delivery is required
        if (fulfillmentType === 'delivery' || fulfillmentType === 'courierExterno') {
            if (!user) {
                // Guest user - check guest address
                if (!guestAddress.street || !guestAddress.city || !guestAddress.state || !guestAddress.zip) {
                    toast.error('Por favor completa tu dirección de envío');
                    return;
                }
            } else {
                // Logged in user - check selected address
                if (!selectedAddress && addressList.length === 0) {
                    toast.error('Por favor agrega y selecciona una dirección de envío');
                    return;
                }
            }
        }
        
        // Validate only essential fields - allow optional fields to be empty
        if (!user) {
            // Only require email for guest checkout (for order confirmation)
            if (!guestEmail || guestEmail.trim() === '') {
                toast.error('Por favor ingresa tu email para confirmar el pedido');
                return;
            }
            // Name and phone are optional but recommended
            // Address is only required if delivery is selected
            if (fulfillmentType === 'delivery' || fulfillmentType === 'courierExterno') {
                if (!guestAddress.street || !guestAddress.city || !guestAddress.state || !guestAddress.zip) {
                    toast.error('Por favor completa tu dirección de envío');
                    return;
                }
            }
            
            // Auto-register the user before placing order
            setIsPlacingOrder(true);
            toast.loading('Creando tu cuenta...', { id: 'auto-register' });
            
            try {
                const { data: signUpData, error: signUpError } = await autoRegisterUser(guestEmail, {
                    full_name: guestName,
                    phone: guestPhone,
                });
                
                if (signUpError) {
                    // If user already exists, show message but continue with order
                    if (signUpError.message?.includes('ya está registrado')) {
                        toast.error('Este email ya está registrado. Usa "Olvidé mi contraseña" para acceder. Continuando con tu pedido...', { id: 'auto-register' });
                        // Continue with guest checkout
                    } else {
                        toast.error(signUpError.message || 'Error al crear la cuenta. Continuando como invitado...', { id: 'auto-register' });
                        // Continue with guest checkout anyway
                    }
                } else {
                    // Registration successful
                    toast.success('Cuenta creada exitosamente. Te hemos enviado un email para establecer tu contraseña.', { id: 'auto-register' });
                    
                    // Mark that user was auto-registered (session may not be ready yet)
                    setWasAutoRegistered(true);
                    
                    // Wait a moment for session to be established, then refresh user session
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    // Refresh user session
                    const { user: newUser } = await getCurrentUser();
                    if (newUser) {
                        setUser(newUser);
                        // Update guest info with user data
                        setGuestEmail(newUser.email || guestEmail);
                        setGuestName(newUser.user_metadata?.full_name || guestName);
                    } else {
                        // Session might not be ready yet, but continue with order
                        // The address won't be saved, but the order will proceed
                        console.warn('User session not ready yet after auto-registration. Order will continue as guest.');
                    }
                }
            } catch (error) {
                console.error('Error in auto-registration:', error);
                toast.error('Error al crear la cuenta. Continuando como invitado...', { id: 'auto-register' });
                // Continue with guest checkout
            }
        } else {
            setIsPlacingOrder(true);
        }
        
        // Validate address only if delivery is required
        if (fulfillmentType === 'delivery' || fulfillmentType === 'courierExterno') {
            if (!user && (!guestAddress.street || !guestAddress.city || !guestAddress.state || !guestAddress.zip)) {
                toast.error('Por favor completa tu dirección de envío');
                setIsPlacingOrder(false);
                return;
            }
            
            if (user && !selectedAddress && addressList.length === 0) {
                toast.error('Por favor agrega una dirección de envío');
                setIsPlacingOrder(false);
                return;
            }
        }
        
        // Get customer zip code for service area validation
        let customerZipCode = null;
        if (user && selectedAddress) {
            customerZipCode = selectedAddress.zip;
        } else if (!user && guestAddress.zip) {
            customerZipCode = guestAddress.zip;
        } else if (addressList.length > 0) {
            const defaultAddr = addressList.find(a => a.is_default) || addressList[0];
            customerZipCode = defaultAddr?.zip;
        }
        
        // Validate service area if store has service colonias configured
        if (storeInfo && storeInfo.service_colonias && storeInfo.service_colonias.length > 0 && customerZipCode) {
            const validation = await validateCartItem(customerZipCode, storeInfo);
            if (!validation.isValid) {
                toast.error(validation.message);
                setIsPlacingOrder(false);
                return;
            }
        }
        
        try {
            // Get vendor_id from first item (assuming all items are from same vendor)
            // Handle both vendor_id (Supabase) and storeId (legacy)
            let vendorId = items[0]?.vendor_id || items[0]?.storeId;
            
            if (!vendorId) {
                console.error('Items:', items);
                throw new Error('No se pudo determinar el vendedor. Los productos no tienen vendor_id o storeId.');
            }

            // Validate vendor_id format (should be UUID for Supabase)
            // If it's a legacy storeId like "seller_1", we need to handle it differently
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(vendorId)) {
                console.warn('vendor_id is not a valid UUID:', vendorId);
                // Try to find a valid vendor or show error
                throw new Error('El vendedor no es válido. Por favor, asegúrate de que los productos provengan de una tienda aprobada.');
            }

            console.log('Creating order with vendor_id:', vendorId);

            // Use the same calculation logic as calculateTotal() to ensure consistency
            const subtotal = totalPrice;
            const couponDiscount = calculateCouponDiscount(subtotal);
            const subtotalAfterCoupon = subtotal - couponDiscount;
            
            // Check if free shipping applies (either from coupon or subtotal >= 800)
            const isFreeShippingFromCoupon = coupon?.type === 'free_shipping';
            const isFreeShippingFromAmount = subtotalAfterCoupon >= 800;
            const isFreeShipping = isFreeShippingFromCoupon || isFreeShippingFromAmount;
            
            const deliveryCost = (deliveryOption && !isFreeShipping) ? deliveryOption.price : 0;
            const courierCost = (fulfillmentType === 'courierExterno' && storeInfo && !storeInfo.courier_cost_included) 
                ? (storeInfo.courier_cost || 0) 
                : 0;
            const tip = calculateTip();
            const finalTotal = subtotalAfterCoupon + deliveryCost + courierCost + tip;
            
            console.log('Order calculation:', {
                subtotal,
                couponDiscount,
                subtotalAfterCoupon,
                isFreeShippingFromCoupon,
                isFreeShippingFromAmount,
                isFreeShipping,
                deliveryCost,
                tip,
                finalTotal
            });

            // Validate address_id - must be a valid UUID or null
            let validAddressId = null;
            if (selectedAddress?.id) {
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                if (uuidRegex.test(selectedAddress.id)) {
                    validAddressId = selectedAddress.id;
                } else {
                    console.warn('address_id is not a valid UUID, setting to null:', selectedAddress.id);
                    validAddressId = null;
                }
            }

            // courierCost is already calculated above (line 605)
            const orderData = {
                vendor_id: vendorId,
                total: finalTotal + courierCost, // Add courier cost to total if not included
                payment_method: paymentMethod,
                payment_provider: paymentMethod,
                is_paid: paymentMethod === 'COD' ? false : false, // Will be updated after payment confirmation for Mercado Pago
                address_id: validAddressId,
                commission: (finalTotal + courierCost) * 0.15,
                vendor_earnings: (finalTotal + courierCost) * 0.85,
                // Guest checkout fields
                guest_email: !user ? guestEmail : null,
                guest_name: !user ? guestName : null,
                guest_phone: !user ? guestPhone : null,
                guest_address: !user ? {
                    street: guestAddress.street,
                    city: guestAddress.city,
                    state: guestAddress.state,
                    zip: guestAddress.zip,
                    references: guestAddress.references,
                    country: guestAddress.country,
                } : (selectedAddress ? {
                    name: selectedAddress.name,
                    city: selectedAddress.city,
                    state: selectedAddress.state,
                    zip: selectedAddress.zip,
                    address: selectedAddress.address || selectedAddress.street || '',
                } : null),
                // Delivery and tip info
                delivery_option: deliveryOption ? deliveryOption.id : null,
                delivery_cost: deliveryCost,
                tip_amount: tip,
                // Fulfillment fields
                fulfillment_type: fulfillmentType,
                meetup_point_id: selectedMeetupPoint?.id || null,
                courier_cost: courierCost,
                dispatch_status: fulfillmentType === 'courierExterno' ? 'pending' : null,
            };

            console.log('Order data:', orderData);
            console.log('Items:', items);
            
            // Validate order data before creating
            if (!orderData.vendor_id) {
                throw new Error('No se pudo determinar el vendedor. Los productos no tienen vendor_id válido.');
            }
            if (!orderData.total || orderData.total <= 0) {
                throw new Error('El total del pedido debe ser mayor a 0.');
            }
            
            let order;
            try {
                order = await createOrder(orderData);
                console.log('Order created:', order);
                
                if (!order || !order.id) {
                    throw new Error('La orden se creó pero no se recibió un ID válido.');
                }
            } catch (createOrderError) {
                console.error('Error in createOrder:', createOrderError);
                throw createOrderError; // Re-throw to be caught by outer catch
            }
            
            // Create order items - ensure items have correct structure
            let orderItems = items.map(item => {
                if (!item.id) {
                    console.error('Item without id:', item);
                    throw new Error('Uno o más productos no tienen un ID válido.');
                }
                return {
                    id: item.id,
                    quantity: item.quantity || 1,
                    price: item.price || 0,
                    variant: item.variant || null, // Include variant info if available
                };
            });
            
            // Add free 1gr for first-time registered users
            if (user && isEligibleForFreeGram) {
                // Create a special item for the free gram
                // We'll use a special product ID or create it as a special item
                // For now, we'll add it as a special item with price 0
                // Note: You may need to create a special product in your database for this
                // Or handle it as a special case in your order_items table
                orderItems.push({
                    id: 'FREE_1GR_FIRST_ORDER', // Special ID for free gram
                    quantity: 1,
                    price: 0, // Free
                    variant: {
                        name: '1 gr gratis',
                        price: 0,
                    },
                });
                console.log('✅ Agregando 1 gr gratis para primer pedido');
            }
            
            console.log('Creating order items:', orderItems);
            
            try {
                await createOrderItems(order.id, orderItems);
                console.log('Order items created successfully');
                
                // Notify vendor about new order ONLY for COD (cash on delivery)
                // For Mercado Pago, notifications will be sent after payment confirmation via webhook
                if (paymentMethod === 'COD') {
                    try {
                        console.log(`📧 Notifying vendor ${order.vendor_id} about COD order ${order.id}`)
                        const notifyResponse = await fetch('/api/notify-vendor', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                orderId: order.id,
                                vendorId: order.vendor_id,
                            }),
                        })
                        
                        if (!notifyResponse.ok) {
                            const errorData = await notifyResponse.json().catch(() => ({}))
                            console.error('❌ Notification API error:', errorData)
                        } else {
                            const result = await notifyResponse.json()
                            console.log('✅ Notification sent:', result)
                        }
                    } catch (notifyError) {
                        console.error('❌ Error notifying vendor (non-blocking):', notifyError);
                        // Don't fail the order if notification fails
                    }
                } else {
                    console.log(`⏳ Order ${order.id} created with ${paymentMethod}. Notifications will be sent after payment confirmation.`)
                }
            } catch (createItemsError) {
                console.error('Error creating order items:', createItemsError);
                throw createItemsError; // Re-throw to be caught by outer catch
            }

            // If Mercado Pago, create preference and redirect
            if (paymentMethod === 'MERCADOPAGO') {
                setProcessingPayment(true);
                
                try {
                    const payerInfo = {
                        name: user ? (user.user_metadata?.full_name || user.email?.split('@')[0]) : guestName,
                        surname: '',
                        email: user ? user.email : guestEmail,
                        phone: user ? null : guestPhone,
                        address: !user ? {
                            street: guestAddress.street,
                            streetNumber: '',
                            zip: guestAddress.zip,
                        } : (selectedAddress ? {
                            street: selectedAddress.address || selectedAddress.street || '',
                            streetNumber: '',
                            zip: selectedAddress.zip,
                        } : null),
                    };

                    // Calculate final total with all discounts and fees
                    const subtotal = totalPrice;
                    const couponDiscount = calculateCouponDiscount(subtotal);
                    const subtotalAfterCoupon = subtotal - couponDiscount;
                    const finalTotal = calculateTotal(); // This includes delivery and tip
                    
                    // Calculate the discount ratio to apply proportionally to items
                    const discountRatio = couponDiscount > 0 && subtotal > 0 ? couponDiscount / subtotal : 0;
                    
                    // Create preference items with coupon discount applied proportionally
                    const preferenceItems = items.map(item => {
                        const itemSubtotal = (item.price || item.discountedPrice || 0) * (item.quantity || 1);
                        const itemDiscount = itemSubtotal * discountRatio;
                        const itemPriceAfterDiscount = (itemSubtotal - itemDiscount) / (item.quantity || 1);
                        
                        return {
                            name: item.name,
                            quantity: item.quantity || 1,
                            price: Math.max(0, parseFloat(itemPriceAfterDiscount.toFixed(2))), // Ensure price is not negative and has 2 decimals
                        };
                    });

                    // Calculate sum of product items to verify total
                    const productsTotal = preferenceItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                    
                    // Add delivery and tip as items if applicable
                    if (deliveryCost > 0) {
                        preferenceItems.push({
                            name: 'Envío',
                            quantity: 1,
                            price: parseFloat(deliveryCost.toFixed(2)),
                        });
                    }
                    if (tip > 0) {
                        preferenceItems.push({
                            name: 'Propina',
                            quantity: 1,
                            price: parseFloat(tip.toFixed(2)),
                        });
                    }
                    
                    // Calculate total from all items
                    const itemsTotal = preferenceItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                    
                    // If there's a rounding difference, adjust the last item to match final total
                    const difference = finalTotal - itemsTotal;
                    if (Math.abs(difference) > 0.01 && preferenceItems.length > 0) {
                        const lastItem = preferenceItems[preferenceItems.length - 1];
                        lastItem.price = Math.max(0, parseFloat((lastItem.price + difference).toFixed(2)));
                    }
                    
                    console.log('MercadoPago items:', preferenceItems);
                    console.log('Final total calculated:', finalTotal);
                    console.log('Items total:', preferenceItems.reduce((sum, item) => sum + (item.price * item.quantity), 0));

                    const response = await fetch('/api/mercadopago/create-preference', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            items: preferenceItems,
                            orderId: order.id,
                            payer: payerInfo,
                        }),
                    });

                    let responseData;
                    try {
                        responseData = await response.json();
                    } catch (parseError) {
                        console.error('Error parsing Mercado Pago response:', parseError);
                        const text = await response.text();
                        console.error('Raw response:', text);
                        throw new Error('Error al procesar la respuesta de Mercado Pago. Verifica que MERCADOPAGO_ACCESS_TOKEN esté configurado en .env.local');
                    }

                    if (!response.ok) {
                        const errorMessage = responseData?.error || responseData?.message || 'Error al crear la preferencia de pago';
                        console.error('Mercado Pago API error:', {
                            status: response.status,
                            statusText: response.statusText,
                            error: responseData?.error,
                            details: responseData?.details,
                            message: responseData?.message,
                            fullResponse: responseData
                        });
                        throw new Error(errorMessage);
                    }

                    const { init_point, sandbox_init_point } = responseData;
                    
                    // Redirect to Mercado Pago checkout
                    // Use init_point for production, sandbox_init_point only for testing
                    // When using production credentials, init_point is the production URL
                    window.location.href = init_point || sandbox_init_point;
                } catch (error) {
                    console.error('Error creating Mercado Pago preference:', error);
                    
                    // Extract error message more safely
                    let errorMessage = 'Error al procesar el pago. Intenta de nuevo.';
                    
                    if (error?.message) {
                        errorMessage = error.message;
                    } else if (typeof error === 'string') {
                        errorMessage = error;
                    } else if (error?.error) {
                        errorMessage = error.error;
                    } else if (error?.details?.message) {
                        errorMessage = error.details.message;
                    }
                    
                    // Check if it's a configuration error
                    if (errorMessage.includes('MERCADOPAGO_ACCESS_TOKEN') || errorMessage.includes('no está configurado')) {
                        errorMessage = 'Mercado Pago no está configurado. Contacta al administrador.';
                    }
                    
                    console.error('Final error message:', errorMessage);
                    toast.error(errorMessage);
                    setProcessingPayment(false);
                    setIsPlacingOrder(false);
                }
                return;
            }
            
            // Save address to user account if logged in and address was entered manually
            // Only try to save if user is logged in (not for guest checkout)
            // IMPORTANT: Skip if user was auto-registered in this session (session may not be ready)
            // Also verify that session is actually established before trying to save
            if (user && !selectedAddress && guestAddress.street && !wasAutoRegistered) {
                try {
                    // Double-check that user session is actually established
                    const { user: verifiedUser } = await getCurrentUser();
                    if (!verifiedUser) {
                        console.warn('User session not established yet. Skipping address save.');
                    } else {
                        const savedAddress = await saveAddress({
                            name: guestName || verifiedUser.user_metadata?.full_name || verifiedUser.email,
                            email: guestEmail || verifiedUser.email,
                            street: guestAddress.street,
                            city: guestAddress.city,
                            state: guestAddress.state,
                            zip: guestAddress.zip,
                            country: guestAddress.country || 'México',
                            phone: guestPhone,
                            references: guestAddress.references,
                            is_default: true, // Set as default if it's the first address
                        });
                        
                        if (savedAddress) {
                            console.log('✅ Dirección guardada en la cuenta del usuario');
                        } else {
                            console.warn('Address could not be saved (no session). User can add it later.');
                        }
                    }
                } catch (error) {
                    // Handle errors gracefully - don't fail the order
                    if (error?.isTableNotFound || error?.code === 'PGRST205' || error?.code === '42P01' || error?.message?.includes('does not exist') || error?.message?.includes('404') || error?.message?.includes('Could not find the table')) {
                        console.warn('Addresses table does not exist. Run migration_addresses.sql in Supabase. Order will continue without saving address.');
                    } else {
                        console.warn('Error saving address (non-critical):', error?.message || error);
                    }
                    // Don't fail the order if address save fails - this is a non-critical operation
                }
            } else if (wasAutoRegistered) {
                console.log('User was auto-registered in this session. Address will not be saved (user can add it later after setting password).');
            }
            
            // Clear guest checkout data from sessionStorage after successful order
            if (!user && typeof window !== 'undefined') {
                sessionStorage.removeItem('guest_checkout_address');
                sessionStorage.removeItem('guest_checkout_info');
            }
            
            // For COD, clear cart and redirect to success page
            dispatch(clearCart());
            // Redirect to success page with order ID
            router.push(`/order-success?orderId=${order.id}`);
        } catch (error) {
            // Extract error information more safely
            const errorInfo = {
                message: error?.message || error?.error_description || String(error),
                code: error?.code,
                details: error?.details,
                hint: error?.hint,
                name: error?.name,
                stack: error?.stack
            };
            
            console.error('Error placing order:', error);
            console.error('Error info:', errorInfo);
            
            // Try to stringify safely
            try {
                console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
            } catch (e) {
                console.error('Could not stringify error:', e);
                console.error('Error toString:', error.toString());
            }
            
            // Better error handling with more specific messages
            let errorMessage = 'Error al realizar el pedido. Intenta de nuevo.';
            
            // Check message first
            if (errorInfo.message) {
                errorMessage = errorInfo.message;
                
                // Provide helpful messages for common errors
                if (errorInfo.message.includes('not-null constraint') || errorInfo.message.includes('null value')) {
                    errorMessage = 'Error: Falta información requerida. Por favor, ejecuta la migración de guest checkout en Supabase (ALTER TABLE orders ALTER COLUMN user_id DROP NOT NULL).';
                } else if (errorInfo.message.includes('row-level security') || errorInfo.message.includes('RLS') || errorInfo.message.includes('policy')) {
                    errorMessage = 'Error de permisos. Por favor, ejecuta el script fix_rls_orders.sql en Supabase.';
                } else if (errorInfo.message.includes('column') || errorInfo.message.includes('does not exist')) {
                    errorMessage = 'Error: Faltan columnas en la base de datos. Por favor, ejecuta las migraciones necesarias (ver MIGRATION_INSTRUCTIONS.md).';
                } else if (errorInfo.message.includes('vendor') || errorInfo.message.includes('vendedor')) {
                    errorMessage = errorInfo.message; // Keep vendor-specific messages
                } else if (errorInfo.message.includes('uuid') || errorInfo.message.includes('invalid input')) {
                    errorMessage = 'Error: ID inválido. Por favor, verifica que los productos provengan de tiendas aprobadas.';
                }
            } else if (errorInfo.details) {
                errorMessage = `Error: ${errorInfo.details}`;
            } else if (errorInfo.hint) {
                errorMessage = `Error: ${errorInfo.hint}`;
            } else if (errorInfo.code) {
                errorMessage = `Error ${errorInfo.code}: ${errorInfo.message || 'Error desconocido'}`;
            } else if (typeof error === 'string') {
                errorMessage = error;
            }
            
            // If we still don't have a good message, show a generic one with instructions
            if (errorMessage === 'Error al realizar el pedido. Intenta de nuevo.') {
                errorMessage = 'Error al crear el pedido. Revisa la consola para más detalles. Asegúrate de haber ejecutado todas las migraciones necesarias en Supabase.';
            }
            
            toast.error(errorMessage);
        } finally {
            setIsPlacingOrder(false);
            setProcessingPayment(false);
        }
    }

    if (isLoadingUser) {
        return (
            <div className='w-full max-w-lg lg:max-w-[340px] bg-slate-50/30 border border-slate-200 text-slate-500 text-sm rounded-xl p-7'>
                <p>Cargando...</p>
            </div>
        );
    }

    // Calculate display values (for UI only - actual calculation is in calculateTotal)
    const subtotal = totalPrice; // Original subtotal without coupon
    const freeShippingThreshold = storeInfo?.free_shipping_threshold || 800;
    const isFreeShippingFromCoupon = coupon?.type === 'free_shipping';
    const isFreeShippingFromAmount = subtotal >= freeShippingThreshold; // Based on original subtotal
    const isFreeShipping = isFreeShippingFromCoupon || isFreeShippingFromAmount;
    
    // Calculate coupon discount for display (will be recalculated in calculateTotal)
    const deliveryCost = getDeliveryCost();
    const courierCost = getCourierCost();
    const tip = calculateTip();
    const totalBeforeCoupon = subtotal + deliveryCost + courierCost + tip;
    let couponDiscount = 0;
    
    if (coupon) {
        // Check if there are other active promotions
        const hasOtherPromotions = isFreeShippingFromAmount && coupon.type !== 'free_shipping';
        
        // If coupon is not stackable and there are other promotions, don't apply the coupon
        if (!coupon.stackable_with_promotions && hasOtherPromotions) {
            couponDiscount = 0; // Don't apply coupon if not stackable and other promotions exist
        } else if (coupon.type !== 'free_shipping') {
            if (coupon.type === 'percentage') {
                couponDiscount = (totalBeforeCoupon * coupon.discount_value) / 100;
                if (coupon.max_discount && couponDiscount > coupon.max_discount) {
                    couponDiscount = coupon.max_discount;
                }
            } else if (coupon.type === 'fixed_amount') {
                couponDiscount = Math.min(coupon.discount_value, totalBeforeCoupon);
            }
        }
    }
    
    const finalTotal = calculateTotal();

    return (
        <div className='w-full max-w-lg lg:max-w-[340px] bg-slate-50/30 border border-slate-200 text-slate-500 text-sm rounded-xl p-7'>
            <h2 className='text-xl font-medium text-slate-600'>Resumen de Pago</h2>
            
            {/* Guest Checkout Fields */}
            {!user && (
                <div className='my-4 py-4 border-y border-slate-200 text-slate-400'>
                    <p className='text-slate-600 font-medium mb-3'>Información de Contacto</p>
                    <input 
                        type="text" 
                        placeholder="Nombre completo *" 
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        className='border border-slate-400 p-3 w-full my-2 outline-none rounded text-base min-h-[44px] touch-manipulation'
                        required
                    />
                    <input 
                        type="email" 
                        placeholder="Correo electrónico *" 
                        value={guestEmail}
                        onChange={(e) => setGuestEmail(e.target.value)}
                        className='border border-slate-400 p-3 w-full my-2 outline-none rounded text-base min-h-[44px] touch-manipulation'
                        required
                    />
                    <input 
                        type="tel" 
                        placeholder="Teléfono *" 
                        value={guestPhone}
                        onChange={(e) => setGuestPhone(e.target.value)}
                        className='border border-slate-400 p-3 w-full my-2 outline-none rounded text-base min-h-[44px] touch-manipulation'
                        required
                    />
                </div>
            )}
            
            {/* Address Section */}
            <div className='my-4 py-4 border-y border-slate-200 text-slate-400'>
                <p className='text-slate-600 font-medium mb-3'>Dirección de Entrega</p>
                {user ? (
                    // Logged in user - use saved addresses
                    selectedAddress ? (
                        <div className='flex gap-2 items-center'>
                            <p className='text-sm'>{selectedAddress.name}, {selectedAddress.city}, {selectedAddress.state}, {selectedAddress.zip}</p>
                            <SquarePenIcon onClick={() => setSelectedAddress(null)} className='cursor-pointer' size={18} />
                        </div>
                    ) : (
                        <div>
                            {addressList.length > 0 && (
                                <select 
                                    className='border border-slate-400 p-2 w-full my-3 outline-none rounded focus:border-[#00C6A2] focus:ring-2 focus:ring-[#00C6A2]/20' 
                                    value={selectedAddress ? addressList.findIndex(a => a.id === selectedAddress.id) : 0}
                                    onChange={(e) => {
                                        const index = parseInt(e.target.value);
                                        if (index >= 0 && index < addressList.length) {
                                            setSelectedAddress(addressList[index]);
                                        }
                                    }}
                                >
                                    {addressList.map((address, index) => (
                                        <option key={index} value={index}>
                                            {address.name}, {address.city}, {address.state}, {address.zip}
                                        </option>
                                    ))}
                                </select>
                            )}
                            <button 
                                type="button"
                                className='flex items-center gap-1 text-slate-600 mt-1 hover:text-[#00C6A2] transition-colors min-h-[44px] px-2 touch-manipulation' 
                                onClick={() => setShowAddressModal(true)}
                            >
                                Agregar Dirección <PlusIcon size={18} />
                            </button>
                        </div>
                    )
                ) : (
                    // Guest user - enter address manually
                    <div className='space-y-2'>
                        <input 
                            type="text" 
                            placeholder="Calle y número *" 
                            value={guestAddress.street}
                            onChange={(e) => setGuestAddress({...guestAddress, street: e.target.value})}
                            className='border border-slate-400 p-3 w-full outline-none rounded text-base min-h-[44px] touch-manipulation'
                            required
                        />
                        <div className='flex flex-col sm:flex-row gap-2'>
                            <input 
                                type="text" 
                                placeholder="Ciudad *" 
                                value={guestAddress.city}
                                onChange={(e) => setGuestAddress({...guestAddress, city: e.target.value})}
                                className='border border-slate-400 p-3 w-full outline-none rounded text-base min-h-[44px] touch-manipulation'
                                required
                            />
                            <input 
                                type="text" 
                                placeholder="Estado *" 
                                value={guestAddress.state}
                                onChange={(e) => setGuestAddress({...guestAddress, state: e.target.value})}
                                className='border border-slate-400 p-3 w-full outline-none rounded text-base min-h-[44px] touch-manipulation'
                                required
                            />
                        </div>
                        <input 
                            type="text" 
                            placeholder="Código Postal *" 
                            value={guestAddress.zip}
                            onChange={(e) => setGuestAddress({...guestAddress, zip: e.target.value})}
                            className='border border-slate-400 p-3 w-full outline-none rounded text-base min-h-[44px] touch-manipulation'
                            required
                        />
                        <textarea 
                            placeholder="Referencias (opcional)"
                            value={guestAddress.references}
                            onChange={(e) => setGuestAddress({...guestAddress, references: e.target.value})}
                            className='border border-slate-400 p-3 w-full outline-none rounded text-base min-h-[80px] touch-manipulation resize-none'
                            rows="2"
                        />
                    </div>
                )}
            </div>

            {/* Fulfillment Type Selection */}
            {storeInfo && (
                <div className='my-4 py-4 border-y border-slate-200 text-slate-400'>
                    <p className='text-slate-600 font-medium mb-3'>Tipo de Entrega</p>
                    <div className='space-y-2'>
                        {storeInfo.fulfillment_modes?.pickup && (
                            <label className='flex items-start gap-2 cursor-pointer'>
                                <input 
                                    type="radio" 
                                    name="fulfillment"
                                    checked={fulfillmentType === 'pickup'}
                                    onChange={() => {
                                        setFulfillmentType('pickup');
                                        setDeliveryOption(null);
                                        setSelectedMeetupPoint(null);
                                    }}
                                    className='accent-gray-500 mt-1'
                                />
                                <div className='flex-1'>
                                    <p className='text-slate-700 font-medium'>Pickup (Recoger en tienda)</p>
                                    <p className='text-xs text-slate-500'>Recoge tu pedido directamente en la tienda</p>
                                </div>
                            </label>
                        )}
                        
                        {storeInfo.fulfillment_modes?.delivery && (
                            <>
                                <label className='flex items-start gap-2 cursor-pointer'>
                                    <input 
                                        type="radio" 
                                        name="fulfillment"
                                        checked={fulfillmentType === 'delivery'}
                                        onChange={() => {
                                            setFulfillmentType('delivery');
                                            setSelectedMeetupPoint(null);
                                        }}
                                        className='accent-gray-500 mt-1'
                                    />
                                    <div className='flex-1'>
                                        <p className='text-slate-700 font-medium'>Envío a domicilio</p>
                                        <p className='text-xs text-slate-500'>Entrega directa a tu dirección</p>
                                    </div>
                                </label>
                                
                                {/* Courier Externo Option - Only show if store has it enabled */}
                                {storeInfo.fulfillment_modes?.courierExterno && (
                                    <label className='flex items-start gap-2 cursor-pointer'>
                                        <input 
                                            type="radio" 
                                            name="fulfillment"
                                            checked={fulfillmentType === 'courierExterno'}
                                            onChange={() => {
                                                setFulfillmentType('courierExterno');
                                                setSelectedMeetupPoint(null);
                                                setDeliveryOption(null);
                                            }}
                                            className='accent-gray-500 mt-1'
                                        />
                                        <div className='flex-1'>
                                            <p className='text-slate-700 font-medium'>Envío coordinado (courier externo)</p>
                                            <p className='text-xs text-slate-500'>
                                                {storeInfo.courier_cost_included 
                                                    ? 'Costo incluido en el precio'
                                                    : `Costo adicional: ${currency}${storeInfo.courier_cost || 0}`
                                                }
                                            </p>
                                        </div>
                                    </label>
                                )}
                                
                                {fulfillmentType === 'delivery' && (
                                    <div className='ml-6 mt-2 space-y-2'>
                                        {/* Delivery Options - Always show, but adjust pricing for free shipping */}
                                        {deliveryOptions.map((option) => {
                                            // If free shipping applies and it's "same_day", make it free
                                            // "on_demand" always costs money even with free shipping
                                            const isSameDay = option.id === 'same_day';
                                            const finalPrice = (isFreeShipping && isSameDay) ? 0 : option.price;
                                            const isFree = (isFreeShipping && isSameDay);
                                            
                                            return (
                                                <label key={option.id} className='flex items-start gap-2 cursor-pointer min-h-[44px]'>
                                                    <input 
                                                        type="radio" 
                                                        name="deliveryMethod"
                                                        checked={deliveryOption?.id === option.id && fulfillmentType === 'delivery'}
                                                        onChange={() => {
                                                            // Create option with adjusted price for free shipping
                                                            const adjustedOption = {
                                                                ...option,
                                                                price: finalPrice,
                                                                originalPrice: option.price, // Keep original for reference
                                                            };
                                                            setDeliveryOption(adjustedOption);
                                                            setFulfillmentType('delivery');
                                                        }}
                                                        className='accent-gray-500 mt-1 w-5 h-5 touch-manipulation'
                                                    />
                                                    <div className='flex-1 flex items-center'>
                                                        <div className='flex justify-between items-start w-full'>
                                                            <div>
                                                                <p className='text-slate-700 font-medium'>
                                                                    {option.name}
                                                                    {isFree && <span className='text-[#00C6A2] ml-2 text-xs font-semibold'>(Gratis)</span>}
                                                                </p>
                                                                <p className='text-xs text-slate-500'>{option.description}</p>
                                                            </div>
                                                            <div className='text-right ml-2'>
                                                                {isFree ? (
                                                                    <p className='text-[#00C6A2] font-medium'>Gratis</p>
                                                                ) : (
                                                                    <p className='text-slate-700 font-medium'>{currency}{option.price}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>
                                )}
                            </>
                        )}
                        
                        {storeInfo.fulfillment_modes?.meetupPoint && storeInfo.meetup_points?.length > 0 && (
                            <label className='flex items-start gap-2 cursor-pointer'>
                                <input 
                                    type="radio" 
                                    name="fulfillment"
                                    checked={fulfillmentType === 'meetupPoint'}
                                    onChange={() => {
                                        setFulfillmentType('meetupPoint');
                                        setDeliveryOption(null);
                                    }}
                                    className='accent-gray-500 mt-1'
                                />
                                <div className='flex-1'>
                                    <p className='text-slate-700 font-medium'>Punto de entrega</p>
                                    <p className='text-xs text-slate-500'>Recoge en un punto de entrega designado</p>
                                </div>
                            </label>
                        )}
                    </div>
                    
                    {/* Meetup Points Selection */}
                    {fulfillmentType === 'meetupPoint' && storeInfo.meetup_points?.length > 0 && (
                        <div className='ml-6 mt-3'>
                            <label className='block text-sm font-medium text-slate-700 mb-2'>
                                Selecciona un punto de entrega
                            </label>
                            <select
                                value={selectedMeetupPoint?.id || ''}
                                onChange={(e) => {
                                    const point = storeInfo.meetup_points.find(p => p.id === e.target.value);
                                    setSelectedMeetupPoint(point);
                                }}
                                className='w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-[#00C6A2] focus:ring-2 focus:ring-[#00C6A2]/20 outline-none'
                            >
                                <option value="">Selecciona un punto...</option>
                                {storeInfo.meetup_points.map((point) => (
                                    <option key={point.id} value={point.id}>
                                        {point.name} - {point.address}
                                    </option>
                                ))}
                            </select>
                            {selectedMeetupPoint && selectedMeetupPoint.instructions && (
                                <p className='text-xs text-slate-500 mt-2'>{selectedMeetupPoint.instructions}</p>
                            )}
                        </div>
                    )}
                    
                    {isFreeShipping && fulfillmentType === 'delivery' && (
                        <div className='bg-[#00C6A2]/10 border border-[#00C6A2]/30 rounded-lg p-3 mt-3'>
                            <p className='text-[#00C6A2] font-semibold text-sm'>🎉 ¡Envío Gratis Disponible!</p>
                            <p className='text-xs text-slate-600 mt-1'>
                                Tu pedido califica para <strong>Entrega Mismo Día gratis</strong> {storeInfo?.free_shipping_threshold 
                                    ? `(pedidos mayores a ${currency}${storeInfo.free_shipping_threshold} MXN)`
                                    : '(pedidos mayores a $800 MXN)'}. 
                                También puedes elegir <strong>On Demand</strong> para recibir antes pagando el costo adicional.
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Tip Section */}
            <div className='my-4 py-4 border-y border-slate-200 text-slate-400'>
                <p className='text-slate-600 font-medium mb-3'>Propina para el Repartidor</p>
                
                {/* Tip Type Selection */}
                <div className='flex gap-4 mb-3'>
                    <label className='flex items-center gap-2 cursor-pointer'>
                        <input 
                            type="radio" 
                            name="tipType"
                            checked={tipType === 'percentage'}
                            onChange={() => {
                                setTipType('percentage');
                                setCustomTip('');
                            }}
                            className='accent-gray-500'
                        />
                        <span className='text-sm'>Porcentaje</span>
                    </label>
                    <label className='flex items-center gap-2 cursor-pointer'>
                        <input 
                            type="radio" 
                            name="tipType"
                            checked={tipType === 'custom'}
                            onChange={() => {
                                setTipType('custom');
                                setTipPercentage(0);
                            }}
                            className='accent-gray-500'
                        />
                        <span className='text-sm'>Monto Específico</span>
                    </label>
                </div>

                {/* Percentage Tips */}
                {tipType === 'percentage' && (
                    <div className='grid grid-cols-5 gap-2 mb-3'>
                        {tipPercentages.map((percent) => {
                            const tipAmount = ((subtotal + deliveryCost) * percent) / 100;
                            return (
                                <button
                                    key={percent}
                                    onClick={() => setTipPercentage(percent)}
                                    className={`p-2 rounded text-sm border transition-all ${
                                        tipPercentage === percent
                                            ? 'bg-[#00C6A2] text-white border-[#00C6A2]'
                                            : 'bg-white border-slate-300 hover:border-[#00C6A2]'
                                    }`}
                                >
                                    <div className='font-medium'>{percent}%</div>
                                    <div className='text-xs'>{currency}{tipAmount.toFixed(0)}</div>
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Custom Tip */}
                {tipType === 'custom' && (
                    <div className='mb-3'>
                        <input 
                            type="number" 
                            placeholder="Ingresa el monto" 
                            value={customTip}
                            onChange={(e) => setCustomTip(e.target.value)}
                            className='border border-slate-400 p-3 w-full outline-none rounded text-base min-h-[44px] touch-manipulation'
                            min="0"
                            step="0.01"
                        />
                    </div>
                )}

                {/* Tip Display */}
                {tip > 0 && (
                    <div className='bg-slate-100 p-2 rounded text-sm'>
                        <p className='text-slate-600'>
                            Propina: <span className='font-medium'>{currency}{tip.toFixed(2)}</span>
                        </p>
                    </div>
                )}
            </div>
            
            <p className='text-slate-400 text-xs my-4'>Método de Pago</p>
            <div className='flex gap-2 items-center min-h-[44px]'>
                <input type="radio" id="COD" onChange={() => setPaymentMethod('COD')} checked={paymentMethod === 'COD'} className='accent-gray-500 w-5 h-5 touch-manipulation' />
                <label htmlFor="COD" className='cursor-pointer flex-1 min-h-[44px] flex items-center touch-manipulation'>Contra Entrega</label>
            </div>
            <div className='flex gap-2 items-center mt-1 min-h-[44px]'>
                <input type="radio" id="MERCADOPAGO" name='payment' onChange={() => setPaymentMethod('MERCADOPAGO')} checked={paymentMethod === 'MERCADOPAGO'} className='accent-gray-500 w-5 h-5 touch-manipulation' />
                <label htmlFor="MERCADOPAGO" className='cursor-pointer flex-1 min-h-[44px] flex items-center touch-manipulation'>Mercado Pago</label>
            </div>
            
            <div className='pb-4 border-b border-slate-200 mt-4'>
                <div className='flex justify-between'>
                    <div className='flex flex-col gap-1 text-slate-400'>
                        <p>Subtotal:</p>
                        {(deliveryOption || isFreeShipping) && <p>Envío:</p>}
                        {fulfillmentType === 'courierExterno' && getCourierCost() > 0 && <p>Courier:</p>}
                        {tip > 0 && <p>Propina:</p>}
                        {coupon && <p>Cupón:</p>}
                    </div>
                    <div className='flex flex-col gap-1 font-medium text-right'>
                        <p>{currency}{subtotal.toLocaleString()}</p>
                        {(deliveryOption || isFreeShipping) && (
                            <p className={isFreeShipping ? 'text-[#00C6A2]' : ''}>
                                {isFreeShipping ? 'Gratis' : `${currency}${getDeliveryCost()}`}
                            </p>
                        )}
                        {fulfillmentType === 'courierExterno' && getCourierCost() > 0 && (
                            <p>{currency}{getCourierCost().toFixed(2)}</p>
                        )}
                        {tip > 0 && <p>{currency}{tip.toFixed(2)}</p>}
                        {coupon && (
                            <p className="text-[#00C6A2]">
                                {couponDiscount > 0 ? (
                                    <>
                                        -{currency}{couponDiscount.toFixed(2)}
                                        {coupon.type === 'free_shipping' && getDeliveryCost() > 0 && (
                                            <span className="text-xs block">+ Envío gratis</span>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        {coupon.type === 'free_shipping' ? (
                                            <span className="text-xs">Envío gratis aplicado</span>
                                        ) : (
                                            <span className="text-xs text-slate-500">
                                                No aplicable (hay otras promociones activas)
                                            </span>
                                        )}
                                    </>
                                )}
                            </p>
                        )}
                    </div>
                </div>
                {
                    !coupon ? (
                        <form onSubmit={e => toast.promise(handleCouponCode(e), { loading: 'Verificando cupón...' })} className='flex justify-center gap-2 sm:gap-3 mt-3'>
                            <input 
                                onChange={(e) => setCouponCodeInput(e.target.value)} 
                                value={couponCodeInput} 
                                type="text" 
                                placeholder='Código de Cupón' 
                                className='border border-slate-400 p-2 sm:p-1.5 rounded w-full outline-none text-base min-h-[44px] touch-manipulation' 
                            />
                            <button 
                                type="submit"
                                className='bg-slate-600 text-white px-4 sm:px-3 rounded hover:bg-slate-800 active:scale-95 transition-all min-h-[44px] min-w-[80px] touch-manipulation font-medium'
                            >
                                Aplicar
                            </button>
                        </form>
                    ) : (
                        <div className='w-full flex items-center justify-center gap-2 text-xs mt-2 flex-wrap'>
                            <p>Código: <span className='font-semibold ml-1'>{coupon.code?.toUpperCase() || 'N/A'}</span></p>
                            <p>{coupon.discount_description || coupon.description}</p>
                            <button 
                                type="button"
                                onClick={() => setCoupon('')} 
                                className='min-w-[44px] min-h-[44px] flex items-center justify-center hover:text-red-700 transition cursor-pointer touch-manipulation'
                                aria-label="Remover cupón"
                            >
                                <XIcon size={18} />
                            </button>
                        </div>
                    )
                }
            </div>
            <div className='flex justify-between py-4'>
                <p className='font-medium'>Total:</p>
                <p className='font-bold text-lg text-right'>{currency}{finalTotal.toFixed(2)}</p>
            </div>
            
            <button 
                onClick={handlePlaceOrder} 
                disabled={isPlacingOrder || processingPayment}
                className='w-full bg-[#00C6A2] text-white py-3 sm:py-2.5 rounded-full hover:bg-[#00B894] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium min-h-[44px] touch-manipulation text-base shadow-md'
            >
                {processingPayment ? 'Redirigiendo a Mercado Pago...' : isPlacingOrder ? 'Procesando...' : 'Realizar Pedido'}
            </button>

            {showAddressModal && <AddressModal setShowAddressModal={setShowAddressModal} />}

        </div>
    )
}

export default OrderSummary
