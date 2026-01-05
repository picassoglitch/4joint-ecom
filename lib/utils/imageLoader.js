/**
 * Robust image loader utility
 * Handles images with incorrect Content-Type by converting to blob URLs
 */

/**
 * Convert an image URL to a blob URL with correct MIME type
 * This fixes issues where Supabase returns application/json instead of image/jpeg
 * 
 * @param {string} imageUrl - The image URL to load
 * @returns {Promise<string>} A blob URL with correct MIME type, or original URL if conversion fails
 */
export async function getImageBlobUrl(imageUrl) {
  if (!imageUrl || typeof imageUrl !== 'string') {
    return ''
  }

  try {
    // Fetch the image
    const response = await fetch(imageUrl, {
      method: 'GET',
      mode: 'cors',
      cache: 'default'
    })

    if (!response.ok) {
      console.warn('Image fetch failed:', response.status)
      return imageUrl // Return original URL as fallback
    }

    // Get the blob
    const blob = await response.blob()
    
    // Check if Content-Type is incorrect
    const contentType = response.headers.get('content-type') || blob.type
    
    // If it's not an image type, try to detect from blob
    if (!contentType.startsWith('image/')) {
      // Try to determine image type from file extension or blob content
      let imageType = 'image/jpeg' // Default to JPEG
      
      if (imageUrl.includes('.png')) {
        imageType = 'image/png'
      } else if (imageUrl.includes('.webp')) {
        imageType = 'image/webp'
      } else if (imageUrl.includes('.gif')) {
        imageType = 'image/gif'
      }
      
      // Create a new blob with correct MIME type
      const correctedBlob = new Blob([blob], { type: imageType })
      const blobUrl = URL.createObjectURL(correctedBlob)
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('Fixed image Content-Type:', {
          original: contentType,
          corrected: imageType,
          url: imageUrl
        })
      }
      
      return blobUrl
    }
    
    // Content-Type is correct, but create blob URL anyway for consistency
    // This also helps with CORS issues
    const blobUrl = URL.createObjectURL(blob)
    return blobUrl
    
  } catch (error) {
    console.error('Error creating blob URL:', error)
    return imageUrl // Return original URL as fallback
  }
}

/**
 * Preload an image to verify it's valid
 * @param {string} imageUrl - The image URL to verify
 * @returns {Promise<boolean>} True if image is valid, false otherwise
 */
export function preloadImage(imageUrl) {
  return new Promise((resolve) => {
    if (!imageUrl) {
      resolve(false)
      return
    }

    const img = new Image()
    img.onload = () => resolve(true)
    img.onerror = () => resolve(false)
    img.src = imageUrl
  })
}

/**
 * Clean up blob URLs to prevent memory leaks
 * @param {string} blobUrl - The blob URL to revoke
 */
export function revokeBlobUrl(blobUrl) {
  if (blobUrl && blobUrl.startsWith('blob:')) {
    URL.revokeObjectURL(blobUrl)
  }
}

