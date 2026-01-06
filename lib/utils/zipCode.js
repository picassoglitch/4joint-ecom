/**
 * Normalize zip code to a 5-character string with leading zeros
 * Handles: "3310" -> "03310", "03310" -> "03310", 3310 -> "03310"
 * @param {string|number} zip - Zip code to normalize
 * @returns {string|null} - Normalized 5-character zip code or null if invalid
 */
export function normalizeZip(zip) {
  if (!zip) return null
  
  // Convert to string and remove whitespace
  let zipStr = String(zip).trim().replace(/\s+/g, '')
  
  // Remove non-digit characters (except if it's a full string like "santa-cruz-atoyac-03310")
  // Extract just the numeric part if it contains other characters
  const numericMatch = zipStr.match(/(\d{4,5})/)
  if (numericMatch) {
    zipStr = numericMatch[1]
  }
  
  // Must be 4-5 digits
  if (!/^\d{4,5}$/.test(zipStr)) {
    return null
  }
  
  // Pad to 5 digits with leading zeros
  return zipStr.padStart(5, '0')
}

/**
 * Extract zip code from colonia ID format: "santa-cruz-atoyac-03310" -> "03310"
 * Also handles formats like: "03310", 3310, "(03310)", etc.
 * @param {string} coloniaId - Colonia ID or zip code string
 * @returns {string|null} - Normalized zip code or null
 */
export function extractZipFromColoniaId(coloniaId) {
  if (!coloniaId) return null
  
  const str = String(coloniaId)
  
  // Try to extract from format "colonia-name-03310" (last 5 digits after last hyphen)
  const hyphenMatch = str.match(/-(\d{5})$/)
  if (hyphenMatch) {
    return normalizeZip(hyphenMatch[1])
  }
  
  // Try to extract from format "(03310)" in parentheses
  const parenMatch = str.match(/\((\d{4,5})\)/)
  if (parenMatch) {
    return normalizeZip(parenMatch[1])
  }
  
  // If it's just a 4-5 digit number, normalize it
  if (/^\d{4,5}$/.test(str)) {
    return normalizeZip(str)
  }
  
  // Try to find any 4-5 digit sequence
  const anyMatch = str.match(/(\d{4,5})/)
  if (anyMatch) {
    return normalizeZip(anyMatch[1])
  }
  
  return null
}

/**
 * Check if a zip code matches any of the service colonias
 * Handles multiple formats: arrays, strings, objects, numbers
 * @param {string} userZip - User's normalized zip code
 * @param {any} serviceColonias - Service colonias from vendor (array, string, object, etc.)
 * @returns {boolean} - True if zip code matches
 */
export function isZipInServiceArea(userZip, serviceColonias) {
  if (!userZip) return false
  
  const normalizedUserZip = normalizeZip(userZip)
  if (!normalizedUserZip) return false
  
  if (!serviceColonias) return false
  
  // Handle string format (JSON string)
  let colonias = serviceColonias
  if (typeof serviceColonias === 'string') {
    try {
      colonias = JSON.parse(serviceColonias)
    } catch (e) {
      // If not JSON, treat as single colonia ID
      const extracted = extractZipFromColoniaId(serviceColonias)
      return extracted === normalizedUserZip
    }
  }
  
  // Handle array format
  if (Array.isArray(colonias)) {
    for (const item of colonias) {
      let extractedZip = null
      
      // Item might be a string colonia ID: "santa-cruz-atoyac-03310"
      if (typeof item === 'string') {
        extractedZip = extractZipFromColoniaId(item)
      }
      // Item might be an object: { cp: "03310" } or { zip: "03310" } or { colonia: "...", zip: "03310" }
      else if (typeof item === 'object' && item !== null) {
        extractedZip = normalizeZip(item.cp || item.zip || item.zip_code || item.postcode)
      }
      // Item might be a number: 3310
      else if (typeof item === 'number') {
        extractedZip = normalizeZip(item)
      }
      
      if (extractedZip === normalizedUserZip) {
        return true
      }
    }
    return false
  }
  
  // Handle object format: { cp: "03310" } or { zip: "03310" }
  if (typeof colonias === 'object' && colonias !== null) {
    const extractedZip = normalizeZip(colonias.cp || colonias.zip || colonias.zip_code || colonias.postcode)
    return extractedZip === normalizedUserZip
  }
  
  // Handle number format: 3310
  if (typeof colonias === 'number') {
    const extractedZip = normalizeZip(colonias)
    return extractedZip === normalizedUserZip
  }
  
  return false
}





