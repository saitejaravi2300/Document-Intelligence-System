import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FileText, LogOut, Upload, LayoutDashboard } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-light border-bottom border-light-subtle py-3" style={{ backgroundColor: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(10px)' }}>
      <div className="container">
        <Link className="navbar-brand d-flex align-items-center gap-2" to="/">
          <FileText className="text-primary" size={28} />
          <span className="font-secondary fw-bold fs-4 gradient-text">IntelliDoc AI</span>
        </Link>
        
        {user && (
          <>
            <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
              <span className="navbar-toggler-icon"></span>
            </button>
            <div className="collapse navbar-collapse" id="navbarNav">
              <ul className="navbar-nav ms-auto align-items-center gap-3 mt-3 mt-lg-0">
                <li className="nav-item">
                  <Link className="nav-link d-flex align-items-center gap-1" to="/dashboard">
                    <LayoutDashboard size={18} />
                    <span>Dashboard</span>
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link d-flex align-items-center gap-1" to="/upload">
                    <Upload size={18} />
                    <span>Upload</span>
                  </Link>
                </li>
                <li className="nav-item ms-lg-2">
                  <span className="badge bg-light text-muted border border-light-subtle py-2 px-3 fw-normal">
                    Signed in as: <strong className="text-dark">{user.username}</strong>
                  </span>
                </li>
                <li className="nav-item">
                  <button onClick={handleLogout} className="btn btn-outline-danger btn-sm d-flex align-items-center gap-1 py-1.5 px-3">
                    <LogOut size={16} />
                    <span>Sign Out</span>
                  </button>
                </li>
              </ul>
            </div>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
