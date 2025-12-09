'use client'
import { supabase } from './client'
import { ROLES } from './auth'

/**
 * Get all users (admin only - requires service role key)
 * Note: This should be called from a server action or API route in production
 */
export async function getAllUsers() {
  try {
    // Get current session to pass auth token
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return { 
        data: null, 
        error: { message: 'No estás autenticado. Por favor inicia sesión.' } 
      }
    }

    const response = await fetch('/api/admin/users', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }))
      
      if (response.status === 401) {
        return { data: null, error: { message: 'No autorizado. Verifica que tengas rol de administrador.' } }
      }
      if (response.status === 403) {
        return { data: null, error: { message: 'Acceso denegado. Necesitas ser administrador.' } }
      }
      if (response.status === 500) {
        return { data: null, error: { message: errorData.error || 'Error del servidor. Verifica la configuración.' } }
      }
      
      throw new Error(errorData.error || 'Failed to fetch users')
    }

    const result = await response.json()
    if (result.error) {
      return { data: null, error: result.error }
    }

    return { data: result.data, error: null }
  } catch (error) {
    console.error('Get users error:', error)
    return { 
      data: null, 
      error: { 
        message: error.message || 'Error al cargar usuarios. Verifica tu conexión.' 
      } 
    }
  }
}

/**
 * Update user role (admin only)
 */
export async function updateUserRole(userId, newRole) {
  try {
    if (!Object.values(ROLES).includes(newRole)) {
      return { 
        data: null, 
        error: { message: 'Rol inválido' } 
      }
    }

    // Get current session to pass auth token
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return { 
        data: null, 
        error: { message: 'No estás autenticado. Por favor inicia sesión.' } 
      }
    }

    const response = await fetch('/api/admin/users/role', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ userId, role: newRole }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }))
      
      if (response.status === 401) {
        return { data: null, error: { message: 'No autorizado' } }
      }
      if (response.status === 403) {
        return { data: null, error: { message: 'Acceso denegado. Necesitas ser administrador.' } }
      }
      
      throw new Error(errorData.error || 'Failed to update user role')
    }

    const result = await response.json()
    if (result.error) {
      return { data: null, error: result.error }
    }

    return { data: result.data, error: null }
  } catch (error) {
    console.error('Update role error:', error)
    return { 
      data: null, 
      error: { 
        message: error.message || 'Error al actualizar el rol' 
      } 
    }
  }
}

/**
 * Get user by ID
 */
export async function getUserById(userId) {
  try {
    const response = await fetch(`/api/admin/users/${userId}`, {
      method: 'GET',
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error('Failed to fetch user')
    }

    const { data, error } = await response.json()
    if (error) throw error

    return { data, error: null }
  } catch (error) {
    console.error('Get user error:', error)
    return { data: null, error }
  }
}

