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
    const lat = parseFloat(searchParams.get('lat'))
    const lng = parseFloat(searchParams.get('lng'))
    const maxDistance = parseFloat(searchParams.get('maxDistance')) || 50
    const fulfillmentFilter = searchParams.get('fulfillment') // 'pickup', 'delivery', 'meetupPoint'
    const openNow = searchParams.get('openNow') === 'true'

    if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { error: 'Latitud y longitud son requeridas' },
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

    // Get all approved stores with location
    let query = supabase
      .from('vendors')
      .select('*')
      .eq('approved', true)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)

    const { data: stores, error } = await query

    if (error) {
      console.error('Error fetching stores:', error)
      return NextResponse.json(
        { error: 'Error al obtener tiendas' },
        { status: 500 }
      )
    }

    if (!stores || stores.length === 0) {
      return NextResponse.json({ stores: [] })
    }

    // Calculate distance and filter
    let nearbyStores = stores
      .map(store => {
        const distance = calculateDistance(lat, lng, store.latitude, store.longitude)
        return {
          ...store,
          distance_km: distance
        }
      })
      .filter(store => store.distance_km <= maxDistance)

    // Filter by fulfillment type
    if (fulfillmentFilter) {
      nearbyStores = nearbyStores.filter(store => {
        const modes = store.fulfillment_modes || {}
        switch (fulfillmentFilter) {
          case 'pickup':
            return modes.pickup === true
          case 'delivery':
            return modes.delivery === true
          case 'meetupPoint':
            return modes.meetupPoint === true
          default:
            return true
        }
      })
    }

    // Filter by open now (if operating hours are set)
    if (openNow) {
      const now = new Date()
      const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
      const currentTime = now.toTimeString().slice(0, 5) // HH:MM

      nearbyStores = nearbyStores.filter(store => {
        const hours = store.operating_hours || {}
        const dayHours = hours[currentDay]
        
        if (!dayHours || !dayHours.open || !dayHours.close) {
          return true // If no hours set, assume open
        }

        return currentTime >= dayHours.open && currentTime <= dayHours.close
      })
    }

    // Sort by distance
    nearbyStores.sort((a, b) => a.distance_km - b.distance_km)

    // Calculate average rating (if you have ratings table)
    // This is a placeholder - you'll need to join with ratings if available
    nearbyStores = nearbyStores.map(store => ({
      id: store.id,
      name: store.name,
      description: store.description,
      distance_km: parseFloat(store.distance_km.toFixed(2)),
      fulfillment_modes: store.fulfillment_modes || { pickup: false, delivery: false, meetupPoint: false },
      min_order: store.min_order || 0,
      rating: 4.5, // Placeholder - calculate from ratings table
      logo: store.logo,
      email: store.email,
      contact: store.contact,
      address: store.address,
      operating_hours: store.operating_hours || {},
      latitude: store.latitude,
      longitude: store.longitude,
      service_radius_km: store.service_radius_km || 10,
      meetup_points: store.meetup_points || [],
    }))

    return NextResponse.json({ stores: nearbyStores })
  } catch (error) {
    console.error('Error in nearby stores API:', error)
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    )
  }
}

