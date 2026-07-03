import mongoose from 'mongoose';

const ocrBlockSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
  },
  confidence: {
    type: Number,
    required: true,
    default: 0.0,
  },
  bbox: {
    type: [Number], // [x_min, y_min, x_max, y_max] or 4-point polygon representation
    required: true,
  },
});

const documentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    filename: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    filepath: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['uploaded', 'processing', 'ocr-completed', 'completed', 'failed'],
      default: 'uploaded',
      index: true,
    },
    ocr: {
      fullText: {
        type: String,
        default: '',
      },
      blocks: [ocrBlockSchema],
    },
    classification: {
      docType: {
        type: String,
        enum: [
          'Resume',
          'Letter',
          'Receipt',
          'Invoice',
          'Certificate',
          'News Article',
          'Form',
          'Report',
          'Unknown',
        ],
        default: 'Unknown',
        index: true,
      },
      confidence: {
        type: Number,
        default: 0.0,
      },
    },
    summary: {
      content: { type: String, default: '' },
      mainPurpose: { type: String, default: '' },
      importantPeople: { type: [String], default: [] },
      organizations: { type: [String], default: [] },
      dates: { type: [String], default: [] },
    },
    entities: {
      // General Extracted Entities
      names: { type: [String], default: [] },
      dates: { type: [String], default: [] },
      organizations: { type: [String], default: [] },
      locations: { type: [String], default: [] },
      emails: { type: [String], default: [] },
      phones: { type: [String], default: [] },
      
      // Letter Specific
      sender: { type: String, default: '' },
      receiver: { type: String, default: '' },
      subject: { type: String, default: '' },

      // Receipt/Invoice Specific
      storeName: { type: String, default: '' },
      amount: { type: Number, default: null },
      tax: { type: Number, default: null },

      // Resume Specific
      candidateName: { type: String, default: '' },
      skills: { type: [String], default: [] },
      education: { type: [String], default: [] },
    },
    error: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for text search
documentSchema.index({
  filename: 'text',
  'ocr.fullText': 'text',
  'entities.names': 'text',
  'entities.organizations': 'text',
  'entities.locations': 'text',
});

const Document = mongoose.model('Document', documentSchema);
export default Document;
