'use client'
import { supabase } from './client'

// Addresses
export async function getUserAddresses(userId) {
  // Validate userId before making query
  if (!userId || typeof userId !== 'string') {
    console.warn('Invalid userId provided to getUserAddresses:', userId);
    return [] // Return empty array for invalid userId
  }

  const { data, error } = await supabase
    .from('addresses')
    .select('*')
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    // Handle 404 or table not found errors gracefully
    if (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('404')) {
      console.warn('Addresses table does not exist. Run migration_addresses.sql in Supabase.');
      return [] // Return empty array instead of throwing
    }
    // Handle invalid UUID error
    if (error.code === '22P02' || error.message?.includes('invalid input syntax for type uuid')) {
      console.warn('Invalid UUID format for user_id:', userId);
      return [] // Return empty array for invalid UUID
    }
    throw error
  }
  return data || []
}

export async function saveAddress(addressData) {
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session?.user) {
    throw new Error('Usuario debe estar autenticado para guardar direcciones')
  }

  const addressPayload = {
    user_id: session.user.id,
    name: addressData.name,
    email: addressData.email,
    street: addressData.street,
    city: addressData.city,
    state: addressData.state,
    zip: addressData.zip,
    country: addressData.country || 'México',
    phone: addressData.phone,
    references_text: addressData.references || addressData.references_text || null,
    is_default: addressData.is_default || false,
  }

  // If this is set as default, unset other defaults
  if (addressPayload.is_default) {
    const { error: updateError } = await supabase
      .from('addresses')
      .update({ is_default: false })
      .eq('user_id', session.user.id)
      .neq('id', addressPayload.id || '00000000-0000-0000-0000-000000000000')
    
    // Handle table not found error gracefully
    if (updateError && (updateError.code === 'PGRST205' || updateError.code === '42P01' || updateError.message?.includes('does not exist'))) {
      console.warn('Addresses table does not exist. Run migration_addresses.sql in Supabase.')
      throw new Error('La tabla de direcciones no existe. Ejecuta la migración migration_addresses.sql en Supabase.')
    }
  }

  const { data, error } = await supabase
    .from('addresses')
    .insert(addressPayload)
    .select()
    .single()

  if (error) {
    // Handle table not found error (404/PGRST205)
    if (error.code === 'PGRST205' || error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('Could not find the table')) {
      console.warn('Addresses table does not exist. Run migration_addresses.sql in Supabase.')
      const tableNotFoundError = new Error('La tabla de direcciones no existe. Ejecuta la migración migration_addresses.sql en Supabase.')
      tableNotFoundError.code = error.code
      tableNotFoundError.isTableNotFound = true
      throw tableNotFoundError
    }
    throw error
  }
  return data
}

export async function updateAddress(addressId, addressData) {
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session?.user) {
    throw new Error('Usuario debe estar autenticado para actualizar direcciones')
  }

  const addressPayload = {
    name: addressData.name,
    email: addressData.email,
    street: addressData.street,
    city: addressData.city,
    state: addressData.state,
    zip: addressData.zip,
    country: addressData.country || 'México',
    phone: addressData.phone,
    references_text: addressData.references || addressData.references_text || null,
    is_default: addressData.is_default || false,
  }

  // If this is set as default, unset other defaults
  if (addressPayload.is_default) {
    await supabase
      .from('addresses')
      .update({ is_default: false })
      .eq('user_id', session.user.id)
      .neq('id', addressId)
  }

  const { data, error } = await supabase
    .from('addresses')
    .update(addressPayload)
    .eq('id', addressId)
    .eq('user_id', session.user.id)
    .select()
    .single()

  if (error) throw error
  return data
}

