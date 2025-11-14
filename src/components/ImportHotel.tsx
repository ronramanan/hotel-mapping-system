import React, { useState } from 'react';
import { importSupplierHotel } from '../services/hotelMappingService';

const ImportHotel: React.FC = () => {
  const [formData, setFormData] = useState({
    supplierCode: '',
    supplierHotelId: '',
    hotelName: '',
    addressLine1: '',
    city: '',
    countryCode: '',
    postalCode: '',
    latitude: '',
    longitude: '',
    phoneNumber: '',
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.supplierCode || !formData.supplierHotelId || !formData.hotelName) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const result = await importSupplierHotel({
        supplierCode: formData.supplierCode,
        supplierHotelId: formData.supplierHotelId,
        hotelName: formData.hotelName,
        addressLine1: formData.addressLine1 || undefined,
        city: formData.city || undefined,
        countryCode: formData.countryCode || undefined,
        postalCode: formData.postalCode || undefined,
        latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
        longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
        phoneNumber: formData.phoneNumber || undefined,
      });

      setMessage({
        type: 'success',
        text: result.message,
      });

      // Reset form
      setFormData({
        supplierCode: '',
        supplierHotelId: '',
        hotelName: '',
        addressLine1: '',
        city: '',
        countryCode: '',
        postalCode: '',
        latitude: '',
        longitude: '',
        phoneNumber: '',
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to import hotel. Please check your database connection.',
      });
      console.error('Error importing hotel:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const loadSampleData = () => {
    setFormData({
      supplierCode: 'expedia',
      supplierHotelId: 'EXP' + Math.floor(Math.random() * 10000),
      hotelName: 'Hilton Garden Inn Downtown Manhattan',
      addressLine1: '123 Broadway',
      city: 'New York',
      countryCode: 'US',
      postalCode: '10013',
      latitude: '40.7831',
      longitude: '-73.9712',
      phoneNumber: '+1-212-555-0100',
    });
  };

  return (
    <div>
      <h1>Import Supplier Hotel</h1>

      <div className="card">
        {message && (
          <div className={`message message-${message.type}`}>
            {message.text}
          </div>
        )}

        <button
          type="button"
          onClick={loadSampleData}
          className="button button-secondary"
          style={{ marginBottom: '1rem' }}
        >
          Load Sample Data
        </button>

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">
                Supplier Code <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="text"
                name="supplierCode"
                className="form-input"
                value={formData.supplierCode}
                onChange={handleChange}
                placeholder="e.g., expedia, booking, amadeus"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Supplier Hotel ID <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="text"
                name="supplierHotelId"
                className="form-input"
                value={formData.supplierHotelId}
                onChange={handleChange}
                placeholder="Supplier's internal hotel ID"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              Hotel Name <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="text"
              name="hotelName"
              className="form-input"
              value={formData.hotelName}
              onChange={handleChange}
              placeholder="e.g., Hilton Garden Inn New York"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Address</label>
            <input
              type="text"
              name="addressLine1"
              className="form-input"
              value={formData.addressLine1}
              onChange={handleChange}
              placeholder="Street address"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">City</label>
              <input
                type="text"
                name="city"
                className="form-input"
                value={formData.city}
                onChange={handleChange}
                placeholder="e.g., New York"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Country Code</label>
              <input
                type="text"
                name="countryCode"
                className="form-input"
                value={formData.countryCode}
                onChange={handleChange}
                placeholder="e.g., US"
                maxLength={2}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Postal Code</label>
              <input
                type="text"
                name="postalCode"
                className="form-input"
                value={formData.postalCode}
                onChange={handleChange}
                placeholder="e.g., 10013"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input
                type="tel"
                name="phoneNumber"
                className="form-input"
                value={formData.phoneNumber}
                onChange={handleChange}
                placeholder="e.g., +1-212-555-0100"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Latitude</label>
              <input
                type="number"
                name="latitude"
                className="form-input"
                value={formData.latitude}
                onChange={handleChange}
                placeholder="e.g., 40.7831"
                step="any"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Longitude</label>
              <input
                type="number"
                name="longitude"
                className="form-input"
                value={formData.longitude}
                onChange={handleChange}
                placeholder="e.g., -73.9712"
                step="any"
              />
            </div>
          </div>

          <button
            type="submit"
            className="button button-primary"
            disabled={loading}
            style={{ width: '100%' }}
          >
            {loading ? 'Importing...' : 'Import Hotel'}
          </button>
        </form>
      </div>

      <div className="card" style={{ backgroundColor: '#f8f9fa' }}>
        <h3>How it works:</h3>
        <ol style={{ paddingLeft: '1.5rem', color: '#666' }}>
          <li>Fill in the hotel information from your supplier</li>
          <li>Click "Import Hotel" to add it to the system</li>
          <li>The system automatically tries to match it with existing master hotels</li>
          <li>
            High-confidence matches (&gt;90%) are mapped automatically
          </li>
          <li>
            Medium-confidence matches are sent to the Review Queue for manual
            review
          </li>
        </ol>
      </div>
    </div>
  );
};

export default ImportHotel;
