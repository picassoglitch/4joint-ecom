import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request) {
  try {
    const { latitude, longitude, locationPlace, hasCompletedOnboarding } = await request.json()

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
      const result = await supabase
        .from('user_profiles')
        .update({
          latitude,
          longitude,
          location_place: locationPlace,
          has_completed_onboarding: hasCompletedOnboarding !== undefined ? hasCompletedOnboarding : true,
        })
        .eq('id', userId)
        .select()
        .single()
      data = result.data
      error = result.error
    } else {
      // Insert new profile
      const result = await supabase
        .from('user_profiles')
        .insert({
          id: userId,
          latitude,
          longitude,
          location_place: locationPlace,
          has_completed_onboarding: hasCompletedOnboarding !== undefined ? hasCompletedOnboarding : true,
        })
        .select()
        .single()
      data = result.data
      error = result.error
    }

    if (error) {
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
  try {
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

    // Get user location from user_profiles table
    const { data, error } = await supabase
      .from('user_profiles')
      .select('latitude, longitude, location_place, has_completed_onboarding')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching user location:', error)
      return NextResponse.json(
        { error: 'Error al obtener ubicación' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error in location API:', error)
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    )
  }
}

