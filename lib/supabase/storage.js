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

    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${folder}/${user.id}/${Date.now()}.${fileExt}`
    const filePath = fileName

    // Upload file
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) throw error

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath)

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


