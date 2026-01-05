import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request) {
  try {
    const { latitude, longitude, locationPlace, postcode, hasCompletedOnboarding } = await request.json()

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      )
    }

    // Get authorization header
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    // Create client with the provided token
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    // Get user from token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Usuario no autenticado' },
        { status: 401 }
      )
    }

    const userId = user.id

    // Update or insert user location in user_profiles table
    // First try to update, if no row exists, insert
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', userId)
      .single()

    let data, error

    if (existingProfile) {
      // Update existing profile
      const updateData = {
        latitude,
        longitude,
        location_place: locationPlace,
        has_completed_onboarding: hasCompletedOnboarding !== undefined ? hasCompletedOnboarding : true,
      }
      
      // Try to update with postcode, but handle gracefully if column doesn't exist
      let result
      if (postcode) {
        // First try with postcode
        result = await supabase
          .from('user_profiles')
          .update({
            ...updateData,
            postcode: postcode
          })
          .eq('id', userId)
          .select()
          .single()
        
        // If error is about column not existing, retry without postcode
        if (result.error && (result.error.message?.includes('column') || result.error.code === '42703')) {
          console.log('Postcode column not found, saving without it')
          result = await supabase
            .from('user_profiles')
            .update(updateData)
            .eq('id', userId)
            .select()
            .single()
        }
      } else {
        result = await supabase
          .from('user_profiles')
          .update(updateData)
          .eq('id', userId)
          .select()
          .single()
      }
      
      data = result.data
      error = result.error
    } else {
      // Insert new profile
      const insertData = {
        id: userId,
        latitude,
        longitude,
        location_place: locationPlace,
        has_completed_onboarding: hasCompletedOnboarding !== undefined ? hasCompletedOnboarding : true,
      }
      
      // Try to insert with postcode, but handle gracefully if column doesn't exist
      let result
      if (postcode) {
        // First try with postcode
        result = await supabase
          .from('user_profiles')
          .insert({
            ...insertData,
            postcode: postcode
          })
          .select()
          .single()
        
        // If error is about column not existing, retry without postcode
        if (result.error && (result.error.message?.includes('column') || result.error.code === '42703')) {
          console.log('Postcode column not found, saving without it')
          result = await supabase
            .from('user_profiles')
            .insert(insertData)
            .select()
            .single()
        }
      } else {
        result = await supabase
          .from('user_profiles')
          .insert(insertData)
          .select()
          .single()
      }
      
      data = result.data
      error = result.error
    }

    if (error) {
      // Check if error is about missing postcode column
      const isColumnError = error.message?.includes('column') || 
                           error.code === '42703' || 
                           error.message?.includes('postcode')
      
      if (isColumnError && postcode) {
        // Postcode column doesn't exist yet - this is okay, location is still saved
        console.log('Postcode column not available, but location saved successfully')
        // Return success even though postcode wasn't saved
        return NextResponse.json({ success: true, data, warning: 'Postcode column not available yet' })
      }
      
      console.error('Error updating user location:', error)
      return NextResponse.json(
        { error: 'Error al guardar ubicación' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error in location API:', error)
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    )
  }
}

export async function GET(request) {
  // FIX 500: Safe fallback location object
  const fallbackLocation = {
    country: 'MX',
    city: 'Ciudad de México',
    region: 'CDMX',
    lat: null,
    lng: null,
    source: 'fallback'
  }

  try {
    // FIX 500: Always return 200, even if Supabase is not configured
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('FIX 500: Supabase not configured')
      return NextResponse.json({
        ok: false,
        error: 'LOCATION_UNAVAILABLE',
        location: fallbackLocation
      })
    }

    // FIX 500: Safely get authorization header (may not exist)
    const authHeader = request?.headers?.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || null
    
    // FIX 500: Create client safely
    let supabase
    try {
      supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })
    } catch (clientError) {
      console.error('FIX 500: Error creating Supabase client:', clientError)
      return NextResponse.json({
        ok: false,
        error: 'LOCATION_UNAVAILABLE',
        location: fallbackLocation
      })
    }

    // FIX 500: If no token, return fallback (not an error)
    if (!token) {
      return NextResponse.json({
        ok: false,
        error: 'LOCATION_UNAVAILABLE',
        location: fallbackLocation
      })
    }

    // FIX 500: Safely get user from token
    let user = null
    try {
      const { data: userData, error: authError } = await supabase.auth.getUser(token)
      if (authError || !userData?.user) {
        // Not authenticated - return fallback, not error
        return NextResponse.json({
          ok: false,
          error: 'LOCATION_UNAVAILABLE',
          location: fallbackLocation
        })
      }
      user = userData.user
    } catch (authErr) {
      console.error('FIX 500: Error getting user:', authErr)
      return NextResponse.json({
        ok: false,
        error: 'LOCATION_UNAVAILABLE',
        location: fallbackLocation
      })
    }

    const userId = user.id

    // FIX 500: Safely get user location from user_profiles table
    let locationData = null
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('latitude, longitude, location_place, postcode, has_completed_onboarding')
        .eq('id', userId)
        .single()

      if (error) {
        // FIX 500: If table doesn't exist or no profile, return fallback (not error)
        console.error('FIX 500: Error fetching user location:', error)
        return NextResponse.json({
          ok: false,
          error: 'LOCATION_UNAVAILABLE',
          location: fallbackLocation
        })
      }

      locationData = data
    } catch (dbError) {
      console.error('FIX 500: Database error fetching location:', dbError)
      return NextResponse.json({
        ok: false,
        error: 'LOCATION_UNAVAILABLE',
        location: fallbackLocation
      })
    }

    // FIX 500: If location data exists and has coordinates, return it
    if (locationData && locationData.latitude && locationData.longitude) {
      return NextResponse.json({
        ok: true,
        location: {
          country: 'MX',
          city: locationData.location_place || 'Ciudad de México',
          region: locationData.location_place || 'CDMX',
          lat: locationData.latitude,
          lng: locationData.longitude,
          postcode: locationData.postcode || null,
          source: 'database'
        },
        data: locationData
      })
    }

    // FIX 500: No location data - return fallback
    return NextResponse.json({
      ok: false,
      error: 'LOCATION_UNAVAILABLE',
      location: fallbackLocation
    })
  } catch (error) {
    // FIX 500: Catch all unexpected errors and return safe fallback
    console.error('FIX 500: Unexpected error in location API:', error)
    return NextResponse.json({
      ok: false,
      error: 'LOCATION_UNAVAILABLE',
      location: fallbackLocation
    })
  }
}

