import { supabase } from './client'

/**
 * Get site configuration by key
 */
export async function getSiteConfig(key) {
  try {
    const { data, error } = await supabase
      .from('site_config')
      .select('*')
      .eq('key', key)
      .single()

    if (error) {
      // Explicit handling for HTTP 406 (Not Acceptable) - age gate required
      // For age_gate requests, any error (especially 406) means age verification is required
      // This is expected behavior and should not throw an error or crash the app
      
      // Check for 406 status first (before checking key)
      const httpStatus = error.status || error.response?.status || error.statusCode || null
      const is406Error = httpStatus === 406 || error.code === 'PGRST301' || error.code === '406'
      
      if (key === 'age_gate' || (is406Error && key === 'age_gate')) {
        // HTTP 406 is expected for age_gate when verification is required
        // This happens when the age_gate config doesn't exist in the database yet
        // Return safe object - do not log as error
        return { ageGateRequired: true }
      }
      
      // Check for explicit 406 status in error object (various possible locations)
      if (httpStatus === 406) {
        // Return safe object indicating age gate is required
        return { ageGateRequired: true }
      }
      
      // Special handling for other age_gate related errors
      if (key === 'age_gate') {
        // Check if this is an age verification required response
        const isAgeGateRequired = error.code === '406' || 
                                  error.code === 'age_gate' ||
                                  (error.message && error.message.includes('age')) ||
                                  (typeof error === 'string' && error.includes('age'))
        
        if (isAgeGateRequired) {
          // Return safe fallback config for age gate
          return {
            ageRequirement: 18,
            enabled: true,
            complianceNotice: '',
            regionRestrictions: [],
            disableStoreDiscovery: false
          }
        }
      }
      
      // Handle "no rows found" error - this is expected when a key doesn't exist yet
      const errorCode = error.code || ''
      const errorMessage = error.message || ''
      
      // PGRST116 is Supabase's "no rows returned" error code
      // This is normal when a config key doesn't exist yet
      if (errorCode === 'PGRST116' || 
          errorMessage.includes('No rows') || 
          errorMessage.includes('0 rows') ||
          errorCode === 'PGRST301' || // Alternative code for no rows
          (errorMessage && errorMessage.toLowerCase().includes('no rows'))) {
        // Key doesn't exist yet - this is normal, return null silently
        return null
      }
      
      // Check if error properties are just the key name (malformed error)
      // This happens sometimes with Supabase errors
      if (error.message === key && error.code === key && error.details === key && error.hint === key) {
        // Malformed error - likely means key doesn't exist, return null silently
        return null
      }
      
      // Check if this is a real Supabase error object with meaningful data
      const isRealError = typeof error === 'object' && 
                         error !== null && 
                         (error.message || error.code || error.details || error.hint)
      
      // Only log if we have a real error object with actual error data
      if (isRealError) {
        const errorDetails = error.details || null
        const errorHint = error.hint || null
        
        // Only log if we have meaningful error information that's not just the key
        const hasValidError = (errorMessage && errorMessage !== key && typeof errorMessage === 'string' && errorMessage.length > 0) ||
                             (errorCode && errorCode !== key && typeof errorCode === 'string' && errorCode.length > 0) ||
                             (errorDetails && errorDetails !== key && typeof errorDetails === 'string' && errorDetails.length > 0) ||
                             (errorHint && errorHint !== key && typeof errorHint === 'string' && errorHint.length > 0)
        
        if (hasValidError) {
          console.error('Error fetching site config:', {
            key,
            message: errorMessage,
            code: errorCode,
            details: errorDetails,
            hint: errorHint
          })
          
          // If table doesn't exist, log helpful message
          if (errorCode === '42P01' || (errorMessage && (errorMessage.includes('does not exist') || errorMessage.includes('relation')))) {
            console.warn('⚠️ La tabla site_config no existe. Ejecuta la migración migration_site_config.sql en Supabase.')
          }
          
          // If RLS issue, log helpful message
          if (errorCode === '42501' || (errorMessage && (errorMessage.includes('row-level security') || errorMessage.includes('policy') || errorMessage.includes('permission denied')))) {
            console.warn('⚠️ Error de permisos al leer site_config. Verifica las políticas RLS. Ejecuta fix_site_config_rls.sql si es necesario.')
          }
        }
      }
      
      // Return null for non-age_gate errors (key doesn't exist or other non-critical errors)
      return null
    }

    return data?.value || null
  } catch (err) {
    // Handle unexpected errors - return fallback for age_gate
    if (key === 'age_gate') {
      return {
        ageRequirement: 18,
        enabled: true,
        complianceNotice: '',
        regionRestrictions: [],
        disableStoreDiscovery: false
      }
    }
    
    console.error('Unexpected error in getSiteConfig:', {
      key,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined
    })
    return null
  }
}

