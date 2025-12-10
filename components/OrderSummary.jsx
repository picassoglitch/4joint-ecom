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
    const deliveryOptions = [
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

    // Check if user is logged in and load saved addresses
    useEffect(() => {
        const checkUser = async () => {
            try {
                const currentUser = await getCurrentUser();
                setUser(currentUser);
                if (currentUser) {
                    setGuestEmail(currentUser.email || '');
                    setGuestName(currentUser.user_metadata?.full_name || currentUser.email || '');
                    
                    // Clear sessionStorage when user logs in
                    if (typeof window !== 'undefined') {
                        sessionStorage.removeItem('guest_checkout_address');
                        sessionStorage.removeItem('guest_checkout_info');
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
                                // Set default address if available
                                const defaultAddr = savedAddresses.find(a => a.is_default) || savedAddresses[0];
                                if (defaultAddr) {
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
        const subtotal = totalPrice;
        const couponDiscount = calculateCouponDiscount(subtotal);
        const subtotalAfterCoupon = subtotal - couponDiscount;
        
        // Check if free shipping applies (either from coupon or subtotal >= 800)
        const isFreeShippingFromCoupon = coupon?.type === 'free_shipping';
        const isFreeShippingFromAmount = subtotalAfterCoupon >= 800;
        const isFreeShipping = isFreeShippingFromCoupon || isFreeShippingFromAmount;
        
        const deliveryCost = (deliveryOption && !isFreeShipping) ? deliveryOption.price : 0;
        const orderSubtotal = subtotalAfterCoupon + deliveryCost;
        
        if (tipType === 'percentage') {
            return (orderSubtotal * tipPercentage) / 100;
        } else {
            return parseFloat(customTip) || 0;
        }
    };

    const calculateTotal = () => {
        const subtotal = totalPrice;
        const couponDiscount = calculateCouponDiscount(subtotal);
        const subtotalAfterCoupon = subtotal - couponDiscount;
        
        // Check if free shipping applies
        const isFreeShippingFromCoupon = coupon?.type === 'free_shipping';
        const isFreeShippingFromAmount = subtotalAfterCoupon >= 800;
        const isFreeShipping = isFreeShippingFromCoupon || isFreeShippingFromAmount;
        
        const deliveryCost = (deliveryOption && !isFreeShipping) ? deliveryOption.price : 0;
        const tip = calculateTip();
        return subtotalAfterCoupon + deliveryCost + tip;
    };
    
    const getDeliveryCost = () => {
        const subtotal = totalPrice;
        const couponDiscount = calculateCouponDiscount(subtotal);
        const subtotalAfterCoupon = subtotal - couponDiscount;
        
        // Check if free shipping applies
        const isFreeShippingFromCoupon = coupon?.type === 'free_shipping';
        const isFreeShippingFromAmount = subtotalAfterCoupon >= 800;
        const isFreeShipping = isFreeShippingFromCoupon || isFreeShippingFromAmount;
        
        if (isFreeShipping) return 0;
        return deliveryOption ? deliveryOption.price : 0;
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
        
        // Validate guest info if not logged in
        if (!user) {
            if (!guestEmail || !guestName || !guestPhone) {
                toast.error('Por favor completa tu información de contacto');
                return;
            }
            if (!guestAddress.street || !guestAddress.city || !guestAddress.state || !guestAddress.zip) {
                toast.error('Por favor completa tu dirección de envío');
                return;
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
        
        // Validate address
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

            const couponDiscount = calculateCouponDiscount(totalPrice);
            const subtotal = totalPrice - couponDiscount;
            const isFreeShipping = subtotal >= 800;
            const deliveryCost = (deliveryOption && !isFreeShipping) ? deliveryOption.price : 0;
            const tip = calculateTip();
            const finalTotal = subtotal + deliveryCost + tip;

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

            const orderData = {
                vendor_id: vendorId,
                total: finalTotal,
                payment_method: paymentMethod,
                payment_provider: paymentMethod,
                is_paid: paymentMethod === 'COD' ? false : false, // Will be updated after payment confirmation for Mercado Pago
                address_id: validAddressId,
                commission: finalTotal * 0.15,
                vendor_earnings: finalTotal * 0.85,
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
                
                // Notify vendor about new order (async, don't wait for it)
                try {
                    await fetch('/api/notify-vendor', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            orderId: order.id,
                            vendorId: order.vendor_id,
                        }),
                    }).catch(err => {
                        console.error('Error notifying vendor (non-blocking):', err);
                    });
                } catch (notifyError) {
                    console.error('Error notifying vendor (non-blocking):', notifyError);
                    // Don't fail the order if notification fails
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

                    const preferenceItems = items.map(item => ({
                        name: item.name,
                        quantity: item.quantity || 1,
                        price: item.price || item.discountedPrice || 0,
                    }));

                    // Add delivery and tip as items if applicable
                    if (deliveryCost > 0) {
                        preferenceItems.push({
                            name: 'Envío',
                            quantity: 1,
                            price: deliveryCost,
                        });
                    }
                    if (tip > 0) {
                        preferenceItems.push({
                            name: 'Propina',
                            quantity: 1,
                            price: tip,
                        });
                    }

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

                    if (!response.ok) {
                        throw new Error('Error al crear la preferencia de pago');
                    }

                    const { init_point, sandbox_init_point } = await response.json();
                    
                    // Redirect to Mercado Pago checkout
                    // Use init_point for production, sandbox_init_point only for testing
                    // When using production credentials, init_point is the production URL
                    window.location.href = init_point || sandbox_init_point;
                } catch (error) {
                    console.error('Error creating Mercado Pago preference:', error);
                    toast.error('Error al procesar el pago. Intenta de nuevo.');
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
            
            // For COD, clear cart and show success
            dispatch(clearCart());
            toast.success('¡Pedido realizado con éxito!');
            router.push('/orders');
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

    const couponDiscount = calculateCouponDiscount(totalPrice);
    const subtotal = totalPrice - couponDiscount;
    const isFreeShippingFromCoupon = coupon?.type === 'free_shipping';
    const isFreeShippingFromAmount = subtotal >= 800;
    const isFreeShipping = isFreeShippingFromCoupon || isFreeShippingFromAmount;
    const deliveryCost = getDeliveryCost();
    const tip = calculateTip();
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
                        className='border border-slate-400 p-2 w-full my-2 outline-none rounded'
                        required
                    />
                    <input 
                        type="email" 
                        placeholder="Correo electrónico *" 
                        value={guestEmail}
                        onChange={(e) => setGuestEmail(e.target.value)}
                        className='border border-slate-400 p-2 w-full my-2 outline-none rounded'
                        required
                    />
                    <input 
                        type="tel" 
                        placeholder="Teléfono *" 
                        value={guestPhone}
                        onChange={(e) => setGuestPhone(e.target.value)}
                        className='border border-slate-400 p-2 w-full my-2 outline-none rounded'
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
                                <select className='border border-slate-400 p-2 w-full my-3 outline-none rounded' onChange={(e) => setSelectedAddress(addressList[e.target.value])} >
                                    <option value="">Seleccionar Dirección</option>
                                    {addressList.map((address, index) => (
                                        <option key={index} value={index}>{address.name}, {address.city}, {address.state}, {address.zip}</option>
                                    ))}
                                </select>
                            )}
                            <button className='flex items-center gap-1 text-slate-600 mt-1' onClick={() => setShowAddressModal(true)} >
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
                            className='border border-slate-400 p-2 w-full outline-none rounded text-sm'
                            required
                        />
                        <div className='flex gap-2'>
                            <input 
                                type="text" 
                                placeholder="Ciudad *" 
                                value={guestAddress.city}
                                onChange={(e) => setGuestAddress({...guestAddress, city: e.target.value})}
                                className='border border-slate-400 p-2 w-full outline-none rounded text-sm'
                                required
                            />
                            <input 
                                type="text" 
                                placeholder="Estado *" 
                                value={guestAddress.state}
                                onChange={(e) => setGuestAddress({...guestAddress, state: e.target.value})}
                                className='border border-slate-400 p-2 w-full outline-none rounded text-sm'
                                required
                            />
                        </div>
                        <input 
                            type="text" 
                            placeholder="Código Postal *" 
                            value={guestAddress.zip}
                            onChange={(e) => setGuestAddress({...guestAddress, zip: e.target.value})}
                            className='border border-slate-400 p-2 w-full outline-none rounded text-sm'
                            required
                        />
                        <textarea 
                            placeholder="Referencias (opcional)"
                            value={guestAddress.references}
                            onChange={(e) => setGuestAddress({...guestAddress, references: e.target.value})}
                            className='border border-slate-400 p-2 w-full outline-none rounded text-sm'
                            rows="2"
                        />
                    </div>
                )}
            </div>

            {/* Delivery Options */}
            <div className='my-4 py-4 border-y border-slate-200 text-slate-400'>
                <p className='text-slate-600 font-medium mb-3'>Opción de Envío</p>
                {isFreeShipping ? (
                    <div className='bg-[#00C6A2]/10 border border-[#00C6A2]/30 rounded-lg p-3 mb-2'>
                        <p className='text-[#00C6A2] font-semibold text-sm'>🎉 ¡Envío Gratis!</p>
                        <p className='text-xs text-slate-600 mt-1'>Tu pedido califica para envío gratis (pedidos mayores a $800 MXN)</p>
                    </div>
                ) : (
                    <>
                        {deliveryOptions.map((option) => (
                            <div key={option.id} className='flex items-start gap-2 mb-2'>
                                <input 
                                    type="radio" 
                                    id={option.id}
                                    name="delivery"
                                    checked={deliveryOption?.id === option.id}
                                    onChange={() => setDeliveryOption(option)}
                                    className='accent-gray-500 mt-1'
                                />
                                <label htmlFor={option.id} className='cursor-pointer flex-1'>
                                    <div className='flex justify-between items-start'>
                                        <div>
                                            <p className='text-slate-700 font-medium'>{option.name}</p>
                                            <p className='text-xs text-slate-500'>{option.description}</p>
                                        </div>
                                        <p className='text-slate-700 font-medium'>{currency}{option.price}</p>
                                    </div>
                                </label>
                            </div>
                        ))}
                        <p className='text-xs text-slate-500 mt-2'>💡 Envío gratis en pedidos mayores a $800 MXN</p>
                    </>
                )}
            </div>

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
                            className='border border-slate-400 p-2 w-full outline-none rounded text-sm'
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
            <div className='flex gap-2 items-center'>
                <input type="radio" id="COD" onChange={() => setPaymentMethod('COD')} checked={paymentMethod === 'COD'} className='accent-gray-500' />
                <label htmlFor="COD" className='cursor-pointer'>Contra Entrega</label>
            </div>
            <div className='flex gap-2 items-center mt-1'>
                <input type="radio" id="MERCADOPAGO" name='payment' onChange={() => setPaymentMethod('MERCADOPAGO')} checked={paymentMethod === 'MERCADOPAGO'} className='accent-gray-500' />
                <label htmlFor="MERCADOPAGO" className='cursor-pointer'>Mercado Pago</label>
            </div>
            
            <div className='pb-4 border-b border-slate-200 mt-4'>
                <div className='flex justify-between'>
                    <div className='flex flex-col gap-1 text-slate-400'>
                        <p>Subtotal:</p>
                        {(deliveryOption || isFreeShipping) && <p>Envío:</p>}
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
                        {tip > 0 && <p>{currency}{tip.toFixed(2)}</p>}
                        {coupon && (
                            <p className="text-[#00C6A2]">
                                -{currency}{calculateCouponDiscount(totalPrice).toFixed(2)}
                                {coupon.type === 'free_shipping' && getDeliveryCost() > 0 && (
                                    <span className="text-xs block">+ Envío gratis</span>
                                )}
                            </p>
                        )}
                    </div>
                </div>
                {
                    !coupon ? (
                        <form onSubmit={e => toast.promise(handleCouponCode(e), { loading: 'Verificando cupón...' })} className='flex justify-center gap-3 mt-3'>
                            <input onChange={(e) => setCouponCodeInput(e.target.value)} value={couponCodeInput} type="text" placeholder='Código de Cupón' className='border border-slate-400 p-1.5 rounded w-full outline-none' />
                            <button className='bg-slate-600 text-white px-3 rounded hover:bg-slate-800 active:scale-95 transition-all'>Aplicar</button>
                        </form>
                    ) : (
                        <div className='w-full flex items-center justify-center gap-2 text-xs mt-2'>
                            <p>Código: <span className='font-semibold ml-1'>{coupon.code?.toUpperCase() || 'N/A'}</span></p>
                            <p>{coupon.discount_description || coupon.description}</p>
                            <XIcon size={18} onClick={() => setCoupon('')} className='hover:text-red-700 transition cursor-pointer' />
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
                className='w-full bg-[#00C6A2] text-white py-2.5 rounded-full hover:bg-[#00B894] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium'
            >
                {processingPayment ? 'Redirigiendo a Mercado Pago...' : isPlacingOrder ? 'Procesando...' : 'Realizar Pedido'}
            </button>

            {showAddressModal && <AddressModal setShowAddressModal={setShowAddressModal} />}

        </div>
    )
}

export default OrderSummary