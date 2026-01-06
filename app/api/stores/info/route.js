import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const vendorId = searchParams.get('vendorId')

    if (!vendorId) {
      return NextResponse.json(
        { error: 'vendorId es requerido' },
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
      .from('vendors')
      .select('*')
      .eq('id', vendorId)
      .single()

    if (error) {
      console.error('Error fetching store info:', error)
      return NextResponse.json(
        { error: 'Error al obtener información de la tienda' },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Tienda no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: data.id,
      name: data.name,
      fulfillment_modes: data.fulfillment_modes || { pickup: false, delivery: false, meetupPoint: false, courierExterno: false },
      meetup_points: data.meetup_points || [],
      courier_cost: data.courier_cost || 0,
      courier_cost_included: data.courier_cost_included || false,
      min_order: data.min_order || 0,
      delivery_notes: data.delivery_notes || '',
      service_colonias: data.service_colonias || [],
      contact: data.contact || '', // WhatsApp/contacto de la tienda
    })
  } catch (error) {
    console.error('Error in store info API:', error)
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    )
  }
}

