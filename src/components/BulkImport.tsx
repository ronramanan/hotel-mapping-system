import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { apiService } from '../services/apiService';

interface ImportJob {
  id: number;
  filename: string;
  status: string;
  progress: number;
  message?: string;
}

const BulkImport: React.FC = () => {
  const [fileType, setFileType] = useState<'master' | 'supplier'>('supplier');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [importJobs, setImportJobs] = useState<ImportJob[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        setError('Please select a CSV file');
        return;
      }
      setSelectedFile(file);
      setError(null);
      setSuccess(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      setSuccess(null);
      setUploadProgress(0);

      // Get presigned URL
      const { uploadUrl, key } = await apiService.getPresignedUrl(
        selectedFile.name,
        fileType
      );

      // Upload file to S3
      await apiService.uploadFile(uploadUrl, selectedFile, (progress) => {
        setUploadProgress(progress);
      });

      setSuccess(`File uploaded successfully! Processing will begin shortly.`);
      
      // Add to import jobs
      const newJob: ImportJob = {
        id: Date.now(),
        filename: selectedFile.name,
        status: 'processing',
        progress: 0,
        message: 'File uploaded, processing started...'
      };
      setImportJobs([newJob, ...importJobs]);

      // Reset form
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setUploadProgress(0);

    } catch (err: any) {
      setError(err.message || 'Failed to upload file');
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const getFileTypeDescription = () => {
    if (fileType === 'master') {
      return 'Upload a CSV file containing master hotel data. This will be your reference database.';
    }
    return 'Upload a CSV file containing supplier hotel data. The system will attempt to match these with master hotels.';
  };

  const getExpectedColumns = () => {
    const columns = fileType === 'master' 
      ? ['Hotel ID', 'Hotel Name', 'Address', 'City', 'Country Code', 'Postal Code', 'Latitude', 'Longitude']
      : ['Supplier ID', 'Hotel Name', 'Address', 'City', 'Country Code', 'Postal Code', 'Latitude', 'Longitude', 'Phone'];
    
    return columns;
  };

  return (
    <div className="bulk-import">
      <h1>Bulk Import Hotels</h1>
      
      {/* File Type Selection */}
      <div className="card mb-4">
        <div className="card-header">
          <h2 className="card-title">Select Import Type</h2>
        </div>
        <div className="card-body">
          <div className="form-group">
            <label className="form-label">Import Type</label>
            <select 
              className="form-control form-select"
              value={fileType}
              onChange={(e) => setFileType(e.target.value as 'master' | 'supplier')}
              disabled={uploading}
            >
              <option value="supplier">Supplier Hotels</option>
              <option value="master">Master Hotels</option>
            </select>
          </div>
          <p className="text-secondary">{getFileTypeDescription()}</p>
        </div>
      </div>

      {/* File Upload */}
      <div className="card mb-4">
        <div className="card-header">
          <h2 className="card-title">Upload CSV File</h2>
        </div>
        <div className="card-body">
          <div className="upload-zone">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              disabled={uploading}
              style={{ display: 'none' }}
            />
            
            <div 
              className="upload-area"
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed #e5e7eb',
                borderRadius: '0.5rem',
                padding: '3rem',
                textAlign: 'center',
                cursor: 'pointer',
                background: selectedFile ? '#f0fdf4' : '#f9fafb'
              }}
            >
              {selectedFile ? (
                <>
                  <FileText size={48} color="#10b981" />
                  <p className="mt-2"><strong>{selectedFile.name}</strong></p>
                  <p className="text-secondary">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </>
              ) : (
                <>
                  <Upload size={48} color="#6b7280" />
                  <p className="mt-2"><strong>Click to select file</strong></p>
                  <p className="text-secondary">or drag and drop CSV file here</p>
                </>
              )}
            </div>
          </div>

          {/* Expected Columns */}
          <div className="mt-4">
            <h3>Expected CSV Columns:</h3>
            <div style={{ 
              background: '#f3f4f6', 
              padding: '1rem', 
              borderRadius: '0.375rem',
              fontFamily: 'monospace',
              fontSize: '0.875rem'
            }}>
              {getExpectedColumns().join(', ')}
            </div>
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="mt-4">
              <div className="progress" style={{
                height: '20px',
                background: '#e5e7eb',
                borderRadius: '10px',
                overflow: 'hidden'
              }}>
                <div 
                  className="progress-bar"
                  style={{
                    width: `${uploadProgress}%`,
                    height: '100%',
                    background: '#2563eb',
                    transition: 'width 0.3s'
                  }}
                />
              </div>
              <p className="text-center mt-2">{uploadProgress}% uploaded</p>
            </div>
          )}

          {/* Error/Success Messages */}
          {error && (
            <div className="alert alert-danger mt-4">
              <XCircle size={20} />
              {error}
            </div>
          )}

          {success && (
            <div className="alert alert-success mt-4">
              <CheckCircle size={20} />
              {success}
            </div>
          )}

          {/* Upload Button */}
          <button
            className="btn btn-primary btn-lg mt-4"
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            style={{ width: '100%' }}
          >
            {uploading ? (
              <>
                <div className="spinner" />
                Uploading...
              </>
            ) : (
              <>
                <Upload size={20} />
                Upload and Process
              </>
            )}
          </button>
        </div>
      </div>

      {/* Import Guidelines */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Import Guidelines</h2>
        </div>
        <div className="card-body">
          <div className="alert alert-info">
            <AlertCircle size={20} />
            <div>
              <h4>File Naming Convention for Suppliers</h4>
              <p>Include the supplier code in the filename for automatic detection:</p>
              <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }}>
                <li><code>iolx_hotels_2024.csv</code> → Detected as IOLX</li>
                <li><code>hotelbeds_inventory.csv</code> → Detected as HOTELBEDS</li>
                <li><code>supplier_agoda_data.csv</code> → Detected as AGODA</li>
              </ul>
            </div>
          </div>

          <h3>Best Practices:</h3>
          <ul style={{ lineHeight: '1.8' }}>
            <li>✅ Ensure CSV is UTF-8 encoded</li>
            <li>✅ Include headers in the first row</li>
            <li>✅ Use standard country codes (ISO 3166-1 alpha-2)</li>
            <li>✅ Provide coordinates in decimal degrees format</li>
            <li>✅ Clean data before import (remove duplicates, fix formatting)</li>
            <li>✅ For large files (&gt;100MB), consider splitting into batches</li>
          </ul>

          <h3>Matching Process:</h3>
          <p>After upload, the system will automatically:</p>
          <ol style={{ lineHeight: '1.8' }}>
            <li>Import hotels into the database</li>
            <li>Normalize hotel names and addresses</li>
            <li>Run multi-tier matching algorithm</li>
            <li>Generate confidence scores</li>
            <li>Create potential matches for review</li>
          </ol>
        </div>
      </div>

      {/* Recent Import Jobs */}
      {importJobs.length > 0 && (
        <div className="card mt-4">
          <div className="card-header">
            <h2 className="card-title">Recent Imports</h2>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Filename</th>
                  <th>Status</th>
                  <th>Progress</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {importJobs.map(job => (
                  <tr key={job.id}>
                    <td>{job.filename}</td>
                    <td>
                      <span className={`badge ${
                        job.status === 'completed' ? 'badge-success' :
                        job.status === 'processing' ? 'badge-warning' :
                        'badge-danger'
                      }`}>
                        {job.status}
                      </span>
                    </td>
                    <td>{job.progress}%</td>
                    <td>{job.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkImport;
