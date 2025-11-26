import React, { useState, useEffect } from 'react';
import { Check, X, AlertCircle, MapPin, Navigation } from 'lucide-react';
import apiService from '../services/apiService';

const ImprovedMappingReview = () => {
  const [hotels, setHotels] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [supplierHotel, setSupplierHotel] = useState(null);
  const [potentialMatches, setPotentialMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    supplier: '',
    country: '',
    city: ''
  });

  useEffect(() => {
    loadUnmatchedHotels();
  }, [filters]);

  useEffect(() => {
    if (hotels.length > 0 && currentIndex < hotels.length) {
      loadPotentialMatches(hotels[currentIndex].id);
    }
  }, [currentIndex, hotels]);

  const loadUnmatchedHotels = async () => {
    try {
      setLoading(true);
      const response = await apiService.getUnmatchedHotels({
        filters: {
          ...filters,
          limit: 100
        }
      });
      setHotels(response.data.hotels || []);
      setCurrentIndex(0);
    } catch (error) {
      console.error('Error loading hotels:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPotentialMatches = async (supplierHotelId) => {
    try {
      const response = await apiService.getPotentialMatches(supplierHotelId);
      setSupplierHotel(response.data.supplierHotel);
      setPotentialMatches(response.data.potentialMatches || []);
    } catch (error) {
      console.error('Error loading matches:', error);
      setSupplierHotel(hotels[currentIndex]);
      setPotentialMatches([]);
    }
  };

  const handleConfirmMatch = async (masterHotelId) => {
    try {
      await apiService.confirmMatch(supplierHotel.id, masterHotelId);
      // Move to next hotel
      if (currentIndex < hotels.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        loadUnmatchedHotels(); // Reload list
      }
    } catch (error) {
      console.error('Error confirming match:', error);
      alert('Failed to confirm match');
    }
  };

  const handleRejectMatch = async (masterHotelId) => {
    try {
      await apiService.rejectMatch(supplierHotel.id, masterHotelId);
      // Remove from potential matches
      setPotentialMatches(potentialMatches.filter(m => m.id !== masterHotelId));
    } catch (error) {
      console.error('Error rejecting match:', error);
    }
  };

  const handleMarkNoMatch = async () => {
    try {
      await apiService.markNoMatch(supplierHotel.id);
      // Move to next hotel
      if (currentIndex < hotels.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        loadUnmatchedHotels();
      }
    } catch (error) {
      console.error('Error marking no match:', error);
    }
  };

  const handleSkip = () => {
    if (currentIndex < hotels.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0); // Loop back
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return (R * c * 1000).toFixed(0); // Return meters
  };

  if (loading) {
    return <div className="p-8 text-center">Loading hotels for review...</div>;
  }

  if (!supplierHotel) {
    return <div className="p-8 text-center">No hotels to review</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Hotel Mapping Review</h1>
            <p className="text-sm text-gray-600 mt-1">
              Reviewing {currentIndex + 1} of {hotels.length} hotels
              {potentialMatches.length > 0 && ` • ${potentialMatches.length} potential matches found`}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSkip}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Skip →
            </button>
            <button
              onClick={handleMarkNoMatch}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
            >
              <X size={16} />
              No Match Available
            </button>
          </div>
        </div>
      </div>

      {/* Supplier Hotel (Left Side) */}
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="bg-blue-50 border-2 border-blue-500 rounded-lg shadow-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                SUPPLIER HOTEL
              </div>
              <span className="text-sm text-gray-600">{supplierHotel.supplier_code}</span>
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{supplierHotel.hotel_name}</h2>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600 font-semibold mb-1">Address</p>
                <p className="text-gray-900">{supplierHotel.address_line1 || 'N/A'}</p>
              </div>
              
              <div>
                <p className="text-gray-600 font-semibold mb-1">Location</p>
                <p className="text-gray-900">
                  {supplierHotel.city || 'N/A'}, {supplierHotel.country_code}
                </p>
              </div>
              
              <div>
                <p className="text-gray-600 font-semibold mb-1">Coordinates</p>
                <p className="text-gray-900 font-mono text-xs">
                  {supplierHotel.latitude?.toFixed(6)}, {supplierHotel.longitude?.toFixed(6)}
                </p>
              </div>
              
              <div>
                <p className="text-gray-600 font-semibold mb-1">Phone</p>
                <p className="text-gray-900">{supplierHotel.phone_number || 'N/A'}</p>
              </div>
            </div>

            {supplierHotel.latitude && supplierHotel.longitude && (
              <a
                href={`https://www.google.com/maps?q=${supplierHotel.latitude},${supplierHotel.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
              >
                <MapPin size={16} />
                View on Google Maps
              </a>
            )}
          </div>
        </div>

        {/* Potential Matches */}
        {potentialMatches.length === 0 ? (
          <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-8 text-center">
            <AlertCircle className="mx-auto mb-4 text-yellow-600" size={48} />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Potential Matches Found</h3>
            <p className="text-gray-600 mb-6">
              No master hotels found within 100 meters of this location.
            </p>
            <button
              onClick={handleMarkNoMatch}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold"
            >
              Mark as No Match Available
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Potential Master Hotel Matches ({potentialMatches.length})
            </h3>
            
            {potentialMatches.map((master, index) => {
              const distance = supplierHotel.latitude && master.latitude
                ? calculateDistance(
                    supplierHotel.latitude,
                    supplierHotel.longitude,
                    master.latitude,
                    master.longitude
                  )
                : null;

              return (
                <div
                  key={master.id}
                  className="bg-white border-2 border-gray-300 rounded-lg shadow p-6 hover:border-green-500 transition-colors"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                      <div className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                        MASTER HOTEL #{index + 1}
                      </div>
                      {distance && (
                        <div className="flex items-center gap-1 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                          <Navigation size={14} />
                          {distance}m away
                        </div>
                      )}
                      {master.match_score && (
                        <div className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-semibold">
                          {(master.match_score * 100).toFixed(0)}% confidence
                        </div>
                      )}
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-gray-900 mb-4">{master.hotel_name}</h3>

                  <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                    <div>
                      <p className="text-gray-600 font-semibold mb-1">Address</p>
                      <p className="text-gray-900">{master.address_line1 || 'N/A'}</p>
                    </div>
                    
                    <div>
                      <p className="text-gray-600 font-semibold mb-1">Location</p>
                      <p className="text-gray-900">
                        {master.city || 'N/A'}, {master.country_code}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-gray-600 font-semibold mb-1">Coordinates</p>
                      <p className="text-gray-900 font-mono text-xs">
                        {master.latitude?.toFixed(6)}, {master.longitude?.toFixed(6)}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-gray-600 font-semibold mb-1">Postal Code</p>
                      <p className="text-gray-900">{master.postal_code || 'N/A'}</p>
                    </div>
                  </div>

                  {master.latitude && master.longitude && (
                    <a
                      href={`https://www.google.com/maps?q=${master.latitude},${master.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mb-4 inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
                    >
                      <MapPin size={16} />
                      View on Google Maps
                    </a>
                  )}

                  <div className="flex gap-3 mt-4 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => handleConfirmMatch(master.id)}
                      className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold flex items-center justify-center gap-2"
                    >
                      <Check size={20} />
                      Confirm Match
                    </button>
                    <button
                      onClick={() => handleRejectMatch(master.id)}
                      className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold flex items-center gap-2"
                    >
                      <X size={20} />
                      Reject
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="max-w-7xl mx-auto mt-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Progress</span>
            <span>{currentIndex + 1} / {hotels.length}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${((currentIndex + 1) / hotels.length) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImprovedMappingReview;
