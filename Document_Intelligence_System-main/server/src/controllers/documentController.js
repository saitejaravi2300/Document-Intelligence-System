import fs from 'fs';
import path from 'path';
import axios from 'axios';
import Document from '../models/Document.js';
import QueryHistory from '../models/QueryHistory.js';

// Background processor to query the Python FastAPI AI service
const processDocumentBackground = async (docId, filepath, originalName, mimeType) => {
  try {
    // Update status to processing
    await Document.findByIdAndUpdate(docId, { status: 'processing' });

    // Read file buffer and construct native FormData
    const fileBuffer = fs.readFileSync(filepath);
    const blob = new Blob([fileBuffer], { type: mimeType });
    const formData = new FormData();
    formData.append('file', blob, originalName);
    formData.append('document_id', docId.toString()); // Pass document ID to AI Service for vector index scoping

    // Call FastAPI AI service endpoint
    const response = await axios.post(
      `${process.env.AI_SERVICE_URL}/api/ai/process`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000, // 60 seconds timeout
      }
    );

    const aiData = response.data;

    // Update document in DB with AI analysis results
    await Document.findByIdAndUpdate(docId, {
      status: 'ocr-completed',
      ocr: {
        fullText: aiData.ocr.full_text,
        blocks: aiData.ocr.blocks.map((b) => ({
          text: b.text,
          confidence: b.confidence,
          bbox: b.bbox,
        })),
      },
      classification: {
        docType: aiData.classification.doc_type,
        confidence: aiData.classification.confidence,
      },
      summary: {
        content: aiData.summary.content,
        mainPurpose: aiData.summary.main_purpose,
        importantPeople: aiData.summary.important_people || [],
        organizations: aiData.summary.organizations || [],
        dates: aiData.summary.dates || [],
      },
      entities: {
        names: aiData.entities.names || [],
        dates: aiData.entities.dates || [],
        organizations: aiData.entities.organizations || [],
        locations: aiData.entities.locations || [],
        emails: aiData.entities.emails || [],
        phones: aiData.entities.phones || [],

        sender: aiData.entities.sender || '',
        receiver: aiData.entities.receiver || '',
        subject: aiData.entities.subject || '',

        storeName: aiData.entities.store_name || '',
        amount: aiData.entities.amount || null,
        tax: aiData.entities.tax || null,

        candidateName: aiData.entities.candidate_name || '',
        skills: aiData.entities.skills || [],
        education: aiData.entities.education || [],
      },
    });

    console.log(`OCR Extraction & Vector Indexing succeeded for Document ID: ${docId}`);
  } catch (error) {
    console.error(`AI Processing failed for Document ID ${docId}:`, error.message);
    
    let errMsg = 'AI Service processing failed';
    if (error.response && error.response.data && error.response.data.detail) {
      errMsg = error.response.data.detail;
    } else if (error.code === 'ECONNREFUSED') {
      errMsg = 'AI Service is currently offline';
    }

    await Document.findByIdAndUpdate(docId, {
      status: 'failed',
      error: errMsg,
    });
  }
};

// @desc    Upload document
// @route   POST /api/documents/upload
// @access  Private
export const uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // Save document metadata
    const doc = await Document.create({
      user: req.user._id,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      filepath: req.file.path,
      status: 'uploaded',
    });

    // Run AI OCR/classification processing in the background
    processDocumentBackground(doc._id, req.file.path, req.file.originalname, req.file.mimetype);

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully, analysis has started in the background.',
      data: doc,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all documents for logged-in user
