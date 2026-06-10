import { useCallback, useRef, useState } from "react"
import { geocodePlace, type MapboxFeature } from "@/lib/mapbox"

// Debounced location text input with Mapbox suggestions. Editing the text
// clears any previously selected coordinates until a suggestion is chosen.
export function useLocationAutocomplete() {
  const [location, setLocation] = useState("")
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [suggestions, setSuggestions] = useState<MapboxFeature[]>([])
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleLocationChange = useCallback((text: string) => {
    setLocation(text)
    setLatitude(null)
    setLongitude(null)
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!text.trim()) {
      setSuggestions([])
      return
    }
    timerRef.current = setTimeout(() => {
      void geocodePlace(text).then((results) => {
        setSuggestions(results.slice(0, 5))
      })
    }, 400)
  }, [])

  const selectSuggestion = useCallback((feature: MapboxFeature) => {
    setLocation(feature.place_name)
    setLatitude(feature.center[1])
    setLongitude(feature.center[0])
    setSuggestions([])
  }, [])

  // Seed values loaded from an existing person without triggering a geocode.
  const resetLocation = useCallback((value: string, lat: number | null, lng: number | null) => {
    setLocation(value)
    setLatitude(lat)
    setLongitude(lng)
    setSuggestions([])
  }, [])

  return {
    location,
    latitude,
    longitude,
    suggestions,
    handleLocationChange,
    selectSuggestion,
    resetLocation,
  }
}
