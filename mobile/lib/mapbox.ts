const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? ""

export type MapboxFeature = {
  place_name: string
  center: [number, number]
}

export async function geocodePlace(query: string): Promise<MapboxFeature[]> {
  if (!MAPBOX_TOKEN || !query.trim()) return []
  try {
    const encoded = encodeURIComponent(query.trim())
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?access_token=${MAPBOX_TOKEN}&types=place,locality,neighborhood`
    const response = await fetch(url)
    if (!response.ok) return []
    const data = (await response.json()) as { features?: MapboxFeature[] }
    return data.features ?? []
  } catch {
    return []
  }
}
