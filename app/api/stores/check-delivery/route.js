import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Haversine formula to calculate distance
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371 // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const storeId = searchParams.get('storeId')
    const userLat = parseFloat(searchParams.get('userLat'))
    const userLng = parseFloat(searchParams.get('userLng'))

    if (!storeId) {
      return NextResponse.json(
        { error: 'storeId es requerido' },
        { status: 400 }
      )
    }

    if (!userLat || !userLng || isNaN(userLat) || isNaN(userLng)) {
      return NextResponse.json(
        { error: 'Ubicación del usuario es requerida' },
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

    // Get store information
    const { data: store, error } = await supabase
      .from('vendors')
      .select('latitude, longitude, service_radius_km')
      .eq('id', storeId)
      .single()

    if (error || !store) {
      return NextResponse.json(
        { error: 'Tienda no encontrada' },
        { status: 404 }
      )
    }

    if (!store.latitude || !store.longitude) {
      return NextResponse.json({
        withinRadius: false,
        distance: null,
        serviceRadius: store.service_radius_km || 10,
        message: 'La tienda no tiene ubicación configurada'
      })
    }

    const distance = calculateDistance(
      userLat,
      userLng,
      store.latitude,
      store.longitude
    )

    const serviceRadius = store.service_radius_km || 10
    const withinRadius = distance <= serviceRadius

    return NextResponse.json({
      withinRadius,
      distance: parseFloat(distance.toFixed(2)),
      serviceRadius: parseFloat(serviceRadius.toFixed(2)),
      message: withinRadius 
        ? `Entregamos a tu ubicación (${distance.toFixed(1)}km)` 
        : `Fuera del área de entrega. Entregamos hasta ${serviceRadius}km`
    })
  } catch (error) {
    console.error('Error checking delivery radius:', error)
    return NextResponse.json(
      { error: 'Error al verificar área de entrega' },
      { status: 500 }
    )
  }
}

