import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Search zip codes by query (colonia, delegacion, estado, or zip code)
 * GET /api/zip-codes/search?q=query&limit=10
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] })
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

    // Search by zip code (exact match)
    if (/^\d{5}$/.test(query)) {
      const { data, error } = await supabase
        .from('zip_codes')
        .select('*')
        .eq('zip_code', query)
        .limit(limit)

      if (error) {
        console.error('Error searching zip codes:', error)
        return NextResponse.json({ results: [] })
      }

      return NextResponse.json({
        results: data || []
      })
    }

    // Search by text (colonia, delegacion, estado)
    const searchQuery = `%${query}%`
    const { data, error } = await supabase
      .from('zip_codes')
      .select('*')
      .or(`colonia.ilike.${searchQuery},delegacion_municipio.ilike.${searchQuery},estado.ilike.${searchQuery},ciudad.ilike.${searchQuery}`)
      .limit(limit)
      .order('colonia', { ascending: true })

    if (error) {
      console.error('Error searching zip codes:', error)
      return NextResponse.json({ results: [] })
    }

    return NextResponse.json({
      results: data || []
    })
  } catch (error) {
    console.error('Error in zip codes search API:', error)
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    )
  }
}

/**
 * Get delegaciones/municipios by state
 * GET /api/zip-codes/delegaciones?estado=CDMX
 */
export async function GET_DELEGACIONES(request) {
  try {
    const { searchParams } = new URL(request.url)
    const estado = searchParams.get('estado') || 'CDMX'

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
      .from('zip_codes')
      .select('delegacion_municipio')
      .eq('estado', estado)
      .order('delegacion_municipio', { ascending: true })

    if (error) {
      console.error('Error fetching delegaciones:', error)
      return NextResponse.json({ delegaciones: [] })
    }

    // Get unique delegaciones
    const uniqueDelegaciones = [...new Set((data || []).map(item => item.delegacion_municipio))]

    return NextResponse.json({
      delegaciones: uniqueDelegaciones.map(name => ({ id: name.toLowerCase().replace(/\s+/g, '-'), name }))
    })
  } catch (error) {
    console.error('Error in delegaciones API:', error)
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    )
  }
}