/**
 * Get all site configuration
 */
export async function getAllSiteConfig() {
  try {
    const { data, error } = await supabase
      .from('site_config')
      .select('*')
      .order('key')

    if (error) {
      // Check if this is a real Supabase error object with meaningful data
      const isRealError = typeof error === 'object' && 
                         error !== null && 
                         (error.message || error.code || error.details || error.hint)
      
      // Only log if we have a real error object with actual error data
      if (isRealError) {
        const errorMessage = error.message || null
        const errorCode = error.code || null
        const errorDetails = error.details || null
        const errorHint = error.hint || null
        
        // Only log if we have meaningful error information
        const hasValidError = (errorMessage && typeof errorMessage === 'string' && errorMessage.length > 0) ||
                             (errorCode && typeof errorCode === 'string' && errorCode.length > 0) ||
                             (errorDetails && typeof errorDetails === 'string' && errorDetails.length > 0) ||
                             (errorHint && typeof errorHint === 'string' && errorHint.length > 0)
        
        if (hasValidError) {
          console.error('Error fetching all site config:', {
            message: errorMessage,
            code: errorCode,
            details: errorDetails,
            hint: errorHint
          })
          
          // If table doesn't exist, log helpful message
          if (errorCode === '42P01' || (errorMessage && (errorMessage.includes('does not exist') || errorMessage.includes('relation')))) {
            console.warn('⚠️ La tabla site_config no existe. Ejecuta la migración migration_site_config.sql en Supabase.')
          }
          
          // If RLS issue, log helpful message
          if (errorCode === '42501' || (errorMessage && (errorMessage.includes('row-level security') || errorMessage.includes('policy') || errorMessage.includes('permission denied')))) {
            console.warn('⚠️ Error de permisos al leer site_config. Verifica las políticas RLS. Ejecuta fix_site_config_rls.sql si es necesario.')
          }
        }
      }
      
      // Always return empty object on error, regardless of whether we logged it
      return {}
    }

    // Convert to object with keys
    const config = {}
    if (data && Array.isArray(data)) {
      data.forEach(item => {
        config[item.key] = item.value
      })
    }

    return config
  } catch (err) {
    // Handle unexpected errors
    console.error('Unexpected error in getAllSiteConfig:', {
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined
    })
    return {}
  }
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

/**
 * Get promotional banner configuration
 */
export async function getBannerConfig() {
  const config = await getSiteConfig('promotional_banner')
  return config || {
    enabled: true,
    text: '¡Obtén 1 gr gratis en tu primer pedido!',
    buttonText: 'Reclamar Oferta',
    loginButtonText: 'Iniciar Sesión',
    couponCode: '1GRGRATIS',
    icon: '🎁',
    showForAuthenticated: true,
    showForUnauthenticated: true
  }
}

/**
 * Get shipping banner configuration
 */
export async function getShippingBannerConfig() {
  const config = await getSiteConfig('shipping_banner')
  return config || {
    enabled: true,
    badgeText: 'NUEVO',
    message: '¡Envío gratis en pedidos mayores a $800 MXN!',
    showBadge: true
  }
}

