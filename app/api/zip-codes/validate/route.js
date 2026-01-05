import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Validate if a zip code is in a list of service colonias
 * POST /api/zip-codes/validate
 * Body: { zipCode: "01000", serviceColonias: ["colonia-id-1", "colonia-id-2"] }
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { zipCode, serviceColonias } = body

    if (!zipCode) {
      return NextResponse.json(
        { error: 'zipCode is required' },
        { status: 400 }
      )
    }

    if (!serviceColonias || !Array.isArray(serviceColonias) || serviceColonias.length === 0) {
      return NextResponse.json({
        isValid: false,
        message: 'Esta tienda no tiene zonas de servicio configuradas'
      })
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

    // Extract zip codes from service colonias (format: "colonia-name-01000")
    const serviceZipCodes = serviceColonias
      .map(coloniaId => {
        // Extract zip code from colonia ID (last 5 digits)
        const zipMatch = coloniaId.match(/-(\d{5})$/)
        return zipMatch ? zipMatch[1] : null
      })
      .filter(Boolean)

    if (serviceZipCodes.length === 0) {
      return NextResponse.json({
        isValid: false,
        message: 'No se encontraron códigos postales válidos en las zonas de servicio'
      })
    }

    // Check if zip code is in service area
    const { data, error } = await supabase
      .from('zip_codes')
      .select('zip_code, colonia, delegacion_municipio, estado')
      .eq('zip_code', zipCode)
      .in('zip_code', serviceZipCodes)
      .limit(1)

    if (error) {
      console.error('Error validating zip code:', error)
      return NextResponse.json({
        isValid: false,
        message: 'Error al validar el código postal'
      })
    }

    const isValid = data && data.length > 0

    if (!isValid) {
      // Get service area info for error message
      const { data: serviceAreaData } = await supabase
        .from('zip_codes')
        .select('delegacion_municipio, estado')
        .in('zip_code', serviceZipCodes)
        .limit(10)

      const delegaciones = [...new Set((serviceAreaData || []).map(item => item.delegacion_municipio))]

      return NextResponse.json({
        isValid: false,
        message: `Lo sentimos, no realizamos entregas a tu código postal (${zipCode}). Zonas de servicio: ${delegaciones.join(', ')}`
      })
    }

    return NextResponse.json({
      isValid: true,
      location: data[0]
    })
  } catch (error) {
    console.error('Error in zip code validation API:', error)
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    )
  }
}

