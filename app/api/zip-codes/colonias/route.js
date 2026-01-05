import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Get colonias by delegacion/municipio
 * GET /api/zip-codes/colonias?delegacion=Alvaro Obregon&estado=CDMX
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const delegacion = searchParams.get('delegacion')
    let estado = searchParams.get('estado') || 'CDMX'
    
    // Normalize estado name: CDMX -> Ciudad de México
    if (estado === 'CDMX' || estado === 'CDMX' || estado.toLowerCase() === 'cdmx') {
      estado = 'Ciudad de México'
    }

    if (!delegacion) {
      return NextResponse.json(
        { error: 'delegacion parameter is required' },
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

    // Use ilike for case-insensitive matching and handle encoding issues
    let query = supabase
      .from('zip_codes')
      .select('zip_code, colonia')
      .ilike('delegacion_municipio', `%${delegacion}%`)
      .order('colonia', { ascending: true })
    
    if (estado === 'Ciudad de México' || estado === 'CDMX') {
      query = query.ilike('estado', 'Ciudad de M%')
    } else {
      query = query.ilike('estado', `%${estado}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching colonias:', error)
      return NextResponse.json({ colonias: [] })
    }

    // Group by colonia and get unique zip codes
    const coloniaMap = new Map()
    ;(data || []).forEach(item => {
      if (!coloniaMap.has(item.colonia)) {
        coloniaMap.set(item.colonia, {
          id: `${item.colonia.toLowerCase().replace(/\s+/g, '-').normalize('NFD').replace(/[\u0300-\u036f]/g, '')}-${item.zip_code}`,
          name: item.colonia,
          zip: item.zip_code
        })
      }
    })

    return NextResponse.json({
      colonias: Array.from(coloniaMap.values())
    })
  } catch (error) {
    console.error('Error in colonias API:', error)
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    )
  }
}

