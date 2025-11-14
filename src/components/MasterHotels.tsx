import React, { useState, useEffect } from 'react';
import { getAllMasterHotels } from '../services/apiService';

const MasterHotels: React.FC = () => {
  const [hotels, setHotels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMasterHotels();
  }, []);

  const loadMasterHotels = async () => {
    try {
      setLoading(true);
      const data = await getAllMasterHotels();
      setHotels(data);
    } catch (error) {
      console.error('Error loading master hotels:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading master hotels...</div>;
  }

  return (
    <div>
      <h1>Master Hotels ({hotels.length})</h1>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Hotel Name</th>
              <th>City</th>
              <th>Country</th>
              <th>Address</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {hotels.map((hotel) => (
              <tr key={hotel.id}>
                <td>{hotel.id}</td>
                <td>{hotel.hotel_name}</td>
                <td>{hotel.city || '-'}</td>
                <td>{hotel.country_code || '-'}</td>
                <td>{hotel.address_line1 || '-'}</td>
                <td>
                  <span style={{ color: hotel.status === 'active' ? 'green' : 'gray' }}>
                    {hotel.status}
                  </span>
                </td>
              </tr>
            ))}
            {hotels.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: '#999', padding: '2rem' }}>
                  No master hotels yet. Import your first hotel!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MasterHotels;
