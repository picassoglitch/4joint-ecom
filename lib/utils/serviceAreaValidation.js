/**
 * Service Area Validation Utilities
 * Validates if a customer's zip code is within a store's service area
 * Now uses Supabase zip_codes table instead of hardcoded data
 */

/**
 * Check if a zip code is in the store's service area
 * @param {string} zipCode - Customer's zip code
 * @param {string[]} serviceColonias - Array of colonia IDs from store (format: "colonia-name-01000")
 * @returns {Promise<boolean>} True if zip is in service area
 */
export async function validateZipCodeInServiceArea(zipCode, serviceColonias) {
  if (!zipCode || !serviceColonias || serviceColonias.length === 0) {
    return false
  }

  try {
    const response = await fetch('/api/zip-codes/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        zipCode,
        serviceColonias
      })
    })

    const data = await response.json()
    return data.isValid || false
  } catch (error) {
    console.error('Error validating zip code:', error)
    return false
  }
}

/**
 * Get store service area info for display
 * @param {string[]} serviceColonias - Array of colonia IDs (format: "colonia-name-01000")
 * @returns {Promise<Object>} Service area info with colonias and delegaciones
 */
export async function getServiceAreaInfo(serviceColonias) {
  if (!serviceColonias || serviceColonias.length === 0) {
    return {
      colonias: [],
      delegaciones: [],
      message: 'Esta tienda no tiene zonas de servicio configuradas'
    }
  }

  try {
    // Extract zip codes from colonia IDs
    const zipCodes = serviceColonias
      .map(coloniaId => {
        const parts = coloniaId.split('-')
        return parts[parts.length - 1]
      })
      .filter(zip => /^\d{5}$/.test(zip))

    if (zipCodes.length === 0) {
      return {
        colonias: [],
        delegaciones: [],
        message: 'No se encontraron códigos postales válidos'
      }
    }

    // Fetch colonias info from API
    const response = await fetch('/api/zip-codes/search', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    })

    // Get unique delegaciones from zip codes
    const delegacionesSet = new Set()
    for (const zip of zipCodes.slice(0, 10)) { // Limit to avoid too many requests
      try {
        const zipResponse = await fetch(`/api/zip-codes/search?q=${zip}&limit=1`)
        const zipData = await zipResponse.json()
        if (zipData.results && zipData.results.length > 0) {
          delegacionesSet.add(zipData.results[0].delegacion_municipio)
        }
      } catch (error) {
        console.error(`Error fetching zip ${zip}:`, error)
      }
    }

    const delegaciones = Array.from(delegacionesSet)

    return {
      colonias: [],
      delegaciones,
      message: delegaciones.length > 0 
        ? `Zonas de servicio: ${delegaciones.join(', ')}`
        : 'Zonas de servicio configuradas'
    }
  } catch (error) {
    console.error('Error getting service area info:', error)
    return {
      colonias: [],
      delegaciones: [],
      message: 'Error al obtener información de zonas de servicio'
    }
  }
}

/**
 * Validate customer can add product to cart based on service area
 * @param {string} customerZipCode - Customer's zip code
 * @param {Object} storeInfo - Store information with service_colonias
 * @returns {Promise<Object>} Validation result with isValid and message
 */
export async function validateCartItem(customerZipCode, storeInfo) {
  if (!storeInfo || !storeInfo.service_colonias || storeInfo.service_colonias.length === 0) {
    return {
      isValid: false,
      message: 'Esta tienda no tiene zonas de servicio configuradas. No se pueden realizar pedidos.'
    }
  }

  if (!customerZipCode) {
    return {
      isValid: false,
      message: 'Por favor, agrega una dirección de envío para verificar si podemos entregar en tu zona.'
    }
  }

  try {
    const response = await fetch('/api/zip-codes/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        zipCode: customerZipCode,
        serviceColonias: storeInfo.service_colonias
      })
    })

    const data = await response.json()
    
    if (data.isValid) {
      return {
        isValid: true,
        message: null
      }
    }

    // Get service area info for error message
    const serviceAreaInfo = await getServiceAreaInfo(storeInfo.service_colonias)
    return {
      isValid: false,
      message: data.message || `Lo sentimos, no realizamos entregas a tu código postal (${customerZipCode}). ${serviceAreaInfo.message}`
    }
  } catch (error) {
    console.error('Error validating cart item:', error)
    return {
      isValid: false,
      message: 'Error al validar la zona de servicio. Por favor, intenta de nuevo.'
    }
  }
}

