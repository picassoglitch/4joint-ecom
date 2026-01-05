import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Get delegaciones/municipios by state
 * GET /api/zip-codes/delegaciones?estado=CDMX
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    let estado = searchParams.get('estado') || 'CDMX'
    
    // Normalize estado name: CDMX -> Ciudad de México
    if (estado === 'CDMX' || estado === 'CDMX' || estado.toLowerCase() === 'cdmx') {
      estado = 'Ciudad de México'
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

    // Use ilike for case-insensitive matching and handle encoding issues
    // For CDMX, search for "Ciudad de M%" to handle encoding variations
    let query = supabase
      .from('zip_codes')
      .select('delegacion_municipio')
      .order('delegacion_municipio', { ascending: true })
    
    if (estado === 'Ciudad de México' || estado === 'CDMX') {
      // Search for "Ciudad de M%" to handle encoding variations
      query = query.ilike('estado', 'Ciudad de M%')
    } else {
      query = query.ilike('estado', `%${estado}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching delegaciones:', error)
      return NextResponse.json({ delegaciones: [] })
    }

    // Get unique delegaciones
    const uniqueDelegaciones = [...new Set((data || []).map(item => item.delegacion_municipio))]

    return NextResponse.json({
      delegaciones: uniqueDelegaciones.map(name => ({ 
        id: name.toLowerCase().replace(/\s+/g, '-').normalize('NFD').replace(/[\u0300-\u036f]/g, ''), 
        name 
      }))
    })
  } catch (error) {
    console.error('Error in delegaciones API:', error)
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    )
  }
}

