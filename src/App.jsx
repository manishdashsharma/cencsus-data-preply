import { useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix for default markers in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// Icon components
const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
)

const KeyIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
  </svg>
)

const LocationIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

const DataIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
)

const LoadingSpinner = () => (
  <div className="flex items-center justify-center">
    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
    <span className="ml-2">Loading...</span>
  </div>
)

function App() {
  const [zipCode, setZipCode] = useState('')
  const [censusData, setCensusData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [coordinates, setCoordinates] = useState(null)


  const fetchCensusData = async () => {
    if (!zipCode.trim()) {
      setError('Please enter a zip code')
      return
    }

    if (!apiKey.trim()) {
      setError('Please enter your Census API key')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Fetch Census data
      const censusUrl = `https://api.census.gov/data/2023/acs/acs5/profile?get=group(DP02)&for=zip%20code%20tabulation%20area:${zipCode}&key=${apiKey}`
      const censusResponse = await fetch(censusUrl)
      
      if (!censusResponse.ok) {
        throw new Error('Failed to fetch Census data')
      }
      
      const data = await censusResponse.json()
      setCensusData(data)

      // Get coordinates for the zip code
      const geocodeUrl = `https://api.zippopotam.us/us/${zipCode}`
      try {
        const geoResponse = await fetch(geocodeUrl)
        if (geoResponse.ok) {
          const geoData = await geoResponse.json()
          setCoordinates([
            parseFloat(geoData.places[0].latitude),
            parseFloat(geoData.places[0].longitude)
          ])
        }
      } catch {
        console.log('Could not get coordinates for zip code')
        setCoordinates([39.8283, -98.5795]) // Center of US as fallback
      }

    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const formatCensusData = (data) => {
    if (!data || data.length < 2) return null
    
    const headers = data[0]
    const values = data[1]
    const formatted = {}
    
    headers.forEach((header, index) => {
      formatted[header] = values[index]
    })
    
    return formatted
  }

  const formattedData = formatCensusData(censusData)

  // Helper function to format field names
  const formatFieldName = (field) => {
    return field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  // Get key statistics for dashboard
  const getKeyStats = (data) => {
    if (!data) return null
    
    // Common demographic fields from DP02 profile
    const totalPop = data['DP02_0001E'] || 'N/A'
    const medianAge = data['DP02_0028E'] || 'N/A'
    const households = data['DP02_0001E'] || 'N/A'
    const education = data['DP02_0068PE'] || 'N/A'
    
    return { totalPop, medianAge, households, education }
  }

  const keyStats = getKeyStats(formattedData)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 text-white">
        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="text-center">
            <h1 className="text-5xl font-bold mb-4">
              🏛️ US Census Explorer
            </h1>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto">
              Discover detailed demographic insights for any US zip code using official Census Bureau data
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Search Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 border border-gray-100">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-2 flex items-center">
              <SearchIcon />
              <span className="ml-2">Search Census Data</span>
            </h2>
            <p className="text-gray-600">Enter your Census API key and zip code to get started</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5">
              <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <KeyIcon />
                <span className="ml-2">Census API Key</span>
              </label>
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 text-gray-700"
                placeholder="Enter your Census API key"
              />
            </div>
            
            <div className="lg:col-span-4">
              <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <LocationIcon />
                <span className="ml-2">Zip Code</span>
              </label>
              <input
                type="text"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 text-gray-700"
                placeholder="e.g., 10001"
                onKeyPress={(e) => e.key === 'Enter' && fetchCensusData()}
              />
            </div>
            
            <div className="lg:col-span-3 flex items-end">
              <button
                onClick={fetchCensusData}
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-200 shadow-lg flex items-center justify-center"
              >
                {loading ? <LoadingSpinner /> : (
                  <>
                    <SearchIcon />
                    <span className="ml-2">Explore</span>
                  </>
                )}
              </button>
            </div>
          </div>
          
          {error && (
            <div className="mt-4 bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-red-700 font-medium">{error}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Key Stats Dashboard */}
        {keyStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg transform hover:scale-105 transition-all duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Population</p>
                  <p className="text-2xl font-bold">{keyStats.totalPop}</p>
                </div>
                <div className="text-blue-200">👥</div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg transform hover:scale-105 transition-all duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Median Age</p>
                  <p className="text-2xl font-bold">{keyStats.medianAge}</p>
                </div>
                <div className="text-purple-200">📊</div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-6 text-white shadow-lg transform hover:scale-105 transition-all duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-indigo-100 text-sm font-medium">Households</p>
                  <p className="text-2xl font-bold">{keyStats.households}</p>
                </div>
                <div className="text-indigo-200">🏠</div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg transform hover:scale-105 transition-all duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-teal-100 text-sm font-medium">Education %</p>
                  <p className="text-2xl font-bold">{keyStats.education}</p>
                </div>
                <div className="text-teal-200">🎓</div>
              </div>
            </div>
          </div>
        )}

        {/* Map and Data Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Map Section */}
          {coordinates && (
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
              <div className="bg-gradient-to-r from-green-500 to-teal-500 p-6">
                <h2 className="text-xl font-semibold text-white flex items-center">
                  <LocationIcon />
                  <span className="ml-2">Location Map - Zip Code {zipCode}</span>
                </h2>
              </div>
              <div className="p-6">
                <div className="h-80 rounded-xl overflow-hidden border-2 border-gray-100">
                  <MapContainer 
                    center={coordinates} 
                    zoom={13} 
                    className="h-full w-full"
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker position={coordinates}>
                      <Popup>
                        <div className="text-center p-2">
                          <strong>Zip Code: {zipCode}</strong>
                          <br />
                          <small className="text-gray-600">
                            {coordinates[0].toFixed(4)}, {coordinates[1].toFixed(4)}
                          </small>
                        </div>
                      </Popup>
                    </Marker>
                  </MapContainer>
                </div>
              </div>
            </div>
          )}

          {/* Data Display Section */}
          {formattedData && (
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
              <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6">
                <h2 className="text-xl font-semibold text-white flex items-center">
                  <DataIcon />
                  <span className="ml-2">Census Data Details</span>
                </h2>
              </div>
              <div className="p-6">
                <div className="h-80 overflow-y-auto rounded-xl border border-gray-200">
                  <div className="space-y-2">
                    {Object.entries(formattedData).slice(0, 20).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center py-3 px-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-150">
                        <span className="text-sm font-medium text-gray-600 flex-1 pr-4">
                          {formatFieldName(key)}
                        </span>
                        <span className="text-sm text-gray-800 font-semibold bg-white px-3 py-1 rounded-full">
                          {value}
                        </span>
                      </div>
                    ))}
                    {Object.entries(formattedData).length > 20 && (
                      <p className="text-center text-gray-500 text-sm py-3">
                        ... and {Object.entries(formattedData).length - 20} more fields
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Instructions Card */}
        
      </div>
    </div>
  )
}

export default App
