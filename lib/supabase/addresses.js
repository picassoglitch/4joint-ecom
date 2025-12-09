'use client'
import { supabase } from './client'

// Addresses
export async function getUserAddresses(userId) {
  const { data, error } = await supabase
    .from('addresses')
    .select('*')
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw error
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
    await supabase
      .from('addresses')
      .update({ is_default: false })
      .eq('user_id', session.user.id)
      .neq('id', addressPayload.id || '00000000-0000-0000-0000-000000000000')
  }

  const { data, error } = await supabase
    .from('addresses')
    .insert(addressPayload)
    .select()
    .single()

  if (error) throw error
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