// @route   GET /api/documents
// @access  Private
export const getDocuments = async (req, res, next) => {
  try {
    const docs = await Document.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: docs.length,
      data: docs,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single document details
// @route   GET /api/documents/:id
// @access  Private
export const getDocumentById = async (req, res, next) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, user: req.user._id });
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }
    res.status(200).json({
      success: true,
      data: doc,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete document
// @route   DELETE /api/documents/:id
// @access  Private
export const deleteDocument = async (req, res, next) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, user: req.user._id });
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    // Delete local file if it exists
    if (fs.existsSync(doc.filepath)) {
      fs.unlinkSync(doc.filepath);
    }

    await doc.deleteOne();
    
    // Clean up query history
    await QueryHistory.deleteMany({ document: req.params.id });

    res.status(200).json({
      success: true,
      message: 'Document deleted successfully',
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Search user documents
// @route   GET /api/documents/search
// @access  Private
export const searchDocuments = async (req, res, next) => {
  const { q } = req.query;

  if (!q) {
    return res.status(400).json({ success: false, message: 'Search query is required' });
  }

  try {
    const queryRegex = { $regex: q, $options: 'i' };
    const docs = await Document.find({
      user: req.user._id,
      $or: [
        { originalName: queryRegex },
        { 'ocr.fullText': queryRegex },
        { 'entities.names': queryRegex },
        { 'entities.organizations': queryRegex },
        { 'entities.locations': queryRegex },
        { 'entities.emails': queryRegex },
        { 'classification.docType': queryRegex },
      ],
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: docs.length,
      data: docs,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export document analysis as JSON
// @route   GET /api/documents/:id/export
// @access  Private
export const exportDocument = async (req, res, next) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, user: req.user._id });
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    const exportData = {
      document_id: doc._id,
      filename: doc.originalName,
      uploaded_at: doc.createdAt,
      size_bytes: doc.size,
      status: doc.status,
      classification: doc.classification,
      summary: doc.summary,
      entities: doc.entities,
      ocr_full_text: doc.ocr.fullText,
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=intellidoc-export-${doc._id}.json`
    );
    return res.status(200).send(JSON.stringify(exportData, null, 2));
  } catch (error) {
    next(error);
  }
};

// @desc    Ask a question on a document (RAG)
// @route   POST /api/documents/:id/query
// @access  Private
export const queryDocument = async (req, res, next) => {
  const { question } = req.body;
  const { id } = req.params;

  if (!question) {
    return res.status(400).json({ success: false, message: 'Question is required' });
  }

  try {
    // Check if document exists and user owns it
    const doc = await Document.findOne({ _id: id, user: req.user._id });
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    if (doc.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Document analysis must be completed before asking questions.',
      });
    }

    // Call Python FastAPI Q&A query route
    const aiResponse = await axios.post(`${process.env.AI_SERVICE_URL}/api/ai/query`, {
      document_id: id,
      question,
    });

    const answer = aiResponse.data.answer;

    // Save history record
    const history = await QueryHistory.create({
      user: req.user._id,
      document: id,
      question,
      answer,
    });

    res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error('RAG Query forwarding error:', error.message);
    let errMsg = 'Failed to answer question. Verify AI Engine is online.';
    if (error.response && error.response.data && error.response.data.detail) {
      errMsg = error.response.data.detail;
    }
    res.status(500).json({ success: false, message: errMsg });
  }
};

// @desc    Get Q&A history logs for a document
// @route   GET /api/documents/:id/query-history
// @access  Private
export const getQueryHistory = async (req, res, next) => {
  const { id } = req.params;
  try {
    const history = await QueryHistory.find({
      user: req.user._id,
      document: id,
    }).sort({ createdAt: 1 }); // Sorted chronologically

    res.status(200).json({
      success: true,
      count: history.length,
      data: history,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Run Gemini AI analysis on a document
// @route   POST /api/documents/:id/analyze
// @access  Private
export const analyzeDocument = async (req, res, next) => {
  try {
    const docId = req.params.id;
    const document = await Document.findOne({ _id: docId, user: req.user._id });
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    if (document.status !== 'ocr-completed') {
      return res.status(400).json({ success: false, message: 'Document is not in OCR-completed state' });
    }

    // Call FastAPI AI service /api/ai/analyze
    const response = await axios.post(
      `${process.env.AI_SERVICE_URL}/api/ai/analyze`,
      {
        text: document.ocr.fullText,
        existing_doc_type: document.classification?.docType,
        existing_confidence: document.classification?.confidence
      },
      {
        timeout: 45000 // 45 seconds timeout
      }
    );

    const aiData = response.data;
    if (!aiData.success) {
      return res.status(500).json({ success: false, message: 'Gemini Analysis failed' });
    }

    const { classification, summary, entities } = aiData;

    // Update document in DB with Gemini results and mark as completed
    const updatedDoc = await Document.findByIdAndUpdate(
      docId,
      {
        status: 'completed',
        classification: {
          docType: classification.doc_type,
          confidence: classification.confidence,
        },
        summary: {
          content: summary.content,
          mainPurpose: summary.main_purpose,
          importantPeople: summary.important_people || [],
          organizations: summary.organizations || [],
          dates: summary.dates || [],
        },
        entities: {
          // Merge ocr-completed basic entities with deep entities
          names: entities.names || [],
          dates: Array.from(new Set([...document.entities.dates, ...(entities.dates || [])])),
          organizations: entities.organizations || [],
          locations: entities.locations || [],
          emails: Array.from(new Set([...document.entities.emails, ...(entities.emails || [])])),
          phones: Array.from(new Set([...document.entities.phones, ...(entities.phones || [])])),

          sender: entities.sender || '',
          receiver: entities.receiver || '',
          subject: entities.subject || '',

          storeName: entities.store_name || '',
          amount: entities.amount || null,
          tax: entities.tax || null,

          candidateName: entities.candidate_name || '',
          skills: entities.skills || [],
          education: entities.education || [],
        }
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'AI Analysis completed successfully',
      data: updatedDoc
    });
  } catch (error) {
    console.error(`AI Analysis failed for Document ${req.params.id}:`, error.message);
    let errMsg = 'AI Service analysis failed. Verify AI Engine is online.';
    if (error.response && error.response.data && error.response.data.detail) {
      errMsg = error.response.data.detail;
    }
    res.status(500).json({
      success: false,
      message: errMsg
    });
  }
};
