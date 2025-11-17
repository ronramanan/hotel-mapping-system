import React, { useState, useEffect } from 'react';
import { Search, CheckCircle, XCircle, MapPin, Building, AlertCircle, RefreshCw } from 'lucide-react';

const HotelMatchingReview = () => {
  const [unmatchedHotels, setUnmatchedHotels] = useState([]);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [potentialMatches, setPotentialMatches] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [matchLoading, setMatchLoading] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    matched: 0,
    unmatched: 0
  });
  const [filters, setFilters] = useState({
    country: 'all',
    city: '',
    confidence: 'all'
  });
  const [countries, setCountries] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [errorMessage, setErrorMessage] = useState('');

  const API_BASE = process.env.REACT_APP_API_URL || process.env.REACT_APP_API_ENDPOINT || '';

  // Fetch countries on mount
  useEffect(() => {
    fetchCountries();
    fetchUnmatchedHotels();
  }, []);

  // Refetch when country filter changes
  useEffect(() => {
    if (filters.country !== 'all') {
      fetchUnmatchedHotels();
    }
  }, [filters.country]);

  // Fetch all countries
  const fetchCountries = async () => {
    if (!API_BASE) {
      console.warn('No API endpoint configured for countries');
      return;
    }

    try {
      console.log('🌍 Fetching countries from:', `${API_BASE}/countries`);
      const response = await fetch(`${API_BASE}/countries`, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Received countries:', data.countries?.length || 0);
        setCountries(data.countries || []);
      }
    } catch (error) {
      console.error('❌ Error fetching countries:', error);
    }
  };

  // Fetch unmatched hotels
  const fetchUnmatchedHotels = async () => {
    setLoading(true);
    setErrorMessage('');
    
    if (!API_BASE) {
      console.error('❌ No API endpoint configured!');
      setConnectionStatus('no-api');
      setErrorMessage('No API endpoint configured. Please set REACT_APP_API_ENDPOINT in Amplify.');
      setLoading(false);
      return;
    }

    console.log('🔌 API Configured:', API_BASE);
    console.log('📡 Fetching unmatched hotels from:', `${API_BASE}/unmatched-hotels`);
    
    try {
      // Build query parameters
      const params = new URLSearchParams();
      if (filters.country && filters.country !== 'all') {
        params.append('country', filters.country);
      }
      if (filters.city) {
        params.append('city', filters.city);
      }
      params.append('limit', '100');

      const url = `${API_BASE}/unmatched-hotels?${params.toString()}`;
      console.log('🌐 Making request to:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
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
        setStats(data.stats);
      }
      setConnectionStatus('connected');
      
      if (data.hotels?.length === 0) {
        setErrorMessage('No unmatched hotels found. All hotels may be already matched or try adjusting filters.');
      }
      
    } catch (error) {
      console.error('❌ Error fetching unmatched hotels:', error);
      console.error('Error details:', error.message);
      
      if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
        setConnectionStatus('failed');
        setErrorMessage(`CORS Error: API is blocking requests. Enable CORS in AWS API Gateway for: ${window.location.origin}`);
      } else {
        setConnectionStatus('failed');
        setErrorMessage(`Failed to connect to API: ${error.message}`);
      }
      setUnmatchedHotels([]);
    }
    setLoading(false);
  };

  // Search for potential matches when a hotel is selected
  const searchPotentialMatches = async (supplierHotel) => {
    setSelectedHotel(supplierHotel);
    setMatchLoading(true);
    setPotentialMatches([]);
    setErrorMessage('');
    
    if (!API_BASE) {
      console.error('❌ No API endpoint configured!');
      setErrorMessage('Cannot search matches - no API endpoint configured');
      setMatchLoading(false);
      return;
    }

    console.log('🔍 Searching potential matches for:', supplierHotel.hotel_name);
    console.log('📡 API endpoint:', `${API_BASE}/potential-matches/${supplierHotel.id}`);
    
    try {
      const response = await fetch(`${API_BASE}/potential-matches/${supplierHotel.id}`, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
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
        setErrorMessage('No potential matches found. Try custom search or mark as no match.');
      }
      
    } catch (error) {
      console.error('❌ Error fetching potential matches:', error);
      setErrorMessage(`Failed to search matches: ${error.message}`);
      setPotentialMatches([]);
    }
    setMatchLoading(false);
  };

  // Custom search in master hotels
  const handleCustomSearch = async () => {
    if (!searchQuery.trim() || !selectedHotel) return;
    
    setMatchLoading(true);
    try {
      const response = await fetch(`${API_BASE}/master-hotels/search?q=${encodeURIComponent(searchQuery)}`, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPotentialMatches(data.hotels || []);
      }
    } catch (error) {
      console.error('Error in custom search:', error);
      setErrorMessage(`Custom search failed: ${error.message}`);
    } finally {
      setMatchLoading(false);
    }
  };

  // Manual match hotels
  const matchHotels = async (supplierHotelId, masterHotelId, confidence) => {
    if (!API_BASE) {
      alert('❌ Cannot match hotels - No API endpoint configured!');
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
          supplier_hotel_id: supplierHotelId,
          master_hotel_id: masterHotelId,
          confidence_score: confidence || 1.0,
          match_type: 'manual'
        })
      });
      
      console.log('📥 Response status:', response.status, response.statusText);
      
      if (response.ok) {
        console.log('✅ Match successful');
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
      alert(`❌ Failed to match hotels: ${error.message}`);
    }
  };

  // Mark as no match available
  const markAsNoMatch = async () => {
    if (!selectedHotel || !API_BASE) return;

    try {
      const response = await fetch(`${API_BASE}/mark-no-match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierHotelId: selectedHotel.id
        })
      });
      
      if (response.ok) {
        setUnmatchedHotels(prev => prev.filter(h => h.id !== selectedHotel.id));
        setSelectedHotel(null);
        setPotentialMatches([]);
        alert('✅ Marked as no match available');
      }
    } catch (error) {
      console.error('Error marking as no match:', error);
      alert('Failed to mark as no match');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Hotel Matching Review</h1>
        {connectionStatus === 'no-api' && (
          <div style={styles.demoNotice}>⚠️ No API Configured</div>
        )}
        {connectionStatus === 'connected' && (
          <div style={{...styles.demoNotice, background: '#d4edda', color: '#155724'}}>
            ✅ Connected
          </div>
        )}
      </div>

      {errorMessage && (
        <div style={styles.errorBanner}>
          <strong>⚠️ Error</strong>
          <p style={styles.errorText}>{errorMessage}</p>
        </div>
      )}

      {/* Statistics */}
      <div style={styles.statsContainer}>
        <div style={{...styles.statCard, ...styles.blueCard}}>
          <div style={styles.statLabel}>Total Hotels</div>
          <div style={styles.statValue}>{stats.total || 0}</div>
        </div>
        <div style={{...styles.statCard, ...styles.greenCard}}>
          <div style={styles.statLabel}>Matched</div>
          <div style={styles.statValue}>{stats.matched || 0}</div>
        </div>
        <div style={{...styles.statCard, ...styles.yellowCard}}>
          <div style={styles.statLabel}>Unmatched</div>
          <div style={styles.statValue}>{stats.unmatched || 0}</div>
        </div>
        <div style={{...styles.statCard, ...styles.purpleCard}}>
          <div style={styles.statLabel}>No Match</div>
          <div style={styles.statValue}>{stats.noMatch || 0}</div>
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.mainContent}>
        {/* Left Panel - Unmatched Hotels */}
        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <h3 style={styles.panelTitle}>Unmatched Supplier Hotels</h3>
            <div style={styles.filters}>
              <select
                style={styles.select}
                value={filters.country}
                onChange={(e) => setFilters({...filters, country: e.target.value})}
              >
                <option value="all">✓ All Countries</option>
                {countries.map(country => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
              <input
                type="text"
                style={styles.input}
                placeholder="Filter by city..."
                value={filters.city}
                onChange={(e) => setFilters({...filters, city: e.target.value})}
                onKeyPress={(e) => e.key === 'Enter' && fetchUnmatchedHotels()}
              />
              <button 
                style={styles.refreshButton} 
                onClick={fetchUnmatchedHotels}
                disabled={loading}
              >
                <RefreshCw size={16} style={{marginRight: '4px'}} />
                Refresh
              </button>
            </div>
          </div>
          <div style={styles.listContainer}>
            {loading ? (
              <div style={styles.loading}>
                <RefreshCw size={32} className="spin" />
                <p>Loading hotels...</p>
              </div>
            ) : unmatchedHotels.length === 0 ? (
              <div style={styles.emptyState}>
                <AlertCircle size={48} style={styles.emptyIcon} />
                <p style={styles.emptyText}>No unmatched hotels found</p>
                {(filters.country !== 'all' || filters.city) && (
                  <p style={{fontSize: '12px', color: '#999'}}>Try adjusting your filters</p>
                )}
              </div>
            ) : (
              unmatchedHotels.map(hotel => (
                <div
                  key={hotel.id}
                  style={{
                    ...styles.hotelCard,
                    ...(selectedHotel?.id === hotel.id ? styles.selectedCard : {})
                  }}
                  onClick={() => searchPotentialMatches(hotel)}
                >
                  <div style={styles.hotelName}>{hotel.hotel_name || hotel.name}</div>
                  <div style={styles.hotelInfo}>
                    <div style={styles.infoRow}>
                      <MapPin size={14} />
                      <span style={styles.infoText}>
                        {hotel.city}, {hotel.country_code || hotel.country}
                      </span>
                    </div>
                    <div style={styles.infoRow}>
                      <Building size={14} />
                      <span style={styles.infoText}>IOL X - {hotel.supplier_hotel_id}</span>
                    </div>
                  </div>
                  {hotel.address_line1 && (
                    <div style={styles.hotelId}>{hotel.address_line1}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Panel - Potential Matches */}
        <div style={styles.panel}>
          {!selectedHotel ? (
            <div style={styles.emptyState}>
              <Search size={64} style={styles.emptyIcon} />
              <p style={styles.emptyText}>Select a supplier hotel to find matches</p>
              <p style={{fontSize: '12px', color: '#999'}}>Click on any hotel from the left panel</p>
            </div>
          ) : (
            <>
              <div style={styles.panelHeader}>
                <h3 style={styles.panelTitle}>Potential Master Hotel Matches</h3>
                <div style={styles.searchSection}>
                  <div style={styles.matchingFor}>
                    Matching for: <span style={styles.matchingHotelName}>{selectedHotel.hotel_name || selectedHotel.name}</span>
                  </div>
                  <div style={{fontSize: '12px', color: '#666', marginBottom: '10px'}}>
                    📍 {selectedHotel.city}, {selectedHotel.country_code || selectedHotel.country}
                  </div>
                  <div style={styles.searchBar}>
                    <input
                      type="text"
                      style={styles.searchInput}
                      placeholder="Custom search in master hotels..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleCustomSearch()}
                    />
                    <button 
                      style={styles.searchButton} 
                      onClick={handleCustomSearch}
                      disabled={!searchQuery.trim()}
                    >
                      <Search size={16} />
                    </button>
                  </div>
                </div>
              </div>
              <div style={styles.listContainer}>
                {matchLoading ? (
                  <div style={styles.loading}>
                    <RefreshCw size={32} className="spin" />
                    <p>Finding potential matches...</p>
                  </div>
                ) : potentialMatches.length === 0 ? (
                  <div style={styles.emptyState}>
                    <AlertCircle size={48} style={styles.emptyIcon} />
                    <p style={styles.emptyText}>No potential matches found</p>
                    <p style={{fontSize: '12px', color: '#666', marginBottom: '20px'}}>
                      Try custom search or mark as no match available
                    </p>
                    <button style={styles.noMatchButton} onClick={markAsNoMatch}>
                      Mark as No Match Available
                    </button>
                  </div>
                ) : (
                  potentialMatches.map((match, index) => (
                    <div key={match.id} style={styles.matchCard}>
                      <div style={styles.matchContent}>
                        <div style={styles.matchLeft}>
                          <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px'}}>
                            <span style={{
                              background: '#e3f2fd',
                              color: '#1976d2',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '600'
                            }}>
                              #{index + 1}
                            </span>
                            <div style={styles.matchName}>{match.hotel_name || match.name}</div>
                          </div>
                          <div style={styles.matchInfo}>
                            <div style={styles.infoRow}>
                              <MapPin size={14} />
                              <span style={styles.infoText}>
                                {match.city}, {match.country_code || match.country}
                              </span>
                            </div>
                            <div style={styles.infoRow}>
                              <Building size={14} />
                              <span style={styles.infoText}>
                                Code: {match.hotel_id || match.hotel_code}
                              </span>
                            </div>
                          </div>
                          {match.address_line1 && (
                            <div style={styles.matchId}>{match.address_line1}</div>
                          )}
                          {match.match_reason && (
                            <div style={styles.factorsContainer}>
                              <span style={styles.factorBadge}>{match.match_reason}</span>
                            </div>
                          )}
                        </div>
                        <div style={styles.matchRight}>
                          {(match.match_score !== undefined || match.confidence !== undefined) && (
                            <>
                              <div style={styles.confidence}>
                                {Math.round((match.match_score || match.confidence / 100) * 100)}%
                              </div>
                              <div style={styles.confidenceLabel}>Match</div>
                            </>
                          )}
                          <div style={styles.actionButtons}>
                            <button
                              style={styles.acceptButton}
                              onClick={() => matchHotels(selectedHotel.id, match.id, match.match_score || 1.0)}
                              title="Accept this match"
                            >
                              <CheckCircle size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
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
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    background: '#f5f5f5',
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
    fontSize: '14px',
    fontWeight: '500'
  },
  errorBanner: {
    background: '#f8d7da',
    color: '#721c24',
    padding: '15px 20px',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #f5c6cb'
  },
  errorText: {
    marginTop: '8px',
    fontSize: '14px',
    margin: '8px 0 0 0'
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
  blueCard: {
    borderLeftColor: '#2196f3'
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
    marginBottom: '8px',
    fontWeight: '500'
  },
  statValue: {
    fontSize: '28px',
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
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    height: '700px'
  },
  panelHeader: {
    padding: '20px',
    borderBottom: '1px solid #e0e0e0',
    flexShrink: 0
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
    gap: '10px',
    flexWrap: 'wrap'
  },
  select: {
    border: '1px solid #ddd',
    borderRadius: '4px',
    padding: '8px 12px',
    fontSize: '14px',
    minWidth: '150px',
    background: 'white'
  },
  input: {
    border: '1px solid #ddd',
    borderRadius: '4px',
    padding: '8px 12px',
    fontSize: '14px',
    flex: 1,
    minWidth: '150px'
  },
  refreshButton: {
    background: '#2196f3',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '4px',
    fontSize: '14px',
    cursor: 'pointer',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    whiteSpace: 'nowrap'
  },
  listContainer: {
    flex: 1,
    overflowY: 'auto'
  },
  loading: {
    padding: '60px 20px',
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
    fontSize: '15px',
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
    marginTop: '4px',
    color: '#666'
  },
  infoText: {
    fontSize: '13px',
    color: '#666'
  },
  hotelId: {
    fontSize: '11px',
    color: '#999',
    marginTop: '4px'
  },
  searchSection: {
    marginTop: '10px'
  },
  matchingFor: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '4px'
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
    padding: '8px 12px',
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
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '40px'
  },
  emptyState: {
    padding: '60px 20px',
    textAlign: 'center',
    color: '#666'
  },
  emptyIcon: {
    color: '#ff9800',
    marginBottom: '15px'
  },
  emptyText: {
    marginBottom: '10px',
    fontSize: '15px',
    fontWeight: '500'
  },
  noMatchButton: {
    background: '#f44336',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
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
    fontSize: '15px',
    color: '#333'
  },
  matchInfo: {
    marginTop: '8px',
    marginBottom: '8px'
  },
  matchId: {
    fontSize: '11px',
    color: '#999',
    marginTop: '4px',
    marginBottom: '8px'
  },
  factorsContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginTop: '8px'
  },
  factorBadge: {
    fontSize: '11px',
    background: '#e3f2fd',
    color: '#1976d2',
    padding: '4px 8px',
    borderRadius: '4px',
    fontWeight: '500'
  },
  matchRight: {
    marginLeft: '20px',
    textAlign: 'right',
    minWidth: '100px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end'
  },
  confidence: {
    fontSize: '28px',
    fontWeight: 'bold',
    marginBottom: '2px',
    color: '#2196f3'
  },
  confidenceLabel: {
    fontSize: '11px',
    color: '#666',
    marginBottom: '12px',
    fontWeight: '500'
  },
  actionButtons: {
    display: 'flex',
    gap: '8px'
  },
  acceptButton: {
    background: '#4caf50',
    color: 'white',
    border: 'none',
    padding: '10px',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '40px'
  }
};

// Add spinning animation via CSS
const styleSheet = document.styleSheets[0];
styleSheet.insertRule(`
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`, styleSheet.cssRules.length);

styleSheet.insertRule(`
  .spin {
    animation: spin 1s linear infinite;
  }
`, styleSheet.cssRules.length);

export default HotelMatchingReview;
