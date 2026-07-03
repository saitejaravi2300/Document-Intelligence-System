import express from 'express';
import {
  uploadDocument,
  getDocuments,
  getDocumentById,
  deleteDocument,
  searchDocuments,
  exportDocument,
  queryDocument,
  getQueryHistory,
  analyzeDocument,
} from '../controllers/documentController.js';
import { protect } from '../middleware/auth.js';
import upload from '../middleware/multer.js';

const router = express.Router();

// Apply auth protection to all routes
router.use(protect);

router.post('/upload', upload.single('file'), uploadDocument);
router.get('/', getDocuments);
router.get('/search', searchDocuments);
router.get('/:id', getDocumentById);
router.delete('/:id', deleteDocument);
router.get('/:id/export', exportDocument);
router.post('/:id/analyze', analyzeDocument);

// Q&A (RAG) endpoints
router.post('/:id/query', queryDocument);
router.get('/:id/query-history', getQueryHistory);

export default router;
