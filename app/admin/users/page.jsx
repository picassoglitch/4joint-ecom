'use client'
import { useEffect, useState } from 'react'
import { getAllUsers, updateUserRole } from '@/lib/supabase/users'
import { ROLES } from '@/lib/supabase/auth'
import Loading from '@/components/Loading'
import { Users, Shield, Store, User as UserIcon, Search } from 'lucide-react'
import { toast } from 'react-hot-toast'

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [updating, setUpdating] = useState({})

  const roleLabels = {
    [ROLES.USER]: { label: 'Usuario', color: 'bg-blue-100 text-blue-800', icon: UserIcon },
    [ROLES.VENDOR]: { label: 'Vendedor', color: 'bg-[#00C6A2]/20 text-[#00C6A2]', icon: Store },
    [ROLES.ADMIN]: { label: 'Administrador', color: 'bg-[#FFD95E]/20 text-[#FFD95E]', icon: Shield },
  }

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const { data, error } = await getAllUsers()
      if (error) {
        const errorMessage = typeof error === 'string' ? error : error?.message || 'Error al cargar usuarios'
        toast.error(errorMessage)
        console.error('Error fetching users:', error)
        return
      }
      setUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error(error.message || 'Error al cargar usuarios')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleRoleChange = async (userId, newRole) => {
    setUpdating({ ...updating, [userId]: true })
    try {
      const { error } = await updateUserRole(userId, newRole)
      if (error) throw error

      toast.success('Rol actualizado exitosamente')
      // Update local state
      setUsers(users.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ))
    } catch (error) {
      console.error('Error updating role:', error)
      toast.error(error.message || 'Error al actualizar el rol')
    } finally {
      setUpdating({ ...updating, [userId]: false })
    }
  }

  const filteredUsers = users.filter(user =>
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const roleCounts = {
    [ROLES.USER]: users.filter(u => u.role === ROLES.USER).length,
    [ROLES.VENDOR]: users.filter(u => u.role === ROLES.VENDOR).length,
    [ROLES.ADMIN]: users.filter(u => u.role === ROLES.ADMIN).length,
  }

  if (loading) return <Loading />

  return (
    <div className="text-[#1A1A1A]/70 mb-28">
      <h1 className="text-2xl">Gestión de <span className="text-[#1A1A1A] font-bold">Usuarios</span></h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 my-6">
        {Object.entries(roleCounts).map(([role, count]) => {
          const roleInfo = roleLabels[role]
          const Icon = roleInfo.icon
          return (
            <div key={role} className="flex items-center gap-6 border border-[#00C6A2]/20 bg-white/80 backdrop-blur-sm p-4 px-6 rounded-2xl shadow-sm">
              <div className="flex flex-col gap-2 text-xs flex-1">
                <p className="text-[#1A1A1A]/60">{roleInfo.label}</p>
                <b className="text-2xl font-bold text-[#1A1A1A]">{count}</b>
              </div>
              <Icon size={50} className={`w-12 h-12 p-2.5 ${roleInfo.color.includes('text-') ? roleInfo.color.split('text-')[1] : 'text-[#00C6A2]'} bg-[#00C6A2]/10 rounded-full`} />
            </div>
          )
        })}
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#1A1A1A]/40" />
          <input
            type="text"
            placeholder="Buscar por email o nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-[#00C6A2]/20 rounded-xl focus:border-[#00C6A2] focus:ring-2 focus:ring-[#00C6A2]/20 outline-none transition-all bg-white/80"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white/80 backdrop-blur-sm border border-[#00C6A2]/20 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gradient-to-r from-[#00C6A2]/10 to-[#FFD95E]/10">
              <tr>
                <th className="px-6 py-4 text-left font-semibold text-[#1A1A1A]">Usuario</th>
                <th className="px-6 py-4 text-left font-semibold text-[#1A1A1A]">Email</th>
                <th className="px-6 py-4 text-left font-semibold text-[#1A1A1A]">Rol Actual</th>
                <th className="px-6 py-4 text-left font-semibold text-[#1A1A1A]">Cambiar Rol</th>
                <th className="px-6 py-4 text-left font-semibold text-[#1A1A1A]">Registrado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#00C6A2]/10">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-[#1A1A1A]/60">
                    {searchTerm ? 'No se encontraron usuarios' : 'No hay usuarios registrados'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const roleInfo = roleLabels[user.role] || roleLabels[ROLES.USER]
                  const RoleIcon = roleInfo.icon
                  return (
                    <tr key={user.id} className="hover:bg-[#00C6A2]/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#00C6A2]/20 flex items-center justify-center">
                            <Users size={20} className="text-[#00C6A2]" />
                          </div>
                          <div>
                            <p className="font-semibold text-[#1A1A1A]">{user.name}</p>
                            <p className="text-xs text-[#1A1A1A]/60">ID: {user.id.slice(0, 8)}...</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[#1A1A1A]/80">{user.email}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${roleInfo.color}`}>
                          <RoleIcon size={14} />
                          {roleInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          disabled={updating[user.id]}
                          className="px-4 py-2 border border-[#00C6A2]/20 rounded-xl focus:border-[#00C6A2] focus:ring-2 focus:ring-[#00C6A2]/20 outline-none transition-all bg-white text-[#1A1A1A] font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value={ROLES.USER}>Usuario</option>
                          <option value={ROLES.VENDOR}>Vendedor</option>
                          <option value={ROLES.ADMIN}>Administrador</option>
                        </select>
                        {updating[user.id] && (
                          <span className="ml-2 text-xs text-[#1A1A1A]/60">Actualizando...</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-[#1A1A1A]/60 text-xs">
                        {user.created_at 
                          ? new Date(user.created_at).toLocaleDateString('es-MX', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })
                          : 'N/A'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-6 bg-gradient-to-br from-[#00C6A2]/10 to-[#FFD95E]/10 border border-[#00C6A2]/20 rounded-2xl p-5">
        <h3 className="font-semibold text-[#1A1A1A] mb-2">ℹ️ Información sobre Roles</h3>
        <ul className="space-y-2 text-sm text-[#1A1A1A]/70">
          <li><strong>Usuario:</strong> Puede comprar productos y navegar la tienda</li>
          <li><strong>Vendedor:</strong> Puede crear productos, gestionar pedidos y ver su dashboard de ventas</li>
          <li><strong>Administrador:</strong> Acceso completo al panel de administración, gestión de usuarios, vendedores y configuración</li>
        </ul>
        <p className="mt-3 text-xs text-[#1A1A1A]/60">
          Los cambios de rol se aplican inmediatamente. El usuario deberá cerrar sesión y volver a iniciar para que los cambios surtan efecto completamente.
        </p>
      </div>
    </div>
  )
}

