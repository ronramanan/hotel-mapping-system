import React, { useState, useEffect, useCallback } from 'react';
import { Search, CheckCircle, XCircle, MapPin, Building, Phone, Globe, AlertCircle } from 'lucide-react';

const HotelMatchingReview = () => {
  const [unmatchedHotels, setUnmatchedHotels] = useState([]);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [potentialMatches, setPotentialMatches] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    total: 41152,
    matched: 18797,
    unmatched: 22355,
    pendingReview: 0
  });
  const [filters, setFilters] = useState({
    country: '',
    city: '',
    confidence: 'all'
  });

  const API_BASE = process.env.REACT_APP_API_URL || 'https://your-api-gateway-url/prod';

  // Fetch unmatched hotels
  const fetchUnmatchedHotels = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/unmatched-hotels?limit=50`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filters)
      });
      const data = await response.json();
      setUnmatchedHotels(data.hotels || []);
      setStats(prev => ({ ...prev, ...data.stats }));
    } catch (error) {
      console.error('Error fetching unmatched hotels:', error);
    }
    setLoading(false);
  };

  // Search for potential matches
  const searchPotentialMatches = async (supplierHotel) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/potential-matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotelName: supplierHotel.hotel_name,
          city: supplierHotel.city,
          countryCode: supplierHotel.country_code,
          latitude: supplierHotel.latitude,
          longitude: supplierHotel.longitude,
          customSearch: searchQuery
        })
      });
      const data = await response.json();
      setPotentialMatches(data.matches || []);
    } catch (error) {
      console.error('Error fetching potential matches:', error);
    }
    setLoading(false);
  };

  // Manual match hotels
  const matchHotels = async (supplierHotelId, masterHotelId, confidence) => {
    try {
      const response = await fetch(`${API_BASE}/manual-match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierHotelId,
          masterHotelId,
          confidence,
          matchMethod: 'manual_review'
        })
      });
      
      if (response.ok) {
        // Remove from unmatched list
        setUnmatchedHotels(prev => prev.filter(h => h.id !== supplierHotelId));
        setSelectedHotel(null);
        setPotentialMatches([]);
        setStats(prev => ({
          ...prev,
          matched: prev.matched + 1,
          unmatched: prev.unmatched - 1
        }));
        alert('Hotels matched successfully!');
      }
    } catch (error) {
      console.error('Error matching hotels:', error);
      alert('Failed to match hotels');
    }
  };

  // Mark as no match available
  const markAsNoMatch = async (supplierHotelId) => {
    try {
      const response = await fetch(`${API_BASE}/mark-no-match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplierHotelId })
      });
      
      if (response.ok) {
        setUnmatchedHotels(prev => prev.filter(h => h.id !== supplierHotelId));
        setSelectedHotel(null);
        alert('Marked as no match available');
      }
    } catch (error) {
      console.error('Error marking no match:', error);
    }
  };

  // Calculate similarity score
  const calculateSimilarity = (supplier, master) => {
    let score = 0;
    let factors = [];
    
    // Name similarity
    const nameSim = stringSimilarity(supplier.hotel_name, master.hotel_name);
    score += nameSim * 0.4;
    if (nameSim > 0.7) factors.push(`Name: ${Math.round(nameSim * 100)}%`);
    
    // Location proximity
    if (supplier.latitude && master.latitude) {
      const distance = haversineDistance(
        supplier.latitude, supplier.longitude,
        master.latitude, master.longitude
      );
      if (distance < 0.1) {
        score += 0.3;
        factors.push('Same location');
      } else if (distance < 1) {
        score += 0.2;
        factors.push(`${distance.toFixed(1)}km away`);
      }
    }
    
    // Same city
    if (supplier.city === master.city) {
      score += 0.2;
      factors.push('Same city');
    }
    
    // Address similarity
    if (supplier.address_line1 && master.address_line1) {
      const addrSim = stringSimilarity(supplier.address_line1, master.address_line1);
      if (addrSim > 0.5) {
        score += addrSim * 0.1;
        factors.push(`Address: ${Math.round(addrSim * 100)}%`);
      }
    }
    
    return { score, factors };
  };

  // String similarity helper
  const stringSimilarity = (str1, str2) => {
    if (!str1 || !str2) return 0;
    const s1 = str1.toLowerCase().replace(/[^a-z0-9]/g, '');
    const s2 = str2.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (s1 === s2) return 1;
    
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    
    if (longer.length === 0) return 1;
    const editDistance = levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  };

  // Levenshtein distance
  const levenshteinDistance = (str1, str2) => {
    const matrix = [];
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[str2.length][str1.length];
  };

  // Haversine distance
  const haversineDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  useEffect(() => {
    fetchUnmatchedHotels();
  }, [filters]);

  useEffect(() => {
    if (selectedHotel) {
      searchPotentialMatches(selectedHotel);
    }
  }, [selectedHotel, searchQuery]);

  return (
    <div className="hotel-matching-review p-6 max-w-7xl mx-auto">
      {/* Header Stats */}
      <div className="mb-6 bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-4">Hotel Matching Review</h1>
        <div className="grid grid-cols-4 gap-4">
          <div className="stat-card bg-blue-50 p-4 rounded">
            <div className="text-sm text-gray-600">Total Supplier Hotels</div>
            <div className="text-2xl font-bold text-blue-600">{stats.total.toLocaleString()}</div>
          </div>
          <div className="stat-card bg-green-50 p-4 rounded">
            <div className="text-sm text-gray-600">Matched</div>
            <div className="text-2xl font-bold text-green-600">
              {stats.matched.toLocaleString()} ({((stats.matched / stats.total) * 100).toFixed(1)}%)
            </div>
          </div>
          <div className="stat-card bg-yellow-50 p-4 rounded">
            <div className="text-sm text-gray-600">Unmatched</div>
            <div className="text-2xl font-bold text-yellow-600">{stats.unmatched.toLocaleString()}</div>
          </div>
          <div className="stat-card bg-purple-50 p-4 rounded">
            <div className="text-sm text-gray-600">Pending Review</div>
            <div className="text-2xl font-bold text-purple-600">{stats.pendingReview.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-2 gap-6">
        {/* Left Panel - Unmatched Hotels */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold mb-3">Unmatched Supplier Hotels</h2>
            
            {/* Filters */}
            <div className="flex gap-2 mb-3">
              <select
                className="border rounded px-2 py-1 text-sm"
                value={filters.country}
                onChange={(e) => setFilters({...filters, country: e.target.value})}
              >
                <option value="">All Countries</option>
                <option value="US">United States</option>
                <option value="GB">United Kingdom</option>
                <option value="FR">France</option>
                <option value="DE">Germany</option>
                <option value="SG">Singapore</option>
              </select>
              
              <input
                type="text"
                placeholder="Filter by city..."
                className="border rounded px-2 py-1 text-sm flex-1"
                value={filters.city}
                onChange={(e) => setFilters({...filters, city: e.target.value})}
              />
              
              <button
                onClick={fetchUnmatchedHotels}
                className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
              >
                Refresh
              </button>
            </div>
          </div>
          
          <div className="overflow-auto" style={{maxHeight: '600px'}}>
            {loading && <div className="p-4 text-center">Loading...</div>}
            
            {unmatchedHotels.map((hotel) => (
              <div
                key={hotel.id}
                className={`p-4 border-b hover:bg-gray-50 cursor-pointer ${
                  selectedHotel?.id === hotel.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                }`}
                onClick={() => setSelectedHotel(hotel)}
              >
                <div className="font-semibold text-sm">{hotel.hotel_name}</div>
                <div className="text-xs text-gray-600 mt-1">
                  <div className="flex items-center gap-2">
                    <MapPin size={12} />
                    {hotel.city}, {hotel.country_code}
                  </div>
                  {hotel.address_line1 && (
                    <div className="flex items-center gap-2 mt-1">
                      <Building size={12} />
                      {hotel.address_line1}
                    </div>
                  )}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  ID: {hotel.supplier_hotel_id}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel - Potential Matches */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold mb-3">Potential Master Hotel Matches</h2>
            
            {selectedHotel && (
              <div className="mb-3">
                <div className="text-sm text-gray-600 mb-2">
                  Matching for: <span className="font-semibold">{selectedHotel.hotel_name}</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Custom search in master hotels..."
                    className="border rounded px-2 py-1 text-sm flex-1"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <button
                    onClick={() => searchPotentialMatches(selectedHotel)}
                    className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
                  >
                    <Search size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <div className="overflow-auto" style={{maxHeight: '600px'}}>
            {!selectedHotel && (
              <div className="p-8 text-center text-gray-500">
                Select a supplier hotel to see potential matches
              </div>
            )}
            
            {selectedHotel && loading && (
              <div className="p-4 text-center">Searching for matches...</div>
            )}
            
            {selectedHotel && !loading && potentialMatches.length === 0 && (
              <div className="p-8 text-center">
                <AlertCircle className="mx-auto mb-2 text-yellow-500" size={32} />
                <div className="text-gray-600">No potential matches found</div>
                <button
                  onClick={() => markAsNoMatch(selectedHotel.id)}
                  className="mt-4 bg-red-500 text-white px-4 py-2 rounded text-sm hover:bg-red-600"
                >
                  Mark as No Match Available
                </button>
              </div>
            )}
            
            {potentialMatches.map((match) => {
              const similarity = calculateSimilarity(selectedHotel, match);
              const confidenceColor = similarity.score > 0.8 ? 'green' : 
                                     similarity.score > 0.6 ? 'yellow' : 'red';
              
              return (
                <div key={match.id} className="p-4 border-b hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{match.hotel_name}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        <div className="flex items-center gap-2">
                          <MapPin size={12} />
                          {match.city}, {match.country_code}
                        </div>
                        {match.address_line1 && (
                          <div className="flex items-center gap-2 mt-1">
                            <Building size={12} />
                            {match.address_line1}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        Master ID: {match.hotel_id}
                      </div>
                      
                      {/* Similarity factors */}
                      <div className="mt-2 flex flex-wrap gap-1">
                        {similarity.factors.map((factor, idx) => (
                          <span key={idx} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            {factor}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="ml-4 text-right">
                      <div className={`text-lg font-bold text-${confidenceColor}-600`}>
                        {Math.round(similarity.score * 100)}%
                      </div>
                      <div className="text-xs text-gray-500">confidence</div>
                      
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => matchHotels(selectedHotel.id, match.id, similarity.score)}
                          className="bg-green-500 text-white p-1 rounded hover:bg-green-600"
                          title="Accept Match"
                        >
                          <CheckCircle size={20} />
                        </button>
                        <button
                          className="bg-red-500 text-white p-1 rounded hover:bg-red-600"
                          title="Reject Match"
                        >
                          <XCircle size={20} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HotelMatchingReview;
