import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { docAPI } from '../services/api';
import {
  ArrowLeft,
  Download,
  FileText,
  AlertTriangle,
  Calendar,
  Building,
  User,
  Mail,
  Phone,
  MapPin,
  FileCode,
  Tag,
  RefreshCw,
  MessageSquare,
  Send,
  Sparkles,
} from 'lucide-react';

const DocumentDetails = () => {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' or 'qa'
  
  // Q&A State
  const [question, setQuestion] = useState('');
  const [qaHistory, setQaHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [submittingQuestion, setSubmittingQuestion] = useState(false);
  const [qaError, setQaError] = useState('');
  
  const pollInterval = useRef(null);
  const chatBottomRef = useRef(null);

  // AI Analyze State & Handler
  const [analyzing, setAnalyzing] = useState(false);

  const handleRunAIAnalysis = async () => {
    setAnalyzing(false);
    setAnalyzing(true);
    try {
      const response = await docAPI.analyze(id);
      if (response.data.success) {
        setDoc(response.data.data);
      } else {
        setError(response.data.message || 'AI Analysis failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error running AI Analysis');
    } finally {
      setAnalyzing(false);
    }
  };

  const fetchDocDetails = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const response = await docAPI.getById(id);
      const data = response.data.data;
      setDoc(data);
      
      // Stop polling once processing terminates
      if (data.status === 'completed' || data.status === 'ocr-completed' || data.status === 'failed') {
        if (pollInterval.current) {
          clearInterval(pollInterval.current);
          pollInterval.current = null;
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load document details');
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
        pollInterval.current = null;
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const fetchQAHistory = async () => {
    setLoadingHistory(true);
    setQaError('');
    try {
      const response = await docAPI.getQueryHistory(id);
      setQaHistory(response.data.data);
    } catch (err) {
      setQaError('Failed to load Q&A history logs');
    } finally {
      setLoadingHistory(false);
      scrollToBottom();
    }
  };

  useEffect(() => {
    fetchDocDetails(true);

    // Setup polling every 3 seconds if document is processing
    pollInterval.current = setInterval(() => {
      fetchDocDetails(false);
    }, 3000);

    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
      }
    };
  }, [id]);

  // Fetch QA history logs when Q&A Tab activates
  useEffect(() => {
    if (activeTab === 'qa' && (doc?.status === 'completed' || doc?.status === 'ocr-completed')) {
      fetchQAHistory();
    }
  }, [activeTab, doc?.status]);

  // Scroll to bottom of chat helper
  const scrollToBottom = () => {
    setTimeout(() => {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleAskQuestion = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;

    setSubmittingQuestion(true);
    setQaError('');
    const userQuestion = question;
    setQuestion('');

    // Optimistically add to temporary UI log
    const optimisticQA = {
      _id: 'temp_id',
      question: userQuestion,
      answer: 'Analyzing context and generating answer...',
      loading: true,
    };
    setQaHistory((prev) => [...prev, optimisticQA]);
    scrollToBottom();

    try {
      const response = await docAPI.query(id, userQuestion);
      // Replace optimistic log with saved entry
      setQaHistory((prev) =>
        prev.map((item) => (item._id === 'temp_id' ? response.data.data : item))
      );
    } catch (err) {
      setQaError(err.response?.data?.message || 'Failed to generate answer.');
      setQaHistory((prev) => prev.filter((item) => item._id !== 'temp_id'));
    } finally {
      setSubmittingQuestion(false);
      scrollToBottom();
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100" style={{ backgroundColor: '#f8fafc' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-5 text-center">
        <div className="card glass-panel p-5 mx-auto" style={{ maxWidth: '500px' }}>
          <AlertTriangle className="text-danger mb-3 mx-auto" size={48} />
          <h4 className="text-dark font-secondary mb-3">Error Loading Document</h4>
          <p className="text-muted mb-4">{error}</p>
          <Link to="/dashboard" className="btn custom-btn-primary">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!doc) return null;

  // Construct absolute static file URL
  const serverUrl = import.meta.env.VITE_API_URL || window.location.origin;
  const fileUrl = `${serverUrl}/uploads/${doc.filename}`;

  // Helper to render entity badges
  const renderEntityBadge = (list, labelClass, icon) => {
    if (!list || list.length === 0) return <span className="text-muted small">None</span>;
    return (
      <div className="d-flex flex-wrap gap-2">
        {list.map((item, idx) => (
          <span key={idx} className={`badge ${labelClass} d-flex align-items-center gap-1 py-1.5 px-2.5 fw-normal border`}>
            {icon}
            <span>{item}</span>
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="container-fluid py-4 px-md-5 animate-fade-in">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div className="d-flex align-items-center gap-3">
          <Link to="/dashboard" className="btn btn-outline-secondary d-flex align-items-center gap-1.5 glass-panel py-2">
            <ArrowLeft size={16} />
            <span>Catalog</span>
          </Link>
          <div>
            <h2 className="text-dark font-secondary m-0 text-truncate" style={{ maxWidth: '400px' }}>
              {doc.originalName}
            </h2>
            <span className="text-muted small">
              Size: {(doc.size / (1024 * 1024)).toFixed(2)} MB | Uploaded: {new Date(doc.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
        
        <div className="d-flex gap-2">
          {doc.status === 'completed' && (
            <a href={docAPI.exportUrl(doc._id)} download className="btn btn-outline-info d-flex align-items-center gap-1.5 py-2 px-3 glass-panel">
              <Download size={16} />
              <span>Export JSON</span>
            </a>
          )}
        </div>
      </div>

      {/* Main Side-by-Side Grid */}
      <div className="row g-4">
        {/* Left Side: Original Document View */}
        <div className="col-12 col-xl-6">
          <div className="card glass-panel p-3 h-100 d-flex flex-column" style={{ minHeight: '650px' }}>
            <h4 className="mb-3 font-secondary text-dark border-bottom border-light pb-2">Document Preview</h4>
            <div className="flex-grow-1 bg-light rounded overflow-hidden d-flex justify-content-center align-items-center">
              {doc.mimeType === 'application/pdf' ? (
                <iframe
                  src={`${fileUrl}#toolbar=0`}
                  title="PDF Document Preview"
                  width="100%"
                  height="100%"
                  className="border-0"
                  style={{ minHeight: '600px' }}
                />
              ) : (
                <img
                  src={fileUrl}
                  alt="Document Preview"
                  className="img-fluid rounded shadow-sm"
                  style={{ maxHeight: '600px', objectFit: 'contain' }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Analysis Details & Q&A */}
        <div className="col-12 col-xl-6">
          <div className="card glass-panel p-4 h-100 d-flex flex-column">
            
            {/* Header Tabs */}
            {(doc.status === 'completed' || doc.status === 'ocr-completed') && (
              <div className="nav nav-pills gap-2 mb-4 p-1 rounded bg-light border border-light" style={{ maxWidth: 'fit-content' }}>
                <button
                  className={`nav-link py-2 px-4 rounded d-flex align-items-center gap-2 border-0 ${activeTab === 'profile' ? 'active btn custom-btn-primary' : 'text-muted bg-transparent'}`}
                  onClick={() => setActiveTab('profile')}
                >
                  <FileText size={16} />
                  <span>Document Profile</span>
                </button>
                <button
                  className={`nav-link py-2 px-4 rounded d-flex align-items-center gap-2 border-0 ${activeTab === 'qa' ? 'active btn custom-btn-primary' : 'text-muted bg-transparent'}`}
                  onClick={() => setActiveTab('qa')}
                >
                  <MessageSquare size={16} />
                  <span>Document Q&A (RAG)</span>
                </button>
              </div>
            )}

            {doc.status === 'processing' || doc.status === 'uploaded' ? (
              <div className="d-flex flex-column align-items-center justify-content-center flex-grow-1 py-5 my-5 text-center">
                <RefreshCw size={48} className="text-warning mb-3 spinner-border border-0" style={{ animationDuration: '3s' }} />
                <h4 className="text-dark font-secondary">Analyzing Document...</h4>
              </div>
            ) : doc.status === 'failed' ? (
              <div className="d-flex flex-column align-items-center justify-content-center flex-grow-1 py-5 my-5 text-center">
                <AlertTriangle className="text-danger mb-3" size={48} />
                <h4 className="text-dark font-secondary">Analysis Failed</h4>
                <p className="text-muted w-75">{doc.error || 'An error occurred during OCR or LLM processing.'}</p>
                <button onClick={() => fetchDocDetails(true)} className="btn btn-outline-warning mt-2">
                  Retry Loading
                </button>
              </div>
            ) : activeTab === 'profile' ? (
              // TAB 1: Successful Completed Analysis (Document Profile)
              <div className="d-flex flex-column gap-4 animate-fade-in flex-grow-1" style={{ overflowY: 'auto', maxHeight: '700px', paddingRight: '4px' }}>
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 border-bottom border-light pb-3">
                  <div>
                    <span className="text-muted small">Document Category</span>
                    <h3 className="text-primary font-secondary fw-bold mb-0">
                      {doc.classification.docType}
                    </h3>
                  </div>
                  <div className="text-end">
                    <span className="text-muted small">AI Confidence</span>
                    <div>
                      <span className="badge bg-primary-subtle text-primary border border-primary fs-6 px-3 py-1.5">
                        {(doc.classification.confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* AI Summary */}
                <div>
                  <h5 className="text-dark font-secondary d-flex align-items-center gap-2 mb-3">
                    <FileText size={18} className="text-primary" />
                    <span>AI Generated Summary</span>
                  </h5>
                  <div className="bg-light p-3 rounded border border-light">
                    {doc.status === 'ocr-completed' ? (
                      <div className="text-center py-3">
                        <p className="text-muted small mb-3">AI classification, summarization, and key entity extraction are available for this document.</p>
                        <button
                          onClick={handleRunAIAnalysis}
                          className="btn custom-btn-primary d-flex align-items-center gap-2 mx-auto shadow-sm"
                          disabled={analyzing}
                        >
                          {analyzing ? (
                            <>
                              <RefreshCw size={16} className="spinner-border spinner-border-sm border-0 m-0 animate-spin" />
                              <span>Analyzing Document...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles size={16} />
                              <span>Run AI Analysis</span>
                            </>
                          )}
                        </button>
                      </div>
                    ) : (
                      <>
                        <p className="mb-2 text-dark" style={{ lineHeight: '1.6' }}>{doc.summary.content}</p>
                        <div className="mt-3">
                          <strong className="small text-muted d-block mb-1">Main Purpose:</strong>
                          <span className="small text-muted">{doc.summary.mainPurpose}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Extracted Entities */}
                <div>
                  <h5 className="text-dark font-secondary d-flex align-items-center gap-2 mb-3">
                    <Tag size={18} className="text-primary" />
                    <span>Extracted Metadata Entities</span>
                  </h5>
                  
                  <div className="row g-3">
                    <div className="col-12">
                      <div className="bg-light p-3 rounded border border-light d-flex flex-column gap-3">
                        <div>
                          <span className="small text-muted d-block mb-2">Names (Person)</span>
                          {renderEntityBadge(doc.entities.names, 'bg-primary-subtle text-primary border-primary', <User size={12} />)}
                        </div>
                        <div>
                          <span className="small text-muted d-block mb-2">Organizations</span>
                          {renderEntityBadge(doc.entities.organizations, 'bg-purple-subtle text-purple border-purple', <Building size={12} />)}
                        </div>
                        <div>
                          <span className="small text-muted d-block mb-2">Dates</span>
                          {renderEntityBadge(doc.entities.dates, 'bg-success-subtle text-success border-success', <Calendar size={12} />)}
                        </div>
                        <div>
                          <span className="small text-muted d-block mb-2">Locations</span>
                          {renderEntityBadge(doc.entities.locations, 'bg-info-subtle text-info border-info', <MapPin size={12} />)}
                        </div>
                        <div>
                          <span className="small text-muted d-block mb-2">Emails</span>
                          {renderEntityBadge(doc.entities.emails, 'bg-pink-subtle text-pink border-pink', <Mail size={12} />)}
                        </div>
                        <div>
                          <span className="small text-muted d-block mb-2">Phones</span>
                          {renderEntityBadge(doc.entities.phones, 'bg-secondary-subtle text-secondary border-secondary', <Phone size={12} />)}
                        </div>
                      </div>
                    </div>

                    {/* Template Specific Entities */}
                    {doc.classification.docType === 'Letter' && (
                      <div className="col-12">
                        <div className="bg-info bg-opacity-10 p-3 rounded border border-info-subtle text-dark">
                          <h6 className="text-info font-secondary mb-3">Letter Properties</h6>
                          <div className="row g-2 small">
                            <div className="col-6"><strong>Sender:</strong> {doc.entities.sender || 'N/A'}</div>
                            <div className="col-6"><strong>Receiver:</strong> {doc.entities.receiver || 'N/A'}</div>
                            <div className="col-12 mt-2"><strong>Subject:</strong> {doc.entities.subject || 'N/A'}</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {(doc.classification.docType === 'Receipt' || doc.classification.docType === 'Invoice') && (
                      <div className="col-12">
                        <div className="bg-warning bg-opacity-10 p-3 rounded border border-warning-subtle text-dark">
                          <h6 className="text-warning font-secondary mb-3">Financial Metadata</h6>
                          <div className="row g-2 small">
                            <div className="col-6"><strong>Merchant:</strong> {doc.entities.storeName || 'N/A'}</div>
                            <div className="col-6"><strong>Total Amount:</strong> {doc.entities.amount !== null ? `$${doc.entities.amount.toFixed(2)}` : 'N/A'}</div>
                            <div className="col-6 mt-1"><strong>Tax Charged:</strong> {doc.entities.tax !== null ? `$${doc.entities.tax.toFixed(2)}` : 'N/A'}</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {doc.classification.docType === 'Resume' && (
                      <div className="col-12">
                        <div className="bg-primary bg-opacity-10 p-3 rounded border border-primary-subtle text-dark">
                          <h6 className="text-purple font-secondary mb-3">Candidate Profile</h6>
                          <div className="mb-2 small">
                            <strong>Candidate Name:</strong> {doc.entities.candidateName || 'N/A'}
                          </div>
                          <div className="mb-2">
                            <span className="small text-muted d-block mb-1">Skills:</span>
                            {renderEntityBadge(doc.entities.skills, 'bg-light text-dark border-secondary', null)}
                          </div>
                          <div>
                            <span className="small text-muted d-block mb-1">Education Background:</span>
                            {renderEntityBadge(doc.entities.education, 'bg-light text-dark border-secondary', null)}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Raw OCR Text */}
                <div>
                  <h5 className="text-dark font-secondary d-flex align-items-center gap-2 mb-3">
                    <FileCode size={18} className="text-primary" />
                    <span>Raw Extracted Text (OCR Output)</span>
                  </h5>
                  <div className="bg-light p-3 rounded border border-light" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                    <pre className="m-0 text-dark small" style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', lineHeight: '1.5' }}>
                      {doc.ocr.fullText}
                    </pre>
                  </div>
                </div>
              </div>
            ) : (
              // TAB 2: Document Q&A RAG Interface
              <div className="d-flex flex-column flex-grow-1 animate-fade-in" style={{ height: 'calc(100% - 60px)' }}>
                {qaError && (
                  <div className="alert alert-danger d-flex align-items-center gap-2 mb-3 py-2 px-3 small" role="alert">
                    <AlertTriangle size={14} />
                    <div>{qaError}</div>
                  </div>
                )}

                {/* Chat Message Box */}
                <div className="flex-grow-1 bg-light border border-light rounded p-3 mb-3 d-flex flex-column gap-3 overflow-y-auto" style={{ maxHeight: '420px', minHeight: '380px' }}>
                  {loadingHistory ? (
                    <div className="d-flex justify-content-center align-items-center h-100">
                      <div className="spinner-border text-primary spinner-border-sm" role="status"></div>
                    </div>
                  ) : qaHistory.length === 0 ? (
                    <div className="d-flex flex-column align-items-center justify-content-center h-100 text-center text-muted p-4">
                      <MessageSquare size={32} className="mb-2 opacity-50" />
                      <p className="mb-0 small fw-semibold">No questions asked yet.</p>
                      <p className="small text-muted">Ask a question below to query the document content using RAG semantic indexing.</p>
                    </div>
                  ) : (
                    qaHistory.map((item, idx) => (
                      <div key={item._id || idx} className="d-flex flex-column gap-2">
                        {/* Question (User) */}
                        <div className="align-self-end bg-primary bg-opacity-75 text-white py-2 px-3 rounded-start rounded-bottom small border border-primary border-opacity-50" style={{ maxWidth: '85%' }}>
                          {item.question}
                        </div>
                        {/* Answer (AI Assistant) */}
                        <div className={`align-self-start bg-light text-dark py-2 px-3 rounded-end rounded-bottom small border border-secondary border-opacity-25 ${item.loading ? 'text-warning' : ''}`} style={{ maxWidth: '85%' }}>
                          {item.answer}
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={chatBottomRef} />
                </div>

                {/* Chat Form Input */}
                <form onSubmit={handleAskQuestion} className="d-flex gap-2">
                  <input
                    type="text"
                    className="form-control custom-input py-2 px-3 small shadow-none"
                    placeholder="Ask a question (e.g. 'What is the total amount?' or 'What skills are listed?')..."
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    disabled={submittingQuestion}
                  />
                  <button
                    type="submit"
                    className="btn custom-btn-primary d-flex align-items-center justify-content-center p-2.5 px-3"
                    disabled={submittingQuestion || !question.trim()}
                  >
                    {submittingQuestion ? (
                      <span className="spinner-border spinner-border-sm" role="status"></span>
                    ) : (
                      <Send size={16} />
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentDetails;
