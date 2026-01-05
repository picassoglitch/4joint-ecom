'use client'
import { useState, useEffect, useRef } from 'react'
import { Search, MapPin } from 'lucide-react'

/**
 * LocationSearch component with autocomplete suggestions
 * Uses Google Maps Places API or similar for location search
 */
export default function LocationSearch({ 
  value = '', 
  onChange, 
  placeholder = 'Buscar ubicación...',
  onLocationSelect 
}) {
  const [searchQuery, setSearchQuery] = useState(value)
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [loading, setLoading] = useState(false)
  const searchRef = useRef(null)
  const suggestionsRef = useRef(null)

  useEffect(() => {
    setSearchQuery(value)
  }, [value])

  useEffect(() => {
    // Close suggestions when clicking outside
    const handleClickOutside = (event) => {
      if (
        searchRef.current && 
        !searchRef.current.contains(event.target) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target)
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleSearch = async (query) => {
    setSearchQuery(query)
    onChange?.(query)

    if (query.length < 3) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    setLoading(true)
    setShowSuggestions(true)

    try {
      // Use Google Maps Places API or similar
      // For now, we'll use a simple geocoding approach
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=mx`
      )
      
      if (response.ok) {
        const data = await response.json()
        setSuggestions(data.map(item => ({
          displayName: item.display_name,
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon),
          address: item.display_name
        })))
      } else {
        setSuggestions([])
      }
    } catch (error) {
      console.error('Error fetching location suggestions:', error)
      setSuggestions([])
    } finally {
      setLoading(false)
    }
  }

  const handleSelectSuggestion = (suggestion) => {
    setSearchQuery(suggestion.displayName)
    setShowSuggestions(false)
    onChange?.(suggestion.displayName)
    onLocationSelect?.({
      address: suggestion.displayName,
      latitude: suggestion.lat,
      longitude: suggestion.lon
    })
  }

  return (
    <div className="relative" ref={searchRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#1A1A1A]/40" size={20} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestions(true)
            }
          }}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#00C6A2]/20 focus:border-[#00C6A2] focus:ring-2 focus:ring-[#00C6A2]/20 outline-none transition-all"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#00C6A2]"></div>
          </div>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-2 bg-white border border-[#00C6A2]/20 rounded-xl shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSelectSuggestion(suggestion)}
              className="w-full px-4 py-3 text-left hover:bg-[#00C6A2]/10 transition-colors flex items-start gap-3 border-b border-[#00C6A2]/10 last:border-b-0"
            >
              <MapPin className="text-[#00C6A2] mt-0.5 flex-shrink-0" size={18} />
              <span className="text-sm text-[#1A1A1A]">{suggestion.displayName}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

