'use client'
import { supabase } from './client'

// Products
export async function getProducts(filters = {}) {
  let query = supabase.from('products').select('*')

  if (filters.category) {
    query = query.eq('category', filters.category)
  }

  if (filters.vendor_id) {
    query = query.eq('vendor_id', filters.vendor_id)
  }

  if (filters.search) {
    query = query.ilike('name', `%${filters.search}%`)
  }

  // Only show in stock products if not filtering by vendor_id (vendor dashboard)
  if (!filters.vendor_id) {
    query = query.eq('in_stock', true)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) {
    console.error('❌ Error fetching products from database:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    })
    throw error
  }
  
  console.log(`📦 Raw products from database: ${data?.length || 0} products`)
  
  // If not filtering by vendor, get approved vendors and filter products
  // But if no approved vendors exist, show all products (backward compatibility)
  if (!filters.vendor_id && data) {
    // Get all approved vendor IDs
    const { data: approvedVendors, error: vendorsError } = await supabase
      .from('vendors')
      .select('id, name, approved')
      .eq('approved', true)
    
    if (vendorsError) {
      console.error('Error fetching approved vendors:', vendorsError)
      // If error, return all products (fallback)
      return data || []
    }
    
    if (approvedVendors && approvedVendors.length > 0) {
      const approvedVendorIds = approvedVendors.map(v => v.id)
      console.log(`✅ Found ${approvedVendors.length} approved vendors:`, approvedVendors.map(v => v.name))
      
      // Filter products to only show those from approved vendors
      const filteredProducts = data.filter(product => approvedVendorIds.includes(product.vendor_id))
      console.log(`📦 Filtered to ${filteredProducts.length} products from approved vendors`)
      return filteredProducts
    }
    
    // If no approved vendors found, check if there are any vendors at all
    const { data: allVendors } = await supabase
      .from('vendors')
      .select('id')
      .limit(1)
    
    if (!allVendors || allVendors.length === 0) {
      // No vendors table or no vendors at all - return all products
      console.log('📦 No vendors table or no vendors found. Showing all products.')
      return data || []
    }
    
    // Vendors exist but none are approved - show all products for backward compatibility
    console.warn('⚠️ No approved vendors found, but vendors exist. Showing all products for backward compatibility.')
    return data || []
  }
  
  return data || []
}

export async function getProductById(id) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

// Get unique categories from products (only from approved vendors)
export async function getCategories() {
  // First get all approved vendor IDs
  const { data: approvedVendors, error: vendorsError } = await supabase
    .from('vendors')
    .select('id')
    .eq('approved', true)

  if (vendorsError) throw vendorsError

  if (!approvedVendors || approvedVendors.length === 0) {
    return []
  }

  const approvedVendorIds = approvedVendors.map(v => v.id)

  // Then get categories from products of approved vendors
  const { data, error } = await supabase
    .from('products')
    .select('category')
    .eq('in_stock', true) // Only get categories from products in stock
    .in('vendor_id', approvedVendorIds) // Only from approved vendors

  if (error) throw error
  
  // Get unique categories
  const uniqueCategories = [...new Set(data.map(product => product.category).filter(Boolean))]
  return uniqueCategories
}

export async function createProduct(productData, userId = null) {
  let user = null
  
  // If userId is provided, use it directly (from component state)
  if (userId) {
    user = { id: userId }
  } else {
    // Try getSession first
    let { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    // If no session, try getUser which may refresh the session
    if (!session?.user) {
      const { data: { user: fetchedUser }, error: userError } = await supabase.auth.getUser()
      
      if (userError) {
        console.error('Error getting user:', userError)
        // If it's just a session missing error, try one more time with getSession
        if (userError.message === 'Auth session missing!' || userError.message?.includes('session')) {
          const { data: { session: retrySession } } = await supabase.auth.getSession()
          if (retrySession?.user) {
            session = retrySession
          }
        }
      } else if (fetchedUser) {
        // We have a user, create session object
        session = { user: fetchedUser }
      }
    }
    
    if (!session?.user) {
      throw new Error('Debes iniciar sesión para crear productos. Por favor, inicia sesión e intenta de nuevo.')
    }
    
    user = session.user
  }

  // Check for duplicate product name from same vendor
  const { data: existingProducts } = await supabase
    .from('products')
    .select('id, name')
    .eq('vendor_id', user.id)
    .ilike('name', productData.name.trim())

  // If duplicate found, throw error
  if (existingProducts && existingProducts.length > 0) {
    const isDuplicate = existingProducts.some(p => 
      p.name.toLowerCase().trim() === productData.name.toLowerCase().trim()
    )
    if (isDuplicate) {
      throw new Error('Ya tienes un producto con este nombre. Por favor, usa un nombre diferente.')
    }
  }

  // Prepare product payload
  const productPayload = {
    name: productData.name.trim(),
    description: productData.description?.trim() || '',
    price: productData.price,
    mrp: productData.mrp,
    category: productData.category,
    images: productData.images,
    in_stock: productData.in_stock !== false, // Default to true
    vendor_id: user.id,
  }

  // Only include variants if the column exists (check by trying to insert without it first if error)
  // For now, we'll try with variants, and if it fails with column not found, retry without it
  if (productData.variants && Array.isArray(productData.variants) && productData.variants.length > 0) {
    productPayload.variants = productData.variants
  }

  const { data, error } = await supabase
    .from('products')
    .insert(productPayload)
    .select()
    .single()

  if (error) {
    // If error is about variants column not existing, retry without it
    if (error.message?.includes('variants') || error.message?.includes('column') || error.code === '42703' || error.hint?.includes('variants')) {
      console.warn('⚠️ Columna "variants" no encontrada. Creando producto sin variantes. Ejecuta la migración: supabase/migration_product_variants.sql')
      
      // Remove variants and try again
      const { variants, ...payloadWithoutVariants } = productPayload
      const { data: retryData, error: retryError } = await supabase
        .from('products')
        .insert(payloadWithoutVariants)
        .select()
        .single()
      
      if (retryError) {
        const errorMessage = retryError.message || retryError.details || 'Error al crear el producto'
        const enhancedError = new Error(errorMessage)
        enhancedError.code = retryError.code
        enhancedError.details = retryError.details
        enhancedError.hint = retryError.hint
        console.error('Supabase error creating product (retry without variants):', retryError)
        throw enhancedError
      }
      
      console.log('✅ Producto creado sin variantes. Para habilitar variantes, ejecuta la migración en Supabase.')
      return retryData
    }
    
    // Better error handling for other errors
    const errorMessage = error.message || error.details || 'Error al crear el producto'
    const enhancedError = new Error(errorMessage)
    enhancedError.code = error.code
    enhancedError.details = error.details
    enhancedError.hint = error.hint
    console.error('Supabase error creating product:', error)
    throw enhancedError
  }
  return data
}

export async function updateProduct(id, productData, userId = null) {
  let user = null
  
  // If userId is provided, use it directly
  if (userId) {
    user = { id: userId }
  } else {
    // Try getSession first
    let { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    // If no session, try getUser which may refresh the session
    if (!session?.user) {
      const { data: { user: fetchedUser }, error: userError } = await supabase.auth.getUser()
      
      if (userError) {
        console.error('Error getting user:', userError)
        if (userError.message === 'Auth session missing!' || userError.message?.includes('session')) {
          const { data: { session: retrySession } } = await supabase.auth.getSession()
          if (retrySession?.user) {
            session = retrySession
          }
        }
      } else if (fetchedUser) {
        session = { user: fetchedUser }
      }
    }
    
    if (!session?.user) {
      throw new Error('Debes iniciar sesión para editar productos')
    }
    
    user = session.user
  }

  // First verify the product belongs to the current vendor
  const { data: existingProduct, error: fetchError } = await supabase
    .from('products')
    .select('vendor_id')
    .eq('id', id)
    .single()

  if (fetchError) throw fetchError

  if (existingProduct.vendor_id !== user.id) {
    throw new Error('No tienes permiso para modificar este producto')
  }

  // Update the product
  const { data, error } = await supabase
    .from('products')
    .update(productData)
    .eq('id', id)
    .eq('vendor_id', user.id) // Extra security: ensure vendor_id matches
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteProduct(id) {
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session?.user) {
    throw new Error('User must be logged in')
  }

  const user = session.user

  // First verify the product exists and belongs to the current vendor
  const { data: existingProduct, error: fetchError } = await supabase
    .from('products')
    .select('vendor_id, id')
    .eq('id', id)
    .single()

  if (fetchError) {
    console.error('Error fetching product for deletion:', fetchError)
    throw fetchError
  }

  if (!existingProduct) {
    throw new Error('Producto no encontrado')
  }

  if (existingProduct.vendor_id !== user.id) {
    throw new Error('No tienes permiso para eliminar este producto')
  }

  // Delete the product
  const { data: deletedData, error: deleteError } = await supabase
    .from('products')
    .delete()
    .eq('id', id)
    .eq('vendor_id', user.id) // Extra security: ensure vendor_id matches
    .select() // Select to verify deletion

  if (deleteError) {
    console.error('Error deleting product:', deleteError)
    throw deleteError
  }

  // Verify deletion was successful
  if (!deletedData || deletedData.length === 0) {
    console.warn('Product deletion returned no data. Product may not have been deleted.')
    // Check if product still exists
    const { data: verifyProduct } = await supabase
      .from('products')
      .select('id')
      .eq('id', id)
      .single()
    
    if (verifyProduct) {
      throw new Error('Error: El producto no se pudo eliminar. Verifica los permisos o contacta al administrador.')
    }
  }

  console.log('✅ Product deleted successfully:', id)
  return { success: true, deletedId: id }
}

// Vendors
export async function getVendors(approved = null) {
  let query = supabase.from('vendors').select('*')

  if (approved !== null) {
    query = query.eq('approved', approved)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getVendorById(id) {
  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function approveVendor(id) {
  const { data, error } = await supabase
    .from('vendors')
    .update({ approved: true })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function rejectVendor(id) {
  const { error } = await supabase
    .from('vendors')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Get current user's vendor profile
export async function getCurrentVendor() {
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session?.user) {
    throw new Error('User must be logged in')
  }

  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('id', session.user.id)
    .single()

  if (error) {
    // If vendor doesn't exist, return null instead of throwing
    if (error.code === 'PGRST116') {
      return null
    }
    throw error
  }
  return data
}

// Update vendor profile
export async function updateVendor(vendorData) {
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session?.user) {
    throw new Error('User must be logged in')
  }

  const { data, error } = await supabase
    .from('vendors')
    .update(vendorData)
    .eq('id', session.user.id)
    .select()
    .single()

  if (error) throw error
  return data
}

// Orders
export async function getOrders(filters = {}) {
  let query = supabase.from('orders').select('*')

  if (filters.vendor_id) {
    query = query.eq('vendor_id', filters.vendor_id)
  }

  if (filters.user_id) {
    query = query.eq('user_id', filters.user_id)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getOrderById(id) {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function createOrder(orderData) {
  const { data: { session } } = await supabase.auth.getSession()
  
  // Allow guest checkout - user_id can be null
  const orderPayload = {
    ...orderData,
    user_id: session?.user?.id || null,
  }

  // Validate and clean address_id - must be UUID or null
  if (orderPayload.address_id) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(orderPayload.address_id)) {
      console.warn('Invalid address_id format, setting to null:', orderPayload.address_id);
      orderPayload.address_id = null;
    }
  }

  // Remove payment_provider if it doesn't exist in schema yet (for backward compatibility)
  // The migration should be run, but this prevents errors if not
  if (!orderPayload.payment_provider) {
    orderPayload.payment_provider = orderPayload.payment_method || 'COD'
  }

  // Remove delivery and tip fields if columns don't exist (for backward compatibility)
  // Check if error mentions these columns and retry without them
  const { data, error } = await supabase
    .from('orders')
    .insert(orderPayload)
    .select()
    .single()

  if (error) {
    // Check if error is about missing columns
    const isColumnError = error.message?.includes('column') || 
                         error.code === '42703' ||
                         error.hint?.includes('column')
    
    const missingColumns = []
    if (error.message?.includes('delivery_cost') || error.message?.includes('delivery_option') || error.message?.includes('tip_amount')) {
      missingColumns.push('delivery/tip')
    }
    if (error.message?.includes('guest_address') || error.message?.includes('guest_email') || 
        error.message?.includes('guest_name') || error.message?.includes('guest_phone')) {
      missingColumns.push('guest checkout')
    }
    
    // If error is about missing columns, remove them and retry
    if (isColumnError && missingColumns.length > 0) {
      console.warn(`⚠️ Columnas no encontradas: ${missingColumns.join(', ')}. Creando orden sin estos campos. Ejecuta las migraciones necesarias.`)
      
      // Remove problematic fields and retry
      const { 
        delivery_option, 
        delivery_cost, 
        tip_amount,
        guest_address,
        guest_email,
        guest_name,
        guest_phone,
        ...payloadWithoutMissingColumns 
      } = orderPayload
      
      const { data: retryData, error: retryError } = await supabase
        .from('orders')
        .insert(payloadWithoutMissingColumns)
        .select()
        .single()
      
      if (retryError) {
        // If still error, try removing more optional fields
        if (retryError.message?.includes('column') || retryError.code === '42703') {
          console.warn('⚠️ Intentando con campos mínimos requeridos...')
          
          // Keep only essential fields
          // If user_id is null but column requires NOT NULL, we need to handle it
          // Try to use a system user or require authentication
          let finalUserId = orderPayload.user_id;
          
          // If user_id is null and column doesn't allow it, we can't create the order
          // This means the guest checkout migration hasn't been run
          if (!finalUserId) {
            // Try to get current session one more time
            const { data: { session: finalSession } } = await supabase.auth.getSession();
            if (finalSession?.user?.id) {
              finalUserId = finalSession.user.id;
              console.warn('⚠️ user_id es NULL pero la columna requiere NOT NULL. Usando usuario autenticado. Ejecuta la migración de guest checkout.');
            } else {
              throw new Error('No se puede crear una orden sin usuario. Por favor, inicia sesión o ejecuta la migración de guest checkout en Supabase.');
            }
          }
          
          const essentialFields = {
            vendor_id: orderPayload.vendor_id,
            total: orderPayload.total,
            status: orderPayload.status || 'pending',
            payment_method: orderPayload.payment_method || 'COD',
            user_id: finalUserId, // Ensure it's never null
          }
          
          const { data: finalRetryData, error: finalRetryError } = await supabase
            .from('orders')
            .insert(essentialFields)
            .select()
            .single()
          
          if (finalRetryError) {
            const errorMessage = finalRetryError.message || finalRetryError.details || 'Error al crear la orden'
            const enhancedError = new Error(errorMessage)
            enhancedError.code = finalRetryError.code
            enhancedError.details = finalRetryError.details
            enhancedError.hint = finalRetryError.hint
            console.error('Supabase error creating order (final retry):', {
              message: finalRetryError.message,
              code: finalRetryError.code,
              details: finalRetryError.details,
              hint: finalRetryError.hint,
              fullError: finalRetryError
            })
            throw enhancedError
          }
          
          console.log('✅ Orden creada con campos mínimos. Ejecuta las migraciones para habilitar todas las funcionalidades.')
          return finalRetryData
        }
        
        const errorMessage = retryError.message || retryError.details || 'Error al crear la orden'
        const enhancedError = new Error(errorMessage)
        enhancedError.code = retryError.code
        enhancedError.details = retryError.details
        enhancedError.hint = retryError.hint
        console.error('Supabase error creating order (retry without missing columns):', retryError)
        throw enhancedError
      }
      
      console.log(`✅ Orden creada sin campos: ${missingColumns.join(', ')}. Ejecuta las migraciones para habilitar estas funcionalidades.`)
      return retryData
    }
    
    // Better error message for other errors
    const errorMessage = error.message || error.details || 'Error al crear la orden'
    const enhancedError = new Error(errorMessage)
    enhancedError.code = error.code
    enhancedError.details = error.details
    enhancedError.hint = error.hint
    console.error('Supabase error creating order:', error)
    throw enhancedError
  }
  return data
}

export async function createOrderItems(orderId, items) {
  // Validate orderId
  if (!orderId) {
    throw new Error('Order ID is required to create order items')
  }

  // Validate items
  if (!items || items.length === 0) {
    throw new Error('No items provided to create order items')
  }

  const orderItems = items.map(item => {
    // Handle special free items (like "1 gr gratis" for first order)
    // These items use a special ID format
    if (item.id === 'FREE_1GR_FIRST_ORDER' || item.id?.startsWith('FREE_')) {
      // For free items, use null product_id (requires migration to make product_id nullable)
      // Or use a special product ID if you created one
      return {
        order_id: orderId,
        product_id: null, // Nullable after migration
        quantity: item.quantity || 1,
        price: 0, // Always free
        variant: item.variant ? {
          name: item.variant.name || '1 gr gratis',
          price: 0,
          is_free_item: true, // Flag to identify this as a free promotional item
        } : {
          name: '1 gr gratis - Primer pedido',
          price: 0,
          is_free_item: true,
        },
      }
    }
    
    if (!item.id) {
      throw new Error('Item must have an ID')
    }
    return {
      order_id: orderId,
      product_id: item.id,
      quantity: item.quantity || 1,
      price: item.price || item.discountedPrice || 0,
      variant: item.variant ? {
        name: item.variant.name,
        price: item.variant.price,
        provider_cost: item.variant.provider_cost || 0, // Include provider_cost for GreenBoy calculations
      } : null,
    }
  })
  
  // Separate regular items and free items
  const regularItems = orderItems.filter(item => item.product_id !== null)
  const freeItems = orderItems.filter(item => item.product_id === null)

  // Insert all items together
  // If product_id is not nullable, free items will fail but regular items will succeed
  const { data, error } = await supabase
    .from('order_items')
    .insert(orderItems)
    .select()
  
  if (error) {
    // If error is about NOT NULL constraint on product_id, try inserting separately
    if (error.code === '23502' || error.message?.includes('null value in column "product_id"')) {
      console.warn('⚠️ product_id no es nullable. Insertando items regulares primero, luego items gratis.')
      
      // Insert regular items first
      let regularResult
      if (regularItems.length > 0) {
        regularResult = await supabase
          .from('order_items')
          .insert(regularItems)
          .select()
        
        if (regularResult.error) {
          throw regularResult.error
        }
      }
      
      // Try to insert free items if product_id is now nullable (after migration)
      if (freeItems.length > 0) {
        try {
          const freeResult = await supabase
            .from('order_items')
            .insert(freeItems)
            .select()
          
          if (freeResult.error) {
            // If still fails, log warning but don't fail the order
            console.warn('⚠️ No se pudo insertar el item gratis. Ejecuta la migración: supabase/migration_free_gram.sql')
            // Return regular items only
            return regularResult.data || []
          } else {
            // Merge results
            return [...(regularResult.data || []), ...(freeResult.data || [])]
          }
        } catch (freeError) {
          console.warn('Error inserting free items:', freeError)
          // Return regular items only
          return regularResult.data || []
        }
      }
      
      return regularResult?.data || []
    }
    
    // For other errors, throw
    throw error
  }

  if (error) {
    // Better error handling
    const errorMessage = error.message || error.details || 'Error al crear los items de la orden'
    const enhancedError = new Error(errorMessage)
    enhancedError.code = error.code
    enhancedError.details = error.details
    enhancedError.hint = error.hint
    
    // If RLS error, provide helpful message
    if (error.code === '42501' || error.message?.includes('row-level security')) {
      enhancedError.message = 'Error de permisos al crear items. Por favor, ejecuta el script fix_rls_orders.sql en Supabase para corregir las políticas RLS.'
    }
    
    console.error('Supabase error creating order items:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      orderId,
      itemsCount: items.length
    })
    
    throw enhancedError
  }
  
  return data
}

export async function getOrderItems(orderId) {
  const { data, error } = await supabase
    .from('order_items')
    .select(`
      *,
      product:products (
        id,
        name,
        images,
        category,
        price,
        mrp
      )
    `)
    .eq('order_id', orderId)
    .order('created_at', { ascending: true })

  if (error) throw error
  
  // Format the data to match expected structure
  return data.map(item => ({
    ...item,
    // Ensure product is always an object (even if null for free items)
    product: item.product || null,
    // Ensure variant is parsed if it's a string
    variant: typeof item.variant === 'string' ? JSON.parse(item.variant) : item.variant
  }))
}

export async function updateOrderStatus(id, status) {
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session?.user) {
    throw new Error('User must be logged in')
  }

  const user = session.user

  // First verify the order belongs to the current vendor
  const { data: existingOrder, error: fetchError } = await supabase
    .from('orders')
    .select('vendor_id')
    .eq('id', id)
    .single()

  if (fetchError) throw fetchError

  if (existingOrder.vendor_id !== user.id) {
    throw new Error('No tienes permiso para modificar este pedido')
  }

  // Update the order status
  const { data, error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', id)
    .eq('vendor_id', user.id) // Extra security: ensure vendor_id matches
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteOrder(id) {
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session?.user) {
    throw new Error('User must be logged in')
  }

  const user = session.user
  const userRole = user.user_metadata?.role || 'user'

  // First verify the order exists
  const { data: existingOrder, error: fetchError } = await supabase
    .from('orders')
    .select('vendor_id')
    .eq('id', id)
    .single()

  if (fetchError) throw fetchError

  // Admin can delete any order, vendors can only delete their own orders
  if (userRole !== 'admin' && existingOrder.vendor_id !== user.id) {
    throw new Error('No tienes permiso para eliminar este pedido')
  }

  // Delete the order (order_items will be deleted automatically due to CASCADE)
  const { error } = await supabase
    .from('orders')
    .delete()
    .eq('id', id)

  // Extra security: if not admin, ensure vendor_id matches
  if (userRole !== 'admin') {
    // This check is already done above, but we add it here for extra security
    // The delete will fail if vendor_id doesn't match due to RLS policies
  }

  if (error) throw error
  return { success: true }
}

