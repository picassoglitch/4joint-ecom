import { supabase } from './client'

/**
 * Get site configuration by key
 */
export async function getSiteConfig(key) {
  const { data, error } = await supabase
    .from('site_config')
    .select('*')
    .eq('key', key)
    .single()

  if (error) {
    console.error('Error fetching site config:', error)
    return null
  }

  return data?.value || null
}

/**
 * Get all site configuration
 */
export async function getAllSiteConfig() {
  const { data, error } = await supabase
    .from('site_config')
    .select('*')
    .order('key')

  if (error) {
    console.error('Error fetching all site config:', error)
    return []
  }

  // Convert to object with keys
  const config = {}
  data.forEach(item => {
    config[item.key] = item.value
  })

  return config
}

/**
 * Update site configuration
 * Requires admin role
 */
export async function updateSiteConfig(key, value) {
  try {
    // Verify user is authenticated
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session?.user) {
      throw new Error('Debes iniciar sesión para actualizar la configuración')
    }

    // Ensure value is properly formatted as JSONB
    // Supabase will handle JSONB conversion automatically, but we ensure it's an object
    const jsonbValue = typeof value === 'string' ? JSON.parse(value) : value

    // First, try to get existing config to see if it exists
    const { data: existing } = await supabase
      .from('site_config')
      .select('id')
      .eq('key', key)
      .single()

    let data, error

    if (existing) {
      // Update existing
      const result = await supabase
        .from('site_config')
        .update({
          value: jsonbValue,
          updated_at: new Date().toISOString()
        })
        .eq('key', key)
        .select()
        .single()
      data = result.data
      error = result.error
    } else {
      // Insert new
      const result = await supabase
        .from('site_config')
        .insert({
          key,
          value: jsonbValue
        })
        .select()
        .single()
      data = result.data
      error = result.error
    }

    if (error) {
      // Log the raw error object first to see its structure
      console.error('Raw Supabase error object:', JSON.stringify(error, null, 2))
      console.error('Error type:', typeof error)
      console.error('Error keys:', Object.keys(error))
      
      // Safely extract error properties
      const errorMessage = error?.message || String(error) || 'Error desconocido'
      const errorCode = error?.code || null
      const errorDetails = error?.details || null
      const errorHint = error?.hint || null
      
      console.error('Extracted error info:', {
        message: errorMessage,
        code: errorCode,
        details: errorDetails,
        hint: errorHint,
        key: key,
        valueType: typeof value
      })
      
      // Provide specific error messages based on code or message
      if (errorCode === '42P01' || errorMessage?.includes('does not exist') || errorMessage?.includes('relation')) {
        throw new Error('La tabla site_config no existe. Ejecuta la migración migration_site_config.sql en Supabase.')
      }
      
      if (errorCode === '42501' || errorMessage?.includes('row-level security') || errorMessage?.includes('policy') || errorMessage?.includes('permission denied')) {
        throw new Error('No tienes permisos para actualizar la configuración. Verifica que tengas rol de administrador y que las políticas RLS estén configuradas correctamente.')
      }
      
      if (errorCode === '23505' || errorMessage?.includes('unique constraint')) {
        throw new Error('Ya existe una configuración con esta clave.')
      }
      
      // Create enhanced error with all details
      const enhancedError = new Error(errorMessage)
      
      // Safely add properties
      if (errorCode) enhancedError.code = errorCode
      if (errorDetails) enhancedError.details = errorDetails
      if (errorHint) enhancedError.hint = errorHint
      enhancedError.originalError = error
      enhancedError.configKey = key
      
      throw enhancedError
    }

    return data
  } catch (error) {
    // Re-throw with better message if it's already an Error object
    if (error instanceof Error) {
      throw error
    }
    
    // If it's not an Error, create one
    throw new Error(error?.message || 'Error desconocido al actualizar la configuración')
  }
}

/**
 * Get hero configuration
 */
export async function getHeroConfig() {
  const config = await getSiteConfig('hero')
  return config || {
    title: 'Productos 420 que amas. Precios que confías.',
    bannerImage: '',
    showPrice: false
  }
}

/**
 * Get social media links
 */
export async function getSocialMediaLinks() {
  const config = await getSiteConfig('social_media')
  return config || {
    facebook: '',
    instagram: '',
    twitter: '',
    linkedin: '',
    tiktok: '',
    youtube: ''
  }
}

