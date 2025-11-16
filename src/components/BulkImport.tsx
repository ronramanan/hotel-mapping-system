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

interface FileProgress {
  filename: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: ImportResult;
  error?: string;
}

const BulkImport: React.FC<BulkImportProps> = ({ type }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [supplierCode, setSupplierCode] = useState('');
  const [uploading, setUploading] = useState(false);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [fileProgress, setFileProgress] = useState<FileProgress[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [error, setError] = useState('');
  const [totalResults, setTotalResults] = useState({
    total: 0,
    imported: 0,
    updated: 0,
    failed: 0
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      setFiles(selectedFiles);
      setError('');
      setFileProgress(selectedFiles.map(f => ({
        filename: f.name,
        status: 'pending'
      })));
      setTotalResults({ total: 0, imported: 0, updated: 0, failed: 0 });
    }
  };

  const parseCSVLine = (line: string): string[] => {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    
    return result;
  };

  const parseCSV = (text: string): any[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = parseCSVLine(lines[0]).map(h => 
      h.replace(/^["']|["']$/g, '').trim().toLowerCase()
    );
    
    const hotels = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]).map(v => 
        v.replace(/^["']|["']$/g, '').trim()
      );
      
      const hotel: any = {};

      headers.forEach((header, index) => {
        const value = values[index];
        
        switch (header) {
          case 'hotel_name':
          case 'hotelname':
          case 'name':
            hotel.hotelName = value;
            break;
          case 'supplier_hotel_id':
          case 'hotel_id':
          case 'id':
            if (type === 'supplier') {
              hotel.supplierHotelId = value;
            }
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
          case 'postcode':
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

      if (type === 'supplier' && supplierCode) {
        hotel.supplierCode = supplierCode;
      }

      if (hotel.hotelName && (type === 'master' || hotel.supplierHotelId)) {
        hotels.push(hotel);
      }
    }

    return hotels;
  };

  const uploadInBatches = async (hotels: any[]): Promise<ImportResult> => {
    const batchSize = 10000; // Much larger batches - reduce API calls
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

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Batch ${i + 1} failed: ${errorText}`);
        }

        const batchResult = await response.json();
        totalImported += batchResult.imported || batchResult.created || 0;
        totalUpdated += batchResult.updated || 0;
        totalFailed += batchResult.failed || 0;
        if (batchResult.errors) {
          allErrors.push(...batchResult.errors);
        }
        
        console.log(`Batch ${i + 1}/${batches} completed: ${batchResult.imported || batchResult.created} imported`);
      } catch (err: any) {
        console.error(`Batch ${i + 1} error:`, err);
        totalFailed += batch.length;
        allErrors.push({ hotel: `Batch ${i + 1}`, error: err.message || 'Unknown error' });
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

  const processFile = async (file: File, index: number) => {
    // Update status to processing
    setFileProgress(prev => prev.map((fp, i) => 
      i === index ? { ...fp, status: 'processing' } : fp
    ));

    try {
      const text = await file.text();
      const hotels = parseCSV(text);

      if (hotels.length === 0) {
        throw new Error('No valid hotels found in CSV');
      }

      console.log(`Processing ${file.name}: ${hotels.length} hotels`);

      const uploadResult = await uploadInBatches(hotels);
      
      // Update file progress
      setFileProgress(prev => prev.map((fp, i) => 
        i === index ? { ...fp, status: 'completed', result: uploadResult } : fp
      ));

      // Update total results
      setTotalResults(prev => ({
        total: prev.total + uploadResult.total,
        imported: prev.imported + uploadResult.imported,
        updated: prev.updated + uploadResult.updated,
        failed: prev.failed + uploadResult.failed
      }));

      return uploadResult;
    } catch (err: any) {
      // Update file progress with error
      setFileProgress(prev => prev.map((fp, i) => 
        i === index ? { ...fp, status: 'failed', error: err.message } : fp
      ));
      throw err;
    }
  };

  const handleUploadAll = async () => {
    if (files.length === 0) {
      setError('Please select at least one file');
      return;
    }

    if (type === 'supplier' && !supplierCode.trim()) {
      setError('Please enter a supplier code');
      return;
    }

    setUploading(true);
    setError('');
    setOverallProgress(0);
    setCurrentFileIndex(0);

    try {
      // Process files sequentially
      for (let i = 0; i < files.length; i++) {
        setCurrentFileIndex(i);
        await processFile(files[i], i);
        setOverallProgress(Math.round(((i + 1) / files.length) * 100));
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      // Continue processing remaining files even if one fails
    } finally {
      setUploading(false);
      setOverallProgress(100);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'processing': return '🔄';
      case 'completed': return '✅';
      case 'failed': return '❌';
      default: return '';
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
          <label>CSV Files (select multiple):</label>
          <input
            type="file"
            accept=".csv"
            multiple
            onChange={handleFileChange}
            disabled={uploading}
          />
        </div>

        {files.length > 0 && (
          <div className="file-info">
            <strong>Selected {files.length} file(s):</strong>
            <ul>
              {files.map((f, i) => (
                <li key={i}>{f.name} ({(f.size / 1024 / 1024).toFixed(2)} MB)</li>
              ))}
            </ul>
            <p><strong>Total size:</strong> {(files.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(2)} MB</p>
          </div>
        )}

        <button onClick={handleUploadAll} disabled={uploading || files.length === 0}>
          {uploading ? `Processing file ${currentFileIndex + 1} of ${files.length}...` : '📤 Upload All Files'}
        </button>
      </div>

      {uploading && (
        <div className="overall-progress">
          <h3>Overall Progress: {overallProgress}%</h3>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${overallProgress}%` }}>
              {overallProgress}%
            </div>
          </div>
        </div>
      )}

      {fileProgress.length > 0 && (
        <div className="files-progress">
          <h3>File Status:</h3>
          {fileProgress.map((fp, index) => (
            <div key={index} className={`file-status file-status-${fp.status}`}>
              <div className="file-status-header">
                <span className="status-icon">{getStatusIcon(fp.status)}</span>
                <strong>{fp.filename}</strong>
                <span className="status-text">{fp.status}</span>
              </div>
              
              {fp.result && (
                <div className="file-result">
                  <span>Total: {fp.result.total}</span>
                  <span className="success">Imported: {fp.result.imported}</span>
                  {fp.result.updated > 0 && <span className="info">Updated: {fp.result.updated}</span>}
                  {fp.result.failed > 0 && <span className="error">Failed: {fp.result.failed}</span>}
                </div>
              )}
              
              {fp.error && (
                <div className="file-error">
                  Error: {fp.error}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}

      {!uploading && totalResults.total > 0 && (
        <div className="import-result">
          <h3>🎉 All Files Processed!</h3>
          <div className="result-stats">
            <div className="stat">
              <strong>Total Hotels:</strong> {totalResults.total.toLocaleString()}
            </div>
            <div className="stat success">
              <strong>Successfully Imported:</strong> {totalResults.imported.toLocaleString()}
            </div>
            {totalResults.updated > 0 && (
              <div className="stat info">
                <strong>Updated:</strong> {totalResults.updated.toLocaleString()}
              </div>
            )}
            {totalResults.failed > 0 && (
              <div className="stat error">
                <strong>Failed:</strong> {totalResults.failed.toLocaleString()}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="csv-format-info">
        <h4>Instructions:</h4>
        <ol>
          <li>Select <strong>multiple CSV files</strong> at once (Ctrl+Click or Cmd+Click)</li>
          <li>Click "Upload All Files" - they will be processed <strong>sequentially</strong></li>
          <li>Watch the progress of each file in real-time</li>
          <li>You can leave the page - processing continues in background</li>
        </ol>
        
        <h4>CSV Format:</h4>
        <p>Required: <code>hotel_name</code>{type === 'supplier' && ', '}<code>{type === 'supplier' && 'supplier_hotel_id'}</code></p>
        <p>Optional: <code>address_line1, city, country_code, postal_code, latitude, longitude, phone_number</code></p>
      </div>

      <style>{`
        .bulk-import {
          max-width: 1000px;
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
          margin: 15px 0;
          padding: 15px;
          background: white;
          border-radius: 4px;
          border: 1px solid #ddd;
        }

        .file-info ul {
          margin: 10px 0;
          padding-left: 20px;
        }

        .file-info li {
          margin: 5px 0;
        }

        button {
          background: #007bff;
          color: white;
          padding: 12px 24px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 16px;
          font-weight: bold;
          width: 100%;
        }

        button:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .overall-progress {
          background: #e3f2fd;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
        }

        .progress-bar {
          width: 100%;
          height: 40px;
          background: #e0e0e0;
          border-radius: 4px;
          overflow: hidden;
          margin-top: 10px;
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
          font-size: 18px;
        }

        .files-progress {
          background: white;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
          border: 1px solid #ddd;
        }

        .file-status {
          padding: 15px;
          margin: 10px 0;
          border-radius: 4px;
          border: 2px solid #ddd;
        }

        .file-status-pending {
          background: #f5f5f5;
          border-color: #999;
        }

        .file-status-processing {
          background: #fff3cd;
          border-color: #ffc107;
        }

        .file-status-completed {
          background: #d4edda;
          border-color: #28a745;
        }

        .file-status-failed {
          background: #f8d7da;
          border-color: #dc3545;
        }

        .file-status-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }

        .status-icon {
          font-size: 24px;
        }

        .status-text {
          margin-left: auto;
          text-transform: uppercase;
          font-weight: bold;
          font-size: 12px;
        }

        .file-result {
          display: flex;
          gap: 15px;
          flex-wrap: wrap;
          padding: 10px;
          background: rgba(255, 255, 255, 0.5);
          border-radius: 4px;
        }

        .file-result span {
          padding: 5px 10px;
          border-radius: 3px;
          background: white;
        }

        .file-result .success {
          background: #c8e6c9;
          font-weight: bold;
        }

        .file-result .info {
          background: #b3e5fc;
        }

        .file-result .error {
          background: #ffcdd2;
          font-weight: bold;
        }

        .file-error {
          color: #c62828;
          margin-top: 10px;
          font-weight: bold;
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
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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

        .csv-format-info ol {
          margin: 10px 0;
          padding-left: 25px;
        }

        .csv-format-info li {
          margin: 8px 0;
        }
      `}</style>
    </div>
  );
};

export default BulkImport;
