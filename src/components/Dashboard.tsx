import React, { useState, useEffect } from 'react';
import { getMappingStats } from '../services/apiService';

interface Stats {
  totalSuppliers: number;
  pendingReviews: number;
  byStatus: Array<{ mapping_status: string; count: string }>;
  bySupplier: Array<{
    supplier_code: string;
    total_hotels: string;
    mapped_hotels: string;
    mapping_percentage: string;
  }>;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await getMappingStats();
      setStats(data);
      setError(null);
    } catch (err) {
      setError('Failed to load statistics. Make sure database is initialized.');
      console.error('Error loading stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="message message-error">{error}</div>
        <p>Please initialize the database from the Admin page.</p>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const totalHotels = stats.byStatus.reduce(
    (sum, s) => sum + parseInt(s.count),
    0
  );
  const mappedHotels =
    parseInt(
      stats.byStatus.find((s) => s.mapping_status === 'auto_mapped')?.count || '0'
    ) +
    parseInt(
      stats.byStatus.find((s) => s.mapping_status === 'manually_mapped')?.count || '0'
    );
  const mappingRate = totalHotels > 0 ? (mappedHotels / totalHotels) * 100 : 0;

  return (
    <div>
      <h1>Dashboard</h1>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{totalHotels}</div>
          <div className="stat-label">Total Hotels</div>
        </div>

        <div className="stat-card">
          <div className="stat-value">{mappedHotels}</div>
          <div className="stat-label">Mapped Hotels</div>
        </div>

        <div className="stat-card">
          <div className="stat-value">{mappingRate.toFixed(1)}%</div>
          <div className="stat-label">Mapping Rate</div>
        </div>

        <div className="stat-card">
          <div className="stat-value">{stats.pendingReviews}</div>
          <div className="stat-label">Pending Reviews</div>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">Mapping Status Breakdown</h2>
        <table className="table">
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
                <td>{status.mapping_status.replace(/_/g, ' ')}</td>
                <td>{status.count}</td>
                <td>
                  {((parseInt(status.count) / totalHotels) * 100).toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2 className="card-title">Mapping by Supplier</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Supplier</th>
              <th>Total Hotels</th>
              <th>Mapped</th>
              <th>Coverage</th>
            </tr>
          </thead>
          <tbody>
            {stats.bySupplier.map((supplier) => (
              <tr key={supplier.supplier_code}>
                <td>{supplier.supplier_code.toUpperCase()}</td>
                <td>{supplier.total_hotels}</td>
                <td>{supplier.mapped_hotels}</td>
                <td>{supplier.mapping_percentage}%</td>
              </tr>
            ))}
            {stats.bySupplier.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', color: '#999' }}>
                  No suppliers yet. Import your first hotel!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Dashboard;
