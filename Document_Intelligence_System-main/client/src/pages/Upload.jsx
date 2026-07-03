import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { docAPI } from '../services/api';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';

const UploadPage = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [uploadedDocId, setUploadedDocId] = useState('');

  const handleFileChange = (e) => {
    setError('');
    setSuccess(false);
    const selectedFile = e.target.files[0];
    
    if (!selectedFile) return;

    // Check size limit (10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File size exceeds 10MB limit.');
      setFile(null);
      return;
    }

    // Check mime type
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(selectedFile.type)) {
      setError('Invalid file format. Only PDF, JPG, JPEG, and PNG files are allowed.');
      setFile(null);
      return;
    }

    setFile(selectedFile);
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file to upload first.');
      return;
    }

    setError('');
    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await docAPI.upload(formData);
      if (response.data.success) {
        setSuccess(true);
        setUploadedDocId(response.data.data._id);
        setFile(null);
      } else {
        setError(response.data.message || 'Upload failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error occurred during upload. Please verify AI Service is active.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="container py-5 animate-fade-in" style={{ maxWidth: '600px' }}>
      <div className="card glass-panel p-4 p-md-5 mt-md-4">
        <h2 className="gradient-text font-secondary text-center mb-4">Upload Document</h2>
        <p className="text-center text-muted mb-4">Upload PDF or image files to extract OCR texts, categorize, and run LLM summarization analyses.</p>

        {error && (
          <div className="alert alert-danger d-flex align-items-center gap-2" role="alert">
            <AlertCircle size={18} />
            <div>{error}</div>
          </div>
        )}

        {success && (
          <div className="alert alert-success d-flex flex-column align-items-center gap-2 text-center p-4 mb-4" role="alert">
            <CheckCircle size={32} className="text-success mb-2" />
            <h5 className="alert-heading font-secondary fw-semibold">Upload Complete!</h5>
            <p className="mb-3 small text-muted">The document has been uploaded and analysis is running in the background.</p>
            <div className="d-flex gap-2">
              <button onClick={() => navigate('/dashboard')} className="btn btn-sm btn-outline-success">
                Back to Dashboard
              </button>
              <button onClick={() => navigate(`/documents/${uploadedDocId}`)} className="btn btn-sm btn-success px-3">
                View Analysis Details
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleUploadSubmit}>
          <div className="mb-4">
            <div className="d-flex flex-column align-items-center justify-content-center border border-2 border-dashed border-light-subtle rounded-3 p-5 bg-light cursor-pointer text-center position-relative" style={{ transition: 'border-color 0.2s' }}>
              <input
                type="file"
                className="position-absolute top-0 start-0 w-100 h-100 opacity-0 cursor-pointer"
                style={{ zIndex: 2 }}
                onChange={handleFileChange}
                accept=".pdf, .jpg, .jpeg, .png"
              />
              
              <Upload className="text-primary mb-3" size={48} />
              
              {file ? (
                <div>
                  <p className="fw-semibold text-dark mb-1">{file.name}</p>
                  <p className="small text-muted mb-0">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                </div>
              ) : (
                <div>
                  <p className="fw-semibold text-dark mb-1">Click to browse or drag & drop</p>
                  <p className="small text-muted mb-0">PDF, JPG, JPEG, PNG (max. 10MB)</p>
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            className="btn custom-btn-primary w-100 py-2.5 fs-5 shadow"
            disabled={uploading || !file}
          >
            {uploading ? (
              <span className="d-flex align-items-center justify-content-center gap-2">
                <span className="spinner-border spinner-border-sm" role="status"></span>
                <span>Uploading Document...</span>
              </span>
            ) : (
              'Upload and Process'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UploadPage;
