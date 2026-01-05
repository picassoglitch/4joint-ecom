import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { normalizeZip, isZipInServiceArea } from '../../../../lib/utils/zipCode'

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

// Calculate estimated delivery time in minutes based on distance
function calculateDeliveryTime(distanceKm) {
  // Base time: 30 minutes
  // Additional time: ~2 minutes per km
  // Max time: 120 minutes (2 hours)
  const baseTime = 30
  const timePerKm = 2
  const estimatedMinutes = Math.round(baseTime + (distanceKm * timePerKm))
  return Math.min(estimatedMinutes, 120)
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const lat = parseFloat(searchParams.get('lat'))
    const lng = parseFloat(searchParams.get('lng'))
    const maxDistance = parseFloat(searchParams.get('maxDistance')) || 50
    const fulfillmentFilter = searchParams.get('fulfillment') // 'pickup', 'delivery', 'meetupPoint'
    const openNow = searchParams.get('openNow') === 'true'
    let userZipCode = searchParams.get('zipCode') // User's zip code for service area filtering

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

    // DEBUG: Preflight query - fetch sample vendors WITHOUT filters to check table/RLS
    console.log('🔍 DEBUG: Preflight query - checking vendors table access...')
    const preflightQuery = supabase
      .from('vendors')
      .select('id, name, approved, service_colonias, latitude, longitude')
      .limit(5)
    
    const { data: preflightData, error: preflightError } = await preflightQuery
    
    if (preflightError) {
      console.error('❌ DEBUG: Preflight query error:', preflightError)
      console.error('   This suggests RLS blocking or wrong table name')
    } else {
      console.log(`✅ DEBUG: Vendors preflight count: ${preflightData?.length || 0}`)
      if (preflightData && preflightData.length > 0) {
        const sample = preflightData[0]
        console.log('✅ DEBUG: Sample vendor fields:')
        console.log(`   - id: ${sample.id}`)
        console.log(`   - name: ${sample.name}`)
        console.log(`   - approved: ${sample.approved} (type: ${typeof sample.approved})`)
        console.log(`   - service_colonias type: ${typeof sample.service_colonias}`)
        console.log(`   - service_colonias value: ${JSON.stringify(sample.service_colonias)}`)
        console.log(`   - latitude: ${sample.latitude}, longitude: ${sample.longitude}`)
      }
    }

    // DEBUG: Log incoming zip code
    console.log(`🔍 DEBUG: Incoming zipCode param: ${userZipCode || 'null/undefined'}`)
    let normalizedUserZip = null
    try {
      normalizedUserZip = userZipCode ? normalizeZip(userZipCode) : null
      console.log(`🔍 DEBUG: Normalized zip code: ${normalizedUserZip || 'null (invalid)'}`)
    } catch (error) {
      console.error('❌ DEBUG: Error normalizing zip code:', error)
      // Fallback: manual normalization
      if (userZipCode) {
        const zipStr = String(userZipCode).trim().replace(/\s+/g, '')
        normalizedUserZip = /^\d{4,5}$/.test(zipStr) ? zipStr.padStart(5, '0') : null
        console.log(`🔍 DEBUG: Fallback normalized zip: ${normalizedUserZip}`)
      }
    }

    // Get all approved stores
    // If filtering by zip code, don't require location (store can deliver to zip without having location set)
    // If NOT filtering by zip code, require location for distance calculation
    console.log('🔍 DEBUG: Querying vendors table with filters:')
    console.log('   - Table: vendors')
    console.log('   - Approval field: approved = true')
    if (normalizedUserZip) {
      console.log('   - Location fields: NOT required (filtering by zip code)')
    } else {
      console.log('   - Location fields: latitude IS NOT NULL, longitude IS NOT NULL (required for distance)')
    }
    console.log('   - Delivery zones field: service_colonias')
    
    let query = supabase
      .from('vendors')
      .select('id, name, description, latitude, longitude, service_colonias, fulfillment_modes, min_order, logo, email, contact, address, operating_hours, service_radius_km, meetup_points')
      .eq('approved', true)
    
    // Only require location if NOT filtering by zip code (need it for distance calculation)
    if (!normalizedUserZip) {
      query = query.not('latitude', 'is', null).not('longitude', 'is', null)
    }

    const { data: stores, error } = await query

    if (error) {
      console.error('❌ DEBUG: Error fetching stores:', error)
      console.error('   Error code:', error.code)
      console.error('   Error message:', error.message)
      console.error('   Error details:', error.details)
      console.error('   Error hint:', error.hint)
      return NextResponse.json(
        { error: 'Error al obtener tiendas' },
        { status: 500 }
      )
    }

    console.log(`📦 Found ${stores?.length || 0} approved stores with location`)
    
    if (!stores || stores.length === 0) {
      console.log('❌ DEBUG: No stores found after query')
      console.log('   Possible reasons:')
      console.log('   A) No vendors with approved=true')
      console.log('   B) No vendors with latitude/longitude set')
      console.log('   C) RLS blocking the query')
      const debugInfo = process.env.NODE_ENV !== 'production' ? {
        returnedCount: 0,
        reason: 'No stores found - check approved status and location fields',
        preflightCount: preflightData?.length || 0
      } : {}
      return NextResponse.json({ stores: [], ...debugInfo })
    }

    // DEBUG: Log first store's service_colonias format
    if (stores.length > 0) {
      const firstStore = stores[0]
      console.log('🔍 DEBUG: First store sample:')
      console.log(`   - name: ${firstStore.name}`)
      console.log(`   - service_colonias type: ${typeof firstStore.service_colonias}`)
      console.log(`   - service_colonias isArray: ${Array.isArray(firstStore.service_colonias)}`)
      console.log(`   - service_colonias value: ${JSON.stringify(firstStore.service_colonias)}`)
      if (Array.isArray(firstStore.service_colonias) && firstStore.service_colonias.length > 0) {
        console.log(`   - First colonia ID: ${firstStore.service_colonias[0]}`)
      }
    }

    if (stores && stores.length > 0) {
      stores.forEach(store => {
        const serviceColonias = store.service_colonias
        const coloniasType = Array.isArray(serviceColonias) ? 'array' : typeof serviceColonias
        const coloniasLength = Array.isArray(serviceColonias) ? serviceColonias.length : 'N/A'
        console.log(`  - ${store.name}:`)
        console.log(`    service_colonias type: ${coloniasType}, length: ${coloniasLength}`)
        if (Array.isArray(serviceColonias) && serviceColonias.length > 0) {
          console.log(`    First 3 colonias: ${JSON.stringify(serviceColonias.slice(0, 3))}`)
        } else {
          console.log(`    service_colonias value: ${JSON.stringify(serviceColonias)}`)
        }
      })
    }

    console.log(`Found ${stores.length} approved stores with location`)

    // Normalize zip code if provided (already done above, but log here)
    if (normalizedUserZip) {
      console.log(`📍 Filtering stores by zip code: ${userZipCode} -> ${normalizedUserZip} (normalized)`)
    } else if (userZipCode) {
      console.warn(`⚠️ Invalid zip code provided: ${userZipCode}`)
    }

    // Filter by service area FIRST (if zip code provided)
    // If store has the user's zip code in service_colonias, include it regardless of distance
    // If store has no service areas configured, use distance filter (backward compatibility)
    let filteredStores = stores
    if (normalizedUserZip) {
      filteredStores = stores.filter(store => {
        const serviceColonias = store.service_colonias
        
        // Debug: Log service_colonias format for first store
        if (process.env.NODE_ENV === 'development' && stores.indexOf(store) === 0) {
          console.log(`🔍 DEBUG - Sample store ${store.name}:`)
          console.log(`  - service_colonias type: ${typeof serviceColonias}`)
          console.log(`  - service_colonias value: ${JSON.stringify(serviceColonias)}`)
          console.log(`  - service_colonias isArray: ${Array.isArray(serviceColonias)}`)
        }
        
        // If store has no service areas configured, check distance (backward compatibility)
        if (!serviceColonias || 
            (Array.isArray(serviceColonias) && serviceColonias.length === 0) ||
            (typeof serviceColonias === 'string' && serviceColonias.trim() === '')) {
          const distance = calculateDistance(lat, lng, store.latitude, store.longitude)
          const withinDistance = distance <= maxDistance
          if (process.env.NODE_ENV === 'development') {
            if (!withinDistance) {
              console.log(`  ⚠️ Store ${store.name} has no service areas and is ${distance.toFixed(2)}km away (outside ${maxDistance}km radius)`)
            } else {
              console.log(`  ✅ Store ${store.name} has no service areas but is within ${maxDistance}km (${distance.toFixed(2)}km)`)
            }
          }
          return withinDistance
        }

        // Use robust matching function that handles all formats
        let isInServiceArea = false
        try {
          isInServiceArea = isZipInServiceArea(normalizedUserZip, serviceColonias)
        } catch (error) {
          console.error(`❌ DEBUG: Error in isZipInServiceArea for ${store.name}:`, error)
          // Fallback: manual matching
          if (Array.isArray(serviceColonias)) {
            for (const item of serviceColonias) {
              if (typeof item === 'string') {
                const zipMatch = item.match(/-(\d{5})$/)
                if (zipMatch && zipMatch[1] === normalizedUserZip) {
                  isInServiceArea = true
                  break
                }
              }
            }
          }
        }
        
        console.log(`🔍 DEBUG: Store ${store.name} matching:`)
        if (Array.isArray(serviceColonias)) {
          console.log(`  - Service colonias (first 3): ${JSON.stringify(serviceColonias.slice(0, 3))}${serviceColonias.length > 3 ? '...' : ''}`)
          console.log(`  - Total colonias: ${serviceColonias.length}`)
        } else {
          console.log(`  - Service colonias: ${JSON.stringify(serviceColonias)}`)
        }
        console.log(`  - User zip code: ${normalizedUserZip}`)
        console.log(`  - Match result: ${isInServiceArea ? '✅ MATCH' : '❌ NO MATCH'}`)
        
        return isInServiceArea
      })
      console.log(`📍 After zip code filter: ${filteredStores.length} stores (from ${stores.length} total)`)
    } else {
      // No zip code provided: filter by distance only (backward compatibility)
      filteredStores = stores.filter(store => {
        const distance = calculateDistance(lat, lng, store.latitude, store.longitude)
        return distance <= maxDistance
      })
      console.log(`📍 No zip code provided, filtering by distance only: ${filteredStores.length} stores within ${maxDistance}km`)
    }

    // Calculate distance for all filtered stores (for display and sorting)
    // If store has no location, set distance to null (will be sorted last)
    let nearbyStores = filteredStores.map(store => {
      let distance = null
      if (store.latitude && store.longitude) {
        distance = calculateDistance(lat, lng, store.latitude, store.longitude)
      }
      return {
        ...store,
        distance_km: distance
      }
    })

    // Log stores that passed the filter
    if (nearbyStores.length > 0) {
      console.log(`📍 Final stores: ${nearbyStores.map(s => {
        const dist = s.distance_km !== null ? `${s.distance_km.toFixed(2)}km` : 'no location'
        return `${s.name} (${dist})`
      }).join(', ')}`)
    } else {
      console.log(`⚠️ No stores found after filtering`)
    }


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

    // Sort by distance (stores without location go last)
    nearbyStores.sort((a, b) => {
      if (a.distance_km === null) return 1
      if (b.distance_km === null) return -1
      return a.distance_km - b.distance_km
    })

    // Calculate average rating (if you have ratings table)
    // This is a placeholder - you'll need to join with ratings if available
    nearbyStores = nearbyStores.map(store => {
      const distance = store.distance_km !== null ? parseFloat(store.distance_km.toFixed(2)) : null
      const deliveryTime = distance !== null ? calculateDeliveryTime(distance) : null
      
      return {
        id: store.id,
        name: store.name,
        description: store.description,
        distance_km: distance,
        delivery_time_minutes: deliveryTime,
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
        service_colonias: store.service_colonias || [],
      }
    })

    // DEBUG: Add debug info in development only
    const response = { stores: nearbyStores }
    if (process.env.NODE_ENV !== 'production') {
      response.debug = {
        returnedCount: nearbyStores.length,
        totalVendorsFound: stores.length,
        filteredByZip: normalizedUserZip || 'none',
        firstStoreServiceColonias: nearbyStores.length > 0 ? {
          type: typeof nearbyStores[0].service_colonias,
          isArray: Array.isArray(nearbyStores[0].service_colonias),
          value: nearbyStores[0].service_colonias
        } : null,
        reason: nearbyStores.length === 0 
          ? (normalizedUserZip 
              ? 'No stores match zip code in service_colonias' 
              : 'No zip code provided or invalid')
          : 'Stores found'
      }
    }
    
    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in nearby stores API:', error)
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    )
  }
}

