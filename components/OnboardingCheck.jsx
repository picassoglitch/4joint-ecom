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
            const { user } = await getCurrentUser()
            if (!user) {
                setChecked(true)
                return
            }

            // Check if user has completed onboarding
            // Get session token for API call
            const { supabase } = await import('@/lib/supabase/client')
            const { data: { session } } = await supabase.auth.getSession()

            if (session?.access_token) {
                try {
                    const response = await fetch('/api/user/location', {
                        headers: {
                            'Authorization': `Bearer ${session.access_token}`,
                        },
                    })
                    
                    // FIX 500: Handle new response format - always returns 200
                    if (response.ok) {
                        const result = await response.json()
                        // Check if location is available and onboarding is needed
                        if (result.ok && result.data && !result.data.has_completed_onboarding) {
                            setShowOnboarding(true)
                        } else if (!result.ok || !result.data) {
                            // No location available - check localStorage as fallback
                            const hasLocation = localStorage.getItem('user_location_set')
                            if (!hasLocation) {
                                setShowOnboarding(true)
                            }
                        }
                    } else {
                        // FIX 500: Should not happen now, but handle gracefully
                        const hasLocation = localStorage.getItem('user_location_set')
                        if (!hasLocation) {
                            setShowOnboarding(true)
                        }
                    }
                } catch (fetchError) {
                    // FIX 500: Handle fetch errors gracefully
                    console.error('Error fetching location:', fetchError)
                    const hasLocation = localStorage.getItem('user_location_set')
                    if (!hasLocation) {
                        setShowOnboarding(true)
                    }
                }
            } else {
                // No session, check localStorage as fallback
                const hasLocation = localStorage.getItem('user_location_set')
                if (!hasLocation) {
                    setShowOnboarding(true)
                }
            }
        } catch (error) {
            console.error('Error checking onboarding:', error)
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

