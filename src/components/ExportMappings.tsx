import React, { useState } from 'react';
import '../App.css';

const ExportMappings: React.FC = () => {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [supplierCode, setSupplierCode] = useState('');
  const [exportAll, setExportAll] = useState(true);

  const handleExport = async () => {
    setExporting(true);
    setError('');

    try {
      let url = `${process.env.REACT_APP_API_ENDPOINT}/export`;
      
      // Add supplier filter if not exporting all
      if (!exportAll && supplierCode.trim()) {
        url += `?supplier=${encodeURIComponent(supplierCode.trim())}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Get the CSV content
      const csvContent = await response.text();
      
      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `hotel-mappings-${Date.now()}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      // Success message
      alert('✅ Mappings exported successfully!');
    } catch (err: any) {
      setError(err.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="export-mappings">
      <h2>📥 Export Hotel Mappings</h2>
      
      <div className="export-info">
        <p>Download a CSV file containing all hotel mappings with master hotel IDs.</p>
      </div>

      <div className="export-form">
        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={exportAll}
              onChange={(e) => setExportAll(e.target.checked)}
            />
            Export all suppliers
          </label>
        </div>

        {!exportAll && (
          <div className="form-group">
            <label>Supplier Code:</label>
            <input
              type="text"
              value={supplierCode}
              onChange={(e) => setSupplierCode(e.target.value)}
              placeholder="e.g., SupplierA"
              disabled={exporting}
            />
          </div>
        )}

        <button 
          onClick={handleExport} 
          disabled={exporting || (!exportAll && !supplierCode.trim())}
          className="export-button"
        >
          {exporting ? '⏳ Exporting...' : '📥 Download CSV'}
        </button>
      </div>

      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}

      <div className="csv-format-info">
        <h4>CSV Columns:</h4>
        <ul>
          <li><code>supplier_code</code> - Your supplier identifier</li>
          <li><code>supplier_hotel_id</code> - Original hotel ID from supplier</li>
          <li><code>supplier_hotel_name</code> - Hotel name from supplier</li>
          <li><code>supplier_address</code> - Address from supplier</li>
          <li><code>supplier_city</code> - City from supplier</li>
          <li><code>supplier_country</code> - Country code from supplier</li>
          <li><code>master_hotel_id</code> - <strong>Mapped master hotel ID</strong> (null if unmapped)</li>
          <li><code>master_hotel_name</code> - Master hotel name</li>
          <li><code>master_address</code> - Master hotel address</li>
          <li><code>master_city</code> - Master hotel city</li>
          <li><code>master_country</code> - Master hotel country</li>
          <li><code>mapping_status</code> - auto_mapped, manually_mapped, pending_review, unmapped</li>
          <li><code>confidence_score</code> - Matching confidence (0-1)</li>
          <li><code>mapping_method</code> - How it was mapped (auto, manual, etc.)</li>
          <li><code>mapped_at</code> - When it was mapped</li>
        </ul>
      </div>

      <style>{`
        .export-mappings {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }

        .export-info {
          background: #e3f2fd;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
        }

        .export-form {
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

        .form-group input[type="text"] {
          width: 100%;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }

        .form-group input[type="checkbox"] {
          margin-right: 8px;
        }

        .export-button {
          background: #4caf50;
          color: white;
          padding: 12px 24px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 16px;
          font-weight: bold;
        }

        .export-button:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .export-button:hover:not(:disabled) {
          background: #45a049;
        }

        .error-message {
          background: #ffebee;
          color: #c62828;
          padding: 15px;
          border-radius: 4px;
          margin: 20px 0;
        }

        .csv-format-info {
          background: #fff3cd;
          padding: 15px;
          border-radius: 4px;
          margin-top: 20px;
        }

        .csv-format-info h4 {
          margin-top: 0;
        }

        .csv-format-info code {
          background: #f8f9fa;
          padding: 2px 6px;
          border-radius: 3px;
          font-family: monospace;
        }

        .csv-format-info ul {
          margin: 10px 0;
          padding-left: 20px;
        }

        .csv-format-info li {
          margin: 5px 0;
        }
      `}</style>
    </div>
  );
};

export default ExportMappings;
