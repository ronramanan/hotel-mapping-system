import React, { useState } from 'react';
import '../App.css';

interface BulkImportProps {
  type: 'supplier' | 'master';
}

interface ImportResult {
  total: number;
  imported: number;
  updated: number;
  failed: number;
  errors: Array<{ hotel: string; error: string }>;
}

const BulkImport: React.FC<BulkImportProps> = ({ type }) => {
  const [file, setFile] = useState<File | null>(null);
  const [supplierCode, setSupplierCode] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError('');
      setResult(null);
    }
  };

  const parseCSV = (text: string): any[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const hotels = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const hotel: any = {};

      headers.forEach((header, index) => {
        const value = values[index];
        
        // Map CSV headers to our field names
        switch (header) {
          case 'hotel_name':
          case 'hotelname':
          case 'name':
            hotel.hotelName = value;
            break;
          case 'supplier_hotel_id':
          case 'hotel_id':
          case 'id':
            hotel.supplierHotelId = value;
            break;
          case 'address':
          case 'address_line1':
          case 'addressline1':
            hotel.addressLine1 = value;
            break;
          case 'city':
            hotel.city = value;
            break;
          case 'country_code':
          case 'country':
            hotel.countryCode = value;
            break;
          case 'postal_code':
          case 'zip':
          case 'zipcode':
            hotel.postalCode = value;
            break;
          case 'latitude':
          case 'lat':
            hotel.latitude = value ? parseFloat(value) : null;
            break;
          case 'longitude':
          case 'lon':
          case 'lng':
            hotel.longitude = value ? parseFloat(value) : null;
            break;
          case 'phone':
          case 'phone_number':
            hotel.phoneNumber = value;
            break;
        }
      });

      // Add supplier code for supplier imports
      if (type === 'supplier' && supplierCode) {
        hotel.supplierCode = supplierCode;
      }

      // Only add if has required fields
      if (hotel.hotelName && (type === 'master' || hotel.supplierHotelId)) {
        hotels.push(hotel);
      }
    }

    return hotels;
  };

  const uploadInBatches = async (hotels: any[]) => {
    const batchSize = 500; // Send 500 hotels at a time
    const batches = Math.ceil(hotels.length / batchSize);
    let totalImported = 0;
    let totalUpdated = 0;
    let totalFailed = 0;
    const allErrors: Array<{ hotel: string; error: string }> = [];

    for (let i = 0; i < batches; i++) {
      const start = i * batchSize;
      const end = Math.min(start + batchSize, hotels.length);
      const batch = hotels.slice(start, end);

      try {
        const endpoint = type === 'supplier' ? '/bulk-import' : '/bulk-create-masters';
        const response = await fetch(`${process.env.REACT_APP_API_ENDPOINT}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hotels: batch }),
        });

        if (!response.ok) throw new Error(`Batch ${i + 1} failed`);

        const batchResult = await response.json();
        totalImported += batchResult.imported || batchResult.created || 0;
        totalUpdated += batchResult.updated || 0;
        totalFailed += batchResult.failed || 0;
        if (batchResult.errors) {
          allErrors.push(...batchResult.errors);
        }

        setProgress(Math.round(((i + 1) / batches) * 100));
      } catch (err) {
        console.error(`Batch ${i + 1} error:`, err);
        totalFailed += batch.length;
      }
    }

    return {
      total: hotels.length,
      imported: totalImported,
      updated: totalUpdated,
      failed: totalFailed,
      errors: allErrors,
    };
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    if (type === 'supplier' && !supplierCode.trim()) {
      setError('Please enter a supplier code');
      return;
    }

    setUploading(true);
    setProgress(0);
    setError('');
    setResult(null);

    try {
      const text = await file.text();
      const hotels = parseCSV(text);

      if (hotels.length === 0) {
        throw new Error('No valid hotels found in CSV. Check your column headers.');
      }

      console.log(`Parsed ${hotels.length} hotels from CSV`);

      const uploadResult = await uploadInBatches(hotels);
      setResult(uploadResult);
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="bulk-import">
      <h2>Bulk {type === 'supplier' ? 'Supplier' : 'Master'} Import</h2>

      <div className="import-form">
        {type === 'supplier' && (
          <div className="form-group">
            <label>Supplier Code:</label>
            <input
              type="text"
              value={supplierCode}
              onChange={(e) => setSupplierCode(e.target.value)}
              placeholder="e.g., SupplierA"
              disabled={uploading}
            />
          </div>
        )}

        <div className="form-group">
          <label>CSV File:</label>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            disabled={uploading}
          />
        </div>

        {file && (
          <div className="file-info">
            Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
          </div>
        )}

        <button onClick={handleUpload} disabled={uploading || !file}>
          {uploading ? 'Uploading...' : 'Upload CSV'}
        </button>
      </div>

      {uploading && (
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }}>
            {progress}%
          </div>
        </div>
      )}

      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}

      {result && (
        <div className="import-result">
          <h3>Import Complete!</h3>
          <div className="result-stats">
            <div className="stat">
              <strong>Total:</strong> {result.total}
            </div>
            <div className="stat success">
              <strong>Imported:</strong> {result.imported}
            </div>
            {result.updated > 0 && (
              <div className="stat info">
                <strong>Updated:</strong> {result.updated}
              </div>
            )}
            {result.failed > 0 && (
              <div className="stat error">
                <strong>Failed:</strong> {result.failed}
              </div>
            )}
          </div>

          {result.errors && result.errors.length > 0 && (
            <div className="error-list">
              <h4>Errors ({result.errors.length}):</h4>
              <ul>
                {result.errors.slice(0, 10).map((err, idx) => (
                  <li key={idx}>
                    {err.hotel}: {err.error}
                  </li>
                ))}
                {result.errors.length > 10 && (
                  <li>... and {result.errors.length - 10} more</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="csv-format-info">
        <h4>CSV Format:</h4>
        <p>Required columns:</p>
        <ul>
          <li><code>hotel_name</code> - Hotel name</li>
          {type === 'supplier' && (
            <li><code>supplier_hotel_id</code> - Unique ID from supplier</li>
          )}
        </ul>
        <p>Optional columns:</p>
        <ul>
          <li><code>address_line1</code></li>
          <li><code>city</code></li>
          <li><code>country_code</code> (2-letter, e.g., US, GB)</li>
          <li><code>postal_code</code></li>
          <li><code>latitude</code></li>
          <li><code>longitude</code></li>
          <li><code>phone_number</code></li>
        </ul>
      </div>

      <style>{`
        .bulk-import {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }

        .import-form {
          background: #f5f5f5;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
        }

        .form-group {
          margin-bottom: 15px;
        }

        .form-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: bold;
        }

        .form-group input {
          width: 100%;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }

        .file-info {
          margin: 10px 0;
          color: #666;
        }

        button {
          background: #007bff;
          color: white;
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 16px;
        }

        button:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .progress-bar {
          width: 100%;
          height: 30px;
          background: #e0e0e0;
          border-radius: 4px;
          overflow: hidden;
          margin: 20px 0;
        }

        .progress-fill {
          height: 100%;
          background: #4caf50;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          transition: width 0.3s;
        }

        .error-message {
          background: #ffebee;
          color: #c62828;
          padding: 15px;
          border-radius: 4px;
          margin: 20px 0;
        }

        .import-result {
          background: #e8f5e9;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }

        .result-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 15px;
          margin: 15px 0;
        }

        .stat {
          background: white;
          padding: 15px;
          border-radius: 4px;
          text-align: center;
        }

        .stat.success {
          background: #c8e6c9;
        }

        .stat.info {
          background: #b3e5fc;
        }

        .stat.error {
          background: #ffcdd2;
        }

        .error-list {
          margin-top: 15px;
          background: white;
          padding: 15px;
          border-radius: 4px;
        }

        .error-list ul {
          margin: 10px 0;
          padding-left: 20px;
        }

        .csv-format-info {
          background: #fff3cd;
          padding: 15px;
          border-radius: 4px;
          margin-top: 20px;
        }

        .csv-format-info code {
          background: #f8f9fa;
          padding: 2px 6px;
          border-radius: 3px;
          font-family: monospace;
        }
      `}</style>
    </div>
  );
};

export default BulkImport;

