import React, { useState, useEffect } from 'react';
import { Search, CheckCircle, XCircle, MapPin, Phone, Globe, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiService } from '../services/apiService';

interface SupplierHotel {
  id: number;
  supplier_code: string;
  supplier_hotel_id: string;
  hotel_name: string;
  address_line1: string;
  city: string;
  country_code: string;
  postal_code: string;
  latitude: number;
  longitude: number;
  phone_number: string;
  potential_matches: number;
  best_match_score: number;
}

interface MasterHotel {
  id: number;
  hotel_name: string;
  address_line1: string;
  city: string;
  country_code: string;
  postal_code: string;
  latitude: number;
  longitude: number;
  chain_name: string;
  match_score: number;
  name_score: number;
  address_score: number;
  distance_score: number;
  match_criteria: any;
}

const MappingReview: React.FC = () => {
  const [unmatchedHotels, setUnmatchedHotels] = useState<SupplierHotel[]>([]);
  const [selectedHotel, setSelectedHotel] = useState<SupplierHotel | null>(null);
  const [potentialMatches, setPotentialMatches] = useState<MasterHotel[]>([]);
  const [loading, setLoading] = useState(false);
  const [matchLoading, setMatchLoading] = useState(false);
  const [filters, setFilters] = useState({
    supplier: '',
    country: '',
    city: '',
    limit: 50,
    offset: 0
  });
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    pages: 1
  });
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch unmatched hotels
  const fetchUnmatchedHotels = async () => {
    try {
      setLoading(true);
      const response = await apiService.getUnmatchedHotels(filters);
      setUnmatchedHotels(response.hotels);
      setPagination({
        total: response.total,
        page: response.page,
        pages: response.pages
      });
    } catch (error) {
      console.error('Error fetching unmatched hotels:', error);
      setErrorMessage('Failed to load unmatched hotels');
    } finally {
      setLoading(false);
    }
  };

  // Fetch potential matches for selected hotel
  const fetchPotentialMatches = async (hotelId: number) => {
    try {
      setMatchLoading(true);
      const response = await apiService.getPotentialMatches(hotelId);
      setPotentialMatches(response.potentialMatches);
      setSelectedHotel(response.supplierHotel);
    } catch (error) {
      console.error('Error fetching potential matches:', error);
      setErrorMessage('Failed to load potential matches');
    } finally {
      setMatchLoading(false);
    }
  };

  // Confirm match
  const handleConfirmMatch = async (masterHotelId: number) => {
    if (!selectedHotel) return;

    try {
      await apiService.confirmMatch(selectedHotel.id, masterHotelId);
      setSuccessMessage('Match confirmed successfully!');
      
      // Remove from unmatched list
      setUnmatchedHotels(prev => prev.filter(h => h.id !== selectedHotel.id));
      
      // Clear selection
      setSelectedHotel(null);
      setPotentialMatches([]);
      
      // Refresh list
      fetchUnmatchedHotels();
    } catch (error) {
      console.error('Error confirming match:', error);
      setErrorMessage('Failed to confirm match');
    }
  };

  // Reject match
  const handleRejectMatch = async (masterHotelId: number) => {
    if (!selectedHotel) return;

    try {
      await apiService.rejectMatch(selectedHotel.id, masterHotelId);
      
      // Remove from potential matches
      setPotentialMatches(prev => prev.filter(m => m.id !== masterHotelId));
      
      setSuccessMessage('Match rejected');
    } catch (error) {
      console.error('Error rejecting match:', error);
      setErrorMessage('Failed to reject match');
    }
  };

  // Mark as no match
  const handleNoMatch = async () => {
    if (!selectedHotel) return;

    try {
      await apiService.markNoMatch(selectedHotel.id);
      setSuccessMessage('Marked as no match available');
      
      // Remove from unmatched list
      setUnmatchedHotels(prev => prev.filter(h => h.id !== selectedHotel.id));
      
      // Clear selection
      setSelectedHotel(null);
      setPotentialMatches([]);
      
      // Refresh list
      fetchUnmatchedHotels();
    } catch (error) {
      console.error('Error marking no match:', error);
      setErrorMessage('Failed to mark as no match');
    }
  };

  // Calculate distance between two points
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return -1;
    
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Get confidence color
  const getConfidenceColor = (score: number): string => {
    if (score >= 0.9) return '#10b981';
    if (score >= 0.7) return '#f59e0b';
    return '#ef4444';
  };

  useEffect(() => {
    fetchUnmatchedHotels();
  }, [filters.supplier, filters.country, filters.city, filters.offset]);

  return (
    <div className="mapping-review">
      <h1>Hotel Mapping Review</h1>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-header">
          <h2 className="card-title">Filters</h2>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-3 gap-4">
            <div className="form-group">
              <label className="form-label">Supplier</label>
              <select 
                className="form-control form-select"
                value={filters.supplier}
                onChange={(e) => setFilters({...filters, supplier: e.target.value, offset: 0})}
              >
                <option value="">All Suppliers</option>
                <option value="IOLX">IOLX</option>
                <option value="HOTELBEDS">HOTELBEDS</option>
                <option value="EXPEDIA">EXPEDIA</option>
                <option value="BOOKING">BOOKING</option>
                <option value="AGODA">AGODA</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Country</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g., US, GB, FR"
                value={filters.country}
                onChange={(e) => setFilters({...filters, country: e.target.value.toUpperCase(), offset: 0})}
                maxLength={2}
              />
            </div>
            <div className="form-group">
              <label className="form-label">City</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g., London, Paris"
                value={filters.city}
                onChange={(e) => setFilters({...filters, city: e.target.value, offset: 0})}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="alert alert-success mb-4">
          <CheckCircle size={20} />
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="alert alert-danger mb-4">
          <XCircle size={20} />
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* Unmatched Hotels List */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              Unmatched Hotels ({pagination.total})
            </h2>
            <div className="flex gap-2">
              <button 
                className="btn btn-sm btn-secondary"
                disabled={filters.offset === 0}
                onClick={() => setFilters({...filters, offset: Math.max(0, filters.offset - filters.limit)})}
              >
                <ChevronLeft size={16} />
              </button>
              <span className="flex items-center">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button 
                className="btn btn-sm btn-secondary"
                disabled={pagination.page === pagination.pages}
                onClick={() => setFilters({...filters, offset: filters.offset + filters.limit})}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            {loading ? (
              <div className="loading-container">
                <div className="spinner"></div>
              </div>
            ) : (
              <div className="hotel-list">
                {unmatchedHotels.map((hotel) => (
                  <div
                    key={hotel.id}
                    className={`hotel-item ${selectedHotel?.id === hotel.id ? 'selected' : ''}`}
                    onClick={() => fetchPotentialMatches(hotel.id)}
                    style={{
                      padding: '1rem',
                      borderBottom: '1px solid #e5e7eb',
                      cursor: 'pointer',
                      background: selectedHotel?.id === hotel.id ? '#eff6ff' : 'white',
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 style={{ margin: 0, color: '#1f2937' }}>
                          {hotel.hotel_name}
                        </h4>
                        <p style={{ margin: '0.25rem 0', fontSize: '0.875rem', color: '#6b7280' }}>
                          {hotel.supplier_code} | {hotel.supplier_hotel_id}
                        </p>
                        <p style={{ margin: '0.25rem 0', fontSize: '0.875rem', color: '#6b7280' }}>
                          <MapPin size={14} style={{ display: 'inline' }} />
                          {hotel.city}, {hotel.country_code}
                        </p>
                        {hotel.address_line1 && (
                          <p style={{ margin: '0.25rem 0', fontSize: '0.75rem', color: '#9ca3af' }}>
                            {hotel.address_line1}
                          </p>
                        )}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {hotel.potential_matches > 0 && (
                          <span className="badge badge-info">
                            {hotel.potential_matches} matches
                          </span>
                        )}
                        {hotel.best_match_score && (
                          <div style={{ marginTop: '0.5rem' }}>
                            <small style={{ color: '#6b7280' }}>Best match:</small>
                            <div style={{
                              color: getConfidenceColor(hotel.best_match_score),
                              fontWeight: 'bold'
                            }}>
                              {(hotel.best_match_score * 100).toFixed(0)}%
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Potential Matches */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Potential Matches</h2>
            {selectedHotel && (
              <button 
                className="btn btn-sm btn-danger"
                onClick={handleNoMatch}
              >
                No Match Available
              </button>
            )}
          </div>
          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            {matchLoading ? (
              <div className="loading-container">
                <div className="spinner"></div>
              </div>
            ) : selectedHotel ? (
              <div>
                {/* Selected Hotel Details */}
                <div style={{ 
                  padding: '1rem', 
                  background: '#f3f4f6',
                  borderBottom: '2px solid #e5e7eb'
                }}>
                  <h3 style={{ margin: '0 0 0.5rem 0' }}>Selected Hotel</h3>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: '#1f2937' }}>
                    {selectedHotel.hotel_name}
                  </h4>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    <p><strong>Address:</strong> {selectedHotel.address_line1}</p>
                    <p><strong>Location:</strong> {selectedHotel.city}, {selectedHotel.country_code} {selectedHotel.postal_code}</p>
                    {selectedHotel.latitude && (
                      <p><strong>Coordinates:</strong> {selectedHotel.latitude}, {selectedHotel.longitude}</p>
                    )}
                    {selectedHotel.phone_number && (
                      <p><Phone size={14} style={{ display: 'inline' }} /> {selectedHotel.phone_number}</p>
                    )}
                  </div>
                </div>

                {/* Matches List */}
                <div className="matches-list">
                  {potentialMatches.length > 0 ? (
                    potentialMatches.map((match) => {
                      const distance = selectedHotel.latitude && match.latitude
                        ? calculateDistance(
                            selectedHotel.latitude,
                            selectedHotel.longitude,
                            match.latitude,
                            match.longitude
                          )
                        : -1;

                      return (
                        <div
                          key={match.id}
                          style={{
                            padding: '1rem',
                            borderBottom: '1px solid #e5e7eb',
                            background: 'white'
                          }}
                        >
                          <div className="flex justify-between items-start">
                            <div style={{ flex: 1 }}>
                              <h4 style={{ margin: 0, color: '#1f2937' }}>
                                {match.hotel_name}
                              </h4>
                              {match.chain_name && (
                                <p style={{ margin: '0.25rem 0', fontSize: '0.875rem', color: '#2563eb' }}>
                                  Chain: {match.chain_name}
                                </p>
                              )}
                              <p style={{ margin: '0.25rem 0', fontSize: '0.875rem', color: '#6b7280' }}>
                                {match.address_line1}
                              </p>
                              <p style={{ margin: '0.25rem 0', fontSize: '0.875rem', color: '#6b7280' }}>
                                {match.city}, {match.country_code} {match.postal_code}
                              </p>
                              
                              {/* Match Scores */}
                              <div style={{ marginTop: '0.5rem', display: 'flex', gap: '1rem', fontSize: '0.75rem' }}>
                                <span>
                                  Name: <strong style={{ color: getConfidenceColor(match.name_score) }}>
                                    {(match.name_score * 100).toFixed(0)}%
                                  </strong>
                                </span>
                                {match.address_score !== null && (
                                  <span>
                                    Address: <strong style={{ color: getConfidenceColor(match.address_score) }}>
                                      {(match.address_score * 100).toFixed(0)}%
                                    </strong>
                                  </span>
                                )}
                                {distance >= 0 && (
                                  <span>
                                    Distance: <strong>{distance.toFixed(1)} km</strong>
                                  </span>
                                )}
                              </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
                              <div style={{
                                fontSize: '1.5rem',
                                fontWeight: 'bold',
                                color: getConfidenceColor(match.match_score)
                              }}>
                                {(match.match_score * 100).toFixed(0)}%
                              </div>
                              <button
                                className="btn btn-success btn-sm"
                                onClick={() => handleConfirmMatch(match.id)}
                              >
                                <CheckCircle size={16} />
                                Confirm
                              </button>
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => handleRejectMatch(match.id)}
                              >
                                <XCircle size={16} />
                                Reject
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                      <AlertCircle size={48} style={{ margin: '0 auto 1rem' }} />
                      <p>No potential matches found</p>
                      <button 
                        className="btn btn-danger mt-3"
                        onClick={handleNoMatch}
                      >
                        Mark as No Match Available
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                <Search size={48} style={{ margin: '0 auto 1rem' }} />
                <p>Select an unmatched hotel to see potential matches</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MappingReview;
