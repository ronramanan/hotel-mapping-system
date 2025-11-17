import React, { useState, useEffect } from 'react';
import { Search, CheckCircle, XCircle, MapPin, Building, AlertCircle } from 'lucide-react';

const HotelMatchingReview = () => {
  const [unmatchedHotels, setUnmatchedHotels] = useState([]);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [potentialMatches, setPotentialMatches] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    matched: 0,
    unmatched: 0
  });
  const [filters, setFilters] = useState({
    country: '',
    city: '',
    confidence: 'all'
  });
  const [connectionStatus, setConnectionStatus] = useState('checking'); // checking, connected, failed, no-api
  const [errorMessage, setErrorMessage] = useState('');

  const API_BASE = process.env.REACT_APP_API_URL || process.env.REACT_APP_API_ENDPOINT || '';

  // Mock data for development
  const mockUnmatchedHotels = [
    {
      id: 1,
      supplier_hotel_id: 'SUP001-H001',
      hotel_name: 'Grand Plaza Hotel & Suites',
      city: 'London',
      country_code: 'GB',
      address_line1: '123 Oxford Street',
      latitude: 51.5074,
      longitude: -0.1278
    },
    {
      id: 2,
      supplier_hotel_id: 'SUP001-H002',
      hotel_name: 'Park View Inn',
      city: 'Manchester',
      country_code: 'GB',
      address_line1: '45 Market Street',
      latitude: 53.4808,
      longitude: -2.2426
    },
    {
      id: 3,
      supplier_hotel_id: 'SUP002-H001',
      hotel_name: 'Riverside Hotel & Spa',
      city: 'Edinburgh',
      country_code: 'GB',
      address_line1: '12 Princes Street',
      latitude: 55.9533,
      longitude: -3.1883
    }
  ];

  const mockMasterHotels = [
    {
      id: 101,
      hotel_id: 'MASTER-001',
      hotel_name: 'Grand Plaza Hotel',
      city: 'London',
      country_code: 'GB',
      address_line1: '123 Oxford St',
      latitude: 51.5075,
      longitude: -0.1279
    },
    {
      id: 102,
      hotel_id: 'MASTER-002',
      hotel_name: 'Park View Hotel',
      city: 'Manchester',
      country_code: 'GB',
      address_line1: '47 Market Street',
      latitude: 53.4809,
      longitude: -2.2427
    }
  ];

  // Fetch unmatched hotels
  const fetchUnmatchedHotels = async () => {
    setLoading(true);
    setErrorMessage('');
    
    // Check if API is configured
    if (!API_BASE) {
      console.error('❌ No API endpoint configured!');
      console.error('Please set REACT_APP_API_ENDPOINT or REACT_APP_API_URL environment variable');
      setConnectionStatus('no-api');
      setErrorMessage('No API endpoint configured. Please set environment variables in Amplify.');
      setLoading(false);
      return;
    }

    console.log('🔌 API Configured:', API_BASE);
    console.log('📡 Fetching unmatched hotels from:', `${API_BASE}/unmatched-hotels`);
    
    try {
      const url = `${API_BASE}/unmatched-hotels?limit=50`;
      console.log('🌐 Making request to:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(filters)
      });
      
      console.log('📥 Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error Response:', errorText);
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✅ Successfully received data:', data);
      console.log('📊 Hotels count:', data.hotels?.length || 0);
      console.log('📈 Stats:', data.stats);
      
      setUnmatchedHotels(data.hotels || []);
      if (data.stats) {
        setStats(prev => ({ ...prev, ...data.stats }));
      }
      setConnectionStatus('connected');
      
      if (data.hotels?.length === 0) {
        setErrorMessage('No unmatched hotels found. All hotels may be already matched.');
      }
      
    } catch (error) {
      console.error('❌ Error fetching unmatched hotels:', error);
      console.error('Error details:', error.message);
      
      // Check if it's a CORS error
      if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
        setConnectionStatus('failed');
        setErrorMessage(`
          CORS Error: Your API is blocking requests from this domain.
          
          API: ${API_BASE}
          Frontend: ${window.location.origin}
          
          Fix: Enable CORS in AWS API Gateway for origin: ${window.location.origin}
          
          See FIX_CORS_ERROR.md for detailed instructions.
        `);
      } else {
        setConnectionStatus('failed');
        setErrorMessage(`Failed to connect to API: ${error.message}`);
      }
      setUnmatchedHotels([]);
    }
    setLoading(false);
  };

  // Search for potential matches
  const searchPotentialMatches = async (supplierHotel) => {
    setLoading(true);
    setErrorMessage('');
    
    // Check if API is configured
    if (!API_BASE) {
      console.error('❌ No API endpoint configured!');
      setErrorMessage('Cannot search matches - no API endpoint configured');
      setLoading(false);
      return;
    }

    console.log('🔍 Searching potential matches for:', supplierHotel.hotel_name);
    console.log('📡 API endpoint:', `${API_BASE}/potential-matches`);
    
    try {
      const requestBody = {
        hotelName: supplierHotel.hotel_name,
        city: supplierHotel.city,
        countryCode: supplierHotel.country_code,
        latitude: supplierHotel.latitude,
        longitude: supplierHotel.longitude,
        customSearch: searchQuery
      };
      console.log('📤 Request body:', requestBody);
      
      const response = await fetch(`${API_BASE}/potential-matches`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      console.log('📥 Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error Response:', errorText);
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✅ Received potential matches:', data);
      console.log('🏨 Matches count:', data.matches?.length || 0);
      
      setPotentialMatches(data.matches || []);
      
      if (data.matches?.length === 0) {
        setErrorMessage('No potential matches found for this hotel.');
      }
      
    } catch (error) {
      console.error('❌ Error fetching potential matches:', error);
      setErrorMessage(`Failed to search matches: ${error.message}`);
      setPotentialMatches([]);
    }
    setLoading(false);
  };

  // Reject a match
  const rejectMatch = async (supplierHotelId, masterHotelId) => {
    // Check if API is configured
    if (!API_BASE) {
      console.warn('No API endpoint configured. Demo mode.');
      setPotentialMatches(prev => prev.filter(m => m.id !== masterHotelId));
      alert('Match rejected (Demo mode - no API configured)');
      return;
    }

    try {
      console.log('Rejecting match via API:', `${API_BASE}/reject-match`);
      
      const response = await fetch(`${API_BASE}/reject-match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierHotelId,
          masterHotelId
        })
      });
      
      if (response.ok) {
        console.log('Match rejected successfully');
        // Remove this match from potential matches list
        setPotentialMatches(prev => prev.filter(m => m.id !== masterHotelId));
        alert('Match rejected');
      } else {
        throw new Error(`API returned ${response.status}`);
      }
    } catch (error) {
      console.error('Error rejecting match:', error);
      alert('Failed to reject match. Check console for details.');
    }
  };

  // Manual match hotels
  const matchHotels = async (supplierHotelId, masterHotelId, confidence) => {
    // Check if API is configured
    if (!API_BASE) {
      alert('❌ Cannot match hotels - No API endpoint configured!\nPlease set REACT_APP_API_ENDPOINT in Amplify environment variables.');
      return;
    }

    console.log('💾 Matching hotels via API:', `${API_BASE}/manual-match`);
    console.log('📤 Match data:', { supplierHotelId, masterHotelId, confidence });
    
    try {
      const response = await fetch(`${API_BASE}/manual-match`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          supplierHotelId,
          masterHotelId,
          confidence,
          matchMethod: 'manual_review'
        })
      });
      
      console.log('📥 Response status:', response.status, response.statusText);
      
      if (response.ok) {
        console.log('✅ Match successful');
        // Remove from unmatched list
        setUnmatchedHotels(prev => prev.filter(h => h.id !== supplierHotelId));
        setSelectedHotel(null);
        setPotentialMatches([]);
        setStats(prev => ({
          ...prev,
          matched: prev.matched + 1,
          unmatched: prev.unmatched - 1
        }));
        alert('✅ Hotels matched successfully!');
      } else {
        const errorText = await response.text();
        console.error('❌ API Error:', errorText);
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Error matching hotels:', error);
      alert(`❌ Failed to match hotels: ${error.message}\n\nCheck browser console (F12) for details.`);
    }
  };

  // Mark as no match available
  const markAsNoMatch = async (supplierHotelId) => {
    // Check if API is configured
    if (!API_BASE) {
      console.warn('No API endpoint configured. Demo mode.');
      setUnmatchedHotels(prev => prev.filter(h => h.id !== supplierHotelId));
      setSelectedHotel(null);
      alert('Marked as no match available (Demo mode - no API configured)');
      return;
    }

    try {
      console.log('Marking as no match via API:', `${API_BASE}/mark-no-match`);
      
      const response = await fetch(`${API_BASE}/mark-no-match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplierHotelId })
      });
      
      if (response.ok) {
        console.log('Marked as no match successfully');
        setUnmatchedHotels(prev => prev.filter(h => h.id !== supplierHotelId));
        setSelectedHotel(null);
        alert('Marked as no match available');
      } else {
        throw new Error(`API returned ${response.status}`);
      }
    } catch (error) {
      console.error('Error marking no match:', error);
      alert('Failed to mark as no match. Check console for details.');
    }
  };

  // Calculate similarity score
  const calculateSimilarity = (supplier, master) => {
    let score = 0;
    let factors = [];
    let distance = null;
    
    // Name similarity
    const nameSim = stringSimilarity(supplier.hotel_name, master.hotel_name);
    score += nameSim * 0.4;
    if (nameSim > 0.7) factors.push(`Name: ${Math.round(nameSim * 100)}%`);
    
    // Location proximity
    if (supplier.latitude && master.latitude) {
      distance = haversineDistance(
        supplier.latitude, supplier.longitude,
        master.latitude, master.longitude
      );
      
      if (distance < 0.1) {
        score += 0.3;
        factors.push(`Distance: ${Math.round(distance * 1000)}m`);
      } else if (distance < 1) {
        score += 0.2;
        factors.push(`Distance: ${distance.toFixed(2)}km`);
      } else if (distance < 5) {
        score += 0.1;
        factors.push(`Distance: ${distance.toFixed(2)}km`);
      } else {
        factors.push(`Distance: ${distance.toFixed(2)}km`);
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
    
    return { score, factors, distance };
  };

  // String similarity helper with address normalization
  const stringSimilarity = (str1, str2) => {
    if (!str1 || !str2) return 0;
    
    // Normalize addresses - expand abbreviations
    const normalizeAddress = (str) => {
      return str
        .toLowerCase()
        .replace(/\bst\b/g, 'street')
        .replace(/\bave\b/g, 'avenue')
        .replace(/\brd\b/g, 'road')
        .replace(/\bdr\b/g, 'drive')
        .replace(/\bln\b/g, 'lane')
        .replace(/\bblvd\b/g, 'boulevard')
        .replace(/\bct\b/g, 'court')
        .replace(/\bpl\b/g, 'place')
        .replace(/\bsq\b/g, 'square')
        .replace(/\bapt\b/g, 'apartment')
        .replace(/\bste\b/g, 'suite')
        .replace(/[^a-z0-9]/g, '');
    };
    
    const s1 = normalizeAddress(str1);
    const s2 = normalizeAddress(str2);
    
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
  }, [selectedHotel]);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Hotel Matching Review</h1>
      </div>

      {/* Connection Status Banner */}
      {connectionStatus === 'no-api' && (
        <div style={styles.errorBanner}>
          <strong>⚠️ No API Configured</strong>
          <div style={styles.errorText}>
            Set REACT_APP_API_ENDPOINT in AWS Amplify environment variables
          </div>
        </div>
      )}
      
      {connectionStatus === 'failed' && errorMessage && (
        <div style={styles.errorBanner}>
          <strong>❌ API Connection Failed</strong>
          <div style={styles.errorText}>
            {errorMessage.includes('CORS') ? (
              <>
                <strong>CORS Error Detected</strong>
                <div style={{ marginTop: '10px', whiteSpace: 'pre-wrap' }}>{errorMessage}</div>
                <div style={styles.corsFixButton}>
                  <strong>How to Fix:</strong>
                  <ol style={{ margin: '10px 0', paddingLeft: '20px' }}>
                    <li>Go to AWS API Gateway Console</li>
                    <li>Select your API: 511whmi057</li>
                    <li>Enable CORS for all endpoints</li>
                    <li>Set origin to: {window.location.origin}</li>
                    <li>Deploy API to prod stage</li>
                  </ol>
                  <a 
                    href="https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-cors.html" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ color: '#721c24', textDecoration: 'underline' }}
                  >
                    AWS CORS Documentation →
                  </a>
                </div>
              </>
            ) : (
              errorMessage
            )}
          </div>
          <div style={styles.errorHint}>
            Check browser console (F12) for detailed error messages
          </div>
        </div>
      )}
      
      {connectionStatus === 'connected' && (
        <div style={styles.successBanner}>
          ✅ Connected to live database: {API_BASE}
        </div>
      )}

      {/* Stats */}
      <div style={styles.statsContainer}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Total Supplier Hotels</div>
          <div style={styles.statValue}>{stats.total.toLocaleString()}</div>
        </div>
        <div style={{...styles.statCard, ...styles.greenCard}}>
          <div style={styles.statLabel}>Matched</div>
          <div style={styles.statValue}>
            {stats.matched.toLocaleString()} ({((stats.matched / stats.total) * 100).toFixed(1)}%)
          </div>
        </div>
        <div style={{...styles.statCard, ...styles.yellowCard}}>
          <div style={styles.statLabel}>Unmatched</div>
          <div style={styles.statValue}>{stats.unmatched.toLocaleString()}</div>
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.mainContent}>
        {/* Left Panel - Unmatched Hotels */}
        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <h2 style={styles.panelTitle}>Unmatched Supplier Hotels</h2>
            
            {/* Filters */}
            <div style={styles.filters}>
              <select
                style={styles.select}
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
                style={styles.input}
                value={filters.city}
                onChange={(e) => setFilters({...filters, city: e.target.value})}
              />
              
              <button
                onClick={fetchUnmatchedHotels}
                style={styles.refreshButton}
              >
                Refresh
              </button>
            </div>
          </div>
          
          <div style={styles.listContainer}>
            {loading && <div style={styles.loading}>Loading...</div>}
            
            {unmatchedHotels.map((hotel) => (
              <div
                key={hotel.id}
                style={{
                  ...styles.hotelCard,
                  ...(selectedHotel?.id === hotel.id ? styles.selectedCard : {})
                }}
                onClick={() => setSelectedHotel(hotel)}
              >
                <div style={styles.hotelName}>{hotel.hotel_name}</div>
                <div style={styles.hotelInfo}>
                  <div style={styles.infoRow}>
                    <MapPin size={12} />
                    <span style={styles.infoText}>{hotel.city}, {hotel.country_code}</span>
                  </div>
                  {hotel.address_line1 && (
                    <div style={styles.infoRow}>
                      <Building size={12} />
                      <span style={styles.infoText}>{hotel.address_line1}</span>
                    </div>
                  )}
                </div>
                <div style={styles.hotelId}>
                  ID: {hotel.supplier_hotel_id}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel - Potential Matches */}
        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <h2 style={styles.panelTitle}>Potential Master Hotel Matches</h2>
            
            {selectedHotel && (
              <div style={styles.searchSection}>
                <div style={styles.matchingFor}>
                  Matching for: <span style={styles.matchingHotelName}>{selectedHotel.hotel_name}</span>
                </div>
                <div style={styles.searchBar}>
                  <input
                    type="text"
                    placeholder="Custom search in master hotels..."
                    style={styles.searchInput}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <button
                    onClick={() => searchPotentialMatches(selectedHotel)}
                    style={styles.searchButton}
                  >
                    <Search size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <div style={styles.listContainer}>
            {!selectedHotel && (
              <div style={styles.emptyState}>
                Select a supplier hotel to see potential matches
              </div>
            )}
            
            {selectedHotel && loading && (
              <div style={styles.loading}>Searching for matches...</div>
            )}
            
            {selectedHotel && !loading && potentialMatches.length === 0 && (
              <div style={styles.emptyState}>
                <AlertCircle style={styles.emptyIcon} size={32} />
                <div style={styles.emptyText}>No potential matches found</div>
                <button
                  onClick={() => markAsNoMatch(selectedHotel.id)}
                  style={styles.noMatchButton}
                >
                  Mark as No Match Available
                </button>
              </div>
            )}
            
            {potentialMatches.map((match) => {
              const similarity = calculateSimilarity(selectedHotel, match);
              const confidenceColor = similarity.score > 0.8 ? '#4caf50' : 
                                     similarity.score > 0.6 ? '#ff9800' : '#f44336';
              
              return (
                <div key={match.id} style={styles.matchCard}>
                  <div style={styles.matchContent}>
                    <div style={styles.matchLeft}>
                      <div style={styles.matchName}>{match.hotel_name}</div>
                      <div style={styles.matchInfo}>
                        <div style={styles.infoRow}>
                          <MapPin size={12} />
                          <span style={styles.infoText}>{match.city}, {match.country_code}</span>
                        </div>
                        {match.address_line1 && (
                          <div style={styles.infoRow}>
                            <Building size={12} />
                            <span style={styles.infoText}>{match.address_line1}</span>
                          </div>
                        )}
                      </div>
                      <div style={styles.matchId}>
                        Master ID: {match.hotel_id}
                      </div>
                      
                      {/* Similarity factors */}
                      <div style={styles.factorsContainer}>
                        {similarity.factors.map((factor, idx) => (
                          <span key={idx} style={styles.factorBadge}>
                            {factor}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div style={styles.matchRight}>
                      <div style={{...styles.confidence, color: confidenceColor}}>
                        {Math.round(similarity.score * 100)}%
                      </div>
                      <div style={styles.confidenceLabel}>confidence</div>
                      
                      <div style={styles.actionButtons}>
                        <button
                          onClick={() => matchHotels(selectedHotel.id, match.id, similarity.score)}
                          style={styles.acceptButton}
                          title="Accept Match"
                        >
                          <CheckCircle size={20} />
                        </button>
                        <button
                          onClick={() => rejectMatch(selectedHotel.id, match.id)}
                          style={styles.rejectButton}
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

const styles = {
  container: {
    padding: '20px',
    maxWidth: '1600px',
    margin: '0 auto',
    backgroundColor: '#f5f5f5',
    minHeight: '100vh'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#333',
    margin: 0
  },
  demoNotice: {
    background: '#fff3cd',
    color: '#856404',
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '14px'
  },
  errorBanner: {
    background: '#f8d7da',
    color: '#721c24',
    padding: '15px 20px',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #f5c6cb'
  },
  successBanner: {
    background: '#d4edda',
    color: '#155724',
    padding: '12px 20px',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #c3e6cb',
    fontSize: '14px'
  },
  errorText: {
    marginTop: '8px',
    fontSize: '14px'
  },
  errorHint: {
    marginTop: '8px',
    fontSize: '12px',
    opacity: 0.8
  },
  corsFixButton: {
    marginTop: '15px',
    padding: '15px',
    background: 'rgba(255,255,255,0.5)',
    borderRadius: '6px',
    fontSize: '13px'
  },
  statsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '15px',
    marginBottom: '20px'
  },
  statCard: {
    background: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    borderLeft: '4px solid #2196f3'
  },
  greenCard: {
    borderLeftColor: '#4caf50'
  },
  yellowCard: {
    borderLeftColor: '#ff9800'
  },
  purpleCard: {
    borderLeftColor: '#9c27b0'
  },
  statLabel: {
    fontSize: '12px',
    color: '#666',
    marginBottom: '8px'
  },
  statValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333'
  },
  mainContent: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px'
  },
  panel: {
    background: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    overflow: 'hidden'
  },
  panelHeader: {
    padding: '20px',
    borderBottom: '1px solid #e0e0e0'
  },
  panelTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#333',
    marginTop: 0,
    marginBottom: '15px'
  },
  filters: {
    display: 'flex',
    gap: '10px'
  },
  select: {
    border: '1px solid #ddd',
    borderRadius: '4px',
    padding: '8px',
    fontSize: '14px'
  },
  input: {
    border: '1px solid #ddd',
    borderRadius: '4px',
    padding: '8px',
    fontSize: '14px',
    flex: 1
  },
  refreshButton: {
    background: '#2196f3',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '4px',
    fontSize: '14px',
    cursor: 'pointer',
    fontWeight: '500'
  },
  listContainer: {
    maxHeight: '600px',
    overflowY: 'auto'
  },
  loading: {
    padding: '40px',
    textAlign: 'center',
    color: '#666'
  },
  hotelCard: {
    padding: '16px',
    borderBottom: '1px solid #e0e0e0',
    cursor: 'pointer',
    transition: 'background 0.2s'
  },
  selectedCard: {
    background: '#e3f2fd',
    borderLeft: '4px solid #2196f3'
  },
  hotelName: {
    fontWeight: '600',
    fontSize: '14px',
    color: '#333',
    marginBottom: '8px'
  },
  hotelInfo: {
    marginBottom: '8px'
  },
  infoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginTop: '4px'
  },
  infoText: {
    fontSize: '12px',
    color: '#666'
  },
  hotelId: {
    fontSize: '11px',
    color: '#999'
  },
  searchSection: {
    marginBottom: '15px'
  },
  matchingFor: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '10px'
  },
  matchingHotelName: {
    fontWeight: '600',
    color: '#333'
  },
  searchBar: {
    display: 'flex',
    gap: '8px'
  },
  searchInput: {
    border: '1px solid #ddd',
    borderRadius: '4px',
    padding: '8px',
    fontSize: '14px',
    flex: 1
  },
  searchButton: {
    background: '#4caf50',
    color: 'white',
    border: 'none',
    padding: '8px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center'
  },
  emptyState: {
    padding: '60px 20px',
    textAlign: 'center',
    color: '#666'
  },
  emptyIcon: {
    color: '#ff9800',
    marginBottom: '10px'
  },
  emptyText: {
    marginBottom: '20px'
  },
  noMatchButton: {
    background: '#f44336',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '4px',
    fontSize: '14px',
    cursor: 'pointer',
    fontWeight: '500'
  },
  matchCard: {
    padding: '16px',
    borderBottom: '1px solid #e0e0e0'
  },
  matchContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  matchLeft: {
    flex: 1
  },
  matchName: {
    fontWeight: '600',
    fontSize: '14px',
    color: '#333',
    marginBottom: '8px'
  },
  matchInfo: {
    marginBottom: '8px'
  },
  matchId: {
    fontSize: '11px',
    color: '#999',
    marginBottom: '12px'
  },
  factorsContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px'
  },
  factorBadge: {
    fontSize: '11px',
    background: '#e3f2fd',
    color: '#1976d2',
    padding: '4px 8px',
    borderRadius: '4px'
  },
  matchRight: {
    marginLeft: '20px',
    textAlign: 'right',
    minWidth: '100px'
  },
  confidence: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '4px'
  },
  confidenceLabel: {
    fontSize: '11px',
    color: '#666',
    marginBottom: '12px'
  },
  actionButtons: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end'
  },
  acceptButton: {
    background: '#4caf50',
    color: 'white',
    border: 'none',
    padding: '8px',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center'
  },
  rejectButton: {
    background: '#f44336',
    color: 'white',
    border: 'none',
    padding: '8px',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center'
  }
};

export default HotelMatchingReview;
