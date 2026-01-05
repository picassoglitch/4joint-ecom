/**
 * Normalizes image sources from various formats to a valid URL string
 * Supports:
 * - Full URLs (already valid)
 * - Relative paths (e.g., "products/<id>/<file>.png")
 * - File objects (for previews)
 * - Object shapes like { url: string }
 * 
 * @param {string|File|Object|null|undefined} imageSource - The image source to normalize
 * @param {string} productId - Optional product ID for building relative paths
 * @returns {string} Normalized image URL or empty string if invalid
 */
export function normalizeImageSource(imageSource, productId = null) {
  // Return empty string for null/undefined
  if (!imageSource) {
    return ''
  }

  // Handle File objects (for previews)
  if (imageSource instanceof File) {
    try {
      return URL.createObjectURL(imageSource)
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Error creating object URL from File:', error)
      }
      return ''
    }
  }

  // Handle object shapes like { url: string }
  if (typeof imageSource === 'object' && imageSource !== null) {
    if (imageSource.url && typeof imageSource.url === 'string') {
      imageSource = imageSource.url
    } else if (imageSource.src && typeof imageSource.src === 'string') {
      imageSource = imageSource.src
    } else {
      return ''
    }
  }

  // Handle string sources
  if (typeof imageSource !== 'string') {
    return ''
  }

  // If already a full URL (starts with http:// or https://), return as-is
  if (imageSource.startsWith('http://') || imageSource.startsWith('https://')) {
    return imageSource
  }

  // If starts with /, it's a local path - return as-is
  if (imageSource.startsWith('/')) {
    return imageSource
  }

  // Otherwise, treat as relative path and build full Supabase URL
  const SUPABASE_PUBLIC_BASE = 'https://yqttcfpeebdycpyjmnrv.supabase.co/storage/v1/object/public/product-images/'
  
  // Remove leading slash if present
  let cleanPath = imageSource.startsWith('/') ? imageSource.slice(1) : imageSource
  
  // If the path already contains the bucket name, don't duplicate it
  if (cleanPath.startsWith('product-images/')) {
    cleanPath = cleanPath.replace('product-images/', '')
  }
  
  // Build full URL
  const fullUrl = `${SUPABASE_PUBLIC_BASE}${cleanPath}`
  
  // Log in development for debugging
  if (process.env.NODE_ENV !== 'production') {
    console.log('Normalized image URL:', {
      original: imageSource,
      normalized: fullUrl
    })
  }
  
  return fullUrl
}

/**
 * Gets a safe image source with fallback to placeholder
 * @param {string|File|Object|null|undefined} imageSource - The image source
 * @param {string} productId - Optional product ID
 * @param {string} fallback - Fallback image path (default: '/img/placeholder-product.svg')
 * @returns {string} Safe image URL
 */
export function getSafeImageSource(imageSource, productId = null, fallback = '/img/placeholder-product.svg') {
  const normalized = normalizeImageSource(imageSource, productId)
  return normalized || fallback
}

