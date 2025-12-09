'use client'
import { supabase } from './client'
import { toast } from 'react-hot-toast'

/**
 * Subscribe to new vendor signups
 * @param {Function} callback - Callback function when new vendor is added
 */
export function subscribeToVendorSignups(callback) {
  const channel = supabase
    .channel('vendor-signups')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'vendors',
        filter: 'approved=eq.false',
      },
      (payload) => {
        console.log('New vendor signup:', payload.new)
        callback(payload.new)
        toast.success('¡Nuevo vendedor registrado!', {
          icon: '🌿',
        })
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

/**
 * Subscribe to vendor approval status changes
 * @param {string} vendorId - Vendor ID to watch
 * @param {Function} callback - Callback function when status changes
 */
export function subscribeToVendorApproval(vendorId, callback) {
  const channel = supabase
    .channel(`vendor-approval-${vendorId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'vendors',
        filter: `id=eq.${vendorId}`,
      },
      (payload) => {
        console.log('Vendor approval status changed:', payload.new)
        callback(payload.new)
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

/**
 * Subscribe to new orders for a vendor
 * @param {string} vendorId - Vendor ID
 * @param {Function} callback - Callback function when new order is created
 */
export function subscribeToVendorOrders(vendorId, callback) {
  const channel = supabase
    .channel(`vendor-orders-${vendorId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'orders',
        filter: `vendor_id=eq.${vendorId}`,
      },
      (payload) => {
        console.log('New order for vendor:', payload.new)
        callback(payload.new)
        toast.success('¡Nuevo pedido recibido!', {
          icon: '🛒',
        })
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

