import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Get all orders with courier externo fulfillment type
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        store:vendors(id, name)
      `)
      .eq('fulfillment_type', 'courierExterno')
      .in('dispatch_status', ['pending', 'dispatched'])
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching dispatch orders:', error)
      return NextResponse.json(
        { error: 'Error al obtener órdenes' },
        { status: 500 }
      )
    }

    // Fetch addresses separately (avoids PostgREST relationship cache dependency)
    const addressIds = (orders || [])
      .map(o => o.address_id)
      .filter(Boolean)
    const uniqueAddressIds = [...new Set(addressIds)]

    let addressById = {}
    if (uniqueAddressIds.length > 0) {
      const { data: addresses, error: addrError } = await supabase
        .from('addresses')
        .select('*')
        .in('id', uniqueAddressIds)

      if (addrError) {
        console.warn('Warning fetching addresses for dispatch (non-blocking):', addrError)
      } else {
        addressById = Object.fromEntries((addresses || []).map(a => [a.id, a]))
      }
    }

    const hydratedOrders = (orders || []).map(o => ({
      ...o,
      address: o.address_id ? (addressById[o.address_id] || null) : null,
    }))

    return NextResponse.json({ orders: hydratedOrders })
  } catch (error) {
    console.error('Error in dispatch API:', error)
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    )
  }
}

export async function PATCH(request) {
  try {
    const { orderId, dispatchStatus } = await request.json()

    if (!orderId || !dispatchStatus) {
      return NextResponse.json(
        { error: 'orderId y dispatchStatus son requeridos' },
        { status: 400 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    const { data, error } = await supabase
      .from('orders')
      .update({ dispatch_status: dispatchStatus })
      .eq('id', orderId)
      .select()
      .single()

    if (error) {
      console.error('Error updating dispatch status:', error)
      return NextResponse.json(
        { error: 'Error al actualizar estado' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, order: data })
  } catch (error) {
    console.error('Error in dispatch update API:', error)
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    )
  }
}

