import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { docAPI } from '../services/api';
import {
  FileText,
  Search,
  Upload,
  Clock,
  CheckCircle2,
  XCircle,
  FolderOpen,
  Trash2,
  Download,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const Dashboard = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({ total: 0, completed: 0, processing: 0, failed: 0 });
  const [chartData, setChartData] = useState(null);
  const [statusChartData, setStatusChartData] = useState(null);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const response = await docAPI.getAll();
      const docs = response.data.data;
      setDocuments(docs);
      calculateStatsAndCharts(docs);
    } catch (error) {
      console.error('Failed to load documents:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      fetchDocuments();
      return;
    }
    setLoading(true);
    try {
      const response = await docAPI.search(searchQuery);
      setDocuments(response.data.data);
    } catch (error) {
      console.error('Search failed:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      await docAPI.delete(id);
      const updatedDocs = documents.filter((doc) => doc._id !== id);
      setDocuments(updatedDocs);
      calculateStatsAndCharts(updatedDocs);
    } catch (error) {
      alert('Failed to delete document: ' + error.message);
    }
  };

  const calculateStatsAndCharts = (docs) => {
    const total = docs.length;
    let completed = 0;
    let processing = 0;
    let failed = 0;
    const typeCounts = {};

    docs.forEach((doc) => {
      // Calculate status stats
      if (doc.status === 'completed') completed++;
      else if (doc.status === 'failed') failed++;
      else processing++; // uploaded or processing

      // Calculate doc type stats
      const type = doc.classification?.docType || 'Unknown';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    setStats({ total, completed, processing, failed });

    // Chart 1: Document Types Doughnut Chart
    const types = Object.keys(typeCounts);
    const counts = Object.values(typeCounts);
    
    setChartData({
      labels: types,
      datasets: [
        {
          label: 'Documents',
          data: counts,
          backgroundColor: [
            'rgba(99, 102, 241, 0.7)',
            'rgba(168, 85, 247, 0.7)',
            'rgba(236, 72, 153, 0.7)',
            'rgba(16, 185, 129, 0.7)',
            'rgba(245, 158, 11, 0.7)',
            'rgba(239, 68, 68, 0.7)',
            'rgba(75, 85, 99, 0.7)',
          ],
          borderColor: 'rgba(255, 255, 255, 0.15)',
          borderWidth: 1,
        },
      ],
    });

    // Chart 2: Status Bar Chart
    setStatusChartData({
      labels: ['Completed', 'Processing', 'Failed'],
      datasets: [
        {
          label: 'Count',
          data: [completed, processing, failed],
          backgroundColor: [
            'rgba(16, 185, 129, 0.65)',
            'rgba(245, 158, 11, 0.65)',
            'rgba(239, 68, 68, 0.65)',
          ],
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
        },
      ],
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <span className="badge bg-success-subtle text-success border border-success">Completed</span>;
      case 'failed':
        return <span className="badge bg-danger-subtle text-danger border border-danger">Failed</span>;
      case 'processing':
      case 'uploaded':
        return (
          <span className="badge bg-warning-subtle text-warning border border-warning d-inline-flex align-items-center gap-1">
            <RefreshCw size={12} className="spinner-border spinner-border-sm border-0 m-0" style={{ animationDuration: '2s' }} />
            Processing
          </span>
        );
      default:
        return <span className="badge bg-secondary">{status}</span>;
    }
  };

  return (
    <div className="container py-5 animate-fade-in">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-5">
        <div>
          <h1 className="gradient-text font-secondary m-0">Document Dashboard</h1>
          <p className="text-muted m-0">Upload and manage analyzed templates securely</p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button onClick={fetchDocuments} className="btn btn-outline-secondary d-flex align-items-center gap-2 py-2 px-3 glass-panel">
            <RefreshCw size={18} />
            <span>Reload</span>
          </button>
          <Link to="/upload" className="btn custom-btn-primary d-flex align-items-center gap-2 py-2.5 px-4 shadow">
            <Upload size={18} />
            <span>Upload New</span>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="row g-4 mb-5">
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card glass-panel p-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <FolderOpen className="text-primary" size={32} />
              <span className="fs-1 fw-bold">{stats.total}</span>
            </div>
            <div className="text-muted">Total Documents</div>
          </div>
        </div>
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card glass-panel p-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <CheckCircle2 className="text-success" size={32} />
              <span className="fs-1 fw-bold text-success">{stats.completed}</span>
            </div>
            <div className="text-muted">Successfully Processed</div>
          </div>
        </div>
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card glass-panel p-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <Clock className="text-warning" size={32} />
              <span className="fs-1 fw-bold text-warning">{stats.processing}</span>
            </div>
            <div className="text-muted">Currently Processing</div>
          </div>
        </div>
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card glass-panel p-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <XCircle className="text-danger" size={32} />
              <span className="fs-1 fw-bold text-danger">{stats.failed}</span>
            </div>
            <div className="text-muted">Failed Analyses</div>
          </div>
        </div>
      </div>

      {/* Search Row */}
      <div className="row mb-5">
        <div className="col-12">
          <form onSubmit={handleSearch} className="glass-panel p-2 d-flex align-items-center gap-2">
            <div className="input-group">
              <span className="input-group-text bg-transparent border-0 text-muted">
                <Search size={20} />
              </span>
              <input
                type="text"
                className="form-control bg-transparent border-0 text-dark shadow-none"
                placeholder="Search by file name, classification details, OCR text content, or extracted entities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button type="submit" className="btn custom-btn-primary py-2 px-4">
              Search
            </button>
          </form>
        </div>
      </div>

      <div className="row g-5">
        {/* Left Side: Charts */}
        <div className="col-12 col-lg-4 d-flex flex-column gap-5">
          {chartData && (
            <div className="card glass-panel p-4">
              <h4 className="mb-4 text-center font-secondary">Document Types</h4>
              <div style={{ maxHeight: '250px' }} className="d-flex justify-content-center">
                <Doughnut
                  data={chartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { labels: { color: '#0f172a' } } },
                  }}
                />
              </div>
            </div>
          )}

          {statusChartData && (
            <div className="card glass-panel p-4">
              <h4 className="mb-4 text-center font-secondary">Processing Statistics</h4>
              <div style={{ maxHeight: '220px' }}>
                <Bar
                  data={statusChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      y: { ticks: { color: '#475569' }, grid: { color: 'rgba(0,0,0,0.05)' } },
                      x: { ticks: { color: '#475569' }, grid: { color: 'rgba(0,0,0,0.05)' } },
                    },
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Side: List */}
        <div className="col-12 col-lg-8">
          <div className="card glass-panel p-4 h-100">
            <h4 className="mb-4 font-secondary">Documents Catalog</h4>
            
            {loading ? (
              <div className="d-flex justify-content-center align-items-center py-5 my-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-5 my-5 text-muted">
                <FileText size={48} className="mb-3 mx-auto opacity-50" />
                <p className="fs-5 mb-0">No documents found.</p>
                <p className="small">Try uploading a new file or search something else.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead>
                    <tr className="text-muted">
                      <th>Document</th>
                      <th>Category</th>
                      <th>Status</th>
                      <th>Uploaded At</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((doc) => (
                      <tr key={doc._id}>
                        <td className="fw-semibold text-dark text-truncate" style={{ maxWidth: '200px' }} title={doc.originalName}>
                          {doc.originalName}
                        </td>
                        <td>
                          <span className={`badge ${doc.classification?.docType === 'Unknown' ? 'bg-secondary' : 'bg-primary'} py-1.5`}>
                            {doc.classification?.docType || 'Unknown'}
                          </span>
                        </td>
                        <td>{getStatusBadge(doc.status)}</td>
                        <td className="text-muted small">
                          {new Date(doc.createdAt).toLocaleDateString()}{' '}
                          {new Date(doc.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="text-end">
                          <div className="d-inline-flex gap-2">
                            <Link
                              to={`/documents/${doc._id}`}
                              className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
                              title="View Analysis Details"
                            >
                              <Eye size={14} />
                              <span>View</span>
                            </Link>
                            
                            {doc.status === 'completed' && (
                              <a
                                href={docAPI.exportUrl(doc._id)}
                                download
                                className="btn btn-sm btn-outline-info d-flex align-items-center gap-1"
                                title="Export JSON"
                              >
                                <Download size={14} />
                              </a>
                            )}
                            
                            <button
                              onClick={() => handleDelete(doc._id)}
                              className="btn btn-sm btn-outline-danger d-flex align-items-center gap-1"
                              title="Delete Document"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
