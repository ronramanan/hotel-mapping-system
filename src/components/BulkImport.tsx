import React, { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
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
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed';
  result?: ImportResult;
  error?: string;
  uploadProgress?: number;
}

interface ImportJob {
  id: number;
  filename: string;
  file_type: string;
  status: string;
  total_records: number;
  imported_records: number;
  failed_records: number;
  started_at: string;
  completed_at?: string;
  processing_time_seconds?: number;
}

const EnhancedBulkImport: React.FC<BulkImportProps> = ({ type }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [supplierCode, setSupplierCode] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadMode, setUploadMode] = useState<'browser' | 's3'>('s3'); // Default to S3
  const [dragActive, setDragActive] = useState(false);
  const [fileProgress, setFileProgress] = useState<FileProgress[]>([]);
  const [importJobs, setImportJobs] = useState<ImportJob[]>([]);
  const [showJobs, setShowJobs] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const [error, setError] = useState('');
  const [totalResults, setTotalResults] = useState({
    total: 0,
    imported: 0,
    updated: 0,
    failed: 0
  });

  const apiEndpoint = process.env.REACT_APP_API_ENDPOINT || '';

  // Fetch import jobs
  const fetchImportJobs = useCallback(async () => {
    try {
      const response = await axios.get(`${apiEndpoint}/import-jobs`);
      if (response.data && response.data.jobs) {
        setImportJobs(response.data.jobs);
      }
    } catch (err) {
      console.error('Failed to fetch import jobs:', err);
    }
  }, [apiEndpoint]);

  // Auto-refresh import jobs
  useEffect(() => {
    if (autoRefresh && showJobs) {
      const interval = setInterval(fetchImportJobs, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, showJobs, fetchImportJobs]);

  // Handle drag and drop
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const csvFiles = Array.from(e.dataTransfer.files).filter(file => 
        file.name.endsWith('.csv')
      );
      
      if (csvFiles.length === 0) {
        setError('Please select CSV files only');
        return;
      }
      
      setFiles(csvFiles);
      setError('');
      setFileProgress(csvFiles.map(f => ({
        filename: f.name,
        status: 'pending'
      })));
    }
  }, []);

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

  // Upload file to S3 using presigned URL
  const uploadFileToS3 = async (file: File, index: number): Promise<boolean> => {
    try {
      // Update status to uploading
      setFileProgress(prev => prev.map((fp, i) => 
        i === index ? { ...fp, status: 'uploading', uploadProgress: 0 } : fp
      ));

      // Get presigned URL
      const presignedResponse = await axios.post(`${apiEndpoint}/presigned-url`, {
        fileName: file.name,
        fileType: type
      });

      const { uploadUrl } = presignedResponse.data;

      // Upload directly to S3
      await axios.put(uploadUrl, file, {
        headers: {
          'Content-Type': 'text/csv'
        },
        onUploadProgress: (progressEvent) => {
          const progress = progressEvent.total 
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 0;
          
          setFileProgress(prev => prev.map((fp, i) => 
            i === index ? { ...fp, uploadProgress: progress } : fp
          ));
        }
      });

      // Update status to processing (Lambda will handle it)
      setFileProgress(prev => prev.map((fp, i) => 
        i === index ? { ...fp, status: 'processing', uploadProgress: 100 } : fp
      ));

      // Start auto-refresh to monitor progress
      setAutoRefresh(true);
      setShowJobs(true);

      return true;
    } catch (err: any) {
      console.error(`Failed to upload ${file.name}:`, err);
      setFileProgress(prev => prev.map((fp, i) => 
        i === index ? { ...fp, status: 'failed', error: err.message } : fp
      ));
      return false;
    }
  };

  // Browser-based upload (existing functionality)
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

  const parseCSV = (csvText: string, fileType: 'master' | 'supplier') => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headerLine = parseCSVLine(lines[0]);
    const headers = headerLine.map(h => h.toLowerCase().replace(/['"]/g, ''));
    const hotels: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const hotel: any = {};

      headers.forEach((header, index) => {
        const value = values[index] ? values[index].replace(/['"]/g, '') : '';
        
        switch (header) {
          case 'id':
          case 'hotel_id':
          case 'hotelid':
          case 'master_id':
            if (fileType === 'master') {
              hotel.hotelId = value;
            }
            break;
          case 'hotel_name':
          case 'hotelname':
          case 'name':
            hotel.hotelName = value;
            break;
          case 'supplier_hotel_id':
          case 'supplierhotelid':
            if (fileType === 'supplier') {
              hotel.supplierHotelId = value;
            }
            break;
          case 'supplier_code':
          case 'suppliercode':
            if (fileType === 'supplier') {
              hotel.supplierCode = value || supplierCode;
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

      if (hotel.hotelName) {
        hotels.push(hotel);
      }
    }

    return hotels;
  };

  const uploadInBatches = async (hotels: any[]): Promise<ImportResult> => {
    const batchSize = 10000;
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
        const response = await fetch(`${apiEndpoint}${endpoint}`, {
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

  const processFileBrowser = async (file: File, index: number) => {
    setFileProgress(prev => prev.map((fp, i) => 
      i === index ? { ...fp, status: 'processing' } : fp
    ));

    try {
      const text = await file.text();
      const hotels = parseCSV(text, type);

      if (hotels.length === 0) {
        throw new Error('No valid hotels found in CSV');
      }

      const uploadResult = await uploadInBatches(hotels);
      
      setFileProgress(prev => prev.map((fp, i) => 
        i === index ? { ...fp, status: 'completed', result: uploadResult } : fp
      ));

      setTotalResults(prev => ({
        total: prev.total + uploadResult.total,
        imported: prev.imported + uploadResult.imported,
        updated: prev.updated + uploadResult.updated,
        failed: prev.failed + uploadResult.failed
      }));

      return uploadResult;
    } catch (err: any) {
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

    try {
      if (uploadMode === 's3') {
        // S3 Upload Mode - Files are processed by Lambda
        let successCount = 0;
        for (let i = 0; i < files.length; i++) {
          const success = await uploadFileToS3(files[i], i);
          if (success) successCount++;
          setOverallProgress(Math.round(((i + 1) / files.length) * 100));
        }
        
        if (successCount > 0) {
          setError('');
          alert(`✅ ${successCount} file(s) uploaded to S3! Lambda is processing them in the background. Check the Import Jobs tab for progress.`);
        }
      } else {
        // Browser Upload Mode - Process locally
        for (let i = 0; i < files.length; i++) {
          await processFileBrowser(files[i], i);
          setOverallProgress(Math.round(((i + 1) / files.length) * 100));
        }
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(`Upload failed: ${err.message || 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '-';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#4caf50';
      case 'processing': return '#2196f3';
      case 'failed': return '#f44336';
      case 'completed_with_errors': return '#ff9800';
      default: return '#757575';
    }
  };

  return (
    <div className="enhanced-bulk-import">
      <h2>{type === 'master' ? 'Import Master Hotels' : 'Import Supplier Hotels'}</h2>
      
      {/* Upload Mode Selector */}
      <div className="upload-mode-selector">
        <label className="mode-option">
          <input 
            type="radio" 
            value="s3" 
            checked={uploadMode === 's3'}
            onChange={(e) => setUploadMode(e.target.value as 's3' | 'browser')}
            disabled={uploading}
          />
          <span className="mode-label">
            <strong>🚀 S3 Upload (Recommended)</strong>
            <small>Fast, reliable, handles millions of records</small>
          </span>
        </label>
        <label className="mode-option">
          <input 
            type="radio" 
            value="browser" 
            checked={uploadMode === 'browser'}
            onChange={(e) => setUploadMode(e.target.value as 's3' | 'browser')}
            disabled={uploading}
          />
          <span className="mode-label">
            <strong>🌐 Browser Upload</strong>
            <small>Direct processing, good for small files</small>
          </span>
        </label>
      </div>

      <div className="import-form">
        {type === 'supplier' && (
          <div className="form-group">
            <label>Supplier Code (optional for filename extraction):</label>
            <input 
              type="text" 
              value={supplierCode} 
              onChange={(e) => setSupplierCode(e.target.value)} 
              placeholder="e.g., expedia, booking, agoda"
              disabled={uploading}
            />
          </div>
        )}

        {/* Drag and Drop Area */}
        <div
          className={`drop-zone ${dragActive ? 'drag-active' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="drop-zone-content">
            <span className="drop-icon">📁</span>
            <p>Drag and drop CSV files here</p>
            <p className="drop-zone-or">or</p>
            <label htmlFor="file-upload" className="file-upload-label">
              Browse Files
              <input
                id="file-upload"
                type="file"
                multiple
                accept=".csv"
                onChange={handleFileChange}
                disabled={uploading}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        </div>

        {files.length > 0 && (
          <div className="file-info">
            <strong>{files.length} file(s) selected:</strong>
            <ul>
              {files.map((file, index) => (
                <li key={index}>
                  {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  {fileProgress[index] && (
                    <span className="file-status-inline" style={{ 
                      color: getStatusColor(fileProgress[index].status) 
                    }}>
                      {' '}- {fileProgress[index].status}
                      {fileProgress[index].uploadProgress !== undefined && 
                        fileProgress[index].uploadProgress! < 100 && 
                        ` (${fileProgress[index].uploadProgress}%)`}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <button onClick={handleUploadAll} disabled={uploading || files.length === 0}>
          {uploading ? 'Uploading...' : `Upload All Files (${uploadMode === 's3' ? 'S3' : 'Browser'})`}
        </button>
      </div>

      {/* Progress Section */}
      {uploading && (
        <div className="overall-progress">
          <h3>Upload Progress</h3>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${overallProgress}%` }}>
              {overallProgress}%
            </div>
          </div>
          {uploadMode === 's3' && overallProgress === 100 && (
            <p className="info-message">
              ✅ Files uploaded to S3! Lambda is processing them in the background.
              You can close this window - processing will continue.
            </p>
          )}
        </div>
      )}

      {/* Import Jobs Section */}
      <div className="import-jobs-section">
        <div className="jobs-header">
          <h3>
            Import Jobs 
            <button 
              className="toggle-jobs-btn"
              onClick={() => {
                setShowJobs(!showJobs);
                if (!showJobs) fetchImportJobs();
              }}
            >
              {showJobs ? '▼' : '▶'}
            </button>
          </h3>
          {showJobs && (
            <div className="jobs-controls">
              <label>
                <input 
                  type="checkbox" 
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                />
                Auto-refresh
              </label>
              <button onClick={fetchImportJobs} className="refresh-btn">
                🔄 Refresh
              </button>
            </div>
          )}
        </div>

        {showJobs && (
          <div className="import-jobs-list">
            {importJobs.length === 0 ? (
              <p>No import jobs found</p>
            ) : (
              <table className="jobs-table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Filename</th>
                    <th>Type</th>
                    <th>Total</th>
                    <th>Imported</th>
                    <th>Failed</th>
                    <th>Duration</th>
                    <th>Started</th>
                  </tr>
                </thead>
                <tbody>
                  {importJobs.map(job => (
                    <tr key={job.id}>
                      <td>
                        <span className="job-status" style={{ 
                          backgroundColor: getStatusColor(job.status),
                          color: 'white',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '12px'
                        }}>
                          {job.status}
                        </span>
                      </td>
                      <td>{job.filename}</td>
                      <td>{job.file_type}</td>
                      <td>{job.total_records?.toLocaleString() || '-'}</td>
                      <td>{job.imported_records?.toLocaleString() || '0'}</td>
                      <td>{job.failed_records?.toLocaleString() || '0'}</td>
                      <td>{formatDuration(job.processing_time_seconds)}</td>
                      <td>{formatDate(job.started_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}

      {!uploading && totalResults.total > 0 && uploadMode === 'browser' && (
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
          <li>Choose upload mode: <strong>S3 (recommended)</strong> for large files or Browser for small files</li>
          <li>Drag & drop or browse to select CSV files</li>
          <li>Click "Upload All Files" to start processing</li>
          <li>For S3 mode: Files process in background, check Import Jobs for status</li>
        </ol>
        
        <h4>CSV Format:</h4>
        {type === 'master' ? (
          <p>Required: <code>id</code> or <code>hotel_id</code>, <code>hotel_name</code></p>
        ) : (
          <p>Required: <code>hotel_name</code>, <code>supplier_hotel_id</code></p>
        )}
        <p>Optional: <code>address_line1, city, country_code, postal_code, latitude, longitude, phone_number</code></p>
      </div>

      <style>{`
        .enhanced-bulk-import {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }

        .upload-mode-selector {
          display: flex;
          gap: 20px;
          margin-bottom: 20px;
          padding: 15px;
          background: #f0f0f0;
          border-radius: 8px;
        }

        .mode-option {
          flex: 1;
          display: flex;
          align-items: center;
          cursor: pointer;
          padding: 10px;
          border-radius: 4px;
          transition: background-color 0.3s;
        }

        .mode-option:hover {
          background: #e0e0e0;
        }

        .mode-option input[type="radio"] {
          margin-right: 10px;
        }

        .mode-label {
          display: flex;
          flex-direction: column;
        }

        .mode-label small {
          color: #666;
          margin-top: 4px;
        }

        .drop-zone {
          border: 2px dashed #ccc;
          border-radius: 8px;
          padding: 40px;
          text-align: center;
          margin: 20px 0;
          background: #fafafa;
          transition: all 0.3s;
        }

        .drop-zone.drag-active {
          border-color: #4caf50;
          background: #e8f5e9;
        }

        .drop-zone-content {
          pointer-events: none;
        }

        .drop-icon {
          font-size: 48px;
          display: block;
          margin-bottom: 10px;
        }

        .drop-zone-or {
          color: #999;
          margin: 10px 0;
        }

        .file-upload-label {
          display: inline-block;
          padding: 10px 20px;
          background: #007bff;
          color: white;
          border-radius: 4px;
          cursor: pointer;
          pointer-events: all;
        }

        .file-upload-label:hover {
          background: #0056b3;
        }

        .file-status-inline {
          font-weight: bold;
          margin-left: 10px;
        }

        .import-jobs-section {
          margin-top: 30px;
          padding: 20px;
          background: #f9f9f9;
          border-radius: 8px;
        }

        .jobs-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }

        .jobs-header h3 {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 0;
        }

        .toggle-jobs-btn {
          background: transparent;
          border: none;
          cursor: pointer;
          font-size: 18px;
          padding: 5px;
        }

        .jobs-controls {
          display: flex;
          gap: 15px;
          align-items: center;
        }

        .refresh-btn {
          padding: 5px 10px;
          background: #4caf50;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        .jobs-table {
          width: 100%;
          border-collapse: collapse;
          background: white;
          border-radius: 4px;
          overflow: hidden;
        }

        .jobs-table th {
          background: #f0f0f0;
          padding: 10px;
          text-align: left;
          font-weight: 600;
        }

        .jobs-table td {
          padding: 10px;
          border-top: 1px solid #e0e0e0;
        }

        .job-status {
          display: inline-block;
          text-transform: uppercase;
          font-weight: bold;
        }

        .info-message {
          background: #e3f2fd;
          color: #1976d2;
          padding: 15px;
          border-radius: 4px;
          margin-top: 15px;
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

export default EnhancedBulkImport;
