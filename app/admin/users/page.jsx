'use client'
import { useEffect, useState, useMemo } from 'react'
import { getAllUsers, updateUserRole, updateUserPassword } from '@/lib/supabase/users'
import { ROLES } from '@/lib/supabase/auth'
import Loading from '@/components/Loading'
import { Users, Shield, Store, User as UserIcon, Search, Trash2, Plus, X, Key, ChevronDown, ChevronUp, Filter, Download, CheckSquare, Square, ExternalLink } from 'lucide-react'
import { toast } from 'react-hot-toast'

// User status types
const USER_STATUS = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  READ_ONLY: 'read_only'
}

const STATUS_LABELS = {
  [USER_STATUS.ACTIVE]: { label: 'Activo', color: 'bg-green-100 text-green-800', icon: '✓' },
  [USER_STATUS.SUSPENDED]: { label: 'Suspendido', color: 'bg-red-100 text-red-800', icon: '⚠' },
  [USER_STATUS.READ_ONLY]: { label: 'Solo lectura', color: 'bg-gray-100 text-gray-800', icon: '🔒' },
}

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState({})
  const [deleting, setDeleting] = useState({})
  const [changingPassword, setChangingPassword] = useState({})
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState({})
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [creating, setCreating] = useState(false)
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    name: '',
    role: ROLES.USER
  })

  // NEW: Tab navigation
  const [activeTab, setActiveTab] = useState('all')
  
  // NEW: Advanced filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRoles, setSelectedRoles] = useState([])
  const [selectedStatuses, setSelectedStatuses] = useState([])
  const [storeLinkedFilter, setStoreLinkedFilter] = useState(null) // null = all, true = yes, false = no
  
  // NEW: Bulk actions
  const [selectedUserIds, setSelectedUserIds] = useState(new Set())
  const [showBulkActions, setShowBulkActions] = useState(false)
  
  // NEW: Role change confirmation
  const [showRoleConfirmModal, setShowRoleConfirmModal] = useState(null) // { userId, currentRole, newRole }
  
  // NEW: Store data cache for vendors
  const [vendorStoreData, setVendorStoreData] = useState({}) // { userId: { storeName, storeStatus, productCount, ordersCount } }

  const roleLabels = {
    [ROLES.USER]: { label: 'Usuario', color: 'bg-blue-100 text-blue-800', icon: UserIcon },
    [ROLES.VENDOR]: { label: 'Vendedor', color: 'bg-[#00C6A2]/20 text-[#00C6A2]', icon: Store },
    [ROLES.ADMIN]: { label: 'Administrador', color: 'bg-[#FFD95E]/20 text-[#FFD95E]', icon: Shield },
  }

  // Fetch users and vendor store data
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
      
      // Fetch store data for vendors
      await fetchVendorStoreData(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error(error.message || 'Error al cargar usuarios')
    } finally {
      setLoading(false)
    }
  }

  // Fetch store information for vendor users
  const fetchVendorStoreData = async (usersList) => {
    const vendorUsers = usersList.filter(u => u.role === ROLES.VENDOR)
    if (vendorUsers.length === 0) return

    try {
      const { supabase } = await import('@/lib/supabase/client')
      const { getProducts, getOrders } = await import('@/lib/supabase/database')
      
      const storeDataPromises = vendorUsers.map(async (vendor) => {
        try {
          // Get vendor store info
          const { data: vendorStore, error: storeError } = await supabase
            .from('vendors')
            .select('id, name, approved')
            .eq('id', vendor.id)
            .single()

          if (storeError || !vendorStore) {
            return { userId: vendor.id, hasStore: false }
          }

          // Get product count
          const products = await getProducts({ vendor_id: vendor.id })
          
          // Get orders count
          const orders = await getOrders({ vendor_id: vendor.id })

          return {
            userId: vendor.id,
            hasStore: true,
            storeName: vendorStore.name || 'Sin nombre',
            storeStatus: vendorStore.approved ? 'Aprobada' : 'Pendiente',
            productCount: products?.length || 0,
            ordersCount: orders?.length || 0,
          }
        } catch (error) {
          console.error(`Error fetching store data for vendor ${vendor.id}:`, error)
          return { userId: vendor.id, hasStore: false }
        }
      })

      const storeDataResults = await Promise.all(storeDataPromises)
      const storeDataMap = {}
      storeDataResults.forEach(result => {
        storeDataMap[result.userId] = result
      })
      setVendorStoreData(storeDataMap)
    } catch (error) {
      console.error('Error fetching vendor store data:', error)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  // Get user status (from user_metadata or default to active)
  const getUserStatus = (user) => {
    return user.user_metadata?.status || USER_STATUS.ACTIVE
  }

  // Filter users based on active tab and filters
  const filteredUsers = useMemo(() => {
    let filtered = users

    // Filter by tab (role)
    if (activeTab !== 'all') {
      filtered = filtered.filter(user => user.role === activeTab)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(user =>
        user.email?.toLowerCase().includes(query) ||
        user.name?.toLowerCase().includes(query)
      )
    }

    // Filter by selected roles
    if (selectedRoles.length > 0) {
      filtered = filtered.filter(user => selectedRoles.includes(user.role))
    }

    // Filter by selected statuses
    if (selectedStatuses.length > 0) {
      filtered = filtered.filter(user => selectedStatuses.includes(getUserStatus(user)))
    }

    // Filter by store linked
    if (storeLinkedFilter !== null) {
      filtered = filtered.filter(user => {
        if (user.role !== ROLES.VENDOR) return storeLinkedFilter === false
        const storeData = vendorStoreData[user.id]
        return storeLinkedFilter ? (storeData?.hasStore === true) : (storeData?.hasStore !== true)
      })
    }

    return filtered
  }, [users, activeTab, searchQuery, selectedRoles, selectedStatuses, storeLinkedFilter, vendorStoreData])

  const handleRoleChange = async (userId, newRole) => {
    setUpdating({ ...updating, [userId]: true })
    try {
      const { error } = await updateUserRole(userId, newRole)
      if (error) throw error

      toast.success('Rol actualizado exitosamente')
      // Update local state
      setUsers(users.map(user => 
        user.id === userId ? { ...user, role: newRole, user_metadata: { ...user.user_metadata, role: newRole } } : user
      ))
      
      // Close confirmation modal
      setShowRoleConfirmModal(null)
    } catch (error) {
      console.error('Error updating role:', error)
      toast.error(error.message || 'Error al actualizar el rol')
    } finally {
      setUpdating({ ...updating, [userId]: false })
    }
  }

  // Show role change confirmation
  const handleRoleChangeRequest = (userId, currentRole, newRole) => {
    if (newRole === ROLES.ADMIN || currentRole === ROLES.ADMIN) {
      setShowRoleConfirmModal({ userId, currentRole, newRole })
    } else {
      // For non-admin role changes, proceed directly
      handleRoleChange(userId, newRole)
    }
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    
    if (!newUser.email || !newUser.password) {
      toast.error('Email y contraseña son requeridos')
      return
    }

    if (newUser.password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setCreating(true)
    try {
      const { supabase } = await import('@/lib/supabase/client')
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        toast.error('Sesión no encontrada')
        return
      }

      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUser),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear el usuario')
      }

      toast.success('Usuario creado exitosamente')
      // Reset form
      setNewUser({ email: '', password: '', name: '', role: ROLES.USER })
      setShowCreateModal(false)
      // Refresh users list
      await fetchUsers()
    } catch (error) {
      console.error('Error creating user:', error)
      toast.error(error.message || 'Error al crear el usuario')
    } finally {
      setCreating(false)
    }
  }

  const handleChangePassword = async (userId, userEmail) => {
    if (!newPassword || newPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres')
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas no coinciden')
      return
    }

    setChangingPassword({ ...changingPassword, [userId]: true })
    try {
      const { error } = await updateUserPassword(userId, newPassword)
      if (error) throw error

      toast.success('Contraseña actualizada exitosamente')
      // Close modal and reset form
      setShowPasswordModal({ ...showPasswordModal, [userId]: false })
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      console.error('Error changing password:', error)
      toast.error(error.message || 'Error al actualizar la contraseña')
    } finally {
      setChangingPassword({ ...changingPassword, [userId]: false })
    }
  }

  const handleDeleteUser = async (userId, userEmail) => {
    // Confirm deletion
    const confirmed = window.confirm(
      `¿Estás seguro de que deseas eliminar al usuario "${userEmail}"?\n\n` +
      `Esta acción eliminará:\n` +
      `- El usuario y su cuenta\n` +
      `- Todos sus productos (si es vendedor)\n` +
      `- Todos sus pedidos\n` +
      `- Todo el contenido relacionado\n\n` +
      `Esta acción NO se puede deshacer.`
    )

    if (!confirmed) return

    setDeleting({ ...deleting, [userId]: true })
    try {
      const { supabase } = await import('@/lib/supabase/client')
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        toast.error('Sesión no encontrada')
        return
      }

      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al eliminar el usuario')
      }

      toast.success('Usuario eliminado exitosamente')
      // Remove from local state
      setUsers(users.filter(user => user.id !== userId))
      setSelectedUserIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(userId)
        return newSet
      })
    } catch (error) {
      console.error('Error deleting user:', error)
      toast.error(error.message || 'Error al eliminar el usuario')
    } finally {
      setDeleting({ ...deleting, [userId]: false })
    }
  }

  // Bulk actions
  const handleSelectAll = () => {
    if (selectedUserIds.size === filteredUsers.length) {
      setSelectedUserIds(new Set())
    } else {
      setSelectedUserIds(new Set(filteredUsers.map(u => u.id)))
    }
  }

  const handleToggleUserSelection = (userId) => {
    setSelectedUserIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(userId)) {
        newSet.delete(userId)
      } else {
        newSet.add(userId)
      }
      return newSet
    })
  }

  const handleBulkStatusChange = async (newStatus) => {
    if (selectedUserIds.size === 0) {
      toast.error('Selecciona al menos un usuario')
      return
    }

    const confirmed = window.confirm(
      `¿Estás seguro de cambiar el estado de ${selectedUserIds.size} usuario(s) a "${STATUS_LABELS[newStatus].label}"?`
    )

    if (!confirmed) return

    // TODO: Implement bulk status update API
    toast.info('Funcionalidad de cambio masivo de estado próximamente')
  }

  const handleExportCSV = () => {
    if (filteredUsers.length === 0) {
      toast.error('No hay usuarios para exportar')
      return
    }

    const headers = ['ID', 'Email', 'Nombre', 'Rol', 'Estado', 'Registrado', 'Último acceso']
    const rows = filteredUsers.map(user => [
      user.id,
      user.email,
      user.name || '',
      roleLabels[user.role]?.label || user.role,
      STATUS_LABELS[getUserStatus(user)]?.label || 'Activo',
      user.created_at ? new Date(user.created_at).toLocaleDateString('es-MX') : '',
      user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString('es-MX') : '',
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `usuarios_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast.success('CSV exportado exitosamente')
  }

  const roleCounts = {
    [ROLES.USER]: users.filter(u => u.role === ROLES.USER).length,
    [ROLES.VENDOR]: users.filter(u => u.role === ROLES.VENDOR).length,
    [ROLES.ADMIN]: users.filter(u => u.role === ROLES.ADMIN).length,
  }

  if (loading) return <Loading />

  return (
    <div className="text-[#1A1A1A]/70 mb-28">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl">Gestión de <span className="text-[#1A1A1A] font-bold">Usuarios</span></h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-[#00C6A2] hover:bg-[#00B894] text-white rounded-xl font-semibold transition-all hover:scale-105 active:scale-95 shadow-lg"
        >
          <Plus size={20} />
          Crear Usuario
        </button>
      </div>

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

      {/* Tab Navigation */}
      <div className="mb-6 border-b border-[#00C6A2]/20">
        <div className="flex gap-2">
          <button
            onClick={() => {
              setActiveTab('all')
              setSelectedUserIds(new Set())
            }}
            className={`px-6 py-3 font-medium transition-colors border-b-2 ${
              activeTab === 'all'
                ? 'border-[#00C6A2] text-[#00C6A2]'
                : 'border-transparent text-[#1A1A1A]/60 hover:text-[#1A1A1A]'
            }`}
          >
            Todos ({users.length})
          </button>
          <button
            onClick={() => {
              setActiveTab(ROLES.USER)
              setSelectedUserIds(new Set())
            }}
            className={`px-6 py-3 font-medium transition-colors border-b-2 ${
              activeTab === ROLES.USER
                ? 'border-[#00C6A2] text-[#00C6A2]'
                : 'border-transparent text-[#1A1A1A]/60 hover:text-[#1A1A1A]'
            }`}
          >
            Clientes ({roleCounts[ROLES.USER]})
          </button>
          <button
            onClick={() => {
              setActiveTab(ROLES.VENDOR)
              setSelectedUserIds(new Set())
            }}
            className={`px-6 py-3 font-medium transition-colors border-b-2 ${
              activeTab === ROLES.VENDOR
                ? 'border-[#00C6A2] text-[#00C6A2]'
                : 'border-transparent text-[#1A1A1A]/60 hover:text-[#1A1A1A]'
            }`}
          >
            Tiendas ({roleCounts[ROLES.VENDOR]})
          </button>
          <button
            onClick={() => {
              setActiveTab(ROLES.ADMIN)
              setSelectedUserIds(new Set())
            }}
            className={`px-6 py-3 font-medium transition-colors border-b-2 ${
              activeTab === ROLES.ADMIN
                ? 'border-[#00C6A2] text-[#00C6A2]'
                : 'border-transparent text-[#1A1A1A]/60 hover:text-[#1A1A1A]'
            }`}
          >
            Administradores ({roleCounts[ROLES.ADMIN]})
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#1A1A1A]/40" />
            <input
              type="text"
              placeholder="Buscar por email o nombre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-[#00C6A2]/20 rounded-xl focus:border-[#00C6A2] focus:ring-2 focus:ring-[#00C6A2]/20 outline-none transition-all bg-white/80"
            />
          </div>
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`flex items-center gap-2 px-4 py-3 border border-[#00C6A2]/20 rounded-xl transition-all ${
              showAdvancedFilters ? 'bg-[#00C6A2]/10 border-[#00C6A2]' : 'bg-white/80 hover:bg-[#00C6A2]/5'
            }`}
          >
            <Filter size={18} />
            Filtros
            {showAdvancedFilters ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>

        {/* Advanced Filters Panel */}
        {showAdvancedFilters && (
          <div className="bg-white/80 border border-[#00C6A2]/20 rounded-xl p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Role Filter */}
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Rol</label>
                <div className="space-y-2">
                  {Object.entries(roleLabels).map(([role, info]) => (
                    <label key={role} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedRoles.includes(role)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRoles([...selectedRoles, role])
                          } else {
                            setSelectedRoles(selectedRoles.filter(r => r !== role))
                          }
                        }}
                        className="w-4 h-4 rounded border-[#00C6A2] text-[#00C6A2] focus:ring-[#00C6A2]"
                      />
                      <span className="text-sm text-[#1A1A1A]">{info.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Estado</label>
                <div className="space-y-2">
                  {Object.entries(STATUS_LABELS).map(([status, info]) => (
                    <label key={status} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedStatuses.includes(status)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStatuses([...selectedStatuses, status])
                          } else {
                            setSelectedStatuses(selectedStatuses.filter(s => s !== status))
                          }
                        }}
                        className="w-4 h-4 rounded border-[#00C6A2] text-[#00C6A2] focus:ring-[#00C6A2]"
                      />
                      <span className="text-sm text-[#1A1A1A]">{info.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Store Linked Filter */}
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Tienda vinculada</label>
                <select
                  value={storeLinkedFilter === null ? 'all' : storeLinkedFilter ? 'yes' : 'no'}
                  onChange={(e) => {
                    const value = e.target.value
                    setStoreLinkedFilter(value === 'all' ? null : value === 'yes')
                  }}
                  className="w-full px-4 py-2 border border-[#00C6A2]/20 rounded-xl focus:border-[#00C6A2] focus:ring-2 focus:ring-[#00C6A2]/20 outline-none transition-all bg-white"
                >
                  <option value="all">Todas</option>
                  <option value="yes">Sí</option>
                  <option value="no">No</option>
                </select>
              </div>
            </div>

            {/* Clear Filters */}
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setSelectedRoles([])
                  setSelectedStatuses([])
                  setStoreLinkedFilter(null)
                }}
                className="px-4 py-2 text-sm text-[#1A1A1A]/60 hover:text-[#1A1A1A] transition-colors"
              >
                Limpiar filtros
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Actions Bar */}
      {selectedUserIds.size > 0 && (
        <div className="mb-4 bg-[#00C6A2]/10 border border-[#00C6A2]/20 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-[#1A1A1A]">
              {selectedUserIds.size} usuario(s) seleccionado(s)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 bg-white border border-[#00C6A2]/20 rounded-lg hover:bg-[#00C6A2]/10 transition-colors flex items-center gap-2 text-sm"
            >
              <Download size={16} />
              Exportar CSV
            </button>
            <button
              onClick={() => setSelectedUserIds(new Set())}
              className="px-4 py-2 text-sm text-[#1A1A1A]/60 hover:text-[#1A1A1A] transition-colors"
            >
              Deseleccionar todo
            </button>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white/80 backdrop-blur-sm border border-[#00C6A2]/20 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gradient-to-r from-[#00C6A2]/10 to-[#FFD95E]/10">
              <tr>
                <th className="px-6 py-4 text-left">
                  <button
                    onClick={handleSelectAll}
                    className="flex items-center justify-center"
                    title="Seleccionar todos"
                  >
                    {selectedUserIds.size === filteredUsers.length && filteredUsers.length > 0 ? (
                      <CheckSquare size={18} className="text-[#00C6A2]" />
                    ) : (
                      <Square size={18} className="text-[#1A1A1A]/40" />
                    )}
                  </button>
                </th>
                <th className="px-6 py-4 text-left font-semibold text-[#1A1A1A]">Usuario</th>
                <th className="px-6 py-4 text-left font-semibold text-[#1A1A1A]">Email</th>
                <th className="px-6 py-4 text-left font-semibold text-[#1A1A1A]">Rol</th>
                {activeTab === ROLES.VENDOR && (
                  <th className="px-6 py-4 text-left font-semibold text-[#1A1A1A]">Tienda</th>
                )}
                <th className="px-6 py-4 text-left font-semibold text-[#1A1A1A]">Estado</th>
                <th className="px-6 py-4 text-left font-semibold text-[#1A1A1A]">Cambiar Rol</th>
                <th className="px-6 py-4 text-left font-semibold text-[#1A1A1A]">Registrado</th>
                <th className="px-6 py-4 text-left font-semibold text-[#1A1A1A]">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#00C6A2]/10">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={activeTab === ROLES.VENDOR ? 9 : 8} className="px-6 py-8 text-center text-[#1A1A1A]/60">
                    {searchQuery || selectedRoles.length > 0 || selectedStatuses.length > 0 || storeLinkedFilter !== null
                      ? 'No se encontraron usuarios con los filtros aplicados'
                      : 'No hay usuarios registrados'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const roleInfo = roleLabels[user.role] || roleLabels[ROLES.USER]
                  const RoleIcon = roleInfo.icon
                  const userStatus = getUserStatus(user)
                  const statusInfo = STATUS_LABELS[userStatus] || STATUS_LABELS[USER_STATUS.ACTIVE]
                  const storeData = vendorStoreData[user.id]
                  const isSelected = selectedUserIds.has(user.id)

                  return (
                    <tr key={user.id} className={`hover:bg-[#00C6A2]/5 transition-colors ${isSelected ? 'bg-[#00C6A2]/10' : ''}`}>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleUserSelection(user.id)}
                          className="flex items-center justify-center"
                        >
                          {isSelected ? (
                            <CheckSquare size={18} className="text-[#00C6A2]" />
                          ) : (
                            <Square size={18} className="text-[#1A1A1A]/40" />
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#00C6A2]/20 flex items-center justify-center">
                            <Users size={20} className="text-[#00C6A2]" />
                          </div>
                          <div>
                            <p className="font-semibold text-[#1A1A1A]">{user.name || 'Sin nombre'}</p>
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
                      {activeTab === ROLES.VENDOR && (
                        <td className="px-6 py-4">
                          {storeData?.hasStore ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-[#1A1A1A]">{storeData.storeName}</span>
                                <a
                                  href={`/admin/approve`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#00C6A2] hover:text-[#00B894]"
                                  title="Ver tienda"
                                >
                                  <ExternalLink size={14} />
                                </a>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-[#1A1A1A]/60">
                                <span className={`px-2 py-0.5 rounded ${storeData.storeStatus === 'Aprobada' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                  {storeData.storeStatus}
                                </span>
                                <span>{storeData.productCount} productos</span>
                                <span>{storeData.ordersCount} pedidos</span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-[#1A1A1A]/40">Sin tienda</span>
                          )}
                        </td>
                      )}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold ${statusInfo.color}`}>
                          <span>{statusInfo.icon}</span>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChangeRequest(user.id, user.role, e.target.value)}
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
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setShowPasswordModal({ ...showPasswordModal, [user.id]: true })}
                            className="px-4 py-2 bg-[#00C6A2] hover:bg-[#00B894] text-white rounded-lg font-semibold transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                            title="Cambiar contraseña"
                          >
                            <Key size={16} />
                            Contraseña
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id, user.email)}
                            disabled={deleting[user.id]}
                            className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white rounded-lg font-semibold transition-all hover:scale-105 active:scale-95 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            <Trash2 size={16} />
                            {deleting[user.id] ? 'Eliminando...' : 'Eliminar'}
                          </button>
                        </div>
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

      {/* Role Change Confirmation Modal */}
      {showRoleConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A1A]/50 backdrop-blur-sm">
          <div className="bg-[#FAFAF6] rounded-2xl p-6 md:p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-[#1A1A1A]">Confirmar Cambio de Rol</h2>
              <button
                onClick={() => setShowRoleConfirmModal(null)}
                className="p-2 hover:bg-[#1A1A1A]/10 rounded-full transition-colors"
              >
                <X size={24} className="text-[#1A1A1A]/60" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800 font-medium mb-2">⚠️ Cambio de rol de administrador</p>
                <p className="text-xs text-yellow-700">
                  Estás a punto de cambiar el rol de un usuario a/desde <strong>Administrador</strong>.
                  Esta acción otorga/quita acceso completo al panel de administración.
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-[#1A1A1A]/70">
                  <strong>Rol actual:</strong> {roleLabels[showRoleConfirmModal.currentRole]?.label || showRoleConfirmModal.currentRole}
                </p>
                <p className="text-sm text-[#1A1A1A]/70">
                  <strong>Nuevo rol:</strong> {roleLabels[showRoleConfirmModal.newRole]?.label || showRoleConfirmModal.newRole}
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowRoleConfirmModal(null)}
                  className="flex-1 px-6 py-3 bg-[#1A1A1A]/10 hover:bg-[#1A1A1A]/20 text-[#1A1A1A] rounded-xl font-semibold transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleRoleChange(showRoleConfirmModal.userId, showRoleConfirmModal.newRole)}
                  disabled={updating[showRoleConfirmModal.userId]}
                  className="flex-1 px-6 py-3 bg-[#00C6A2] hover:bg-[#00B894] disabled:bg-[#00C6A2]/50 text-white rounded-xl font-semibold transition-all disabled:cursor-not-allowed"
                >
                  {updating[showRoleConfirmModal.userId] ? 'Actualizando...' : 'Confirmar Cambio'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A1A]/50 backdrop-blur-sm">
          <div className="bg-[#FAFAF6] rounded-2xl p-6 md:p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-[#1A1A1A]">Crear Nuevo Usuario</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setNewUser({ email: '', password: '', name: '', role: ROLES.USER })
                }}
                className="p-2 hover:bg-[#1A1A1A]/10 rounded-full transition-colors"
              >
                <X size={24} className="text-[#1A1A1A]/60" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-[#00C6A2]/20 rounded-xl focus:border-[#00C6A2] focus:ring-2 focus:ring-[#00C6A2]/20 outline-none transition-all bg-white"
                  placeholder="usuario@ejemplo.com"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                  Contraseña * (mínimo 6 caracteres)
                </label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 border border-[#00C6A2]/20 rounded-xl focus:border-[#00C6A2] focus:ring-2 focus:ring-[#00C6A2]/20 outline-none transition-all bg-white"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                  Nombre (opcional)
                </label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="w-full px-4 py-3 border border-[#00C6A2]/20 rounded-xl focus:border-[#00C6A2] focus:ring-2 focus:ring-[#00C6A2]/20 outline-none transition-all bg-white"
                  placeholder="Nombre del usuario"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                  Rol
                </label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full px-4 py-3 border border-[#00C6A2]/20 rounded-xl focus:border-[#00C6A2] focus:ring-2 focus:ring-[#00C6A2]/20 outline-none transition-all bg-white text-[#1A1A1A] font-medium"
                >
                  <option value={ROLES.USER}>Usuario</option>
                  <option value={ROLES.VENDOR}>Vendedor</option>
                  <option value={ROLES.ADMIN}>Administrador</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false)
                    setNewUser({ email: '', password: '', name: '', role: ROLES.USER })
                  }}
                  className="flex-1 px-6 py-3 bg-[#1A1A1A]/10 hover:bg-[#1A1A1A]/20 text-[#1A1A1A] rounded-xl font-semibold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-6 py-3 bg-[#00C6A2] hover:bg-[#00B894] disabled:bg-[#00C6A2]/50 text-white rounded-xl font-semibold transition-all disabled:cursor-not-allowed"
                >
                  {creating ? 'Creando...' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {Object.keys(showPasswordModal).map(userId => {
        if (!showPasswordModal[userId]) return null
        const user = users.find(u => u.id === userId)
        if (!user) return null

        return (
          <div key={userId} className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A1A]/50 backdrop-blur-sm">
            <div className="bg-[#FAFAF6] rounded-2xl p-6 md:p-8 max-w-md w-full mx-4 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-[#1A1A1A]">Cambiar Contraseña</h2>
                <button
                  onClick={() => {
                    setShowPasswordModal({ ...showPasswordModal, [userId]: false })
                    setNewPassword('')
                    setConfirmPassword('')
                  }}
                  className="p-2 hover:bg-[#1A1A1A]/10 rounded-full transition-colors"
                >
                  <X size={24} className="text-[#1A1A1A]/60" />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-sm text-[#1A1A1A]/70">
                  Cambiando contraseña para: <strong>{user.email}</strong>
                </p>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault()
                handleChangePassword(userId, user.email)
              }} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                    Nueva Contraseña * (mínimo 6 caracteres)
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full px-4 py-3 border border-[#00C6A2]/20 rounded-xl focus:border-[#00C6A2] focus:ring-2 focus:ring-[#00C6A2]/20 outline-none transition-all bg-white"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                    Confirmar Contraseña *
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full px-4 py-3 border border-[#00C6A2]/20 rounded-xl focus:border-[#00C6A2] focus:ring-2 focus:ring-[#00C6A2]/20 outline-none transition-all bg-white"
                    placeholder="••••••••"
                  />
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4">
                  <p className="text-xs text-yellow-800">
                    ⚠️ <strong>Importante:</strong> El usuario necesitará usar esta nueva contraseña para iniciar sesión. 
                    Se recomienda notificar al usuario sobre el cambio.
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordModal({ ...showPasswordModal, [userId]: false })
                      setNewPassword('')
                      setConfirmPassword('')
                    }}
                    className="flex-1 px-6 py-3 bg-[#1A1A1A]/10 hover:bg-[#1A1A1A]/20 text-[#1A1A1A] rounded-xl font-semibold transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={changingPassword[userId] || !newPassword || newPassword.length < 6 || newPassword !== confirmPassword}
                    className="flex-1 px-6 py-3 bg-[#00C6A2] hover:bg-[#00B894] disabled:bg-[#00C6A2]/50 text-white rounded-xl font-semibold transition-all disabled:cursor-not-allowed"
                  >
                    {changingPassword[userId] ? 'Cambiando...' : 'Cambiar Contraseña'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      })}
    </div>
  )
}
