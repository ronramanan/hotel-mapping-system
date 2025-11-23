import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Activity, Database, FileUp, CheckCircle, XCircle, Clock, TrendingUp, Users } from 'lucide-react';
import { apiService } from '../services/apiService';
import { formatDistanceToNow } from 'date-fns';

interface DashboardStats {
  overview: {
    total_master_hotels: number;
    total_suppliers: number;
    total_supplier_hotels: number;
    mapped_hotels: number;
    unmapped_hotels: number;
    review_hotels: number;
    avg_confidence: number;
    completed_imports: number;
    processing_imports: number;
    pending_reviews: number;
  };
  suppliers: Array<{
    supplier_code: string;
    total_hotels: number;
    mapped_hotels: number;
    unmapped_hotels: number;
    review_hotels: number;
    avg_confidence: number;
    first_imported: string;
    last_updated: string;
  }>;
  recentJobs: Array<{
    id: number;
    filename: string;
    file_type: string;
    supplier_code: string;
    status: string;
    total_records: number;
    imported_records: number;
    matched_records: number;
    started_at: string;
    completed_at: string;
    processing_time_seconds: number;
  }>;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardStats();
    const interval = setInterval(fetchDashboardStats, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const data = await apiService.getDashboardStats();
      setStats(data);
      setError(null);
    } catch (err) {
      setError('Failed to load dashboard statistics');
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !stats) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger">
        <XCircle size={20} />
        {error}
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const mappingRate = stats.overview.total_supplier_hotels > 0
    ? ((stats.overview.mapped_hotels / stats.overview.total_supplier_hotels) * 100).toFixed(1)
    : '0';

  const pieData = [
    { name: 'Mapped', value: stats.overview.mapped_hotels, color: '#10b981' },
    { name: 'Unmapped', value: stats.overview.unmapped_hotels, color: '#ef4444' },
    { name: 'Review', value: stats.overview.review_hotels, color: '#f59e0b' },
  ];

  const supplierChartData = stats.suppliers.map(s => ({
    name: s.supplier_code,
    mapped: s.mapped_hotels,
    unmapped: s.unmapped_hotels,
    review: s.review_hotels,
    total: s.total_hotels,
  }));

  return (
    <div className="dashboard">
      <h1 className="page-title">Hotel Mapping Dashboard</h1>
      
      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">
            <Database size={16} />
            Master Hotels
          </div>
          <div className="stat-value">
            {stats.overview.total_master_hotels.toLocaleString()}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">
            <Users size={16} />
            Total Suppliers
          </div>
          <div className="stat-value">
            {stats.overview.total_suppliers}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">
            <FileUp size={16} />
            Supplier Hotels
          </div>
          <div className="stat-value">
            {stats.overview.total_supplier_hotels.toLocaleString()}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">
            <CheckCircle size={16} />
            Mapped Hotels
          </div>
          <div className="stat-value">
            {stats.overview.mapped_hotels.toLocaleString()}
          </div>
          <div className="stat-change positive">
            <TrendingUp size={14} />
            {mappingRate}% mapped
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">
            <XCircle size={16} />
            Unmapped Hotels
          </div>
          <div className="stat-value">
            {stats.overview.unmapped_hotels.toLocaleString()}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">
            <Clock size={16} />
            Pending Reviews
          </div>
          <div className="stat-value">
            {stats.overview.pending_reviews.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Mapping Distribution Pie Chart */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Mapping Distribution</h2>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Supplier Comparison Bar Chart */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Supplier Comparison</h2>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={supplierChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="mapped" stackId="a" fill="#10b981" />
              <Bar dataKey="unmapped" stackId="a" fill="#ef4444" />
              <Bar dataKey="review" stackId="a" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Supplier Details Table */}
      <div className="card mb-4">
        <div className="card-header">
          <h2 className="card-title">Supplier Details</h2>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Supplier Code</th>
                <th>Total Hotels</th>
                <th>Mapped</th>
                <th>Unmapped</th>
                <th>For Review</th>
                <th>Avg Confidence</th>
                <th>Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {stats.suppliers.map(supplier => (
                <tr key={supplier.supplier_code}>
                  <td><strong>{supplier.supplier_code}</strong></td>
                  <td>{supplier.total_hotels.toLocaleString()}</td>
                  <td>
                    <span className="badge badge-success">
                      {supplier.mapped_hotels.toLocaleString()}
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-danger">
                      {supplier.unmapped_hotels.toLocaleString()}
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-warning">
                      {supplier.review_hotels.toLocaleString()}
                    </span>
                  </td>
                  <td>{supplier.avg_confidence ? `${(supplier.avg_confidence * 100).toFixed(1)}%` : 'N/A'}</td>
                  <td>{supplier.last_updated ? formatDistanceToNow(new Date(supplier.last_updated), { addSuffix: true }) : 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Import Jobs */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Recent Import Jobs</h2>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Filename</th>
                <th>Type</th>
                <th>Supplier</th>
                <th>Status</th>
                <th>Records</th>
                <th>Matched</th>
                <th>Time</th>
                <th>Started</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentJobs.map(job => (
                <tr key={job.id}>
                  <td>{job.filename}</td>
                  <td>
                    <span className={`badge ${job.file_type === 'master' ? 'badge-info' : 'badge-warning'}`}>
                      {job.file_type}
                    </span>
                  </td>
                  <td>{job.supplier_code || '-'}</td>
                  <td>
                    <span className={`badge ${
                      job.status === 'completed' ? 'badge-success' :
                      job.status === 'processing' ? 'badge-warning' :
                      job.status === 'failed' ? 'badge-danger' : 'badge-info'
                    }`}>
                      {job.status}
                    </span>
                  </td>
                  <td>{job.total_records?.toLocaleString() || '-'}</td>
                  <td>{job.matched_records?.toLocaleString() || '-'}</td>
                  <td>{job.processing_time_seconds ? `${job.processing_time_seconds.toFixed(1)}s` : '-'}</td>
                  <td>{formatDistanceToNow(new Date(job.started_at), { addSuffix: true })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
