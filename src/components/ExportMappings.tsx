import React, { useState, useEffect } from 'react';
import { Download, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { apiService } from '../services/apiService';
import { format } from 'date-fns';

interface SupplierStat {
  supplier_code: string;
  total_hotels: number;
  mapped_hotels: number;
  unmapped_hotels: number;
  avg_confidence: number;
}

const ExportMappings: React.FC = () => {
  const [suppliers, setSuppliers] = useState<SupplierStat[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [exportFormat, setExportFormat] = useState('csv');
  const [includeUnmapped, setIncludeUnmapped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      // Fetch from dashboard stats for now
      const stats = await apiService.getDashboardStats();
      setSuppliers(stats.suppliers);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      setErrorMessage('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!selectedSupplier) {
      setErrorMessage('Please select a supplier');
      return;
    }

    try {
      setExporting(true);
      setErrorMessage('');
      setSuccessMessage('');

      const mappings = await apiService.exportMappings(selectedSupplier);
      
      // Convert to CSV
      const csv = convertToCSV(mappings);
      
      // Create download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const filename = `${selectedSupplier}_mappings_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
      
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      
      setSuccessMessage(`Export completed! File downloaded: ${filename}`);
    } catch (error) {
      console.error('Export error:', error);
      setErrorMessage('Failed to export mappings');
    } finally {
      setExporting(false);
    }
  };

  const convertToCSV = (data: any[]): string => {
    if (!data || data.length === 0) return '';

    // Define columns
    const columns = [
      'supplier_code',
      'supplier_hotel_id',
      'supplier_hotel_name',
      'master_hotel_id',
      'master_hotel_name',
      'mapping_confidence_score',
      'mapping_method',
      'distance_to_master',
      'mapped_at',
      'mapped_by'
    ];

    // Create header
    const header = columns.join(',');

    // Create rows
    const rows = data.map(row => {
      return columns.map(col => {
        const value = row[col];
        // Escape quotes and wrap in quotes if contains comma
        if (value === null || value === undefined) return '';
        const strValue = String(value);
        if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
          return `"${strValue.replace(/"/g, '""')}"`;
        }
        return strValue;
      }).join(',');
    });

    return [header, ...rows].join('\n');
  };

  const getSupplierStats = (supplierCode: string): SupplierStat | undefined => {
    return suppliers.find(s => s.supplier_code === supplierCode);
  };

  return (
    <div className="export-mappings">
      <h1>Export Hotel Mappings</h1>

      {/* Export Configuration */}
      <div className="card mb-4">
        <div className="card-header">
          <h2 className="card-title">Export Configuration</h2>
        </div>
        <div className="card-body">
          {loading ? (
            <div className="loading-container">
              <div className="spinner"></div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Select Supplier</label>
                  <select
                    className="form-control form-select"
                    value={selectedSupplier}
                    onChange={(e) => setSelectedSupplier(e.target.value)}
                  >
                    <option value="">-- Select Supplier --</option>
                    {suppliers.map(supplier => (
                      <option key={supplier.supplier_code} value={supplier.supplier_code}>
                        {supplier.supplier_code} ({supplier.mapped_hotels.toLocaleString()} mapped)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Export Format</label>
                  <select
                    className="form-control form-select"
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value)}
                  >
                    <option value="csv">CSV</option>
                    <option value="json" disabled>JSON (Coming Soon)</option>
                    <option value="excel" disabled>Excel (Coming Soon)</option>
                  </select>
                </div>
              </div>

              <div className="form-group mt-3">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={includeUnmapped}
                    onChange={(e) => setIncludeUnmapped(e.target.checked)}
                  />
                  Include unmapped hotels in export
                </label>
              </div>

              {/* Selected Supplier Stats */}
              {selectedSupplier && (
                <div className="mt-4 p-4" style={{ background: '#f3f4f6', borderRadius: '0.5rem' }}>
                  <h3>Supplier Statistics</h3>
                  {(() => {
                    const stats = getSupplierStats(selectedSupplier);
                    if (!stats) return null;
                    
                    const mappingRate = stats.total_hotels > 0
                      ? ((stats.mapped_hotels / stats.total_hotels) * 100).toFixed(1)
                      : '0';

                    return (
                      <div className="grid grid-cols-4 gap-4 mt-3">
                        <div>
                          <div className="stat-label">Total Hotels</div>
                          <div className="stat-value" style={{ fontSize: '1.5rem' }}>
                            {stats.total_hotels.toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div className="stat-label">Mapped</div>
                          <div className="stat-value" style={{ fontSize: '1.5rem', color: '#10b981' }}>
                            {stats.mapped_hotels.toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div className="stat-label">Unmapped</div>
                          <div className="stat-value" style={{ fontSize: '1.5rem', color: '#ef4444' }}>
                            {stats.unmapped_hotels.toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div className="stat-label">Mapping Rate</div>
                          <div className="stat-value" style={{ fontSize: '1.5rem', color: '#2563eb' }}>
                            {mappingRate}%
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Messages */}
              {successMessage && (
                <div className="alert alert-success mt-4">
                  <CheckCircle size={20} />
                  {successMessage}
                </div>
              )}
              {errorMessage && (
                <div className="alert alert-danger mt-4">
                  <AlertCircle size={20} />
                  {errorMessage}
                </div>
              )}

              {/* Export Button */}
              <button
                className="btn btn-primary btn-lg mt-4"
                onClick={handleExport}
                disabled={!selectedSupplier || exporting}
                style={{ width: '100%' }}
              >
                {exporting ? (
                  <>
                    <div className="spinner"></div>
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download size={20} />
                    Export Mappings
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Export Format Details */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Export Format Details</h2>
        </div>
        <div className="card-body">
          <h3>CSV Export Includes:</h3>
          <ul style={{ lineHeight: '1.8' }}>
            <li><strong>Supplier Code</strong> - The supplier identifier</li>
            <li><strong>Supplier Hotel ID</strong> - Unique ID from the supplier</li>
            <li><strong>Supplier Hotel Name</strong> - Hotel name from supplier</li>
            <li><strong>Master Hotel ID</strong> - Matched master database ID</li>
            <li><strong>Master Hotel Name</strong> - Hotel name from master database</li>
            <li><strong>Confidence Score</strong> - Matching confidence (0-1)</li>
            <li><strong>Matching Method</strong> - How the match was determined</li>
            <li><strong>Distance to Master</strong> - Geographic distance in km</li>
            <li><strong>Mapped Date</strong> - When the mapping was created</li>
            <li><strong>Mapped By</strong> - User or system that created the mapping</li>
          </ul>

          <div className="alert alert-info mt-4">
            <AlertCircle size={20} />
            <div>
              <h4>Integration Tips</h4>
              <p>The exported CSV can be directly imported into your systems:</p>
              <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }}>
                <li>Use <code>supplier_hotel_id</code> as the join key with your supplier data</li>
                <li>Use <code>master_hotel_id</code> to reference the master hotel</li>
                <li>Filter by <code>confidence_score</code> if you only want high-confidence matches</li>
                <li>Check <code>mapping_method</code> to understand how matches were made</li>
              </ul>
            </div>
          </div>

          <h3 className="mt-4">Matching Methods Explained:</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Method</th>
                  <th>Description</th>
                  <th>Typical Confidence</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>exact_match</code></td>
                  <td>Exact coordinates and normalized name match</td>
                  <td>95-100%</td>
                </tr>
                <tr>
                  <td><code>proximity_name</code></td>
                  <td>Very close location (&lt;500m) with similar name</td>
                  <td>85-95%</td>
                </tr>
                <tr>
                  <td><code>city_exact_name</code></td>
                  <td>Same city with exact normalized name</td>
                  <td>80-85%</td>
                </tr>
                <tr>
                  <td><code>city_name_address</code></td>
                  <td>Same city with similar name and address</td>
                  <td>70-80%</td>
                </tr>
                <tr>
                  <td><code>manual</code></td>
                  <td>Manually confirmed by user</td>
                  <td>100%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportMappings;
