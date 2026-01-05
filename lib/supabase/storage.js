'use client'
import { supabase } from './client'

const BUCKET_NAME = 'product-images'

/**
 * Upload image to Supabase Storage
 * @param {File} file - Image file to upload
 * @param {string} folder - Folder path in bucket (e.g., 'products')
 * @returns {Promise<string>} Public URL of uploaded image
 */
export async function uploadImage(file, folder = 'products') {
  try {
    // Get session first - try getSession
    let { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    // If no session, try to get user (this will refresh the session if needed)
    if (!session?.user) {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        // Try to refresh session one more time
        const { data: { session: refreshedSession } } = await supabase.auth.refreshSession()
        
        if (!refreshedSession?.user) {
          throw new Error('Debes iniciar sesión para subir imágenes. Por favor, inicia sesión e intenta de nuevo.')
        }
        
        session = refreshedSession
      } else {
        // User exists, create a session object
        session = { user }
      }
    }

    if (!session?.user) {
      throw new Error('Debes iniciar sesión para subir imágenes. Por favor, inicia sesión e intenta de nuevo.')
    }

    const user = session.user

    // Log file details for debugging
    if (process.env.NODE_ENV !== 'production') {
      console.log('Uploading file:', {
        name: file.name,
        type: file.type,
        size: file.size,
        isFile: file instanceof File,
        isBlob: file instanceof Blob
      })
    }

    // Verify file is actually an image
    if (!file.type || !file.type.startsWith('image/')) {
      console.error('Invalid file type:', file.type)
      // Try to fix by creating a new File with correct type
      const fixedFile = new File([file], file.name, {
        type: 'image/jpeg',
        lastModified: file.lastModified || Date.now()
      })
      console.log('Fixed file type to:', fixedFile.type)
      file = fixedFile
    }

    // Ensure we have a valid image type
    const contentType = file.type || 'image/jpeg'
    if (!contentType.startsWith('image/')) {
      throw new Error(`Invalid file type: ${contentType}. Expected an image file.`)
    }

    // Generate unique filename with correct extension based on MIME type
    let fileExt = file.name.split('.').pop()
    // If extension doesn't match MIME type, correct it
    if (contentType === 'image/jpeg' && fileExt !== 'jpg' && fileExt !== 'jpeg') {
      fileExt = 'jpg'
    } else if (contentType === 'image/png' && fileExt !== 'png') {
      fileExt = 'png'
    } else if (contentType === 'image/webp' && fileExt !== 'webp') {
      fileExt = 'webp'
    }
    
    const fileName = `${folder}/${user.id}/${Date.now()}.${fileExt}`
    const filePath = fileName

    // CRITICAL: Convert File to ArrayBuffer for Supabase Storage
    // Supabase Storage requires ArrayBuffer and explicit contentType option
    const arrayBuffer = await file.arrayBuffer()
    
    // Log upload options
    if (process.env.NODE_ENV !== 'production') {
      console.log('Upload options:', {
        filePath,
        contentType,
        fileType: file.type,
        fileName: file.name,
        arrayBufferSize: arrayBuffer.byteLength
      })
    }

    // Upload file as ArrayBuffer with explicit content type
    // Supabase Storage requires ArrayBuffer and contentType option to set correct MIME type
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, arrayBuffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: contentType // Explicitly set content type
      })

    if (error) throw error

    // Get public URL - ensure it's a complete, accessible URL
    // Don't use transform parameter - it changes the URL to /render/image/ which requires auth
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath)

    // Verify the URL is valid and complete
    if (!publicUrl || typeof publicUrl !== 'string') {
      throw new Error('No se pudo obtener la URL pública de la imagen')
    }

    // Ensure it's a full URL (should already be, but verify)
    if (!publicUrl.startsWith('http://') && !publicUrl.startsWith('https://')) {
      throw new Error(`URL de imagen inválida: ${publicUrl}`)
    }

    // Log in development for debugging
    if (process.env.NODE_ENV !== 'production') {
      console.log('Image uploaded successfully:', {
        filePath,
        publicUrl,
        fileName: file.name
      })
    }

    return publicUrl
  } catch (error) {
    console.error('Error uploading image:', error)
    throw error
  }
}

/**
 * Upload multiple images
 * @param {File[]} files - Array of image files
 * @param {string} folder - Folder path in bucket
 * @returns {Promise<string[]>} Array of public URLs
 */
export async function uploadMultipleImages(files, folder = 'products') {
  try {
    const uploadPromises = files.map(file => uploadImage(file, folder))
    const urls = await Promise.all(uploadPromises)
    return urls
  } catch (error) {
    console.error('Error uploading multiple images:', error)
    throw error
  }
}

/**
 * Delete image from Supabase Storage
 * @param {string} filePath - Path to file in storage
 */
export async function deleteImage(filePath) {
  try {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath])

    if (error) throw error
  } catch (error) {
    console.error('Error deleting image:', error)
    throw error
  }
}

/**
 * Get public URL for an image
 * @param {string} filePath - Path to file in storage
 * @returns {string} Public URL
 */
export function getImageUrl(filePath) {
  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath)
  
  return publicUrl
}

/**
 * Verify that an image URL is accessible
 * @param {string} url - Image URL to verify
 * @returns {Promise<boolean>} True if accessible, false otherwise
 */
export async function verifyImageUrl(url) {
  if (!url || typeof url !== 'string') {
    return false
  }

  try {
    // Try to fetch the image with a timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout
    
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      mode: 'cors'
    })
    
    clearTimeout(timeoutId)
    
    // Check if response is OK (status 200-299)
    return response.ok
  } catch (error) {
    // Network error or timeout - URL might not be accessible
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Image URL verification failed:', {
        url,
        error: error.message
      })
    }
    return false
  }
}

/**
 * Regenerate public URL for an image from its file path
 * Useful if the stored URL is not working
 * @param {string} filePath - Path to file in storage (e.g., "products/user-id/timestamp.jpg")
 * @returns {string} Fresh public URL
 */
export function regenerateImageUrl(filePath) {
  // Remove any leading slashes or bucket name prefixes
  let cleanPath = filePath
  if (cleanPath.startsWith('/')) {
    cleanPath = cleanPath.slice(1)
  }
  if (cleanPath.startsWith(`${BUCKET_NAME}/`)) {
    cleanPath = cleanPath.replace(`${BUCKET_NAME}/`, '')
  }
  
  // Get fresh public URL
  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(cleanPath)
  
  return publicUrl
}


