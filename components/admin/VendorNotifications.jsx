'use client'
import { useEffect, useState } from 'react'
import { subscribeToVendorSignups } from '@/lib/supabase/realtime'
import { getVendors } from '@/lib/supabase/database'
import { Bell } from 'lucide-react'

export default function VendorNotifications() {
  const [pendingCount, setPendingCount] = useState(0)
  const [newVendors, setNewVendors] = useState([])

  useEffect(() => {
    // Load initial pending vendors
    loadPendingVendors()

    // Subscribe to new vendor signups
    const unsubscribe = subscribeToVendorSignups((newVendor) => {
      setNewVendors((prev) => [newVendor, ...prev])
      setPendingCount((prev) => prev + 1)
    })

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [])

  const loadPendingVendors = async () => {
    try {
      const vendors = await getVendors(false) // Get unapproved vendors
      setPendingCount(vendors.length)
      setNewVendors(vendors)
    } catch (error) {
      console.error('Error loading pending vendors:', error)
    }
  }

  if (pendingCount === 0) return null

  return (
    <div className="fixed top-20 right-6 z-50">
      <div className="bg-[#FFD95E] text-[#1A1A1A] px-4 py-3 rounded-2xl shadow-lg border border-[#FFD95E]/30 flex items-center gap-3 animate-pulse">
        <Bell size={20} />
        <div>
          <p className="font-semibold text-sm">
            {pendingCount} nuevo{pendingCount > 1 ? 's' : ''} vendedor{pendingCount > 1 ? 'es' : ''}
          </p>
          <p className="text-xs opacity-80">Pendiente de aprobación</p>
        </div>
        <a
          href="/admin/approve"
          className="ml-2 px-3 py-1 bg-[#1A1A1A] text-white text-xs rounded-full hover:bg-[#1A1A1A]/90 transition-colors"
        >
          Ver
        </a>
      </div>
    </div>
  )
}

