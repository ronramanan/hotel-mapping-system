import React, { useEffect, useState } from 'react';
import '../App.css';

interface PendingReview {
  id: number;
  supplier_code: string;
  hotel_name: string;
  city: string;
  country_code: string;
  potential_matches_count: number;
}

const PendingReviews: React.FC = () => {
  const [reviews, setReviews] = useState<PendingReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPendingReviews();
  }, []);

  const fetchPendingReviews = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${process.env.REACT_APP_API_ENDPOINT}/reviews`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch pending reviews');
      }

      const data = await response.json();
      setReviews(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load pending reviews');
    } finally {
      setLoading(false);
    }
  };

  const handleReviewClick = (id: number) => {
    // Navigate to review details page (implement later)
    alert(`Review hotel ID: ${id}`);
  };

  return (
    <div className="pending-reviews">
      <h2>📋 Pending Reviews</h2>

      <div className="reviews-info">
        <p>Hotels that require manual review for mapping</p>
      </div>

      {loading && (
        <div className="loading">
          ⏳ Loading pending reviews...
        </div>
      )}

      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}

      {!loading && !error && reviews.length === 0 && (
        <div className="empty-state">
          <h3>🎉 No pending reviews!</h3>
          <p>All hotels have been mapped or are unmapped.</p>
        </div>
      )}

      {!loading && !error && reviews.length > 0 && (
        <div className="reviews-list">
          <div className="reviews-header">
            <strong>Found {reviews.length} hotels pending review</strong>
          </div>

          <table className="reviews-table">
            <thead>
              <tr>
                <th>Hotel Name</th>
                <th>Supplier</th>
                <th>City</th>
                <th>Country</th>
                <th>Potential Matches</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((review) => (
                <tr key={review.id}>
                  <td>{review.hotel_name}</td>
                  <td>{review.supplier_code}</td>
                  <td>{review.city || '-'}</td>
                  <td>{review.country_code || '-'}</td>
                  <td className="matches-count">{review.potential_matches_count}</td>
                  <td>
                    <button
                      onClick={() => handleReviewClick(review.id)}
                      className="review-button"
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <style>{`
        .pending-reviews {
          max-width: 1400px;
          margin: 0 auto;
          padding: 20px;
        }

        .reviews-info {
          background: #e3f2fd;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
        }

        .loading {
          text-align: center;
          padding: 40px;
          font-size: 18px;
        }

        .error-message {
          background: #ffebee;
          color: #c62828;
          padding: 15px;
          border-radius: 4px;
          margin: 20px 0;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          background: #f5f5f5;
          border-radius: 8px;
        }

        .empty-state h3 {
          margin: 0 0 10px 0;
          color: #4caf50;
        }

        .reviews-list {
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          overflow: hidden;
        }

        .reviews-header {
          padding: 15px 20px;
          background: #f5f5f5;
          border-bottom: 1px solid #ddd;
        }

        .reviews-table {
          width: 100%;
          border-collapse: collapse;
        }

        .reviews-table th {
          background: #667eea;
          color: white;
          padding: 12px;
          text-align: left;
          font-weight: 600;
        }

        .reviews-table td {
          padding: 12px;
          border-bottom: 1px solid #eee;
        }

        .reviews-table tbody tr:hover {
          background: #f5f5f5;
        }

        .matches-count {
          text-align: center;
          font-weight: bold;
          color: #ff9800;
        }

        .review-button {
          background: #4caf50;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
        }

        .review-button:hover {
          background: #45a049;
        }

        @media (max-width: 768px) {
          .reviews-table {
            font-size: 14px;
          }

          .reviews-table th,
          .reviews-table td {
            padding: 8px;
          }
        }
      `}</style>
    </div>
  );
};

export default PendingReviews;
