import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import '../App.css';

interface Stats {
  totalMasters: number;
  totalSuppliers: number;
  byStatus: Array<{ mapping_status: string; count: number }>;
  bySupplier: Array<{
    supplier_code: string;
    total_hotels: number;
    mapped_hotels: number;
    mapping_percentage: number;
  }>;
  pendingReviews: number;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [usingMockData, setUsingMockData] = useState(false);

  // Mock data for development/demo
  const mockStats: Stats = {
    totalMasters: 15234,
    totalSuppliers: 41152,
    byStatus: [
      { mapping_status: 'auto_mapped', count: 15123 },
      { mapping_status: 'manually_mapped', count: 3674 },
      { mapping_status: 'unmapped', count: 22355 },
      { mapping_status: 'pending_review', count: 0 }
    ],
    bySupplier: [
      { supplier_code: 'SUP001', total_hotels: 8500, mapped_hotels: 6800, mapping_percentage: 80 },
      { supplier_code: 'SUP002', total_hotels: 12300, mapped_hotels: 4500, mapping_percentage: 37 },
      { supplier_code: 'SUP003', total_hotels: 20352, mapped_hotels: 7497, mapping_percentage: 37 }
    ],
    pendingReviews: 0
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    setError('');

    try {
      const apiEndpoint = process.env.REACT_APP_API_ENDPOINT;
      
      if (!apiEndpoint) {
        // No API configured, use mock data
        console.log('No API endpoint configured, using mock data');
        setStats(mockStats);
        setUsingMockData(true);
        setLoading(false);
        return;
      }

      const response = await fetch(`${apiEndpoint}/stats`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch statistics');
      }

      const data = await response.json();
      setStats(data);
      setUsingMockData(false);
    } catch (err: any) {
      console.log('API error, falling back to mock data:', err.message);
      // Fallback to mock data
      setStats(mockStats);
      setUsingMockData(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard">
        <h2>📊 Dashboard</h2>
        <div className="loading">⏳ Loading statistics...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="dashboard">
        <h2>📊 Dashboard</h2>
        <div className="empty-state">No data available</div>
      </div>
    );
  }

  const totalMapped = (stats.byStatus || [])
    .filter(s => s.mapping_status === 'auto_mapped' || s.mapping_status === 'manually_mapped')
    .reduce((sum, s) => sum + parseInt(s.count.toString()), 0);
  const totalUnmapped = (stats.byStatus || []).find(s => s.mapping_status === 'unmapped')?.count || 0;
  const totalSupplierHotels = (stats.byStatus || []).reduce((sum, s) => sum + parseInt(s.count.toString()), 0);
  const mappingPercentage = totalSupplierHotels > 0 ? Math.round((totalMapped / totalSupplierHotels) * 100) : 0;

  return (
    <div className="dashboard">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>📊 Hotel Mapping Dashboard</h2>
        {usingMockData && (
          <div style={{ 
            background: '#fff3cd', 
            color: '#856404', 
            padding: '8px 16px', 
            borderRadius: '6px',
            fontSize: '14px'
          }}>
            ℹ️ Using demo data - Configure API endpoint for live data
          </div>
        )}
      </div>

      <div className="stats-grid">
        <div className="stat-card blue">
          <div className="stat-icon">🏨</div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalMasters?.toLocaleString() || 0}</div>
            <div className="stat-label">Master Hotels</div>
          </div>
        </div>

        <div className="stat-card purple">
          <div className="stat-icon">📦</div>
          <div className="stat-content">
            <div className="stat-value">{totalSupplierHotels.toLocaleString()}</div>
            <div className="stat-label">Supplier Hotels</div>
          </div>
        </div>

        <div className="stat-card green">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-value">{totalMapped.toLocaleString()}</div>
            <div className="stat-label">Mapped ({mappingPercentage}%)</div>
          </div>
        </div>

        <div className="stat-card orange">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <div className="stat-value">{totalUnmapped.toLocaleString()}</div>
            <div className="stat-label">Unmapped</div>
          </div>
        </div>
      </div>

      <div className="dashboard-sections">
        <div className="section">
          <h3>Mapping Status</h3>
          <table className="stats-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Count</th>
                <th>Percentage</th>
              </tr>
            </thead>
            <tbody>
              {stats.byStatus.map((status) => (
                <tr key={status.mapping_status}>
                  <td>{status.mapping_status.replace(/_/g, ' ').toUpperCase()}</td>
                  <td>{parseInt(status.count.toString()).toLocaleString()}</td>
                  <td>{totalSupplierHotels > 0 ? Math.round((parseInt(status.count.toString()) / totalSupplierHotels) * 100) : 0}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="section">
          <h3>By Supplier</h3>
          <table className="stats-table">
            <thead>
              <tr>
                <th>Supplier</th>
                <th>Total</th>
                <th>Mapped</th>
                <th>%</th>
              </tr>
            </thead>
            <tbody>
              {stats.bySupplier.map((supplier) => (
                <tr key={supplier.supplier_code}>
                  <td>{supplier.supplier_code}</td>
                  <td>{parseInt(supplier.total_hotels.toString()).toLocaleString()}</td>
                  <td>{parseInt(supplier.mapped_hotels.toString()).toLocaleString()}</td>
                  <td>{supplier.mapping_percentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="quick-actions">
        <h3>Quick Actions</h3>
        <div className="actions-grid">
          <Link to="/bulk-import-master" className="action-card">
            <div className="action-icon">📥</div>
            <div className="action-title">Import Masters</div>
            <div className="action-desc">Add master hotel records</div>
          </Link>

          <Link to="/bulk-import-supplier" className="action-card">
            <div className="action-icon">📤</div>
            <div className="action-title">Import Suppliers</div>
            <div className="action-desc">Add supplier hotel records</div>
          </Link>

          <Link to="/review" className="action-card">
            <div className="action-icon">🔍</div>
            <div className="action-title">Review Matches</div>
            <div className="action-desc">Review and match hotels</div>
          </Link>

          <Link to="/export" className="action-card">
            <div className="action-icon">💾</div>
            <div className="action-title">Export Mappings</div>
            <div className="action-desc">Download CSV file</div>
          </Link>
        </div>
      </div>

      <style>{`
        .dashboard {
          max-width: 1400px;
          margin: 0 auto;
          padding: 20px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .stat-card {
          background: white;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .stat-card.blue { border-left: 4px solid #2196f3; }
        .stat-card.purple { border-left: 4px solid #9c27b0; }
        .stat-card.green { border-left: 4px solid #4caf50; }
        .stat-card.orange { border-left: 4px solid #ff9800; }

        .stat-icon {
          font-size: 48px;
        }

        .stat-value {
          font-size: 32px;
          font-weight: bold;
          color: #333;
        }

        .stat-label {
          color: #666;
          font-size: 14px;
        }

        .dashboard-sections {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .section {
          background: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .section h3 {
          margin-top: 0;
          color: #333;
        }

        .stats-table {
          width: 100%;
          border-collapse: collapse;
        }

        .stats-table th {
          background: #f5f5f5;
          padding: 12px;
          text-align: left;
          font-weight: 600;
          border-bottom: 2px solid #ddd;
        }

        .stats-table td {
          padding: 10px 12px;
          border-bottom: 1px solid #eee;
        }

        .stats-table tbody tr:hover {
          background: #f9f9f9;
        }

        .quick-actions {
          background: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .quick-actions h3 {
          margin-top: 0;
        }

        .actions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
        }

        .action-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 20px;
          border-radius: 8px;
          text-decoration: none;
          text-align: center;
          transition: transform 0.2s;
        }

        .action-card:hover {
          transform: translateY(-4px);
        }

        .action-icon {
          font-size: 36px;
          margin-bottom: 10px;
        }

        .action-title {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 5px;
        }

        .action-desc {
          font-size: 14px;
          opacity: 0.9;
        }

        .loading {
          text-align: center;
          padding: 60px;
          font-size: 18px;
        }

        .error-message {
          background: #ffebee;
          color: #c62828;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }

        .refresh-button {
          background: #2196f3;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 16px;
          font-weight: bold;
        }

        .empty-state {
          text-align: center;
          padding: 60px;
          color: #666;
        }

        @media (max-width: 768px) {
          .stats-grid {
            grid-template-columns: 1fr;
          }

          .dashboard-sections {
            grid-template-columns: 1fr;
          }

          .actions-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
