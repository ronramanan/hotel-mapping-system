import React, { useState, useEffect } from 'react';
import {
  getPendingReviews,
  getPotentialMatches,
  manualMapHotel,
  createMasterAndMap,
} from '../services/apiService';

const ReviewQueue: React.FC = () => {
  const [pendingReviews, setPendingReviews] = useState<any[]>([]);
  const [currentReview, setCurrentReview] = useState<any>(null);
  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);

  useEffect(() => {
    loadPendingReviews();
  }, []);

  const loadPendingReviews = async () => {
    try {
      setLoading(true);
      const reviews = await getPendingReviews();
      setPendingReviews(reviews);
      if (reviews.length > 0 && !currentReview) {
        loadReviewDetails(reviews[0].id);
      }
    } catch (error) {
      console.error('Error loading pending reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadReviewDetails = async (supplierHotelId: number) => {
    try {
      const details = await getPotentialMatches(supplierHotelId);
      setCurrentReview(details);
      setSelectedMatchId(null);
    } catch (error) {
      console.error('Error loading review details:', error);
    }
  };

  const handleAcceptMatch = async () => {
    if (!selectedMatchId || !currentReview) return;

    try {
      await manualMapHotel(currentReview.supplierHotel.id, selectedMatchId);
      setMessage({ type: 'success', text: 'Hotel mapped successfully!' });
      
      // Move to next review
      const remaining = pendingReviews.filter(r => r.id !== currentReview.supplierHotel.id);
      setPendingReviews(remaining);
      
      if (remaining.length > 0) {
        setTimeout(() => {
          loadReviewDetails(remaining[0].id);
          setMessage(null);
        }, 1000);
      } else {
        setCurrentReview(null);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to map hotel' });
    }
  };

  const handleCreateNew = async () => {
    if (!currentReview) return;

    const sh = currentReview.supplierHotel;
    
    try {
      await createMasterAndMap(sh.id, {
        hotelName: sh.hotel_name,
        addressLine1: sh.address_line1,
        city: sh.city,
        countryCode: sh.country_code,
        postalCode: sh.postal_code,
        latitude: sh.latitude,
        longitude: sh.longitude,
        phoneNumber: sh.phone_number,
      });
      
      setMessage({ type: 'success', text: 'New master hotel created!' });
      
      const remaining = pendingReviews.filter(r => r.id !== sh.id);
      setPendingReviews(remaining);
      
      if (remaining.length > 0) {
        setTimeout(() => {
          loadReviewDetails(remaining[0].id);
          setMessage(null);
        }, 1000);
      } else {
        setCurrentReview(null);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to create master hotel' });
    }
  };

  if (loading) {
    return <div className="loading">Loading review queue...</div>;
  }

  if (pendingReviews.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">✅</div>
        <h3>All Caught Up!</h3>
        <p>No hotels pending manual review</p>
      </div>
    );
  }

  if (!currentReview) {
    return <div className="loading">Loading review details...</div>;
  }

  const sh = currentReview.supplierHotel;
  const matches = currentReview.potentialMatches;

  return (
    <div>
      <h1>Review Queue ({pendingReviews.length} remaining)</h1>

      {message && (
        <div className={`message message-${message.type}`}>{message.text}</div>
      )}

      <div className="review-item">
        <div className="review-header">
          <div>
            <strong>{sh.supplier_code.toUpperCase()}</strong> - ID: {sh.supplier_hotel_id}
          </div>
          <div>{pendingReviews.length} remaining</div>
        </div>

        <div className="review-body">
          <div className="hotel-column">
            <div className="column-title">📍 Supplier Hotel</div>
            <div className="hotel-name">{sh.hotel_name}</div>
            <div className="hotel-detail">
              <span className="detail-label">Address:</span>
              <span className="detail-value">{sh.address_line1 || 'N/A'}</span>
            </div>
            <div className="hotel-detail">
              <span className="detail-label">City:</span>
              <span className="detail-value">{sh.city || 'N/A'}</span>
            </div>
            <div className="hotel-detail">
              <span className="detail-label">Country:</span>
              <span className="detail-value">{sh.country_code || 'N/A'}</span>
            </div>
            <div className="hotel-detail">
              <span className="detail-label">Coordinates:</span>
              <span className="detail-value">
                {sh.latitude && sh.longitude
                  ? `${sh.latitude}, ${sh.longitude}`
                  : 'N/A'}
              </span>
            </div>
          </div>

          <div className="hotel-column">
            <div className="column-title">
              ✓ Potential Matches ({matches.length})
            </div>
            {matches.length > 0 ? (
              matches.map((match: any) => {
                const scoreClass =
                  match.match_score >= 0.85
                    ? 'high'
                    : match.match_score >= 0.70
                    ? 'medium'
                    : 'low';

                return (
                  <div
                    key={match.id}
                    className={`potential-match ${
                      selectedMatchId === match.master_hotel_id ? 'selected' : ''
                    }`}
                    onClick={() => setSelectedMatchId(match.master_hotel_id)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <strong>{match.hotel_name}</strong>
                      <span className={`match-score ${scoreClass}`}>
                        {(match.match_score * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="hotel-detail">
                      <span className="detail-label">Address:</span>
                      <span className="detail-value">{match.address_line1 || 'N/A'}</span>
                    </div>
                    {match.match_criteria?.distanceMeters && (
                      <div className="hotel-detail">
                        <span className="detail-label">Distance:</span>
                        <span className="detail-value">
                          {match.match_criteria.distanceMeters}m away
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>
                No potential matches found
              </div>
            )}
          </div>
        </div>

        <div className="actions">
          <button
            className="button button-secondary"
            onClick={() => {
              const remaining = pendingReviews.filter(r => r.id !== sh.id);
              if (remaining.length > 0) {
                loadReviewDetails(remaining[0].id);
              }
            }}
          >
            Skip
          </button>
          <button
            className="button button-danger"
            onClick={handleCreateNew}
          >
            Create New Master
          </button>
          <button
            className="button button-success"
            onClick={handleAcceptMatch}
            disabled={!selectedMatchId}
          >
            Accept Selected Match
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReviewQueue;
