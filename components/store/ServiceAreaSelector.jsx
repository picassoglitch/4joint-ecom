'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import { Check, X, Search, RotateCcw, Eye, EyeOff, Trash2 } from 'lucide-react'

// Feature flag for new UI improvements
const ENABLE_FAST_ZONE_PICKER = true

/**
 * ServiceAreaSelector component
 * Allows store owners to select multiple colonias for their service area
 * 
 * IMPROVEMENTS (ENABLE_FAST_ZONE_PICKER):
 * - Search & Add zones with typeahead
 * - Bulk actions (Select All, Clear, View Only Selected, Undo)
 * - Grouped selected chips by delegación
 * - UTF-8 encoding support
 */
export default function ServiceAreaSelector({ 
  selectedColonias = [], 
  onChange,
  estado = 'CDMX'
}) {
  const [selectedDelegacion, setSelectedDelegacion] = useState(null)
  const [selectedDelegaciones, setSelectedDelegaciones] = useState([])
  const [localSelectedColonias, setLocalSelectedColonias] = useState(selectedColonias || [])
  const [delegaciones, setDelegaciones] = useState([])
  const [colonias, setColonias] = useState([])
  const [loadingDelegaciones, setLoadingDelegaciones] = useState(false)
  const [loadingColonias, setLoadingColonias] = useState(false)
  
  // NEW: Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchHighlightIndex, setSearchHighlightIndex] = useState(-1)
  const [showSearchResults, setShowSearchResults] = useState(false)
  const searchInputRef = useRef(null)
  const searchResultsRef = useRef(null)
  
  // NEW: View mode and undo
  const [viewOnlySelected, setViewOnlySelected] = useState(false)
  const [undoStack, setUndoStack] = useState([]) // Store previous states for undo
  const [allColoniasCache, setAllColoniasCache] = useState([]) // Cache all colonias for search
  
  // Track which delegaciones have all colonias selected
  const [delegacionesCompletas, setDelegacionesCompletas] = useState(new Set())
  const hasRestoredDelegaciones = useRef(false)
  
  // Sync local state with prop changes
  useEffect(() => {
    setLocalSelectedColonias(selectedColonias || [])
    // Reset restoration flag when selectedColonias changes externally
    if (selectedColonias && selectedColonias.length > 0) {
      hasRestoredDelegaciones.current = false
    }
  }, [selectedColonias])

  // Restore selected delegaciones based on existing colonias when component loads
  useEffect(() => {
    if (hasRestoredDelegaciones.current) return
    if (delegaciones.length === 0 || localSelectedColonias.length === 0) return
    
    const restoreDelegaciones = async () => {
      hasRestoredDelegaciones.current = true
      const restoredDelegaciones = new Set()
      
      // For each selected colonia, find its delegación
      // Use a sample of colonias to avoid too many API calls
      const sampleColonias = localSelectedColonias.slice(0, 20) // Sample first 20
      
      for (const coloniaId of sampleColonias) {
        // Extract zip code from colonia ID (format: "colonia-name-01000")
        const parts = coloniaId.split('-')
        const zip = parts[parts.length - 1]
        
        if (!/^\d{5}$/.test(zip)) continue
        
        try {
          // Fetch colonia details to get delegación
          const response = await fetch(`/api/zip-codes/search?q=${zip}&limit=1`)
          const data = await response.json()
          
          if (data.results && data.results.length > 0) {
            const delegacionName = data.results[0].delegacion_municipio
            const delegacion = delegaciones.find(d => d.name === delegacionName)
            if (delegacion) {
              restoredDelegaciones.add(delegacion.id)
            }
          }
        } catch (error) {
          console.error('Error restoring delegación:', error)
        }
      }
      
      if (restoredDelegaciones.size > 0) {
        setSelectedDelegaciones(Array.from(restoredDelegaciones))
        // Set first delegación as selected for viewing
        const firstDelegacionId = Array.from(restoredDelegaciones)[0]
        setSelectedDelegacion(firstDelegacionId)
      }
    }
    
    restoreDelegaciones()
  }, [delegaciones, localSelectedColonias])

  // Fetch delegaciones from API
  useEffect(() => {
    const fetchDelegaciones = async () => {
      setLoadingDelegaciones(true)
      try {
        const response = await fetch(`/api/zip-codes/delegaciones?estado=${estado}`)
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data = await response.json()
        if (data.error) {
          console.error('API error:', data.error)
          setDelegaciones([])
        } else {
          // Ensure UTF-8 encoding is preserved
          const delegacionesData = (data.delegaciones || []).map(d => ({
            ...d,
            name: decodeURIComponent(encodeURIComponent(d.name)) // Ensure UTF-8
          }))
          setDelegaciones(delegacionesData)
          if (process.env.NODE_ENV !== 'production') {
            console.log('Delegaciones loaded:', delegacionesData.length)
          }
        }
      } catch (error) {
        console.error('Error fetching delegaciones:', error)
        setDelegaciones([])
      } finally {
        setLoadingDelegaciones(false)
      }
    }

    fetchDelegaciones()
  }, [estado])

  // Fetch colonias when a delegacion is selected for viewing
  useEffect(() => {
    if (!selectedDelegacion) {
      setColonias([])
      return
    }

    const fetchColonias = async () => {
      setLoadingColonias(true)
      try {
        const delegacionName = delegaciones.find(d => d.id === selectedDelegacion)?.name
        if (!delegacionName) return

        const response = await fetch(
          `/api/zip-codes/colonias?delegacion=${encodeURIComponent(delegacionName)}&estado=${estado}`
        )
        const data = await response.json()
        // Ensure UTF-8 encoding
        const coloniasData = (data.colonias || []).map(c => ({
          ...c,
          name: decodeURIComponent(encodeURIComponent(c.name))
        }))
        setColonias(coloniasData)
        
        // Cache all colonias for search (with delegación info)
        if (ENABLE_FAST_ZONE_PICKER) {
          const coloniasWithDelegacion = coloniasData.map(c => ({
            ...c,
            delegacionId: selectedDelegacion,
            delegacionName: delegacionName
          }))
          setAllColoniasCache(prev => {
            // Merge, avoiding duplicates
            const existing = prev.filter(p => p.delegacionId !== selectedDelegacion)
            return [...existing, ...coloniasWithDelegacion]
          })
        }
      } catch (error) {
        console.error('Error fetching colonias:', error)
        setColonias([])
      } finally {
        setLoadingColonias(false)
      }
    }

    fetchColonias()
  }, [selectedDelegacion, delegaciones, estado])

  // When selectedDelegaciones changes, update the dropdown
  useEffect(() => {
    if (selectedDelegaciones.length > 0 && !selectedDelegacion) {
      setSelectedDelegacion(selectedDelegaciones[0])
    } else if (selectedDelegaciones.length === 0) {
      setSelectedDelegacion(null)
      setColonias([])
    } else if (selectedDelegacion && !selectedDelegaciones.includes(selectedDelegacion)) {
      setSelectedDelegacion(selectedDelegaciones[0])
    }
  }, [selectedDelegaciones])

  // NEW: Search functionality - search in cached colonias (with debounce)
  useEffect(() => {
    if (!ENABLE_FAST_ZONE_PICKER || !searchQuery.trim()) {
      setSearchResults([])
      setShowSearchResults(false)
      return
    }

    // Debounce search (200ms)
    const debounceTimer = setTimeout(() => {
      const query = searchQuery.toLowerCase().trim()
      const results = []
      
      // Search in all cached colonias
      for (const colonia of allColoniasCache) {
        const matchColonia = colonia.name.toLowerCase().includes(query)
        const matchZip = colonia.zip.includes(query)
        const matchDelegacion = colonia.delegacionName?.toLowerCase().includes(query)
        
        if (matchColonia || matchZip || matchDelegacion) {
          results.push({
            ...colonia,
            matchType: matchZip ? 'zip' : matchColonia ? 'colonia' : 'delegacion'
          })
          if (results.length >= 8) break // Max 8 results
        }
      }
      
      setSearchResults(results)
      setShowSearchResults(results.length > 0)
      setSearchHighlightIndex(-1)
    }, 200)

    return () => clearTimeout(debounceTimer)
  }, [searchQuery, allColoniasCache])

  // NEW: Save state for undo before making changes
  const saveStateForUndo = (newSelection) => {
    if (ENABLE_FAST_ZONE_PICKER) {
      setUndoStack(prev => [...prev.slice(-4), localSelectedColonias]) // Keep last 5 states
    }
    setLocalSelectedColonias(newSelection)
    onChange?.(newSelection)
  }

  // NEW: Undo last action
  const handleUndo = () => {
    if (ENABLE_FAST_ZONE_PICKER && undoStack.length > 0) {
      const previousState = undoStack[undoStack.length - 1]
      setUndoStack(prev => prev.slice(0, -1))
      setLocalSelectedColonias(previousState)
      onChange?.(previousState)
    }
  }

  // NEW: Add colonia from search
  const handleAddFromSearch = (colonia) => {
    if (localSelectedColonias.includes(colonia.id)) {
      // Already selected - show feedback but don't add
      return
    }
    // Ensure delegación is selected if not already
    if (colonia.delegacionId && !selectedDelegaciones.includes(colonia.delegacionId)) {
      setSelectedDelegaciones(prev => [...prev, colonia.delegacionId])
    }
    saveStateForUndo([...localSelectedColonias, colonia.id])
    setSearchQuery('')
    setShowSearchResults(false)
  }

  // NEW: Keyboard navigation for search
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only handle if search input is focused
      if (document.activeElement !== searchInputRef.current) return
      if (!showSearchResults || searchResults.length === 0) return
      
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSearchHighlightIndex(prev => 
          prev < searchResults.length - 1 ? prev + 1 : prev
        )
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSearchHighlightIndex(prev => prev > 0 ? prev - 1 : -1)
      } else if (e.key === 'Enter' && searchHighlightIndex >= 0) {
        e.preventDefault()
        const targetResult = searchResults[searchHighlightIndex]
        if (!localSelectedColonias.includes(targetResult.id)) {
          handleAddFromSearch(targetResult)
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        setShowSearchResults(false)
        setSearchQuery('')
        searchInputRef.current?.blur()
      }
    }
    
    if (showSearchResults) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showSearchResults, searchResults, searchHighlightIndex, localSelectedColonias])

  // NEW: Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        searchInputRef.current &&
        searchResultsRef.current &&
        !searchInputRef.current.contains(e.target) &&
        !searchResultsRef.current.contains(e.target)
      ) {
        setShowSearchResults(false)
      }
    }
    
    if (showSearchResults) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showSearchResults])

  // Fetch details for selected colonias to display
  const [selectedColoniasData, setSelectedColoniasData] = useState([])

  useEffect(() => {
    const fetchSelectedColoniasDetails = async () => {
      if (localSelectedColonias.length === 0) {
        setSelectedColoniasData([])
        return
      }

      // Extract zip codes from colonia IDs (format: "colonia-name-01000")
      const zipCodes = localSelectedColonias
        .map(coloniaId => {
          const parts = coloniaId.split('-')
          return parts[parts.length - 1]
        })
        .filter(zip => /^\d{5}$/.test(zip))

      if (zipCodes.length === 0) {
        setSelectedColoniasData([])
        return
      }

      // Fetch details for each colonia ID (not just zip codes) to handle duplicates
      const detailsPromises = localSelectedColonias.map(async (coloniaId) => {
        try {
          // Extract zip code from colonia ID (format: "colonia-name-01000")
          const parts = coloniaId.split('-')
          const zip = parts[parts.length - 1]
          
          if (!/^\d{5}$/.test(zip)) {
            return null
          }

          const response = await fetch(`/api/zip-codes/search?q=${zip}&limit=10`)
          const data = await response.json()
          
          if (data.results && data.results.length > 0) {
            // Find the result that matches the colonia ID
            // The colonia ID format is like "del-valle-centro-03100"
            // We need to match it with the colonia name from the API
            const coloniaNameFromId = coloniaId
              .split('-')
              .slice(0, -1)
              .join('-')
              .toLowerCase()
              .replace(/-/g, ' ')
            
            // Try to find exact match first
            let result = data.results.find(r => {
              const apiColoniaName = r.colonia.toLowerCase().replace(/\s+/g, '-')
              return coloniaId.toLowerCase().includes(apiColoniaName) || 
                     apiColoniaName.includes(coloniaNameFromId.replace(/-/g, ' '))
            })
            
            // If no exact match, use first result (same zip code)
            if (!result) {
              result = data.results[0]
            }
            
            return {
              id: coloniaId, // Use the original colonia ID to ensure uniqueness
              name: decodeURIComponent(encodeURIComponent(result.colonia)), // Ensure UTF-8
              zip: result.zip_code,
              delegacion: decodeURIComponent(encodeURIComponent(result.delegacion_municipio)) // Ensure UTF-8
            }
          }
          return null
        } catch (error) {
          console.error(`Error fetching colonia ${coloniaId}:`, error)
          return null
        }
      })

      const details = await Promise.all(detailsPromises)
      // Filter out nulls and ensure uniqueness by ID
      const uniqueDetails = details
        .filter(Boolean)
        .filter((colonia, index, self) => 
          index === self.findIndex(c => c.id === colonia.id)
        )
      setSelectedColoniasData(uniqueDetails)
    }

    fetchSelectedColoniasDetails()
  }, [localSelectedColonias])

  // NEW: Group selected colonias by delegación
  const groupedSelectedColonias = useMemo(() => {
    if (!ENABLE_FAST_ZONE_PICKER) return {}
    
    const grouped = {}
    selectedColoniasData.forEach(colonia => {
      const delegacion = colonia.delegacion || 'Sin delegación'
      if (!grouped[delegacion]) {
        grouped[delegacion] = []
      }
      grouped[delegacion].push(colonia)
    })
    return grouped
  }, [selectedColoniasData])

  const handleDelegacionChange = (delegacionId) => {
    setSelectedDelegacion(delegacionId)
  }

  const handleColoniaToggle = async (coloniaId) => {
    const newSelection = localSelectedColonias.includes(coloniaId)
      ? localSelectedColonias.filter(id => id !== coloniaId)
      : [...localSelectedColonias, coloniaId]
    
    saveStateForUndo(newSelection)
    
    // Check if any delegacion is now complete or incomplete after this change
    // Find which delegacion this colonia belongs to
    const colonia = colonias.find(c => c.id === coloniaId)
    if (colonia && selectedDelegacion) {
      // Check if the delegacion is now complete
      const isCompleta = await isDelegacionCompleta(selectedDelegacion)
      setDelegacionesCompletas(prev => {
        const newSet = new Set(prev)
        if (isCompleta) {
          newSet.add(selectedDelegacion)
        } else {
          newSet.delete(selectedDelegacion)
        }
        return newSet
      })
    }
  }

  const handleRemoveColonia = async (coloniaId) => {
    const newSelection = localSelectedColonias.filter(id => id !== coloniaId)
    saveStateForUndo(newSelection)
    
    // Check if any delegacion is now incomplete after removing this colonia
    // Find which delegacion this colonia belongs to
    const colonia = colonias.find(c => c.id === coloniaId)
    if (colonia && selectedDelegacion) {
      // Check if the delegacion is still complete
      const isCompleta = await isDelegacionCompleta(selectedDelegacion)
      setDelegacionesCompletas(prev => {
        const newSet = new Set(prev)
        if (isCompleta) {
          newSet.add(selectedDelegacion)
        } else {
          newSet.delete(selectedDelegacion)
        }
        return newSet
      })
    }
  }

  // NEW: Remove all colonias in a delegación
  const handleRemoveDelegacionColonias = (delegacionName) => {
    const coloniasToRemove = selectedColoniasData
      .filter(c => c.delegacion === delegacionName)
      .map(c => c.id)
    const newSelection = localSelectedColonias.filter(id => !coloniasToRemove.includes(id))
    saveStateForUndo(newSelection)
  }

  // NEW: Bulk actions
  const handleSelectAll = () => {
    const visibleColonias = viewOnlySelected 
      ? colonias.filter(c => localSelectedColonias.includes(c.id))
      : colonias
    const newSelection = [...new Set([...localSelectedColonias, ...visibleColonias.map(c => c.id)])]
    saveStateForUndo(newSelection)
  }

  const handleClear = () => {
    if (viewOnlySelected) {
      // Clear only visible (selected) items
      const visibleIds = colonias
        .filter(c => localSelectedColonias.includes(c.id))
        .map(c => c.id)
      const newSelection = localSelectedColonias.filter(id => !visibleIds.includes(id))
      saveStateForUndo(newSelection)
    } else {
      // Clear all
      saveStateForUndo([])
    }
  }

  // Filter colonias based on view mode
  const displayedColonias = useMemo(() => {
    if (!viewOnlySelected) return colonias
    return colonias.filter(c => localSelectedColonias.includes(c.id))
  }, [colonias, localSelectedColonias, viewOnlySelected])

  // Check if all colonias of a delegacion are selected
  const isDelegacionCompleta = async (delegacionId) => {
    const delegacion = delegaciones.find(d => d.id === delegacionId)
    if (!delegacion) return false

    try {
      const response = await fetch(
        `/api/zip-codes/colonias?delegacion=${encodeURIComponent(delegacion.name)}&estado=${estado}`
      )
      const data = await response.json()
      const allColonias = data.colonias || []
      
      if (allColonias.length === 0) return false
      
      // Check if all colonias are selected
      const allSelected = allColonias.every(colonia => localSelectedColonias.includes(colonia.id))
      return allSelected
    } catch (error) {
      console.error('Error checking delegacion completa:', error)
      return false
    }
  }

  // Check and update delegaciones completas when selected colonias change
  useEffect(() => {
    const checkDelegacionesCompletas = async () => {
      const newCompletas = new Set()
      
      for (const delegacionId of selectedDelegaciones) {
        const isCompleta = await isDelegacionCompleta(delegacionId)
        if (isCompleta) {
          newCompletas.add(delegacionId)
        }
      }
      
      setDelegacionesCompletas(newCompletas)
    }
    
    if (selectedDelegaciones.length > 0) {
      checkDelegacionesCompletas()
    }
  }, [localSelectedColonias, selectedDelegaciones, delegaciones, estado])

  // Select all colonias from a delegacion
  const handleSelectAllDelegacion = async (delegacionId) => {
    const delegacion = delegaciones.find(d => d.id === delegacionId)
    if (!delegacion) return

    try {
      const response = await fetch(
        `/api/zip-codes/colonias?delegacion=${encodeURIComponent(delegacion.name)}&estado=${estado}`
      )
      const data = await response.json()
      const allColonias = data.colonias || []
      
      // Add all colonia IDs to selection
      const newColoniaIds = allColonias.map(c => c.id)
      const newSelection = [...new Set([...localSelectedColonias, ...newColoniaIds])]
      
      saveStateForUndo(newSelection)
      
      // Mark delegacion as complete
      setDelegacionesCompletas(prev => new Set([...prev, delegacionId]))
      
      // Also add to selected delegaciones if not already there
      if (!selectedDelegaciones.includes(delegacionId)) {
        setSelectedDelegaciones([...selectedDelegaciones, delegacionId])
      }
    } catch (error) {
      console.error('Error selecting all delegacion:', error)
    }
  }

  // Deselect all colonias from a delegacion
  const handleDeselectAllDelegacion = async (delegacionId) => {
    const delegacion = delegaciones.find(d => d.id === delegacionId)
    if (!delegacion) return

    try {
      const response = await fetch(
        `/api/zip-codes/colonias?delegacion=${encodeURIComponent(delegacion.name)}&estado=${estado}`
      )
      const data = await response.json()
      const allColonias = data.colonias || []
      
      // Remove all colonia IDs from selection
      const coloniaIdsToRemove = allColonias.map(c => c.id)
      const newSelection = localSelectedColonias.filter(id => !coloniaIdsToRemove.includes(id))
      
      saveStateForUndo(newSelection)
      
      // Remove from complete delegaciones
      setDelegacionesCompletas(prev => {
        const newSet = new Set(prev)
        newSet.delete(delegacionId)
        return newSet
      })
    } catch (error) {
      console.error('Error deselecting all delegacion:', error)
    }
  }

  const handleDelegacionToggle = async (delegacionId) => {
    const isCurrentlySelected = selectedDelegaciones.includes(delegacionId)
    
    if (!isCurrentlySelected) {
      // Selecting a delegation - automatically select ALL colonias from it
      const delegacion = delegaciones.find(d => d.id === delegacionId)
      if (!delegacion) return
      
      try {
        // Fetch all colonias from this delegación
        const response = await fetch(
          `/api/zip-codes/colonias?delegacion=${encodeURIComponent(delegacion.name)}&estado=${estado}`
        )
        const data = await response.json()
        const allColonias = data.colonias || []
        
        // Add all colonia IDs to selection
        const newColoniaIds = allColonias.map(c => c.id)
        const newSelection = [...new Set([...localSelectedColonias, ...newColoniaIds])]
        
        // Update state
        saveStateForUndo(newSelection)
        setSelectedDelegaciones([...selectedDelegaciones, delegacionId])
        setSelectedDelegacion(delegacionId)
        
        // Mark delegación as complete
        setDelegacionesCompletas(prev => new Set([...prev, delegacionId]))
      } catch (error) {
        console.error('Error selecting delegación:', error)
        // Still add to selected delegaciones even if fetch fails
        setSelectedDelegaciones([...selectedDelegaciones, delegacionId])
        setSelectedDelegacion(delegacionId)
      }
    } else {
      // Deselecting a delegation - remove all colonias from it
      const delegacion = delegaciones.find(d => d.id === delegacionId)
      if (delegacion) {
        try {
          // Fetch all colonias from this delegación to remove them
          const response = await fetch(
            `/api/zip-codes/colonias?delegacion=${encodeURIComponent(delegacion.name)}&estado=${estado}`
          )
          const data = await response.json()
          const allColonias = data.colonias || []
          
          // Remove all colonia IDs from selection
          const coloniaIdsToRemove = allColonias.map(c => c.id)
          const newSelection = localSelectedColonias.filter(id => !coloniaIdsToRemove.includes(id))
          
          // Update state
          saveStateForUndo(newSelection)
          
          // Remove from complete delegaciones
          setDelegacionesCompletas(prev => {
            const newSet = new Set(prev)
            newSet.delete(delegacionId)
            return newSet
          })
        } catch (error) {
          console.error('Error deselecting delegación:', error)
        }
      }
      
      // Update selected delegaciones
      const newSelection = selectedDelegaciones.filter(id => id !== delegacionId)
      setSelectedDelegaciones(newSelection)
      
      if (selectedDelegacion === delegacionId) {
        if (newSelection.length > 0) {
          setSelectedDelegacion(newSelection[0])
        } else {
          setSelectedDelegacion(null)
          setColonias([])
        }
      }
    }
  }

  return (
    <div className="space-y-4">
      {/* NEW: Search & Add Zones */}
      {ENABLE_FAST_ZONE_PICKER && (
        <div className="relative">
          <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
            Buscar y Agregar Zonas
          </label>
          <div className="relative">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.trim() && setShowSearchResults(true)}
              placeholder="Buscar colonia, CP o delegación..."
              className="w-full px-4 py-3 pl-10 rounded-xl border border-[#00C6A2]/20 focus:border-[#00C6A2] focus:ring-2 focus:ring-[#00C6A2]/20 outline-none transition-all"
            />
            <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            
            {/* Search Results Dropdown */}
            {showSearchResults && searchResults.length > 0 && (
              <div
                ref={searchResultsRef}
                className="absolute z-50 w-full mt-1 bg-white border border-[#00C6A2]/20 rounded-xl shadow-lg max-h-64 overflow-y-auto"
              >
                {searchResults.map((result, idx) => {
                  const isSelected = localSelectedColonias.includes(result.id)
                  const isHighlighted = idx === searchHighlightIndex
                  return (
                    <div
                      key={result.id}
                      onClick={() => !isSelected && handleAddFromSearch(result)}
                      className={`p-3 cursor-pointer transition-colors ${
                        isHighlighted ? 'bg-[#00C6A2]/10' : 'hover:bg-[#00C6A2]/5'
                      } ${isSelected ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-[#1A1A1A]">
                            {result.name} — {result.delegacionName} ({result.zip})
                          </div>
                        </div>
                        {isSelected && (
                          <span className="text-xs text-[#00C6A2]">Ya agregada</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delegaciones Selector - Multiple Selection */}
      <div>
        <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
          Seleccionar Delegaciones (puedes seleccionar múltiples)
        </label>
        <p className="text-xs text-[#1A1A1A]/60 mb-3">
          Selecciona todas las delegaciones donde realizas entregas. Luego podrás seleccionar las colonias específicas.
        </p>
        {loadingDelegaciones ? (
          <div className="p-4 text-center text-[#1A1A1A]/60">
            Cargando delegaciones...
          </div>
        ) : delegaciones.length > 0 ? (
          <div className="max-h-60 overflow-y-auto border border-[#00C6A2]/20 rounded-xl p-3 space-y-2">
            {delegaciones.map(delegacion => {
              const isSelected = selectedDelegaciones.includes(delegacion.id)
              const isCompleta = delegacionesCompletas.has(delegacion.id)
              return (
                <div
                  key={delegacion.id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-[#00C6A2]/5 transition-colors"
                >
                  <label className="flex items-center gap-3 cursor-pointer flex-1">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleDelegacionToggle(delegacion.id)}
                      className="w-5 h-5 rounded border-[#00C6A2] text-[#00C6A2] focus:ring-[#00C6A2]"
                    />
                    <span className="text-[#1A1A1A] font-medium">{delegacion.name}</span>
                    {isCompleta && (
                      <span className="text-xs text-[#00C6A2] font-medium bg-[#00C6A2]/10 px-2 py-0.5 rounded">
                        ✓ Completa
                      </span>
                    )}
                  </label>
                  {isSelected && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (isCompleta) {
                          handleDeselectAllDelegacion(delegacion.id)
                        } else {
                          handleSelectAllDelegacion(delegacion.id)
                        }
                      }}
                      className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                        isCompleta
                          ? 'text-red-600 hover:bg-red-50'
                          : 'text-[#00C6A2] hover:bg-[#00C6A2]/10'
                      }`}
                    >
                      {isCompleta ? 'Quitar todas' : 'Seleccionar todas'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="p-4 text-center text-[#1A1A1A]/60 border border-red-200 rounded-xl bg-red-50">
            <p className="text-sm font-medium text-red-700 mb-2">
              ⚠️ No se encontraron delegaciones
            </p>
            <p className="text-xs text-red-600">
              La tabla zip_codes no tiene datos. Por favor ejecuta la migración SQL y el script de importación de códigos postales.
            </p>
          </div>
        )}
      </div>

      {/* Delegación Selector for Viewing Colonias */}
      {selectedDelegaciones.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
            Ver Colonias de Delegación
          </label>
          <select
            value={selectedDelegacion || ''}
            onChange={(e) => handleDelegacionChange(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-[#00C6A2]/20 focus:border-[#00C6A2] focus:ring-2 focus:ring-[#00C6A2]/20 outline-none transition-all"
          >
            <option value="">Selecciona una delegación para ver sus colonias...</option>
            {selectedDelegaciones.map(delegacionId => {
              const delegacion = delegaciones.find(d => d.id === delegacionId)
              return delegacion ? (
                <option key={delegacion.id} value={delegacion.id}>
                  {delegacion.name}
                </option>
              ) : null
            })}
          </select>
        </div>
      )}

      {/* NEW: Bulk Actions Bar */}
      {ENABLE_FAST_ZONE_PICKER && selectedDelegacion && colonias.length > 0 && (
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 py-2 border-b border-[#00C6A2]/20 flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleSelectAll}
            className="px-3 py-1.5 text-xs font-medium text-[#00C6A2] hover:bg-[#00C6A2]/10 rounded-lg transition-colors"
          >
            Seleccionar todo
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            Limpiar
          </button>
          <button
            type="button"
            onClick={() => setViewOnlySelected(!viewOnlySelected)}
            className="px-3 py-1.5 text-xs font-medium text-[#1A1A1A] hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1"
          >
            {viewOnlySelected ? <EyeOff size={14} /> : <Eye size={14} />}
            {viewOnlySelected ? 'Ver todas' : 'Ver solo seleccionados'}
          </button>
          {undoStack.length > 0 && (
            <button
              type="button"
              onClick={handleUndo}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1"
            >
              <RotateCcw size={14} />
              Deshacer
            </button>
          )}
        </div>
      )}

      {/* Colonias List */}
      {selectedDelegacion && (
        <div>
          <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
            Seleccionar Colonias de {delegaciones.find(d => d.id === selectedDelegacion)?.name} (puedes seleccionar múltiples)
          </label>
          {loadingColonias ? (
            <div className="p-4 text-center text-[#1A1A1A]/60">
              Cargando colonias...
            </div>
          ) : displayedColonias.length > 0 ? (
            <div className="max-h-60 overflow-y-auto border border-[#00C6A2]/20 rounded-xl p-2 space-y-2">
              {displayedColonias.map(colonia => {
                const isSelected = localSelectedColonias.includes(colonia.id)
                return (
                  <label
                    key={colonia.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#00C6A2]/5 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleColoniaToggle(colonia.id)}
                      className="w-5 h-5 rounded border-[#00C6A2] text-[#00C6A2] focus:ring-[#00C6A2]"
                    />
                    <div className="flex-1">
                      <span className="text-[#1A1A1A] font-medium">{colonia.name}</span>
                      <span className="text-[#1A1A1A]/60 text-sm ml-2">({colonia.zip})</span>
                    </div>
                  </label>
                )
              })}
            </div>
          ) : (
            <div className="p-4 text-center text-[#1A1A1A]/60">
              {viewOnlySelected 
                ? 'No hay colonias seleccionadas en esta delegación'
                : 'No se encontraron colonias para esta delegación'}
            </div>
          )}
        </div>
      )}

      {/* Selected Delegaciones Summary */}
      {selectedDelegaciones.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
            Delegaciones Seleccionadas ({selectedDelegaciones.length})
          </label>
          <div className="flex flex-wrap gap-2">
            {selectedDelegaciones.map(delegacionId => {
              const delegacion = delegaciones.find(d => d.id === delegacionId)
              if (!delegacion) return null
              return (
                <div
                  key={delegacionId}
                  className="flex items-center gap-2 px-3 py-1.5 bg-[#00C6A2]/10 border border-[#00C6A2]/30 rounded-lg"
                >
                  <span className="text-sm text-[#1A1A1A]">{delegacion.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const newSelection = selectedDelegaciones.filter(id => id !== delegacionId)
                      setSelectedDelegaciones(newSelection)
                      if (selectedDelegacion === delegacionId) {
                        if (newSelection.length > 0) {
                          setSelectedDelegacion(newSelection[0])
                        } else {
                          setSelectedDelegacion(null)
                          setColonias([])
                        }
                      }
                    }}
                    className="text-[#00C6A2] hover:text-red-500 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* NEW: Grouped Selected Colonias Summary */}
      {ENABLE_FAST_ZONE_PICKER && selectedColoniasData.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
            Zonas de Entrega Seleccionadas ({selectedColoniasData.length})
          </label>
          <div className="space-y-3">
            {Object.entries(groupedSelectedColonias).map(([delegacionName, colonias]) => {
              // Check if this delegacion is complete
              const delegacion = delegaciones.find(d => d.name === delegacionName)
              const isCompleta = delegacion && delegacionesCompletas.has(delegacion.id)
              
              return (
                <div key={delegacionName} className="border border-[#00C6A2]/20 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#1A1A1A]">{delegacionName}</span>
                      {isCompleta && (
                        <span className="text-xs text-[#00C6A2] font-medium bg-[#00C6A2]/10 px-2 py-0.5 rounded">
                          ✓ Completa ({colonias.length} colonias)
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (delegacion) {
                          if (isCompleta) {
                            handleDeselectAllDelegacion(delegacion.id)
                          } else {
                            handleRemoveDelegacionColonias(delegacionName)
                          }
                        } else {
                          handleRemoveDelegacionColonias(delegacionName)
                        }
                      }}
                      className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1"
                    >
                      <Trash2 size={14} />
                      {isCompleta ? 'Quitar delegación completa' : 'Eliminar todas'}
                    </button>
                  </div>
                  {isCompleta ? (
                    // Show compact summary for complete delegacion
                    <div className="px-3 py-2 bg-[#00C6A2]/5 rounded-lg">
                      <p className="text-sm text-[#1A1A1A]/70">
                        ✓ Toda la delegación <strong>{delegacionName}</strong> está seleccionada ({colonias.length} colonias, {new Set(colonias.map(c => c.zip)).size} códigos postales únicos)
                      </p>
                    </div>
                  ) : (
                    // Show individual colonias for incomplete delegacion
                    <div className="flex flex-wrap gap-2">
                      {colonias.map((colonia, index) => (
                        <div
                          key={`${delegacionName}-${colonia.id}-${colonia.zip}-${index}`}
                          className="flex items-center gap-2 px-3 py-1.5 bg-[#00C6A2]/10 border border-[#00C6A2]/30 rounded-lg"
                        >
                          <span className="text-sm text-[#1A1A1A]">
                            {colonia.name} ({colonia.zip})
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveColonia(colonia.id)}
                            className="text-[#00C6A2] hover:text-red-500 transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Fallback: Original Selected Colonias Summary (if feature flag disabled) */}
      {!ENABLE_FAST_ZONE_PICKER && selectedColoniasData.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
            Zonas de Entrega Seleccionadas ({selectedColoniasData.length})
          </label>
          <div className="flex flex-wrap gap-2">
            {selectedColoniasData.map(colonia => (
              <div
                key={colonia.id}
                className="flex items-center gap-2 px-3 py-1.5 bg-[#00C6A2]/10 border border-[#00C6A2]/30 rounded-lg"
              >
                <span className="text-sm text-[#1A1A1A]">
                  {colonia.name} ({colonia.delegacion})
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveColonia(colonia.id)}
                  className="text-[#00C6A2] hover:text-red-500 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedColoniasData.length === 0 && (
        <p className="text-sm text-[#1A1A1A]/60">
          No has seleccionado ninguna colonia. Los clientes no podrán realizar pedidos hasta que selecciones al menos una zona de entrega.
        </p>
      )}
    </div>
  )
}
