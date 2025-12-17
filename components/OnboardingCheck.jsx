'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import LocationOnboarding from './LocationOnboarding'
import { getCurrentUser } from '@/lib/supabase/auth'

export default function OnboardingCheck() {
    const [showOnboarding, setShowOnboarding] = useState(false)
    const [checked, setChecked] = useState(false)
    const router = useRouter()

    useEffect(() => {
        checkOnboarding()
    }, [])

    const checkOnboarding = async () => {
        try {
            // First check localStorage (works for both authenticated and non-authenticated users)
            const hasLocation = localStorage.getItem('user_location_set')
            const savedLocation = localStorage.getItem('user_location')
            
            if (hasLocation && savedLocation) {
                try {
                    const location = JSON.parse(savedLocation)
                    if (location.lat && location.lng) {
                        // User has location saved, no need to show onboarding
                        setChecked(true)
                        return
                    }
                } catch (e) {
                    // Invalid JSON, continue to check
                }
            }

            // If no location in localStorage, check if user is authenticated and has location on server
            const { user } = await getCurrentUser()
            if (!user) {
                // Not authenticated and no location in localStorage - show onboarding
                setShowOnboarding(true)
                setChecked(true)
                return
            }

            // User is authenticated, try to get location from server
            const { supabase } = await import('@/lib/supabase/client')
            const { data: { session } } = await supabase.auth.getSession()

            if (session?.access_token) {
                try {
                    const response = await fetch('/api/user/location', {
                        headers: {
                            'Authorization': `Bearer ${session.access_token}`,
                        },
                    })
                    
                    if (response.ok) {
                        const { data } = await response.json()
                        if (data && data.has_completed_onboarding && data.latitude && data.longitude) {
                            // User has completed onboarding and has location
                            // Also save to localStorage for consistency
                            localStorage.setItem('user_location', JSON.stringify({
                                lat: data.latitude,
                                lng: data.longitude,
                                place: data.location_place
                            }))
                            localStorage.setItem('user_location_set', 'true')
                            setChecked(true)
                            return
                        }
                    }
                } catch (error) {
                    // API call failed, but that's okay - we'll check localStorage above
                    console.warn('Could not check server location:', error?.message || 'Unknown error')
                }
            }

            // No location found anywhere - show onboarding
            setShowOnboarding(true)
        } catch (error) {
            console.warn('Error checking onboarding:', error?.message || 'Unknown error')
            // On error, show onboarding so user can set location
            setShowOnboarding(true)
        } finally {
            setChecked(true)
        }
    }

    const handleOnboardingComplete = (location) => {
        localStorage.setItem('user_location_set', 'true')
        setShowOnboarding(false)
        // Optionally redirect to nearby stores
        // router.push('/tiendas-cerca')
    }

    if (!checked) return null

    return (
        <LocationOnboarding
            isOpen={showOnboarding}
            onComplete={handleOnboardingComplete}
        />
    )
}

